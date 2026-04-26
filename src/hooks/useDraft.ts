import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "wg_draft_token";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (s?: string) => !!s && EMAIL_RE.test(s) && s.length <= 320;

export interface DraftState {
  id: string;
  resume_token: string;
  email: string;
  current_step: number;
  form_data: Record<string, any>;
  email_verified: boolean;
  phone_verified: boolean;
  updated_at: string;
}

async function callDrafts(payload: Record<string, unknown>): Promise<DraftState | null> {
  const { data, error } = await supabase.functions.invoke("drafts", { body: payload });
  if (error) {
    console.error("[useDraft] edge fn error", error);
    return null;
  }
  if (!data?.ok) return null;
  return (data.draft as DraftState) ?? null;
}

export function useDraft() {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar draft existente al montar (por ?resume= o por token en localStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeParam = params.get("resume");
    const stored = localStorage.getItem(TOKEN_KEY);
    const token = resumeParam || stored;

    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      const result = await callDrafts({ action: "load", resume_token: token });
      if (result) {
        setDraft(result);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      setLoading(false);
    })();
  }, []);

  /** Crea o actualiza el draft. Hace debounce de 800ms. */
  const save = useCallback(
    async (patch: { email?: string; current_step?: number; form_data?: Record<string, any> }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      return new Promise<DraftState | null>((resolve) => {
        saveTimer.current = setTimeout(async () => {
          setSaving(true);
          try {
            if (!draft) {
              // No podemos crear un draft sin email VÁLIDO: el edge function lo rechaza
              // con `invalid_email`. Esperamos a que el usuario termine de escribirlo.
              if (!isValidEmail(patch.email)) {
                resolve(null);
                return;
              }
              const result = await callDrafts({
                action: "create",
                email: patch.email,
                current_step: patch.current_step ?? 1,
                form_data: patch.form_data ?? {},
              });
              if (result) {
                localStorage.setItem(TOKEN_KEY, result.resume_token);
                setDraft(result);
              }
              resolve(result);
            } else {
              // Si se incluye email en el patch, sólo lo enviamos cuando es válido;
              // de lo contrario lo omitimos para no romper el guardado del resto del form.
              const emailPatch =
                patch.email !== undefined && isValidEmail(patch.email)
                  ? { email: patch.email }
                  : {};
              const result = await callDrafts({
                action: "update",
                resume_token: draft.resume_token,
                ...emailPatch,
                ...(patch.current_step !== undefined ? { current_step: patch.current_step } : {}),
                ...(patch.form_data !== undefined ? { form_data: patch.form_data } : {}),
              });
              if (result) setDraft(result);
              resolve(result);
            }
          } finally {
            setSaving(false);
          }
        }, 800);
      });
    },
    [draft],
  );

  /** Refresh from server (e.g. after OTP verify, which flips verification flags server-side). */
  const refresh = useCallback(async () => {
    if (!draft) return null;
    const result = await callDrafts({ action: "load", resume_token: draft.resume_token });
    if (result) setDraft(result);
    return result;
  }, [draft]);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setDraft(null);
  }, []);

  return { draft, loading, saving, save, refresh, clear };
}
