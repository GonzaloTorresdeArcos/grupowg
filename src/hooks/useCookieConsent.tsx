import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CONSENT_VERSION,
  CookieCategory,
  CookieConsentState,
  StoredConsent,
  defaultConsent,
  loadConsent,
  saveConsent,
  clearConsent,
} from "@/lib/cookie-consent";

interface CookieConsentContextValue {
  ready: boolean;
  consent: StoredConsent | null;
  state: CookieConsentState;
  isCategoryEnabled: (cat: CookieCategory) => boolean;
  needsDecision: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  saveCustom: (state: CookieConsentState) => void;
  withdraw: () => void;
  version: string;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(
  undefined,
);

export const CookieConsentProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<StoredConsent | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const stored = loadConsent();
    setConsent(stored);
    setReady(true);
  }, []);

  const persist = useCallback(
    (state: CookieConsentState, decision: StoredConsent["decision"]) => {
      const saved = saveConsent(state, decision);
      setConsent(saved);
      setShowPreferences(false);
      // Notificar al resto de la app (e.g. carga de scripts)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wg:cookie-consent-changed", { detail: saved }),
        );
      }
    },
    [],
  );

  const acceptAll = useCallback(() => {
    persist(
      { necessary: true, analytics: true, marketing: true, preferences: true },
      "accept_all",
    );
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist(
      { necessary: true, analytics: false, marketing: false, preferences: false },
      "reject_all",
    );
  }, [persist]);

  const saveCustom = useCallback(
    (state: CookieConsentState) => {
      const allOn = state.analytics && state.marketing && state.preferences;
      const allOff = !state.analytics && !state.marketing && !state.preferences;
      const decision: StoredConsent["decision"] = allOn
        ? "accept_all"
        : allOff
          ? "reject_all"
          : "custom";
      persist(state, decision);
    },
    [persist],
  );

  const withdraw = useCallback(() => {
    clearConsent();
    setConsent(null);
    setShowPreferences(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wg:cookie-consent-revoked"));
    }
  }, []);

  const value = useMemo<CookieConsentContextValue>(() => {
    const state = consent?.state ?? defaultConsent;
    const needsDecision = ready && !consent;
    return {
      ready,
      consent,
      state,
      isCategoryEnabled: (cat) => !!state[cat],
      needsDecision,
      showBanner: needsDecision,
      showPreferences,
      openPreferences: () => setShowPreferences(true),
      closePreferences: () => setShowPreferences(false),
      acceptAll,
      rejectAll,
      saveCustom,
      withdraw,
      version: CONSENT_VERSION,
    };
  }, [ready, consent, showPreferences, acceptAll, rejectAll, saveCustom, withdraw]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  return ctx;
};
