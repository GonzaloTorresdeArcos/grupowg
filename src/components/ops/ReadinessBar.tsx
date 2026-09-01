import {
  ETAPAS_READINESS,
  ETIQUETA_ETAPA,
  esFueraDeAmbito,
  etapasAlcanzadas,
  etiquetaReadiness,
  traducirReason,
  type EntradaEtapas,
} from "@/lib/ops-portfolio";

/**
 * READINESS ≠ PERFORMANCE · y tampoco es una magnitud.
 *
 * PRV-A1: prohibido cualquier «% de preparación», peso o descuento por
 * blockers. Este componente pinta la SECUENCIA DE ETAPAS categóricas
 * DESCUBIERTA → REPRESENTADA → VALIDADA → APLICABLE → EVALUABLE → EVALUADA,
 * marcando cuáles están alcanzadas y cuáles no. Sin semáforo, sin verde/rojo/
 * ámbar, sin cifra agregada.
 */
export const ReadinessBar = ({
  estado,
  reason,
  claimEstado,
  tieneRegla,
  className = "",
}: {
  estado: string | null | undefined;
  reason: string | null | undefined;
  claimEstado?: string | null;
  tieneRegla?: boolean;
  className?: string;
}) => {
  const entrada: EntradaEtapas = {
    claimEstado,
    tieneRegla: Boolean(tieneRegla),
    readinessEstado: estado,
  };
  const alcanzadas = new Set(etapasAlcanzadas(entrada));
  const fuera = esFueraDeAmbito(estado);

  return (
    <div className={`space-y-1.5 ${className}`} data-testid="readiness-bar" data-reason={reason ?? ""}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Estado de la obligación
        </span>
        <span className="text-[11px] text-slate-600" title={estado ?? undefined}>
          {etiquetaReadiness(estado)}
        </span>
      </div>

      {fuera ? (
        <p className="text-[11px] text-slate-600 leading-snug">
          La obligación no entra en el ámbito evaluable de este programa. No se representa
          progreso de etapas.
        </p>
      ) : (
        <ol className="flex flex-wrap gap-1" aria-label="Etapas del ciclo de la obligación">
          {ETAPAS_READINESS.map((etapa) => {
            const on = alcanzadas.has(etapa);
            return (
              <li
                key={etapa}
                data-etapa={etapa}
                data-alcanzada={on ? "si" : "no"}
                className={
                  on
                    ? "rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-700"
                    : "rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-400"
                }
              >
                {ETIQUETA_ETAPA[etapa]}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[11px] text-slate-600 leading-snug" title={reason ?? undefined}>
        {traducirReason(reason)}
      </p>
    </div>
  );
};

export default ReadinessBar;
