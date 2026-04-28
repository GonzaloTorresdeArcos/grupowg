import { Component, ReactNode, Suspense } from "react";
import { useTranslation } from "react-i18next";

/**
 * RouteBoundary
 * -------------
 * Envuelve cada ruta con:
 *  - Suspense (para lazy + i18n) con fallback de carga visible.
 *  - ErrorBoundary que captura cualquier excepción de render/datos/i18n
 *    y muestra una pantalla de error usable en lugar de quedarse en blanco.
 *
 * Diseño: usa tokens semánticos (bg-background / text-foreground / primary)
 * para que respete el tema (oscuro o claro) sin pintar pantalla blanca.
 */

type ErrorState = { hasError: boolean; error: Error | null };

class ErrorBoundaryInner extends Component<{ children: ReactNode }, ErrorState> {
  state: ErrorState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Log estructurado para que aparezca también en window.__blankScreenLog
    // y en la consola del navegador / herramientas de monitorización.
    // eslint-disable-next-line no-console
    console.error("[RouteBoundary] Render error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const LoadingFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-background text-foreground px-6"
  >
    <div
      className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
      aria-hidden="true"
    />
    <p className="text-sm text-muted-foreground">Cargando…</p>
  </div>
);

const ErrorFallback = ({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) => {
  // Defaults seguros si i18n aún no está inicializado.
  const defaults = {
    title: "No hemos podido cargar esta sección",
    description:
      "Ha ocurrido un error inesperado al preparar el contenido. Puedes reintentar o volver al inicio.",
    retry: "Reintentar",
    home: "Volver al inicio",
  };

  const { t, i18n } = useTranslation("common");
  const ready = i18n?.isInitialized;
  const title = ready ? t("errors.routeTitle", defaults.title) : defaults.title;
  const description = ready
    ? t("errors.routeDescription", defaults.description)
    : defaults.description;
  const retry = ready ? t("errors.retry", defaults.retry) : defaults.retry;
  const home = ready ? t("errors.backHome", defaults.home) : defaults.home;

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-6 bg-background text-foreground px-6 py-16 text-center"
    >
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-base text-muted-foreground">{description}</p>
        {error?.message && (
          <p className="text-xs text-muted-foreground/70 font-mono break-all">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            onReset();
            // Re-render limpio: mantiene la URL pero fuerza re-mount del subtree.
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          {retry}
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          {home}
        </a>
      </div>
    </div>
  );
};

export const RouteBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundaryInner>
    <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
  </ErrorBoundaryInner>
);
