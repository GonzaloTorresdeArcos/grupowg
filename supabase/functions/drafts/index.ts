// Edge function: secure draft access via resume_token
// Replaces direct table access from the client to wg_application_drafts.
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

const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 320;

const sanitizeFormData = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  // Cap stringified size at ~64KB to prevent abuse
  const str = JSON.stringify(data);
  if (str.length > 64_000) return {};
  return data as Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ---------------- LOAD ----------------
    if (action === "load") {
      const token = String(body?.resume_token ?? "");
      if (!token || token.length < 16 || token.length > 128) {
        return json({ error: "invalid_token" }, 400);
      }
      const { data, error } = await supabase
        .from("wg_application_drafts")
        .select("id, resume_token, email, current_step, form_data, email_verified, phone_verified, updated_at")
        .eq("resume_token", token)
        .maybeSingle();
      if (error) {
        console.error("[drafts][load] db error", error);
        return json({ error: "internal_error" }, 500);
      }
      return json({ ok: true, draft: data ?? null });
    }

    // ---------------- CREATE ----------------
    if (action === "create") {
      const email = body?.email;
      if (!isEmail(email)) return json({ error: "invalid_email" }, 400);

      const token = generateToken();
      const insertPayload = {
        email: (email as string).toLowerCase(),
        resume_token: token,
        current_step: Number.isInteger(body?.current_step) ? body.current_step : 1,
        form_data: sanitizeFormData(body?.form_data),
      };

      const { data, error } = await supabase
        .from("wg_application_drafts")
        .insert(insertPayload)
        .select("id, resume_token, email, current_step, form_data, email_verified, phone_verified, updated_at")
        .single();
      if (error) {
        console.error("[drafts][create] db error", error);
        return json({ error: "internal_error" }, 500);
      }
      return json({ ok: true, draft: data });
    }

    // ---------------- UPDATE ----------------
    if (action === "update") {
      const token = String(body?.resume_token ?? "");
      if (!token || token.length < 16 || token.length > 128) {
        return json({ error: "invalid_token" }, 400);
      }
      const patch: Record<string, unknown> = {};
      if (body?.email !== undefined) {
        if (!isEmail(body.email)) return json({ error: "invalid_email" }, 400);
        patch.email = (body.email as string).toLowerCase();
      }
      if (body?.current_step !== undefined) {
        if (!Number.isInteger(body.current_step) || body.current_step < 1 || body.current_step > 20) {
          return json({ error: "invalid_step" }, 400);
        }
        patch.current_step = body.current_step;
      }
      if (body?.form_data !== undefined) {
        patch.form_data = sanitizeFormData(body.form_data);
      }
      // NOTE: email_verified / phone_verified are NEVER settable from client.
      // They are toggled only by the server-side OTP verify path inside send-otp.

      if (Object.keys(patch).length === 0) {
        return json({ error: "nothing_to_update" }, 400);
      }

      const { data, error } = await supabase
        .from("wg_application_drafts")
        .update(patch)
        .eq("resume_token", token)
        .select("id, resume_token, email, current_step, form_data, email_verified, phone_verified, updated_at")
        .single();
      if (error) {
        console.error("[drafts][update] db error", error);
        return json({ error: "internal_error" }, 500);
      }
      return json({ ok: true, draft: data });
    }

    return json({ error: "unsupported_action" }, 400);
  } catch (err) {
    console.error("[drafts] unhandled", err);
    return json({ error: "internal_error" }, 500);
  }
});
