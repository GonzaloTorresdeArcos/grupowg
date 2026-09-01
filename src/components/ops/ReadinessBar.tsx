import { etiquetaReadiness, progresoReadiness, traducirReason } from "@/lib/ops-portfolio";

/**
 * READINESS ≠ PERFORMANCE.
 *
 * Este componente representa exclusivamente PREPARACIÓN: cuánta evidencia hay
 * para que una obligación pueda llegar a evaluarse. Por eso es una barra
 * segmentada gris-azul, SIN semáforo y SIN verde/rojo. Está prohibido usarla
 * para comunicar resultado de cumplimiento (para eso existe `ResultCard`).
 */
export const ReadinessBar = ({
  estado,
  reason,
  className = "",
}: {
  estado: string | null | undefined;
  reason: string | null | undefined;
  className?: string;
}) => {
  const p = progresoReadiness(estado, reason);
  const segmentos = 4;
  const llenos = Math.round(p * segmentos);

  return (
    <div className={`space-y-1.5 ${className}`} data-testid="readiness-bar" data-reason={reason ?? ""}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Preparación
        </span>
        <span className="text-[11px] text-slate-600" title={estado ?? undefined}>
          {etiquetaReadiness(estado)}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: segmentos }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < llenos ? "bg-slate-500" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-600 leading-snug" title={reason ?? undefined}>
        {traducirReason(reason)}
      </p>
    </div>
  );
};

export default ReadinessBar;
