import { useMemo } from "react";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { useOpsRpc } from "@/lib/ops-query";
import { useOpsFilters, fmtNum, fmtPct, fmtDec, fmtEur } from "@/lib/ops-filters";
import { Loader2 } from "lucide-react";

type Row = {
  sat: string; cerradas: number; abiertas: number; pct_sla20: number;
  pct_bajas: number; pct_nff: number; dias_medio: number; coste_medio: number;
};

const median = (arr: number[]) => {
  const a = arr.filter((n) => n != null && !isNaN(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const semaforo = (v: number, mediana: number, inverse = false) => {
  if (mediana === 0) return "text-ink/60";
  const rel = v / mediana;
  const good = inverse ? rel < 0.8 : rel > 1.1;
  const bad = inverse ? rel > 1.3 : rel < 0.9;
  return good ? "text-emerald-600" : bad ? "text-red-600" : "text-ink/60";
};

const Sats = () => {
  const { rpcParams } = useOpsFilters();
  const params = useMemo(() => ({
    p_from: rpcParams.p_from, p_to: rpcParams.p_to,
    p_cliente: rpcParams.p_cliente, p_gama: rpcParams.p_gama,
    p_familia: rpcParams.p_familia, p_provincia: rpcParams.p_provincia,
  }), [rpcParams]);
  const q = useOpsRpc<Row[]>("ops_sats_ranking", params);
  const rows = useMemo(() => (q.data ?? []) as Row[], [q.data]);
  const loading = q.isPending;

  const medians = useMemo(() => ({
    sla20: median(rows.map((r) => r.pct_sla20)),
    bajas: median(rows.map((r) => r.pct_bajas)),
    nff: median(rows.map((r) => r.pct_nff)),
    dias: median(rows.map((r) => r.dias_medio)),
    coste: median(rows.map((r) => r.coste_medio)),
  }), [rows]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red externa</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SATs externos</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Ranking de SATs externos con mínimo 30 OTs cerradas en el período. Semáforos comparados
          contra la mediana del grupo.
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
            {rows.map((r) => (
              <tr key={r.sat}>
                <td className="px-4 py-2.5 text-ink font-medium">{r.sat}</td>
                <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(r.cerradas)}</td>
                <td className="text-right px-3 py-2.5 tabular-nums text-ink/60">{fmtNum(r.abiertas)}</td>
                <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_sla20, medians.sla20)}`}>{fmtPct(r.pct_sla20)}</td>
                <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.dias_medio, medians.dias, true)}`}>{fmtDec(r.dias_medio, 1)}</td>
                <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_bajas, medians.bajas, true)}`}>{fmtPct(r.pct_bajas)}</td>
                <td className={`text-right px-3 py-2.5 tabular-nums ${semaforo(r.pct_nff, medians.nff, true)}`}>{fmtPct(r.pct_nff)}</td>
                <td className={`text-right px-4 py-2.5 tabular-nums ${semaforo(r.coste_medio, medians.coste, true)}`}>{fmtEur(r.coste_medio)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center px-4 py-8 text-ink/40 text-sm">Sin SATs con ≥30 OTs cerradas en el período.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink/40">
        Mediana del grupo · SLA 20d {fmtPct(medians.sla20)} · Días medio {fmtDec(medians.dias, 1)} · % Bajas {fmtPct(medians.bajas)} · % NFF {fmtPct(medians.nff)} · Coste medio {fmtEur(medians.coste)}
      </p>
    </div>
  );
};

export default Sats;
