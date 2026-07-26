import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct } from "@/lib/ops-filters";
import { Loader2, Download } from "lucide-react";

type Tramos = { t0_10: number; t11_20: number; t21_30: number; t_30_plus: number; total: number };
type Abierta = {
  num_ot: string; cliente_wg: string | null; familia: string | null; provincia: string | null;
  tecnico: string | null; sat: string | null; delegacion: string | null;
  fecha_creacion: string | null; dias_abierta: number;
};
type Sla = {
  tramos: Tramos;
  abiertas: Abierta[];
  prov_30: Array<{ provincia: string; n: number }>;
  sat_30: Array<{ sat: string; n: number }>;
};

const SLA = () => {
  const { rpcParams } = useOpsFilters();
  const [data, setData] = useState<Sla | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc("ops_sla" as never, rpcParams as never);
      setData((data ?? null) as Sla | null);
      setLoading(false);
    })();
  }, [rpcParams]);

  const csv = useMemo(() => {
    if (!data) return "";
    const header = "num_ot,cliente,familia,provincia,delegacion,sat,tecnico,fecha_creacion,dias_abierta\n";
    const rows = data.abiertas.map((a) =>
      [a.num_ot, a.cliente_wg, a.familia, a.provincia, a.delegacion, a.sat, a.tecnico, a.fecha_creacion, a.dias_abierta]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    return header + rows;
  }, [data]);

  const exportCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sla-abiertas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  const t = data.tramos;
  const tot = Math.max(1, t.total);
  const bar = (n: number) => (n / tot) * 100;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Envejecimiento</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SLA y OTs abiertas</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Distribución por tramos de cierre (0-10, 11-20, 21-30, +30 días) y listado de OTs abiertas ordenadas por antigüedad.
        </p>
      </header>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Tramos de cierre · {fmtNum(t.total)} OTs cerradas en el período</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6 space-y-4">
          {[
            { l: "0-10 días", n: t.t0_10, c: "bg-emerald-500" },
            { l: "11-20 días", n: t.t11_20, c: "bg-emerald-400" },
            { l: "21-30 días", n: t.t21_30, c: "bg-amber-500" },
            { l: "+30 días", n: t.t_30_plus, c: "bg-red-500" },
          ].map((r) => (
            <div key={r.l}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink/70">{r.l}</span>
                <span className="tabular-nums text-ink/60">{fmtNum(r.n)} · {fmtPct(r.n / tot)}</span>
              </div>
              <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                <div className={`h-full ${r.c}`} style={{ width: `${bar(r.n)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Abiertas ({fmtNum(data.abiertas.length)}{data.abiertas.length === 500 ? "+" : ""})</p>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">OT</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Familia</th>
                <th className="text-left px-3 py-2.5 font-semibold">Provincia</th>
                <th className="text-left px-3 py-2.5 font-semibold">Recurso</th>
                <th className="text-left px-3 py-2.5 font-semibold">Creación</th>
                <th className="text-right px-4 py-2.5 font-semibold">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {data.abiertas.map((a) => (
                <tr key={a.num_ot}>
                  <td className="px-4 py-2 font-medium text-ink">{a.num_ot}</td>
                  <td className="px-3 py-2 text-ink/70">{a.cliente_wg || "—"}</td>
                  <td className="px-3 py-2 text-ink/70">{a.familia || "—"}</td>
                  <td className="px-3 py-2 text-ink/70">{a.provincia || "—"}</td>
                  <td className="px-3 py-2 text-ink/70">{a.tecnico || a.sat || "—"}</td>
                  <td className="px-3 py-2 text-ink/60 text-xs tabular-nums">{a.fecha_creacion || "—"}</td>
                  <td className={`text-right px-4 py-2 tabular-nums ${a.dias_abierta > 30 ? "text-red-600 font-medium" : a.dias_abierta > 20 ? "text-amber-600" : "text-ink/60"}`}>{a.dias_abierta}</td>
                </tr>
              ))}
              {data.abiertas.length === 0 && (
                <tr><td colSpan={7} className="text-center px-4 py-8 text-ink/40 text-sm">Sin OTs abiertas con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <MiniList title="+30d por provincia" rows={data.prov_30.map((r) => ({ k: r.provincia, n: r.n }))} />
        <MiniList title="+30d por SAT" rows={data.sat_30.map((r) => ({ k: r.sat, n: r.n }))} />
      </section>
    </div>
  );
};

const MiniList = ({ title, rows }: { title: string; rows: Array<{ k: string; n: number }> }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">{title}</p>
    <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.04]">
      {rows.length === 0 && <p className="p-4 text-xs text-ink/40">Sin acumulación.</p>}
      {rows.map((r) => (
        <div key={r.k} className="px-4 py-2 flex justify-between text-sm">
          <span className="text-ink">{r.k}</span>
          <span className="tabular-nums text-ink/60">{fmtNum(r.n)}</span>
        </div>
      ))}
    </div>
  </div>
);

export default SLA;
