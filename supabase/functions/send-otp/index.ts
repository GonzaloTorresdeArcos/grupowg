import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hash sencillo (no exponer códigos en claro). En producción usaríamos un servicio externo.
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, channel, destination, code } = await req.json();

    if (!["email", "sms"].includes(channel)) {
      return new Response(JSON.stringify({ error: "Canal inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!destination || typeof destination !== "string") {
      return new Response(JSON.stringify({ error: "Destinatario requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "send") {
      const newCode = generateCode();
      const codeHash = await sha256(newCode);

      // Invalidar códigos anteriores no consumidos del mismo destino
      await supabase
        .from("wg_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("channel", channel)
        .eq("destination", destination.toLowerCase())
        .is("consumed_at", null);

      const { error } = await supabase.from("wg_otp_codes").insert({
        channel,
        destination: destination.toLowerCase(),
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      // Devolvemos el código directamente (modo demo, sin coste de envío real).
      // En producción aquí iría el envío real por email/SMS.
      return new Response(
        JSON.stringify({
          ok: true,
          demo_code: newCode,
          message: `Código enviado a ${destination}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return new Response(JSON.stringify({ error: "Código requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const codeHash = await sha256(code);
      const { data, error } = await supabase
        .from("wg_otp_codes")
        .select("*")
        .eq("channel", channel)
        .eq("destination", destination.toLowerCase())
        .eq("code_hash", codeHash)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ ok: false, error: "Código no válido o expirado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("wg_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", data.id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no soportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-otp error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
