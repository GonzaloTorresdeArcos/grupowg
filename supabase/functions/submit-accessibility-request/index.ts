import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BodySchema = z.object({
  request_type: z.enum(["informacion_accesible", "queja", "reclamacion", "sugerencia"]),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  organization: z.string().trim().max(160).optional().nullable(),
  page_url: z.string().trim().max(500).optional().nullable(),
  preferred_format: z.enum(["email", "telefono", "correo_postal", "otro"]),
  postal_address: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().min(20).max(4000),
  assistive_tech: z.string().trim().max(200).optional().nullable(),
  consent_given: z.literal(true),
  turnstile_token: z.string().min(10).max(4000),
});

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY not configured");
    return false;
  }
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!data.success) {
      console.warn("[turnstile] verification failed", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verify error", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // GET: devuelve la site key pública para que el frontend renderice el widget
  if (req.method === "GET") {
    const siteKey = Deno.env.get("TURNSTILE_SITE_KEY") ?? "";
    return new Response(JSON.stringify({ site_key: siteKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const ok = await verifyTurnstile(parsed.data.turnstile_token, ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: "captcha_failed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { turnstile_token: _t, ...payload } = parsed.data;
  const { error } = await supabase.from("wg_accessibility_requests").insert({
    ...payload,
    consent_at: new Date().toISOString(),
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    console.error("[accessibility-request] insert error", error);
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
