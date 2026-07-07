// Edge function: capture WG Network simulator lead. Anonymous visitors,
// no JWT required. Uses SERVICE_ROLE to bypass RLS on insert.
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

const isStr = (v: unknown, max = 500) => typeof v === "string" && v.length <= max;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const {
      nombre, empresa, email, telefono,
      cp, intervenciones_mes, ticket_medio, gama,
      impacto_total, multiplicador, caja_liberada, breakdown,
    } = body ?? {};

    if (!isStr(email, 320) || !emailRe.test(String(email).trim())) {
      return json({ ok: false, error: "invalid_email" }, 400);
    }

    const ua = req.headers.get("user-agent") ?? "";
    const payload = {
      nombre: isStr(nombre, 250) ? nombre : null,
      empresa: isStr(empresa, 250) ? empresa : null,
      email: String(email).trim(),
      telefono: isStr(telefono, 40) ? telefono : null,
      cp: isStr(cp, 10) ? cp : null,
      intervenciones_mes: Number.isFinite(intervenciones_mes) ? Math.trunc(intervenciones_mes) : null,
      ticket_medio: Number.isFinite(ticket_medio) ? Number(ticket_medio) : null,
      gama: isStr(gama, 50) ? gama : null,
      impacto_total: Number.isFinite(impacto_total) ? Number(impacto_total) : null,
      multiplicador: Number.isFinite(multiplicador) ? Number(multiplicador) : null,
      caja_liberada: Number.isFinite(caja_liberada) ? Number(caja_liberada) : null,
      breakdown: breakdown && typeof breakdown === "object" && !Array.isArray(breakdown) ? breakdown : null,
      source: "simulador",
      user_agent: ua.slice(0, 500),
    };

    const { data, error } = await supabase
      .from("wg_network_leads")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[submit-lead] insert error", error);
      return json({ ok: false, error: "internal_error" }, 500);
    }

    return json({ ok: true, lead_id: data.id });
  } catch (err) {
    console.error("[submit-lead] unhandled", err);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
