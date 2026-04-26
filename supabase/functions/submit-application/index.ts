// Edge function: secure submission of a network application.
// Performs the full insert flow server-side and computes the scoring
// authoritatively (client-supplied scoring is ignored).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ----------- Server-side scoring (mirror of src/lib/scoring.ts) -----------
type Tier = "basic" | "advanced" | "premium";
interface ScoringInput {
  familias: string[];
  servicios: string[];
  tecnicos: number;
  capacidadMensualText: string;
  coberturas: string[];
  documentosSubidos: number;
  zonaCobertura: number;
  emailVerified: boolean;
  phoneVerified: boolean;
}
const parseCapacidad = (s: string): number => {
  const m = String(s ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};
function computeScoring(input: ScoringInput) {
  const breakdown: Record<string, number> = {};
  const oferta = Math.min(25, (input.familias?.length ?? 0) * 4 + (input.servicios?.length ?? 0) * 3);
  breakdown["Oferta de servicios"] = oferta;
  const cap = parseCapacidad(input.capacidadMensualText);
  let capScore = 0;
  if (input.tecnicos >= 1) capScore += 5;
  if (input.tecnicos >= 3) capScore += 5;
  if (input.tecnicos >= 8) capScore += 5;
  if (cap >= 50) capScore += 4;
  if (cap >= 200) capScore += 6;
  capScore = Math.min(25, capScore);
  breakdown["Capacidad operativa"] = capScore;
  breakdown["Cobertura geográfica"] = Math.min(15, (input.zonaCobertura ?? 0) * 2);
  breakdown["Documentación aportada"] = Math.min(20, (input.documentosSubidos ?? 0) * 2);
  breakdown["Coberturas activadas"] = Math.min(10, (input.coberturas?.length ?? 0) * 2);
  let ver = 0;
  if (input.emailVerified) ver += 3;
  if (input.phoneVerified) ver += 2;
  breakdown["Verificación de contacto"] = ver;
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  let tier: Tier = "basic";
  if (total >= 75) tier = "premium";
  else if (total >= 50) tier = "advanced";
  return { total, tier, breakdown };
}

// ----------- Agreement integrity (mirror of src/lib/agreement-pdf.ts) -----------
const AGREEMENT_VERSION = "v1.0.0";
const AGREEMENT_INTRO =
  "El firmante declara, como representante legal o autorizado de la empresa indicada, que:";
const AGREEMENT_CLAUSES: string[] = [
  "Los datos aportados en el formulario de inscripción son veraces y completos.",
  "Acepta las condiciones generales del programa WG Professional Network y se compromete a aportar la documentación obligatoria pendiente para la activación operativa.",
  "Autoriza a Welife Group a tratar los datos facilitados con la finalidad de gestionar esta inscripción y, si procede, formalizar la relación de colaboración.",
  "Se compromete a comunicar cualquier cambio relevante en su capacidad operativa, estructura societaria, seguros o documentación obligatoria.",
];
const AGREEMENT_CLOSING =
  "El presente acuerdo manifiesta la voluntad inicial de incorporación a la red. La formalización contractual definitiva se realizará tras la validación documental y la firma del contrato mercantil correspondiente.";
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
const AGREEMENT_HASH = fnv1aHex(
  [AGREEMENT_VERSION, AGREEMENT_INTRO, ...AGREEMENT_CLAUSES, AGREEMENT_CLOSING].join("\n"),
);

// ----------- Validation -----------
const isStr = (v: unknown, max = 500) => typeof v === "string" && v.length <= max;
const isStrArr = (v: unknown, max = 100) =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && x.length <= 200);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const {
      action,
      resume_token,
      application,
      signature,
      application_id,
    } = body ?? {};

    if (!isStr(resume_token, 128) || (resume_token as string).length < 16) {
      return json({ error: "invalid_token" }, 400);
    }

    // ---------- Action: register agreement for an existing app ----------
    if (action === "register_agreement") {
      if (!isStr(application_id, 64) || !signature || typeof signature !== "object") {
        return json({ error: "invalid_payload" }, 400);
      }

      // Verify agreement integrity: hash sent by client must match the one
      // computed server-side from the canonical agreement text.
      const clientVersion = isStr(signature.agreement_version, 32) ? signature.agreement_version : null;
      const clientHash = isStr(signature.agreement_hash, 64) ? signature.agreement_hash : null;
      if (!clientVersion || !clientHash) {
        return json({ error: "missing_agreement_metadata" }, 400);
      }
      if (clientVersion !== AGREEMENT_VERSION || clientHash !== AGREEMENT_HASH) {
        console.warn("[submit-application][register_agreement] agreement hash mismatch", {
          clientVersion,
          clientHash,
          agreement_version_canon: AGREEMENT_VERSION,
          agreement_hash_canon: AGREEMENT_HASH,
        });
        return json({
          error: "agreement_hash_mismatch",
          expected_version: AGREEMENT_VERSION,
          expected_hash: AGREEMENT_HASH,
          agreement_version_canon: AGREEMENT_VERSION,
          agreement_hash_canon: AGREEMENT_HASH,
        }, 400);
      }

      const readAtRaw = isStr(signature.agreement_read_at, 64) ? signature.agreement_read_at : null;
      const readAtIso = readAtRaw && !isNaN(Date.parse(readAtRaw)) ? new Date(readAtRaw).toISOString() : null;

      const { data: draft0, error: dErr } = await supabase
        .from("wg_application_drafts")
        .select("id, email")
        .eq("resume_token", resume_token)
        .maybeSingle();
      if (dErr || !draft0) return json({ error: "draft_not_found" }, 404);

      const sigPayload = {
        application_id,
        draft_id: draft0.id,
        signer_name: isStr(signature.signer_name, 200) ? signature.signer_name : "",
        signer_dni: isStr(signature.signer_dni, 32) ? signature.signer_dni : null,
        signer_email: draft0.email,
        signature_data_url: isStr(signature.signature_data_url, 500_000) ? signature.signature_data_url : null,
        pdf_path: isStr(signature.pdf_path, 1024) ? signature.pdf_path : null,
        user_agent: isStr(signature.user_agent, 500) ? signature.user_agent : null,
        agreement_version: AGREEMENT_VERSION,
        agreement_hash: AGREEMENT_HASH,
        agreement_read_at: readAtIso,
      };
      if (!sigPayload.signer_name) return json({ error: "missing_signer" }, 400);
      const { error: sigErr } = await supabase.from("wg_signed_agreements").insert(sigPayload);
      if (sigErr) {
        console.error("[submit-application][register_agreement] insert error", sigErr);
        return json({ error: "internal_error" }, 500);
      }
      return json({ ok: true });
    }

    // ---------- Default action: full submission ----------
    if (!application || typeof application !== "object") {
      return json({ error: "invalid_application" }, 400);
    }

    // Load draft to verify ownership + verification flags
    const { data: draft, error: draftErr } = await supabase
      .from("wg_application_drafts")
      .select("id, email, email_verified, phone_verified")
      .eq("resume_token", resume_token)
      .maybeSingle();
    if (draftErr) {
      console.error("[submit-application] draft lookup error", draftErr);
      return json({ error: "internal_error" }, 500);
    }
    if (!draft) return json({ error: "draft_not_found" }, 404);
    if (!draft.email_verified) return json({ error: "email_not_verified" }, 400);

    // Build sanitized application payload — force status=pending and reset score/tier
    const payload = {
      razon_social: isStr(application.razon_social, 250) ? application.razon_social : null,
      nombre_comercial: isStr(application.nombre_comercial, 250) ? application.nombre_comercial : null,
      cif_nif: isStr(application.cif_nif, 32) ? application.cif_nif : null,
      tipo_colaborador: isStr(application.tipo_colaborador, 50) ? application.tipo_colaborador : null,
      persona_contacto: isStr(application.persona_contacto, 200) ? application.persona_contacto : null,
      telefono: isStr(application.telefono, 32) ? application.telefono : null,
      email: draft.email, // always use verified draft email
      direccion_fiscal: isStr(application.direccion_fiscal, 500) ? application.direccion_fiscal : null,
      provincias: isStr(application.provincias, 2000) ? application.provincias : null,
      provincias_codes: isStrArr(application.provincias_codes) ? application.provincias_codes : [],
      zona_cobertura: isStr(application.zona_cobertura, 2000) ? application.zona_cobertura : null,
      familias_producto: isStrArr(application.familias_producto) ? application.familias_producto : [],
      marcas_codes: isStrArr(application.marcas_codes) ? application.marcas_codes : [],
      marcas_trabajadas: isStr(application.marcas_trabajadas, 2000) ? application.marcas_trabajadas : null,
      numero_tecnicos: Number.isInteger(application.numero_tecnicos) && application.numero_tecnicos >= 0 && application.numero_tecnicos <= 10000 ? application.numero_tecnicos : null,
      servicios_ofrecidos: isStrArr(application.servicios_ofrecidos) ? application.servicios_ofrecidos : [],
      horarios: isStr(application.horarios, 500) ? application.horarios : null,
      capacidad_mensual: isStr(application.capacidad_mensual, 100) ? application.capacidad_mensual : null,
      coberturas: isStrArr(application.coberturas) ? application.coberturas : [],
      datos_seguros: application.datos_seguros && typeof application.datos_seguros === "object" && !Array.isArray(application.datos_seguros) ? application.datos_seguros : {},
      // forced server-side
      status: "pending",
      current_score: 0,
      current_tier: "basic",
    };

    if (!payload.razon_social || !payload.cif_nif || !payload.persona_contacto || !payload.telefono || !payload.tipo_colaborador) {
      return json({ error: "missing_required_fields" }, 400);
    }

    const { data: app, error: appErr } = await supabase
      .from("wg_network_applications")
      .insert(payload)
      .select("id")
      .single();
    if (appErr) {
      console.error("[submit-application] insert error", appErr);
      return json({ error: "internal_error" }, 500);
    }

    // Compute scoring server-side using sanitized values
    const scoring = computeScoring({
      familias: payload.familias_producto,
      servicios: payload.servicios_ofrecidos,
      tecnicos: payload.numero_tecnicos ?? 0,
      capacidadMensualText: payload.capacidad_mensual ?? "",
      coberturas: payload.coberturas,
      documentosSubidos: Number.isInteger(application.documentosSubidos) && application.documentosSubidos >= 0 && application.documentosSubidos <= 100
        ? application.documentosSubidos
        : 0,
      zonaCobertura: (payload.provincias_codes ?? []).length,
      emailVerified: draft.email_verified,
      phoneVerified: draft.phone_verified,
    });

    await supabase.from("wg_application_scoring").insert({
      application_id: app.id,
      draft_id: draft.id,
      total_score: scoring.total,
      tier: scoring.tier,
      breakdown: scoring.breakdown,
    });

    // Optional signed agreement (PDF path provided by client after upload)
    if (signature && typeof signature === "object") {
      // Validate agreement integrity (same logic as register_agreement)
      const clientVersion = isStr(signature.agreement_version, 32) ? signature.agreement_version : null;
      const clientHash = isStr(signature.agreement_hash, 64) ? signature.agreement_hash : null;
      if (!clientVersion || !clientHash) {
        return json({
          error: "missing_agreement_metadata",
          agreement_version_canon: AGREEMENT_VERSION,
          agreement_hash_canon: AGREEMENT_HASH,
        }, 400);
      }
      if (clientVersion !== AGREEMENT_VERSION || clientHash !== AGREEMENT_HASH) {
        console.warn("[submit-application] agreement hash mismatch on full submit", {
          clientVersion,
          clientHash,
          agreement_version_canon: AGREEMENT_VERSION,
          agreement_hash_canon: AGREEMENT_HASH,
        });
        return json({
          error: "agreement_hash_mismatch",
          expected_version: AGREEMENT_VERSION,
          expected_hash: AGREEMENT_HASH,
          agreement_version_canon: AGREEMENT_VERSION,
          agreement_hash_canon: AGREEMENT_HASH,
        }, 400);
      }

      const readAtRaw = isStr(signature.agreement_read_at, 64) ? signature.agreement_read_at : null;
      const readAtIso = readAtRaw && !isNaN(Date.parse(readAtRaw)) ? new Date(readAtRaw).toISOString() : null;

      const sigPayload = {
        application_id: app.id,
        draft_id: draft.id,
        signer_name: isStr(signature.signer_name, 200) ? signature.signer_name : "",
        signer_dni: isStr(signature.signer_dni, 32) ? signature.signer_dni : null,
        signer_email: draft.email,
        signature_data_url: isStr(signature.signature_data_url, 500_000) ? signature.signature_data_url : null,
        pdf_path: isStr(signature.pdf_path, 1024) ? signature.pdf_path : null,
        user_agent: isStr(signature.user_agent, 500) ? signature.user_agent : null,
        agreement_version: AGREEMENT_VERSION,
        agreement_hash: AGREEMENT_HASH,
        agreement_read_at: readAtIso,
      };
      if (sigPayload.signer_name) {
        const { error: sigErr } = await supabase.from("wg_signed_agreements").insert(sigPayload);
        if (sigErr) console.error("[submit-application] signature insert error", sigErr);
      }
    }

    return json({ ok: true, application_id: app.id, scoring });
  } catch (err) {
    console.error("[submit-application] unhandled", err);
    return json({ error: "internal_error" }, 500);
  }
});
