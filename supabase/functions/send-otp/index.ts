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

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 320;
const isPhone = (s: string) => /^\+?[\d\s().-]{6,32}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, channel, destination, code, resume_token } = body ?? {};

    if (!["email", "sms"].includes(channel)) {
      return json({ error: "invalid_channel" }, 400);
    }
    if (typeof destination !== "string" || destination.length < 3 || destination.length > 320) {
      return json({ error: "invalid_destination" }, 400);
    }
    const dest = destination.toLowerCase().trim();
    if (channel === "email" && !isEmail(dest)) return json({ error: "invalid_destination" }, 400);
    if (channel === "sms" && !isPhone(dest)) return json({ error: "invalid_destination" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "send") {
      // Rate limit: max 3 sends per destination in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("wg_otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("channel", channel)
        .eq("destination", dest)
        .gte("created_at", tenMinAgo);

      if ((recentCount ?? 0) >= 3) {
        return json({ error: "rate_limited", message: "Too many requests. Try again in a few minutes." }, 429);
      }

      const newCode = generateCode();
      const codeHash = await sha256(newCode);

      // Invalidate previous unused codes
      await supabase
        .from("wg_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("channel", channel)
        .eq("destination", dest)
        .is("consumed_at", null);

      const { error } = await supabase.from("wg_otp_codes").insert({
        channel,
        destination: dest,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      if (error) {
        console.error("[send-otp][send] insert error", error);
        return json({ error: "internal_error" }, 500);
      }

      // TODO production: deliver newCode via email (Resend) / SMS (Twilio).
      // We never return the code to the caller.
      console.info("[send-otp][send] code generated for", channel, dest);
      return json({ ok: true, message: "Code sent" });
    }

    if (action === "verify") {
      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return json({ error: "invalid_code" }, 400);
      }

      let matchedId: string | null = null;
      {
        const codeHash = await sha256(code);
        const { data, error } = await supabase
          .from("wg_otp_codes")
          .select("id")
          .eq("channel", channel)
          .eq("destination", dest)
          .eq("code_hash", codeHash)
          .is("consumed_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[send-otp][verify] query error", error);
          return json({ error: "internal_error" }, 500);
        }
        if (!data) return json({ ok: false, error: "invalid_or_expired" }, 400);
        matchedId = data.id;
      }

      if (matchedId) {
        await supabase
          .from("wg_otp_codes")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", matchedId);
      }

      // If a resume_token was provided, flip the verification flag on the draft (server-only).
      if (typeof resume_token === "string" && resume_token.length >= 16 && resume_token.length <= 128) {
        const flag = channel === "email" ? "email_verified" : "phone_verified";
        const { error: updErr } = await supabase
          .from("wg_application_drafts")
          .update({ [flag]: true })
          .eq("resume_token", resume_token);
        if (updErr) console.error("[send-otp][verify] draft flag error", updErr);
      }

      return json({ ok: true });
    }

    return json({ error: "unsupported_action" }, 400);
  } catch (err) {
    console.error("[send-otp] unhandled", err);
    return json({ error: "internal_error" }, 500);
  }
});
