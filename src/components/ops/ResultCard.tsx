/**
 * RESULTADO (semáforo) — reservado.
 *
 * Este componente SOLO puede usarse cuando exista una evaluación fiable de una
 * obligación contra el dato operativo. Hoy NO se usa en ninguna pantalla:
 * no hay ninguna obligación evaluada y ningún calendario laboral cargado, así
 * que pintar un semáforo sería una afirmación falsa.
 *
 * Se deja implementado para que la capa de evaluación, cuando exista, no tenga
 * que inventar una representación nueva ni reutilizar `ReadinessBar` (que mide
 * preparación, no resultado).
 */
export type ResultadoTono = "cumple" | "riesgo" | "incumple";

const TONOS: Record<ResultadoTono, { punto: string; texto: string; borde: string }> = {
  cumple:   { punto: "bg-emerald-500", texto: "text-emerald-700", borde: "border-emerald-200" },
  riesgo:   { punto: "bg-amber-500",   texto: "text-amber-700",   borde: "border-amber-200" },
  incumple: { punto: "bg-red-500",     texto: "text-red-700",     borde: "border-red-200" },
};

export const ResultCard = ({
  titulo,
  valor,
  tono,
  detalle,
}: {
  titulo: string;
  valor: string;
  tono: ResultadoTono;
  detalle?: string;
}) => {
  const t = TONOS[tono];
  return (
    <div className={`rounded-xl border bg-white p-4 ${t.borde}`} data-testid="result-card">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-2 w-2 rounded-full ${t.punto}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
          Resultado
        </span>
      </div>
      <p className="mt-2 text-[12px] text-ink/60">{titulo}</p>
      <p className={`mt-1 heading-display text-2xl ${t.texto}`}>{valor}</p>
      {detalle && <p className="mt-1 text-[11px] text-ink/50 leading-snug">{detalle}</p>}
    </div>
  );
};

export default ResultCard;
