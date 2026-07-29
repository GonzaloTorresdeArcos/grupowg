import { fmtNum, fmtPct } from "@/lib/ops-filters";
import {
  variacion, ratioBajas, estadoDelegacionMulti, esDelegacionReal,
  UMBRAL_MIN_DELEGACION, LABEL_GLOBAL_DELEG,
  type EquipoRow, type EstadoGlobalDeleg,
} from "@/lib/ops-performance";

const DOT: Record<EstadoGlobalDeleg, string> = {
  equilibrado: "bg-emerald-500",
  atencion: "bg-amber-500",
  critico: "bg-red-500",
  informacion_insuficiente: "bg-ink/25",
};
const TEXT: Record<EstadoGlobalDeleg, string> = {
  equilibrado: "text-emerald-700",
  atencion: "text-amber-700",
  critico: "text-red-700",
  informacion_insuficiente: "text-ink/50",
};

const DeltaMini = ({ v, favorable }: { v: number | null; favorable: "up" | "down" }) => {
  if (v == null) return <span className="text-ink/30 text-xs">—</span>;
  const positive = v > 0;
  const neutral = Math.abs(v) < 0.005;
  const good = (positive && favorable === "up") || (!positive && favorable === "down");
  const cls = neutral ? "text-ink/50" : good ? "text-emerald-700" : "text-red-700";
  return (
    <span className={`tabular-nums text-xs ${cls}`}>
      {positive ? "+" : ""}{(v * 100).toFixed(1)}%
    </span>
  );
};

export const DelegacionesResumen = ({
  equiposNow,
  equiposPrev,
  mediaCompaniaBajas,
}: {
  equiposNow: EquipoRow[];
  equiposPrev: EquipoRow[];
  mediaCompaniaBajas: number | null;
}) => {
  // Filtro DURO: solo delegaciones reales (rechaza "Gama PAE/Marrón/Blanca/…",
  // "Central (sin gama)", "Madrid · …", etc. que son equipos, no delegaciones).
  const soloDeleg = equiposNow.filter((e) => esDelegacionReal(e.equipo));
  const prevMap = new Map(equiposPrev.filter((e) => esDelegacionReal(e.equipo)).map((e) => [e.equipo, e] as const));

  const rows = soloDeleg.map((e) => {
    const p = prevMap.get(e.equipo) ?? null;
    const bajasA = Math.round(e.pct_bajas * e.cerradas);
    const bajasP = p ? Math.round(p.pct_bajas * p.cerradas) : null;
    const vC = variacion(e.cerradas, p?.cerradas ?? null);
    const vB = variacion(bajasA, bajasP);
    const estado = estadoDelegacionMulti({
      delegacion: e.equipo,
      cerradas: e.cerradas,
      cerradasPrev: p?.cerradas ?? null,
      pctBajas: e.pct_bajas,
      mediaEmpresaBajas: mediaCompaniaBajas,
      // Sin SLA ni backlog aquí — llegan más completos en /operaciones/delegaciones.
      pctSla20: null,
      abiertas: 0,
      abiertas30: 0,
      umbralMin: UMBRAL_MIN_DELEGACION,
    });
    return { e, p, estado, bajasA, bajasP, vC, vB };
  }).sort((a, b) => {
    const ord: Record<EstadoGlobalDeleg, number> = { critico: 0, atencion: 1, equilibrado: 2, informacion_insuficiente: 3 };
    const d = ord[a.estado.nivel] - ord[b.estado.nivel];
    if (d !== 0) return d;
    return b.e.cerradas - a.e.cerradas;
  });

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Comparativa de delegaciones</p>
        <span className="text-[10px] text-ink/40 italic">
          Solo delegaciones reales — se excluyen equipos de gama y red SAT externa. Estado provisional, sin ajuste por capacidad.
        </span>
      </div>
      <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] sticky top-0 bg-white">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Delegación</th>
              <th className="text-right px-3 py-2.5 font-semibold">Cerradas</th>
              <th className="text-right px-3 py-2.5 font-semibold text-ink/40">Ant.</th>
              <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
              <th className="text-right px-3 py-2.5 font-semibold">Bajas</th>
              <th className="text-right px-3 py-2.5 font-semibold text-ink/40">Ant.</th>
              <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
              <th className="text-right px-3 py-2.5 font-semibold">Bajas / Cerradas</th>
              <th className="text-left px-3 py-2.5 font-semibold">Estado</th>
              <th className="text-left px-3 py-2.5 font-semibold">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {rows.map(({ e, p, estado, bajasA, bajasP, vC, vB }) => (
              <tr key={e.equipo}>
                <td className="px-4 py-2.5 text-ink font-medium">{e.equipo}</td>
                <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(e.cerradas)}</td>
                <td className="text-right px-3 py-2.5 tabular-nums text-ink/50">{fmtNum(p?.cerradas ?? null)}</td>
                <td className="text-right px-3 py-2.5"><DeltaMini v={vC.pct} favorable="up" /></td>
                <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(bajasA)}</td>
                <td className="text-right px-3 py-2.5 tabular-nums text-ink/50">{fmtNum(bajasP)}</td>
                <td className="text-right px-3 py-2.5"><DeltaMini v={vB.pct} favorable="down" /></td>
                <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(ratioBajas(bajasA, e.cerradas))}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${TEXT[estado.nivel]}`} title={estado.reglaGlobal}>
                    <span className={`h-2 w-2 rounded-full ${DOT[estado.nivel]}`} />
                    {LABEL_GLOBAL_DELEG[estado.nivel]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-ink/60 max-w-[360px]">
                  {estado.observacion}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center px-4 py-8 text-ink/40 text-sm">
                  Sin delegaciones reales en el período con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
