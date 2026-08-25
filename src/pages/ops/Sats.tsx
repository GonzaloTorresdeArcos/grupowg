import { useMemo } from "react";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { OpsErrorBlock, falloDeQuery } from "@/components/ops/OpsErrorBlock";
import { useOpsRpc } from "@/lib/ops-query";
import { useOpsFilters, fmtNum, fmtPct, fmtDec, fmtEur } from "@/lib/ops-filters";
import { Loader2 } from "lucide-react";

export type SatRowData = {
  sat: string; cerradas: number; abiertas: number; pct_sla20: number;
  pct_bajas: number; pct_nff: number; dias_medio: number; coste_medio: number;
};

/**
 * UAT-2 · PROTECCIÓN DE MUESTRA.
 * Por debajo de este número de cierres en el período ninguna métrica derivada
 * (medianas, porcentajes, medias) es interpretable: se muestra «—», nunca 0,0
 * ni 0 %. Un 0 % leído como resultado real es una conclusión falsa.
 */
export const UMBRAL_MUESTRA_SAT = 30;

export const satEvaluable = (n: number | null | undefined): boolean =>
  (n ?? 0) >= UMBRAL_MUESTRA_SAT;

/** Mediana calculada SOLO sobre filas con muestra evaluable. `null` si no hay. */
export const medianaEvaluable = (rows: readonly SatRowData[], pick: (r: SatRowData) => number | null | undefined): number | null => {
  const a = rows
    .filter((r) => satEvaluable(r.cerradas))
    .map(pick)
    .filter((n): n is number => n != null && Number.isFinite(n))
    .sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const semaforo = (v: number | null, mediana: number | null, inverse = false) => {
  if (mediana == null || v == null || mediana === 0) return "text-ink/60";
  const rel = v / mediana;
  const good = inverse ? rel < 0.8 : rel > 1.1;
  const bad = inverse ? rel > 1.3 : rel < 0.9;
  return good ? "text-emerald-600" : bad ? "text-red-600" : "text-ink/60";
};

type Medianas = { sla20: number | null; bajas: number | null; nff: number | null; dias: number | null; coste: number | null };

/** Fila del ranking. Exportada para el test de protección de muestra. */
export const SatRow = ({ r, medians }: { r: SatRowData; medians: Medianas }) => {
  const ok = satEvaluable(r.cerradas);
  if (!ok) {
    return (
      <tr data-testid={`sat-${r.sat}`} data-evaluable="false">
        <td className="px-4 py-2.5 text-ink font-medium">{r.sat}</td>
        <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
        <td className="text-right px-3 py-2.5 tabular-nums text-ink/60">{fmtNum(r.abiertas)}</td>
        <td colSpan={5} className="px-3 py-2.5 text-[12px] text-ink/45">
          — Sin muestra evaluable (n={r.cerradas})
        </td>
      </tr>
    );
  }
  return (
    <tr data-testid={`sat-${r.sat}`} data-evaluable="true">
      <td className="px-4 py-2.5 text-ink font-medium">{r.sat}</td>
      <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
      <td className="text-right px-3 py-2.5 tabular-nums text-ink/60">{fmtNum(r.abiertas)}</td>
      <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_sla20, medians.sla20)}`}>{fmtPct(r.pct_sla20)}</td>
      <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.dias_medio, medians.dias, true)}`}>{fmtDec(r.dias_medio, 1)}</td>
      <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_bajas, medians.bajas, true)}`}>{fmtPct(r.pct_bajas)}</td>
      <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_nff, medians.nff, true)}`}>{fmtPct(r.pct_nff)}</td>
      <td className={`text-right px-4 py-2.5 tabular-nums ${semaforo(r.coste_medio, medians.coste, true)}`}>{fmtEur(r.coste_medio)}</td>
    </tr>
  );
};

const Sats = () => {
  const { rpcParams } = useOpsFilters();
  const params = useMemo(() => ({
    p_from: rpcParams.p_from, p_to: rpcParams.p_to,
    p_cliente: rpcParams.p_cliente, p_gama: rpcParams.p_gama,
    p_familia: rpcParams.p_familia, p_provincia: rpcParams.p_provincia,
  }), [rpcParams]);
  const q = useOpsRpc<SatRowData[]>("ops_sats_ranking", params);
  const rows = useMemo(() => (q.data ?? []) as SatRowData[], [q.data]);
  // UAT-3 · error ≠ loading ≠ sin datos.
  const fallos = falloDeQuery("ops_sats_ranking", q, "Ranking de SATs externos");
  const cargando = q.fetchStatus === "fetching" && !q.data;
  const reintentar = () => { void q.refetch(); };

  const medians = useMemo<Medianas>(() => ({
    sla20: medianaEvaluable(rows, (r) => r.pct_sla20),
    bajas: medianaEvaluable(rows, (r) => r.pct_bajas),
    nff: medianaEvaluable(rows, (r) => r.pct_nff),
    dias: medianaEvaluable(rows, (r) => r.dias_medio),
    coste: medianaEvaluable(rows, (r) => r.coste_medio),
  }), [rows]);

  // El ranking nunca ordena por métricas no evaluables: primero los evaluables
  // por volumen de cierres, después el resto (que no exhiben métricas).
  const ordenadas = useMemo(
    () => [...rows].sort((a, b) => Number(satEvaluable(b.cerradas)) - Number(satEvaluable(a.cerradas)) || b.cerradas - a.cerradas),
    [rows],
  );
  const nEval = ordenadas.filter((r) => satEvaluable(r.cerradas)).length;

  if (fallos.length > 0 && !q.data) {
    return <OpsErrorBlock fallos={fallos} onReintentar={reintentar} titulo="No se ha podido cargar el ranking de SATs" />;
  }
  if (cargando) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="space-y-8">
      {fallos.length > 0 && <OpsErrorBlock fallos={fallos} onReintentar={reintentar} conservaDatos />}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red externa</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SATs externos</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Ranking de SATs externos. Solo se publican métricas de los SATs con al menos {UMBRAL_MUESTRA_SAT} OTs
          cerradas en el período; el resto se declara sin muestra evaluable. Semáforos contra la mediana del grupo evaluable.
        </p>
      </header>
      <DataAsOf />

      <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">SAT</th>
              <th className="text-right px-3 py-2.5 font-semibold">Cerradas</th>
              <th className="text-right px-3 py-2.5 font-semibold">Abiertas</th>
              <th className="text-right px-3 py-2.5 font-semibold">SLA 20d</th>
              <th className="text-right px-3 py-2.5 font-semibold">Días medio</th>
              <th className="text-right px-3 py-2.5 font-semibold">% Bajas</th>
              <th className="text-right px-3 py-2.5 font-semibold">% NFF</th>
              <th className="text-right px-4 py-2.5 font-semibold">Coste medio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {ordenadas.map((r) => <SatRow key={r.sat} r={r} medians={medians} />)}
            {ordenadas.length === 0 && (
              <tr><td colSpan={8} className="text-center px-4 py-8 text-ink/40 text-sm">Sin SATs con actividad cerrada en el período.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink/40">
        {nEval === 0
          ? `Sin muestra evaluable en el período: ningún SAT alcanza ${UMBRAL_MUESTRA_SAT} OTs cerradas, por lo que no se publica mediana del grupo.`
          : `Mediana del grupo (${nEval} SAT evaluables) · SLA 20d ${fmtPct(medians.sla20 ?? 0)} · Días medio ${fmtDec(medians.dias ?? 0, 1)} · % Bajas ${fmtPct(medians.bajas ?? 0)} · % NFF ${fmtPct(medians.nff ?? 0)} · Coste medio ${fmtEur(medians.coste ?? 0)}`}
      </p>
    </div>
  );
};

export default Sats;
