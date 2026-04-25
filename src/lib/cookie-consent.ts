// ============================================================
// Sistema de consentimiento de cookies (RGPD / LOPDGDD / Guía AEPD)
// ============================================================
// - 4 categorías: necessary (siempre activa), analytics, marketing, preferences.
// - Consentimiento granular y explícito (opt-in, no implícito).
// - Versionado: cambios materiales ⇒ se renueva el consentimiento.
// - Caducidad: 24 meses (Guía AEPD 2023).
// - Persistencia local en localStorage. No se envían datos a servidor.
// ============================================================

export type CookieCategory = "necessary" | "analytics" | "marketing" | "preferences";

export interface CookieConsentState {
  necessary: true; // siempre true por definición
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface StoredConsent {
  version: string;
  state: CookieConsentState;
  acceptedAt: string; // ISO
  expiresAt: string; // ISO
  decision: "accept_all" | "reject_all" | "custom";
}

// Si cambian categorías o textos sustanciales, sube esta versión para forzar
// re-consentimiento conforme a la Guía AEPD.
export const CONSENT_VERSION = "2025-01-1";
export const CONSENT_STORAGE_KEY = "wg:cookie-consent:v1";
export const CONSENT_TTL_DAYS = 730; // 24 meses

export const defaultConsent: CookieConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const isBrowser = () => typeof window !== "undefined";

export const loadConsent = (): StoredConsent | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed?.version || parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      state: { ...defaultConsent, ...parsed.state, necessary: true },
    };
  } catch {
    return null;
  }
};

export const saveConsent = (
  state: CookieConsentState,
  decision: StoredConsent["decision"],
): StoredConsent => {
  const now = new Date();
  const expires = new Date(now.getTime() + CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    state: { ...state, necessary: true },
    acceptedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    decision,
  };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // noop
    }
  }
  return payload;
};

export const clearConsent = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
};
