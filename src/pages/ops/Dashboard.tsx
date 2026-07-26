import { useEffect, useState } from "react";
import { fetchOperationsData, computeKpis, type OtRow, type Kpis } from "@/lib/ops-queries";
import { Loader2 } from "lucide-react";

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(Math.round(n));

const Kpi = ({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: "ink" | "warn" | "ok" }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
    <div className={`h-[2px] w-8 mb-5 ${tone === "warn" ? "bg-amber-500" : tone === "ok" ? "bg-emerald-500" : "bg-ink"}`} />
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="mt-2 font-display text-4xl tracking-tight text-ink tabular-nums">{value}</p>
    {hint && <p className="mt-2 text-xs text-ink/50">{hint}</p>}
  </div>
);

const Dashboard = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperationsData()
      .then((r) => setRows(r))
      .catch((e) => setError(e.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const kpis: Kpis = computeKpis(rows);
  const hasData = rows.length > 0;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cuadro de mando</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Panorama operativo</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Vista global de la actividad de la red HIPERSERVICE y SATs externos. Se excluye la incidencia
          &quot;ANULADO AVISO&quot; de todos los indicadores.
        </p>
      </header>

      {!hasData ? (
        <div className="border border-dashed border-black/[0.12] rounded-2xl p-10 text-center bg-white">
          <p className="font-display text-xl text-ink tracking-tight">Aún no hay datos cargados</p>
          <p className="text-sm text-ink/60 mt-2">
            Importa el CSV mensual desde <a href="/operaciones/importar" className="underline">Importar CSV</a> para
            empezar a ver los indicadores.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="OTs totales" value={fmtNum(kpis.totalOts)} />
            <Kpi label="Abiertas" value={fmtNum(kpis.abiertas)} hint={`${kpis.envejecidas20} envejecidas +20d`} tone={kpis.envejecidas20 > 0 ? "warn" : "ink"} />
            <Kpi label="Cerradas" value={fmtNum(kpis.cerradas)} />
            <Kpi label="Días de cierre medio" value={kpis.diasCierreMedio.toFixed(1)} />
          </section>

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Calidad y SLA</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="SLA ≤20 días" value={fmtPct(kpis.sla20)} tone={kpis.sla20 >= 0.8 ? "ok" : kpis.sla20 >= 0.6 ? "warn" : "warn"} />
              <Kpi label="SLA ≤30 días" value={fmtPct(kpis.sla30)} tone={kpis.sla30 >= 0.9 ? "ok" : "warn"} />
              <Kpi label="% Bajas" value={fmtPct(kpis.bajas / Math.max(1, kpis.totalOts))} hint={`${fmtNum(kpis.bajas)} aparatos irreparables`} />
              <Kpi label="% NFF" value={fmtPct(kpis.nff / Math.max(1, kpis.totalOts))} hint={`${fmtNum(kpis.nff)} sin avería`} />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Envejecimiento de la cartera abierta</p>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="OTs abiertas +20 días" value={fmtNum(kpis.envejecidas20)} tone={kpis.envejecidas20 > 0 ? "warn" : "ok"} />
              <Kpi label="OTs abiertas +30 días" value={fmtNum(kpis.envejecidas30)} tone={kpis.envejecidas30 > 0 ? "warn" : "ok"} />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
