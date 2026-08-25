import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * UAT-3 · Punto 4 — bloque único de error de RPC en /operaciones.
 *
 * Reglas que impone este componente (y que el test de guardia
 * `ops-error-guard.test.ts` verifica en todas las páginas):
 *
 *  1. Error de RPC ≠ loading. Un fallo NUNCA puede quedarse en spinner: el
 *     spinner solo se muestra con `fetchStatus === "fetching"` y sin datos.
 *  2. Error de RPC ≠ «sin datos». El estado vacío solo es legítimo cuando la
 *     query ha resuelto con éxito y ha devuelto vacío.
 *  3. Si hay datos anteriores (placeholderData) y falla el refetch, la
 *     pantalla NO se vacía: se muestra este bloque en modo compacto arriba
 *     (`conservaDatos`) y el contenido previo sigue en el DOM.
 *
 * El registro central de errores lo hace `opsRpc` (src/lib/ops-query.ts): las
 * páginas no capturan el error antes, solo lo leen de `isError`/`error`.
 */

export type OpsFallo = {
  /** Nombre exacto de la RPC que ha fallado. */
  rpc: string;
  /** Qué parte de la pantalla depende de ella (opcional). */
  contexto?: string;
  mensaje: string;
};

/** Mensaje legible de un error de supabase-js / PostgREST. */
export const mensajeError = (error: unknown): string => {
  if (!error) return "error desconocido";
  if (typeof error === "string") return error;
  const e = error as { message?: unknown; details?: unknown; hint?: unknown };
  const m = typeof e.message === "string" && e.message ? e.message : null;
  const d = typeof e.details === "string" && e.details ? e.details : null;
  return m && d && d !== m ? `${m} — ${d}` : (m ?? d ?? "error desconocido");
};

/** Estado mínimo de una query de react-query que este helper necesita. */
type EstadoQuery = { isError: boolean; error?: unknown };

/**
 * Convierte una tanda de queries (`useOpsRpcs`) en la lista de fallos.
 * `specs` aporta el nombre de la RPC en la misma posición.
 */
export const fallosDeQueries = (
  specs: readonly { rpc: string; contexto?: string }[],
  queries: readonly EstadoQuery[],
): OpsFallo[] =>
  queries
    .map((q, i) => ({ q, spec: specs[i] }))
    .filter((x) => x.q.isError && !!x.spec)
    .map((x) => ({ rpc: x.spec.rpc, contexto: x.spec.contexto, mensaje: mensajeError(x.q.error) }));

/** Un único fallo a partir de una query suelta (`useOpsRpc`). */
export const falloDeQuery = (
  rpc: string,
  q: EstadoQuery,
  contexto?: string,
): OpsFallo[] => (q.isError ? [{ rpc, contexto, mensaje: mensajeError(q.error) }] : []);

export const OpsErrorBlock = ({
  fallos,
  onReintentar,
  conservaDatos = false,
  titulo,
  className = "",
}: {
  fallos: readonly OpsFallo[];
  onReintentar: () => void;
  /** true → banda compacta sobre datos que siguen en pantalla. */
  conservaDatos?: boolean;
  titulo?: string;
  className?: string;
}) => {
  if (!fallos.length) return null;

  const encabezado =
    titulo ?? (conservaDatos ? "No se ha podido actualizar el dato" : "No se ha podido cargar la información");

  return (
    <div
      role="alert"
      data-testid="ops-error-block"
      data-conserva-datos={conservaDatos ? "true" : "false"}
      className={
        conservaDatos
          ? `border border-red-200 bg-red-50/60 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`
          : `max-w-xl mx-auto my-16 border border-red-200 bg-red-50/60 rounded-2xl p-6 space-y-3 ${className}`
      }
    >
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className={conservaDatos ? "h-4 w-4 shrink-0" : "h-5 w-5"} aria-hidden />
        <p className={conservaDatos ? "text-[13px] font-medium" : "font-semibold text-sm"}>{encabezado}</p>
      </div>

      <ul className={conservaDatos ? "text-[12px] text-red-900/80 space-y-0.5" : "text-sm text-red-900/80 space-y-1"}>
        {fallos.map((f, i) => (
          <li key={`${f.rpc}-${i}`}>
            <span className="font-mono text-xs">{f.rpc}</span>
            {f.contexto && <span className="text-red-900/60"> · {f.contexto}</span>}
            {": "}
            {f.mensaje}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onReintentar}
        className={
          conservaDatos
            ? "ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-300 text-red-900 text-[12px] px-3 py-1.5 hover:bg-red-100"
            : "inline-flex items-center gap-1.5 rounded-full bg-ink text-bone text-sm px-4 py-2"
        }
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Reintentar
      </button>
    </div>
  );
};

export default OpsErrorBlock;
