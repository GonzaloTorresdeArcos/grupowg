import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "wg_draft_token";

const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

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
      const { data, error } = await supabase
        .from("wg_application_drafts")
        .select("*")
        .eq("resume_token", token)
        .maybeSingle();

      if (!error && data) {
        setDraft(data as DraftState);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      setLoading(false);
    })();
  }, []);

  /** Crea o actualiza el draft. Hace debounce de 800ms. */
  const save = useCallback(
    async (patch: { email?: string; current_step?: number; form_data?: Record<string, any>; email_verified?: boolean; phone_verified?: boolean; }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      return new Promise<DraftState | null>((resolve) => {
        saveTimer.current = setTimeout(async () => {
          setSaving(true);
          try {
            if (!draft) {
              if (!patch.email) {
                setSaving(false);
                resolve(null);
                return;
              }
              const token = generateToken();
              const { data, error } = await supabase
                .from("wg_application_drafts")
                .insert({
                  email: patch.email,
                  resume_token: token,
                  current_step: patch.current_step ?? 1,
                  form_data: patch.form_data ?? {},
                  email_verified: patch.email_verified ?? false,
                  phone_verified: patch.phone_verified ?? false,
                })
                .select("*")
                .single();
              if (!error && data) {
                localStorage.setItem(TOKEN_KEY, token);
                setDraft(data as DraftState);
                resolve(data as DraftState);
              } else {
                resolve(null);
              }
            } else {
              const { data, error } = await supabase
                .from("wg_application_drafts")
                .update({
                  ...(patch.email !== undefined ? { email: patch.email } : {}),
                  ...(patch.current_step !== undefined ? { current_step: patch.current_step } : {}),
                  ...(patch.form_data !== undefined ? { form_data: patch.form_data } : {}),
                  ...(patch.email_verified !== undefined ? { email_verified: patch.email_verified } : {}),
                  ...(patch.phone_verified !== undefined ? { phone_verified: patch.phone_verified } : {}),
                })
                .eq("id", draft.id)
                .select("*")
                .single();
              if (!error && data) {
                setDraft(data as DraftState);
                resolve(data as DraftState);
              } else {
                resolve(null);
              }
            }
          } finally {
            setSaving(false);
          }
        }, 800);
      });
    },
    [draft],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setDraft(null);
  }, []);

  return { draft, loading, saving, save, clear };
}
