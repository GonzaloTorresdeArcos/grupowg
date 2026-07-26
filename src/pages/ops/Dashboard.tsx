import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOperationsData, computeKpis, type OtRow, type Kpis } from "@/lib/ops-queries";
import { Loader2, AlertTriangle, TrendingDown, MapPin, Gauge } from "lucide-react";

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(Math.round(n));

type Tone = "ink" | "warn" | "ok" | "bad";
const toneClass = (t: Tone) => ({
  ink: "bg-ink",
  warn: "bg-amber-500",
  ok: "bg-emerald-500",
  bad: "bg-red-500",
}[t]);

const Kpi = ({ label, value, hint, tone = "ink", delta }: {
  label: string; value: string; hint?: string; tone?: Tone; delta?: string;
}) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
    <div className={`h-[2px] w-8 mb-5 ${toneClass(tone)}`} />
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <div className="flex items-baseline gap-2 mt-2">
      <p className="font-display text-4xl tracking-tight text-ink tabular-nums">{value}</p>
      {delta && <p className={`text-xs tabular-nums ${delta.startsWith("+") ? "text-emerald-600" : delta.startsWith("−") || delta.startsWith("-") ? "text-red-600" : "text-ink/40"}`}>{delta}</p>}
    </div>
    {hint && <p className="mt-2 text-xs text-ink/50">{hint}</p>}
  </div>
);

type Bench = { familia: string; cliente_wg: string; pct_bajas: number | null; pct_nff: number | null };

type Alert = { kind: "tecnico" | "provincia" | "calidad"; icon: React.ComponentType<{ className?: string }>; title: string; detail: string; tone: Tone };

const Dashboard = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [bench, setBench] = useState<Bench[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ots, b] = await Promise.all([
          fetchOperationsData(),
          supabase.from("ops_benchmark").select("familia,cliente_wg,pct_bajas,pct_nff"),
        ]);
        setRows(ots);
        setBench((b.data ?? []) as Bench[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { current, previous, kpis, prevKpis, evolution, alerts } = useMemo(() => {
    // Mes actual y anterior según fecha de creación
    const now = new Date();
    const cMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    const monthKey = (d: string | null) => {
      if (!d) return -1;
      const dt = new Date(d);
      return dt.getUTCFullYear() * 12 + dt.getUTCMonth();
    };

    const curr = rows.filter((r) => monthKey(r.fecha_creacion) === cMonth);
    const prev = rows.filter((r) => monthKey(r.fecha_creacion) === cMonth - 1);

    // Evolución últimos 12 meses (por creación)
    const buckets = new Map<number, { creadas: number; cerradas: number }>();
    for (let i = 11; i >= 0; i--) buckets.set(cMonth - i, { creadas: 0, cerradas: 0 });
    for (const r of rows) {
      const k = monthKey(r.fecha_creacion);
      if (buckets.has(k)) buckets.get(k)!.creadas++;
      const kc = monthKey(r.fecha_cierre);
      if (buckets.has(kc)) buckets.get(kc)!.cerradas++;
    }
    const evo = Array.from(buckets.entries()).map(([k, v]) => {
      const year = Math.floor(k / 12), month = k % 12;
      const label = new Date(Date.UTC(year, month, 1)).toLocaleString("es-ES", { month: "short" });
      return { label, ...v };
    });

    const k = computeKpis(rows);
    const kPrev = computeKpis(prev);

    // Alertas
    const list: Alert[] = [];

    // 1) Técnicos con caída >40% de cierres vs mes anterior
    const byTecNow = new Map<string, number>();
    const byTecPrev = new Map<string, number>();
    for (const r of curr) if (r.situacion === "Cerrado" && r.tecnico) byTecNow.set(r.tecnico, (byTecNow.get(r.tecnico) ?? 0) + 1);
    for (const r of prev) if (r.situacion === "Cerrado" && r.tecnico) byTecPrev.set(r.tecnico, (byTecPrev.get(r.tecnico) ?? 0) + 1);
    for (const [tec, prevN] of byTecPrev) {
      const nowN = byTecNow.get(tec) ?? 0;
      if (prevN >= 10 && nowN / prevN < 0.6) {
        list.push({
          kind: "tecnico", icon: TrendingDown, tone: "bad",
          title: `${tec}: cierres −${Math.round((1 - nowN / prevN) * 100)}%`,
          detail: `${nowN} este mes vs. ${prevN} el mes anterior`,
        });
      }
    }

    // 2) Provincias con envejecimiento creciente (+30 días abiertas)
    const today = new Date();
    const diffDays = (a: string | null) => (a ? Math.floor((today.getTime() - new Date(a).getTime()) / 86400000) : 0);
    const abiertas30 = rows.filter((r) => r.situacion === "Abierto" && diffDays(r.fecha_creacion) > 30);
    const byProv = new Map<string, number>();
    for (const r of abiertas30) if (r.provincia) byProv.set(r.provincia, (byProv.get(r.provincia) ?? 0) + 1);
    Array.from(byProv.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([prov, n]) => {
      if (n >= 5) list.push({
        kind: "provincia", icon: MapPin, tone: n >= 15 ? "bad" : "warn",
        title: `${prov}: ${n} OTs abiertas +30d`,
        detail: "Cartera envejecida acumulada",
      });
    });

    // 3) Técnicos con bajas/NFF muy sobre benchmark de su mix
    const benchMap = new Map<string, Bench>();
    for (const b of bench) benchMap.set(`${b.familia}‖${b.cliente_wg}`, b);
    const byTec = new Map<string, OtRow[]>();
    for (const r of rows) if (r.tecnico) {
      const arr = byTec.get(r.tecnico) ?? []; arr.push(r); byTec.set(r.tecnico, arr);
    }
    for (const [tec, list2] of byTec) {
      if (list2.length < 30) continue;
      const bajas = list2.filter((r) => r.es_baja).length / list2.length;
      const nff = list2.filter((r) => r.es_nff).length / list2.length;
      // esperado = media ponderada del benchmark de su mix
      let wSum = 0, expBajas = 0, expNff = 0;
      const mix = new Map<string, number>();
      for (const r of list2) {
        const k2 = `${r.familia ?? ""}‖${r.cliente_wg ?? ""}`;
        mix.set(k2, (mix.get(k2) ?? 0) + 1);
      }
      for (const [k2, w] of mix) {
        const b = benchMap.get(k2);
        if (!b) continue;
        wSum += w;
        expBajas += (Number(b.pct_bajas ?? 0) / 100) * w;
        expNff += (Number(b.pct_nff ?? 0) / 100) * w;
      }
      if (wSum > 0) {
        expBajas /= wSum; expNff /= wSum;
        const deltaB = bajas - expBajas;
        const deltaN = nff - expNff;
        if (deltaB > 0.1) list.push({
          kind: "calidad", icon: Gauge, tone: "warn",
          title: `${tec}: bajas ${(bajas * 100).toFixed(0)}% (esperado ${(expBajas * 100).toFixed(0)}%)`,
          detail: `+${(deltaB * 100).toFixed(0)} p.p. sobre benchmark de su mix`,
        });
        if (deltaN > 0.1) list.push({
          kind: "calidad", icon: Gauge, tone: "warn",
          title: `${tec}: NFF ${(nff * 100).toFixed(0)}% (esperado ${(expNff * 100).toFixed(0)}%)`,
          detail: `+${(deltaN * 100).toFixed(0)} p.p. sobre benchmark de su mix`,
        });
      }
    }

    return { current: curr, previous: prev, kpis: k, prevKpis: kPrev, evolution: evo, alerts: list.slice(0, 8) };
  }, [rows, bench]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const hasData = rows.length > 0;
  const delta = (now: number, prev: number) => {
    if (prev === 0) return "";
    const d = ((now - prev) / prev) * 100;
    const sign = d > 0 ? "+" : d < 0 ? "−" : "";
    return `${sign}${Math.abs(d).toFixed(0)}% vs mes ant.`;
  };
  const maxEvo = Math.max(1, ...evolution.flatMap((e) => [e.creadas, e.cerradas]));

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
            Importa el CSV mensual desde <a href="/operaciones/importar" className="underline">Importar CSV</a> para empezar.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs mes actual con delta vs mes anterior */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
              Mes en curso · {current.length.toLocaleString("es-ES")} OTs
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Avisos nuevos" value={fmtNum(current.length)} delta={delta(current.length, previous.length)} />
              <Kpi
                label="Cerrados"
                value={fmtNum(computeKpis(current).cerradas)}
                delta={delta(computeKpis(current).cerradas, computeKpis(previous).cerradas)}
              />
              <Kpi
                label="SLA ≤20 días"
                value={fmtPct(computeKpis(current).sla20)}
                tone={computeKpis(current).sla20 >= 0.8 ? "ok" : computeKpis(current).sla20 >= 0.6 ? "warn" : "bad"}
              />
              <Kpi
                label="Balance"
                value={fmtNum(current.length - computeKpis(current).cerradas)}
                hint="Nuevas − cerradas del mes"
                tone={current.length - computeKpis(current).cerradas > 0 ? "warn" : "ok"}
              />
            </div>
          </section>

          {/* KPIs globales */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Global · toda la cartera</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="OTs totales" value={fmtNum(kpis.totalOts)} />
              <Kpi label="Abiertas" value={fmtNum(kpis.abiertas)} hint={`${kpis.envejecidas30} envejecidas +30d`} tone={kpis.envejecidas30 > 0 ? "warn" : "ink"} />
              <Kpi label="% Bajas" value={fmtPct(kpis.bajas / Math.max(1, kpis.totalOts))} hint={`${fmtNum(kpis.bajas)} irreparables`} />
              <Kpi label="% NFF" value={fmtPct(kpis.nff / Math.max(1, kpis.totalOts))} hint={`${fmtNum(kpis.nff)} sin avería`} />
            </div>
          </section>

          {/* Evolución mensual */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Evolución últimos 12 meses</p>
            <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
              <div className="flex items-end gap-2 h-40">
                {evolution.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-32">
                      <div className="flex-1 bg-ink rounded-t-sm" style={{ height: `${(e.creadas / maxEvo) * 100}%` }} title={`Creadas: ${e.creadas}`} />
                      <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / maxEvo) * 100}%` }} title={`Cerradas: ${e.cerradas}`} />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-ink/40">{e.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[11px] text-ink/60">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-ink rounded-sm" /> Creadas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500 rounded-sm" /> Cerradas</span>
              </div>
            </div>
          </section>

          {/* Alertas automáticas */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Alertas automáticas</p>
            {alerts.length === 0 ? (
              <div className="border border-black/[0.06] rounded-2xl bg-white p-6 text-sm text-ink/50">
                Sin alertas críticas. Todo dentro de rangos esperados.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="border border-black/[0.06] rounded-xl bg-white p-4 flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.tone === "bad" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="text-xs text-ink/50 mt-0.5">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink/40 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Nunca sugerir reducción de incentivo sin revisar carga, territorio, ausencias y causas externas.
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
