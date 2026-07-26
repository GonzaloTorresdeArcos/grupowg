import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtEur, fmtDec } from "@/lib/ops-filters";
import { Loader2, AlertTriangle, TrendingDown, MapPin, Gauge } from "lucide-react";

type Kpis = {
  creadas: number; cerradas: number; bajas: number; nff: number;
  pct_bajas: number; pct_nff: number; pct_sla20: number; pct_sla30: number;
  dias_medio: number; abiertas_total: number; abiertas_30: number; abiertas_20: number;
  coste_sat_total: number; coste_sat_medio: number; balance: number;
};
type EvoRow = { mes: string; creadas: number; cerradas: number; pct_sla20: number; pct_bajas: number };
type Alertas = {
  caidas: Array<{ tecnico: string; n_now: number; n_prev: number }>;
  calidad: Array<{ tecnico: string; n: number; pct_bajas: number; pct_bajas_esp: number; pct_nff: number; pct_nff_esp: number }>;
  provincias: Array<{ provincia: string; abiertas_30: number }>;
};

type Tone = "ink" | "warn" | "ok" | "bad";
const toneBar = (t: Tone) => ({ ink: "bg-ink", warn: "bg-amber-500", ok: "bg-emerald-500", bad: "bg-red-500" }[t]);

const Card = ({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: Tone }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
    <div className={`h-[2px] w-8 mb-4 ${toneBar(tone)}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="font-display text-3xl tracking-tight text-ink tabular-nums mt-2">{value}</p>
    {hint && <p className="mt-1.5 text-[11px] text-ink/50">{hint}</p>}
  </div>
);

const Dashboard = () => {
  const { rpcParams, filters } = useOpsFilters();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [evo, setEvo] = useState<EvoRow[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [k, e, a] = await Promise.all([
        supabase.rpc("ops_kpis" as never, rpcParams as never),
        supabase.rpc("ops_evolucion" as never, {
          p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
          p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
          p_marca: rpcParams.p_marca,
          p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat,
          p_tecnico: rpcParams.p_tecnico, p_canal: rpcParams.p_canal,
        } as never),
        supabase.rpc("ops_alertas" as never, { p_from: filters.from, p_to: filters.to } as never),
      ]);
      setKpis((k.data ?? null) as Kpis | null);
      setEvo((e.data ?? []) as EvoRow[]);
      setAlertas((a.data ?? null) as Alertas | null);
      setLoading(false);
    })();
  }, [rpcParams, filters.from, filters.to]);

  if (loading || !kpis) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  const maxCer = Math.max(1, ...evo.map((e) => Math.max(e.creadas, e.cerradas)));
  const sla20Tone: Tone = kpis.pct_sla20 >= 0.8 ? "ok" : kpis.pct_sla20 >= 0.6 ? "warn" : "bad";
  const balanceTone: Tone = kpis.balance > 0 ? "warn" : "ok";

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cuadro de mando</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Panorama operativo</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Vista global de la actividad de la red HIPERSERVICE y SATs externos.
          Se excluye la incidencia &quot;ANULADO AVISO&quot; y las OTs anuladas de todos los indicadores.
        </p>
      </header>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Período · {filters.from} → {filters.to}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Avisos creados" value={fmtNum(kpis.creadas)} />
          <Card label="Cerradas" value={fmtNum(kpis.cerradas)} hint={`Balance: ${kpis.balance > 0 ? "+" : ""}${fmtNum(kpis.balance)}`} tone={balanceTone} />
          <Card label="SLA ≤20 días" value={fmtPct(kpis.pct_sla20)} tone={sla20Tone} />
          <Card label="SLA ≤30 días" value={fmtPct(kpis.pct_sla30)} />
          <Card label="% Bajas" value={fmtPct(kpis.pct_bajas)} hint={`${fmtNum(kpis.bajas)} irreparables`} />
          <Card label="% NFF" value={fmtPct(kpis.pct_nff)} hint={`${fmtNum(kpis.nff)} sin avería`} />
          <Card label="Días medios cierre" value={fmtDec(kpis.dias_medio, 1)} />
          <Card label="Abiertas +30 días" value={fmtNum(kpis.abiertas_30)} hint={`${fmtNum(kpis.abiertas_total)} abiertas totales`} tone={kpis.abiertas_30 > 0 ? "warn" : "ok"} />
          <Card label="Coste SAT total" value={fmtEur(kpis.coste_sat_total)} />
          <Card label="Coste medio / OT" value={fmtEur(kpis.coste_sat_medio)} />
        </div>
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Evolución últimos 18 meses</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="flex items-end gap-1.5 h-40">
            {evo.map((e) => (
              <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div className="flex-1 bg-ink/70 rounded-t-sm" style={{ height: `${(e.creadas / maxCer) * 100}%` }} title={`Creadas: ${e.creadas}`} />
                  <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / maxCer) * 100}%` }} title={`Cerradas: ${e.cerradas} · SLA20 ${fmtPct(e.pct_sla20)} · Bajas ${fmtPct(e.pct_bajas)}`} />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-ink/40">
                  {new Date(e.mes).toLocaleString("es-ES", { month: "short", year: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[11px] text-ink/60">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-ink/70 rounded-sm" /> Creadas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500 rounded-sm" /> Cerradas</span>
            <span className="ml-auto text-ink/40">Pasa el cursor por las barras para ver SLA y % bajas</span>
          </div>
        </div>
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Alertas automáticas</p>
        <div className="grid md:grid-cols-3 gap-3">
          <AlertBox title="Caída de cierres >40%" icon={TrendingDown} tone="bad" empty="Sin caídas relevantes">
            {alertas?.caidas.map((c) => (
              <li key={c.tecnico} className="text-sm">
                <span className="text-ink font-medium">{c.tecnico}</span>
                <span className="text-ink/50"> · {c.n_now} vs {c.n_prev} ({Math.round((1 - c.n_now / c.n_prev) * 100)}% ↓)</span>
              </li>
            ))}
          </AlertBox>
          <AlertBox title="Calidad sobre benchmark ×2" icon={Gauge} tone="warn" empty="Todo dentro del rango esperado">
            {alertas?.calidad.map((c) => (
              <li key={c.tecnico} className="text-sm">
                <span className="text-ink font-medium">{c.tecnico}</span>
                <span className="text-ink/50"> · bajas {fmtPct(c.pct_bajas)} (esp. {fmtPct(c.pct_bajas_esp)}) · NFF {fmtPct(c.pct_nff)} (esp. {fmtPct(c.pct_nff_esp)})</span>
              </li>
            ))}
          </AlertBox>
          <AlertBox title="Provincias envejecidas +30d" icon={MapPin} tone="warn" empty="Sin acumulación crítica">
            {alertas?.provincias.map((p) => (
              <li key={p.provincia} className="text-sm">
                <span className="text-ink font-medium">{p.provincia}</span>
                <span className="text-ink/50"> · {p.abiertas_30} abiertas</span>
              </li>
            ))}
          </AlertBox>
        </div>
        <p className="text-[11px] text-ink/40 mt-3 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Nunca sugerir reducción de incentivo sin revisar carga, territorio, ausencias y causas externas.
        </p>
      </section>
    </div>
  );
};

const AlertBox = ({ title, icon: Icon, tone, empty, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>; tone: Tone; empty: string; children?: React.ReactNode;
}) => {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center ${tone === "bad" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">{title}</p>
      </div>
      {hasContent ? <ul className="space-y-1.5">{children}</ul> : <p className="text-xs text-ink/40">{empty}</p>}
    </div>
  );
};

export default Dashboard;
