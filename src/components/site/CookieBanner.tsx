import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, Settings2, Minus } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { CookieConsentState } from "@/lib/cookie-consent";

const CATEGORY_ITEMS: Array<{
  key: keyof CookieConsentState;
  title: string;
  description: string;
  required?: boolean;
}> = [
  {
    key: "necessary",
    title: "Estrictamente necesarias",
    description:
      "Imprescindibles para el funcionamiento básico del sitio: sesión, seguridad, equilibrado de carga y memorización del propio consentimiento. No requieren consentimiento (art. 22.2 LSSI).",
    required: true,
  },
  {
    key: "preferences",
    title: "Preferencias",
    description:
      "Permiten recordar elecciones del usuario (idioma, región, formularios guardados) para mejorar la experiencia.",
  },
  {
    key: "analytics",
    title: "Analíticas",
    description:
      "Nos ayudan a entender de forma agregada cómo se usa el sitio (páginas vistas, tiempo, dispositivo) para mejorarlo. Ej.: Google Analytics 4.",
  },
  {
    key: "marketing",
    title: "Marketing y publicidad",
    description:
      "Permiten medir campañas y mostrar contenido más relevante en plataformas de terceros. Ej.: Meta Pixel, Google Ads.",
  },
];

export const CookieBanner = () => {
  const {
    ready,
    showBanner,
    acceptAll,
    rejectAll,
    openPreferences,
  } = useCookieConsent();

  if (!ready || !showBanner) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6 pointer-events-none"
    >
      <div className="container-tight pointer-events-auto">
        <div className="rounded-2xl border border-bone/10 bg-ink/95 backdrop-blur-md text-bone shadow-2xl p-5 sm:p-6 md:p-7 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal)/0.18),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-teal/15 flex items-center justify-center flex-shrink-0">
                <Cookie className="h-5 w-5 text-teal" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg md:text-xl text-bone leading-tight">
                  Usamos cookies en grupowg.com
                </p>
                <p className="mt-2 text-sm text-bone/70 leading-relaxed max-w-2xl">
                  Utilizamos cookies propias y de terceros para fines técnicos, de
                  análisis y de marketing. Puedes aceptarlas todas, rechazarlas o
                  configurarlas. Las estrictamente necesarias se cargan siempre. Más
                  información en nuestra{" "}
                  <Link
                    to="/legal/cookies"
                    className="underline underline-offset-2 hover:text-bone"
                  >
                    Política de cookies
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:flex-shrink-0">
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-bone/20 text-bone hover:bg-bone/5 transition-colors"
              >
                Rechazar todo
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-bone/20 text-bone hover:bg-bone/5 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Configurar
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal text-ink hover:bg-teal/90 transition-colors"
              >
                Aceptar todo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CookiePreferencesDialog = () => {
  const {
    ready,
    showPreferences,
    closePreferences,
    state,
    saveCustom,
    acceptAll,
    rejectAll,
  } = useCookieConsent();
  const [draft, setDraft] = useState<CookieConsentState>(state);

  useEffect(() => {
    if (showPreferences) setDraft(state);
  }, [showPreferences, state]);

  if (!ready) return null;

  return (
    <Dialog open={showPreferences} onOpenChange={(o) => !o && closePreferences()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Preferencias de cookies
          </DialogTitle>
          <DialogDescription className="text-sm">
            Activa o desactiva por categoría. Tu elección se guardará durante 24
            meses. Puedes cambiarla en cualquier momento desde el pie de página.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {CATEGORY_ITEMS.map((item) => {
            const checked = !!draft[item.key];
            return (
              <div
                key={item.key}
                className="rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                      {item.required && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Siempre activas
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={item.required}
                    onCheckedChange={(v) =>
                      setDraft((d) => ({ ...d, [item.key]: v }))
                    }
                    aria-label={item.title}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={rejectAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Rechazar todo
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Aceptar todo
            </button>
          </div>
          <button
            type="button"
            onClick={() => saveCustom(draft)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-ink text-bone hover:bg-ink/90 transition-colors"
          >
            Guardar selección
          </button>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Consulta el detalle de cookies utilizadas, finalidad, duración y
          proveedor en nuestra{" "}
          <Link to="/legal/cookies" className="underline hover:text-foreground">
            Política de cookies
          </Link>{" "}
          y la información completa sobre tratamiento de datos en la{" "}
          <Link to="/legal/privacidad" className="underline hover:text-foreground">
            Política de privacidad
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
};
