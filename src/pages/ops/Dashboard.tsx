import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtEur, fmtDec } from "@/lib/ops-filters";
import {
  computePrevPeriod,
  labelComparativa,
  variacion,
  ratioBajas,
  estadoDelegacion,
  estadoTecnico,
  indicadorProvisionalIncentivo,
  generarConclusiones,
  ordenEstadoTecnico,
  type EstadoNivel,
  type IndicadorIncentivo,
  type Conclusion,
} from "@/lib/ops-performance";
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  MapPin,
  Gauge,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
} from "lucide-react";

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
type DelegKpi = {
  delegacion: string; cerradas: number; pct_sla20: number; dias_medio: number;
  pct_bajas: number; pct_nff: number; tecnicos: number; abiertas: number; abiertas_30: number;
};
type DelegPayload = { kpis: DelegKpi[] };
type ScoreRow = {
  tecnico: string; delegacion: string; grupo: string;
  cerradas: number; cerradas_prev: number; delta_pct: number | null;
  pct_bajas: number; pct_bajas_esp: number;
};

// ---------------- primitives ----------------
type Tone = "ink" | "warn" | "ok" | "bad";
const toneBar = (t: Tone) =>
  ({ ink: "bg-ink", warn: "bg-amber-500", ok: "bg-emerald-500", bad: "bg-red-500" }[t]);
const estadoBadge: Record<EstadoNivel, { dot: string; label: string; text: string }> = {
  ok: { dot: "bg-emerald-500", label: "OK", text: "text-emerald-700" },
  atencion: { dot: "bg-amber-500", label: "Atención", text: "text-amber-700" },
  critico: { dot: "bg-red-500", label: "Crítico", text: "text-red-700" },
};

const DeltaPill = ({
  v,
  favorable,
  format = "pct",
}: {
  v: number | null;
  favorable: "up" | "down"; // dirección buena
  format?: "pct" | "abs";
}) => {
  if (v == null) return <span className="text-ink/30 text-xs tabular-nums">—</span>;
  const positive = v > 0;
  const good = (positive && favorable === "up") || (!positive && favorable === "down");
  const neutral = Math.abs(v) < (format === "pct" ? 0.005 : 0.5);
  const cls = neutral
    ? "text-ink/50 bg-black/[0.03]"
    : good
      ? "text-emerald-700 bg-emerald-50"
      : "text-red-700 bg-red-50";
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const label = format === "pct" ? `${positive ? "+" : ""}${(v * 100).toFixed(1)}%` : `${positive ? "+" : ""}${fmtNum(v)}`;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

const Card = ({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: Tone }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
    <div className={`h-[2px] w-8 mb-4 ${toneBar(tone)}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="font-display text-3xl tracking-tight text-ink tabular-nums mt-2">{value}</p>
    {hint && <p className="mt-1.5 text-[11px] text-ink/50">{hint}</p>}
  </div>
);

const ExecCard = ({
  label,
  actual,
  previo,
  delta,
  favorable,
  extraWarn,
  hint,
}: {
  label: string;
  actual: string;
  previo: string;
  delta: number | null;
  favorable: "up" | "down";
  extraWarn?: string;
  hint?: string;
}) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <div className="flex items-baseline gap-2 mt-2">
      <p className="font-display text-3xl tracking-tight text-ink tabular-nums">{actual}</p>
      <DeltaPill v={delta} favorable={favorable} />
    </div>
    <p className="mt-1 text-[11px] text-ink/50">Anterior: <span className="tabular-nums">{previo}</span></p>
    {hint && <p className="mt-1 text-[11px] text-ink/50">{hint}</p>}
    {extraWarn && (
      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        {extraWarn}
      </p>
    )}
  </div>
);

// ---------------- main ----------------
const Dashboard = () => {
  const { rpcParams, filters } = useOpsFilters();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [kpisPrev, setKpisPrev] = useState<Kpis | null>(null);
  const [evo, setEvo] = useState<EvoRow[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [dele, setDele] = useState<DelegKpi[]>([]);
  const [delePrev, setDelePrev] = useState<DelegKpi[]>([]);
  const [score, setScore] = useState<ScoreRow[]>([]);
  const [scorePrev, setScorePrev] = useState<ScoreRow[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(true);
  const [showDefs, setShowDefs] = useState(false);

  const prev = useMemo(() => computePrevPeriod(filters.from, filters.to), [filters.from, filters.to]);
  const labelComp = useMemo(() => labelComparativa(filters.from, filters.to), [filters.from, filters.to]);

  useEffect(() => {
    setLoading(true);
    const filtroSecundarios = {
      p_delegacion: rpcParams.p_delegacion,
      p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama,
      p_familia: rpcParams.p_familia,
      p_marca: rpcParams.p_marca,
      p_provincia: rpcParams.p_provincia,
      p_sat: rpcParams.p_sat,
      p_tecnico: rpcParams.p_tecnico,
      p_canal: rpcParams.p_canal,
    };
    const prevParams = { ...rpcParams, p_from: prev.from, p_to: prev.to };
    const delegParams = {
      p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      p_cliente: rpcParams.p_cliente, p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia,
    };
    const delegPrevParams = { ...delegParams, p_from: prev.from, p_to: prev.to };
    const scoreParams = {
      p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia, p_marca: rpcParams.p_marca,
      p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat, p_canal: rpcParams.p_canal,
    };
    const scorePrevParams = { ...scoreParams, p_from: prev.from, p_to: prev.to };

    (async () => {
      const [k, kp, e, a, d, dp, s, sp, lu] = await Promise.all([
        supabase.rpc("ops_kpis" as never, rpcParams as never),
        supabase.rpc("ops_kpis" as never, prevParams as never),
        supabase.rpc("ops_evolucion" as never, filtroSecundarios as never),
        supabase.rpc("ops_alertas" as never, { p_from: filters.from, p_to: filters.to } as never),
        supabase.rpc("ops_delegaciones" as never, delegParams as never),
        supabase.rpc("ops_delegaciones" as never, delegPrevParams as never),
        supabase.rpc("ops_tecnicos_scorecard" as never, scoreParams as never),
        supabase.rpc("ops_tecnicos_scorecard" as never, scorePrevParams as never),
        supabase.from("ops_fact_ot").select("fecha_creacion").order("fecha_creacion", { ascending: false }).limit(1),
      ]);
      setKpis((k.data ?? null) as Kpis | null);
      setKpisPrev((kp.data ?? null) as Kpis | null);
      setEvo((e.data ?? []) as EvoRow[]);
      setAlertas((a.data ?? null) as Alertas | null);
      setDele(((d.data as DelegPayload | null)?.kpis ?? []) as DelegKpi[]);
      setDelePrev(((dp.data as DelegPayload | null)?.kpis ?? []) as DelegKpi[]);
      setScore((s.data ?? []) as ScoreRow[]);
      setScorePrev((sp.data ?? []) as ScoreRow[]);
      const row = (lu.data ?? [])[0] as { fecha_creacion?: string } | undefined;
      setLastUpdate(row?.fecha_creacion ?? null);
      setLoading(false);
    })();
  }, [rpcParams, filters.from, filters.to, prev.from, prev.to]);

  if (loading || !kpis) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  // -------- resumen ejecutivo --------
  const vCerradas = variacion(kpis.cerradas, kpisPrev?.cerradas ?? null);
  const vBajas = variacion(kpis.bajas, kpisPrev?.bajas ?? null);
  const ratioAct = ratioBajas(kpis.bajas, kpis.cerradas);
  const ratioPre = ratioBajas(kpisPrev?.bajas ?? null, kpisPrev?.cerradas ?? null);
  const vRatio = variacion(ratioAct, ratioPre);
  const cerradasSubenBajasSuben =
    (vCerradas.pct ?? 0) > 0 && (vBajas.pct ?? 0) > 0 && (vBajas.pct ?? 0) - (vCerradas.pct ?? 0) > 0.1;

  // -------- comparativa delegaciones --------
  const prevByDeleg = new Map(delePrev.map((d) => [d.delegacion, d] as const));
  const mediaGlobalBajas = ratioAct;
  const delegRows = dele
    .map((d) => {
      const p = prevByDeleg.get(d.delegacion) ?? null;
      const est = estadoDelegacion(
        { delegacion: d.delegacion, cerradas: d.cerradas, pct_bajas: d.pct_bajas },
        p ? { delegacion: p.delegacion, cerradas: p.cerradas, pct_bajas: p.pct_bajas } : null,
        mediaGlobalBajas,
      );
      const vC = variacion(d.cerradas, p?.cerradas ?? null);
      const bajasA = Math.round(d.pct_bajas * d.cerradas);
      const bajasP = p ? Math.round(p.pct_bajas * p.cerradas) : null;
      const vB = variacion(bajasA, bajasP);
      return { d, p, est, vC, vB, bajasA, bajasP };
    })
    .sort((a, b) => {
      const ord: Record<EstadoNivel, number> = { critico: 0, atencion: 1, ok: 2 };
      const diff = ord[a.est.estado] - ord[b.est.estado];
      if (diff !== 0) return diff;
      return b.d.cerradas - a.d.cerradas;
    });

  // -------- conclusiones --------
  const prevByTec = new Map(scorePrev.map((r) => [r.tecnico, r] as const));
  const mediaByDeleg = new Map<string, number>();
  {
    const acc = new Map<string, { b: number; c: number }>();
    for (const r of score) {
      const cur = acc.get(r.delegacion) ?? { b: 0, c: 0 };
      cur.b += r.pct_bajas * r.cerradas;
      cur.c += r.cerradas;
      acc.set(r.delegacion, cur);
    }
    for (const [k2, v] of acc) mediaByDeleg.set(k2, v.c > 0 ? v.b / v.c : 0);
  }
  const conclusiones: Conclusion[] = generarConclusiones(
    dele.map((d) => ({
      actual: { delegacion: d.delegacion, cerradas: d.cerradas, pct_bajas: d.pct_bajas },
      previo: (() => {
        const p = prevByDeleg.get(d.delegacion);
        return p ? { delegacion: p.delegacion, cerradas: p.cerradas, pct_bajas: p.pct_bajas } : null;
      })(),
    })),
    score.map((r) => ({
      actual: {
        tecnico: r.tecnico, delegacion: r.delegacion, cerradas: r.cerradas,
        pct_bajas: r.pct_bajas, pct_bajas_esp: r.pct_bajas_esp,
      },
      previo: (() => {
        const p = prevByTec.get(r.tecnico);
        return p ? {
          tecnico: p.tecnico, delegacion: p.delegacion, cerradas: p.cerradas,
          pct_bajas: p.pct_bajas, pct_bajas_esp: p.pct_bajas_esp,
        } : null;
      })(),
      mediaDelegacionBajas: mediaByDeleg.get(r.delegacion) ?? null,
    })),
  );

  // -------- indicador incentivo --------
  const buckets: Record<IndicadorIncentivo, ScoreRow[]> = {
    reconocimiento_potencial: [],
    revision_estandar: [],
    requiere_validacion: [],
    informacion_insuficiente: [],
  };
  for (const r of score) {
    const est = estadoTecnico(
      { tecnico: r.tecnico, delegacion: r.delegacion, cerradas: r.cerradas, pct_bajas: r.pct_bajas, pct_bajas_esp: r.pct_bajas_esp, cerradas_prev: prevByTec.get(r.tecnico)?.cerradas ?? null },
      prevByTec.get(r.tecnico) ? {
        tecnico: r.tecnico, delegacion: r.delegacion,
        cerradas: prevByTec.get(r.tecnico)!.cerradas,
        pct_bajas: prevByTec.get(r.tecnico)!.pct_bajas,
        pct_bajas_esp: prevByTec.get(r.tecnico)!.pct_bajas_esp,
      } : null,
      mediaByDeleg.get(r.delegacion) ?? null,
    );
    buckets[indicadorProvisionalIncentivo(est)].push(r);
  }

  const maxCer = Math.max(1, ...evo.map((e) => Math.max(e.creadas, e.cerradas)));
  const maxBaj = Math.max(0.01, ...evo.map((e) => e.pct_bajas ?? 0));

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cuadro de mando</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Panorama operativo</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Vista global de la red HIPERSERVICE y SATs externos. Se excluyen &quot;ANULADO AVISO&quot; y OTs anuladas.
          Comparativa con el período inmediatamente anterior de igual longitud.
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-ink/50 font-semibold">
          Período comparado · {labelComp}
        </p>
      </header>

      {/* (b) Resumen ejecutivo */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Resumen ejecutivo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <ExecCard
            label="Cerradas"
            actual={fmtNum(kpis.cerradas)}
            previo={fmtNum(kpisPrev?.cerradas ?? null)}
            delta={vCerradas.pct}
            favorable="up"
            extraWarn={cerradasSubenBajasSuben ? "Cierres suben, pero bajas suben desproporcionadamente." : undefined}
          />
          <ExecCard
            label="Bajas"
            actual={fmtNum(kpis.bajas)}
            previo={fmtNum(kpisPrev?.bajas ?? null)}
            delta={vBajas.pct}
            favorable="down"
          />
          <ExecCard
            label="Bajas / Cerradas"
            actual={fmtPct(ratioAct)}
            previo={fmtPct(ratioPre)}
            delta={vRatio.pct}
            favorable="down"
            hint="Ratio calculado sobre cerradas del período (incluye Baja como cierre)."
          />
          <ExecCard
            label="Δ Cerradas"
            actual={vCerradas.abs == null ? "—" : `${vCerradas.abs > 0 ? "+" : ""}${fmtNum(vCerradas.abs)}`}
            previo={fmtNum(kpisPrev?.cerradas ?? null)}
            delta={vCerradas.pct}
            favorable="up"
          />
          <ExecCard
            label="Δ Bajas"
            actual={vBajas.abs == null ? "—" : `${vBajas.abs > 0 ? "+" : ""}${fmtNum(vBajas.abs)}`}
            previo={fmtNum(kpisPrev?.bajas ?? null)}
            delta={vBajas.pct}
            favorable="down"
          />
        </div>
      </section>

      {/* (c) Fila secundaria compacta colapsable */}
      <section>
        <button
          onClick={() => setShowSecondary((s) => !s)}
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors mb-3"
        >
          {showSecondary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Indicadores adicionales
        </button>
        {showSecondary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="SLA ≤20 días" value={fmtPct(kpis.pct_sla20)}
              tone={kpis.pct_sla20 >= 0.8 ? "ok" : kpis.pct_sla20 >= 0.6 ? "warn" : "bad"} />
            <Card label="SLA ≤30 días" value={fmtPct(kpis.pct_sla30)} />
            <Card label="% NFF" value={fmtPct(kpis.pct_nff)} hint={`${fmtNum(kpis.nff)} sin avería`} />
            <Card label="Días medios cierre" value={fmtDec(kpis.dias_medio, 1)} />
            <Card label="Avisos creados" value={fmtNum(kpis.creadas)} hint={`Balance ${kpis.balance > 0 ? "+" : ""}${fmtNum(kpis.balance)}`} />
            <Card label="Abiertas +30 días" value={fmtNum(kpis.abiertas_30)}
              hint={`${fmtNum(kpis.abiertas_total)} abiertas totales`}
              tone={kpis.abiertas_30 > 0 ? "warn" : "ok"} />
            <Card label="Coste SAT total" value={fmtEur(kpis.coste_sat_total)} />
            <Card label="Coste medio / OT" value={fmtEur(kpis.coste_sat_medio)} />
          </div>
        )}
      </section>

      {/* (d) Comparativa de delegaciones */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Comparativa de delegaciones</p>
          <span className="text-[10px] text-ink/40 italic" title="CRÍTICO: caída >25% con bajas empeorando o ratio bajas > 1,5× media global. ATENCIÓN: caída >15%, bajas > media global y empeorando, o cierres suben pero bajas suben desproporcionadamente. OK: resto.">
            Modelo de estado provisional (?)
          </span>
        </div>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06] sticky top-0 bg-white">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Delegación</th>
                <th className="text-right px-3 py-2.5 font-semibold">Cerradas</th>
                <th className="text-right px-3 py-2.5 font-semibold">Anterior</th>
                <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
                <th className="text-right px-3 py-2.5 font-semibold">Bajas</th>
                <th className="text-right px-3 py-2.5 font-semibold">Anterior</th>
                <th className="text-right px-3 py-2.5 font-semibold">Δ</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Bajas / cerradas del período">Bajas / Cerradas</th>
                <th className="text-left px-3 py-2.5 font-semibold">Estado</th>
                <th className="text-left px-3 py-2.5 font-semibold">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {delegRows.map(({ d, p, est, vC, vB, bajasA, bajasP }) => (
                <tr key={d.delegacion}>
                  <td className="px-4 py-2.5 text-ink font-medium">{d.delegacion}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(d.cerradas)}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-ink/50">{fmtNum(p?.cerradas ?? null)}</td>
                  <td className="text-right px-3 py-2.5"><DeltaPill v={vC.pct} favorable="up" /></td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtNum(bajasA)}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-ink/50">{fmtNum(bajasP)}</td>
                  <td className="text-right px-3 py-2.5"><DeltaPill v={vB.pct} favorable="down" /></td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(d.pct_bajas)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${estadoBadge[est.estado].text}`}>
                      <span className={`h-2 w-2 rounded-full ${estadoBadge[est.estado].dot}`} />
                      {estadoBadge[est.estado].label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-ink/60 max-w-[380px]">
                    {est.razones.length ? est.razones.join(" ") : "Sin señales relevantes."}
                  </td>
                </tr>
              ))}
              {delegRows.length === 0 && (
                <tr><td colSpan={10} className="text-center px-4 py-8 text-ink/40 text-sm">Sin delegaciones en el período con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* (e) Evolución + %bajas */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Evolución últimos 18 meses</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="flex items-end gap-1.5 h-40">
            {evo.map((e) => (
              <div key={e.mes} className="flex-1 flex flex-col items-center gap-1 relative">
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div className="flex-1 bg-ink/70 rounded-t-sm" style={{ height: `${(e.creadas / maxCer) * 100}%` }} title={`Creadas: ${e.creadas}`} />
                  <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / maxCer) * 100}%` }} title={`Cerradas: ${e.cerradas} · SLA20 ${fmtPct(e.pct_sla20)}`} />
                </div>
                <div
                  className="absolute h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"
                  style={{ bottom: `${8 + ((e.pct_bajas ?? 0) / maxBaj) * 120}px`, left: "50%", transform: "translateX(-50%)" }}
                  title={`% Bajas: ${fmtPct(e.pct_bajas)}`}
                />
                <span className="text-[9px] uppercase tracking-wider text-ink/40">
                  {new Date(e.mes).toLocaleString("es-ES", { month: "short", year: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[11px] text-ink/60 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-ink/70 rounded-sm" /> Creadas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500 rounded-sm" /> Cerradas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-red-500 rounded-full" /> % Bajas</span>
            <span className="ml-auto text-ink/40">Pasa el cursor por las series para el detalle.</span>
          </div>
        </div>
      </section>

      {/* (f) Conclusiones + alertas */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Conclusiones operativas</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
          {conclusiones.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/40">Sin hallazgos deterministas con los datos y filtros actuales.</p>
          )}
          {conclusiones.map((c) => (
            <div key={c.titulo} className="px-5 py-4">
              <p className="text-sm font-medium text-ink">{c.titulo}</p>
              <p className="text-[13px] text-ink/70 mt-1">{c.detalle}</p>
              <p className="text-[11px] text-ink/40 mt-1">Alcance: {c.alcance}</p>
              {c.faltan && (
                <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {c.faltan}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mt-6 mb-3">Alertas automáticas</p>
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

      {/* (g) Indicador provisional para incentivos */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Indicador provisional para incentivos</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
          <p className="font-display text-lg text-ink">Indicador provisional de producción y calidad</p>
          <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
            Este indicador se basa únicamente en los datos de producción y bajas actualmente disponibles.
            No debe utilizarse como base única para decisiones de nómina o incentivos definitivos.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <BucketBox title="Reconocimiento potencial" tone="ok" rows={buckets.reconocimiento_potencial} />
            <BucketBox title="Revisión estándar" tone="ink" rows={buckets.revision_estandar} />
            <BucketBox title="Requiere validación" tone="warn" rows={buckets.requiere_validacion} />
            <BucketBox title="Información insuficiente" tone="ink" rows={buckets.informacion_insuficiente} muted />
          </div>
          <div className="mt-5 pt-5 border-t border-black/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Datos adicionales necesarios para el modelo definitivo</p>
            <ul className="text-[12px] text-ink/60 grid sm:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4">
              <li>Trabajos asignados</li>
              <li>Días y horas efectivas</li>
              <li>Vacaciones y bajas laborales</li>
              <li>First Time Fix</li>
              <li>Reincidencias</li>
              <li>Cumplimiento SLA</li>
              <li>Reclamaciones y satisfacción</li>
              <li>Complejidad de producto</li>
              <li>Desplazamientos</li>
              <li>Casos demorados por causas ajenas</li>
              <li>Disponibilidad y consumo de repuestos</li>
            </ul>
          </div>
        </div>
      </section>

      {/* (h) Definiciones */}
      <section>
        <button
          onClick={() => setShowDefs((s) => !s)}
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors mb-3"
        >
          {showDefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Definición de métricas y limitaciones
        </button>
        {showDefs && (
          <div className="border border-black/[0.06] rounded-2xl bg-white p-5 text-[13px] text-ink/70 space-y-3">
            <p><strong className="text-ink">Cerradas</strong>: OTs con situación &quot;Cerrado&quot; o &quot;Baja&quot; y fecha de cierre dentro del período. Se excluye siempre &quot;ANULADO AVISO&quot; y las OTs anuladas.</p>
            <p><strong className="text-ink">Bajas</strong>: OTs con situación &quot;Baja&quot; (aparato irreparable). En este sistema una baja ES un cierre.</p>
            <p><strong className="text-ink">Bajas / Cerradas</strong>: bajas del período ÷ cerradas del período.</p>
            <p><strong className="text-ink">Período comparado</strong>: {labelComp}. Cuando el período activo es un mes natural, la comparación es contra el mes natural anterior; en cualquier otro caso, contra los mismos días inmediatamente anteriores.</p>
            <p><strong className="text-ink">Última actualización de datos</strong>: {lastUpdate ? new Date(lastUpdate).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—"} (max. fecha de creación en ops_fact_ot).</p>
            <p><strong className="text-ink">Variables aún no disponibles</strong>: días trabajados, ausencias, First Time Fix, reincidencias, satisfacción, reclamaciones, complejidad de producto, disponibilidad de repuestos.</p>
            <p className="text-ink/50 italic">Todos los valores mostrados provienen de datos reales importados (ops_fact_ot). No hay datos simulados.</p>
          </div>
        )}
      </section>
    </div>
  );
};

// -----------------------------------------------------------------------------
const BucketBox = ({
  title,
  tone,
  rows,
  muted,
}: {
  title: string;
  tone: Tone;
  rows: ScoreRow[];
  muted?: boolean;
}) => (
  <div className={`border rounded-xl p-4 ${muted ? "border-black/[0.05] bg-black/[0.01]" : "border-black/[0.06] bg-white"}`}>
    <div className={`h-[2px] w-6 mb-2 ${toneBar(tone)}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{title}</p>
    <p className="font-display text-2xl tabular-nums text-ink mt-1">{rows.length}</p>
    {rows.length > 0 && (
      <ul className="mt-2 space-y-0.5 text-[11px] text-ink/60 max-h-32 overflow-y-auto">
        {rows
          .slice()
          .sort((a, b) => b.cerradas - a.cerradas)
          .slice(0, 8)
          .map((r) => (
            <li key={r.tecnico} className="flex justify-between gap-2">
              <span className="truncate">{r.tecnico}</span>
              <span className="tabular-nums text-ink/40">{fmtNum(r.cerradas)}</span>
            </li>
          ))}
        {rows.length > 8 && <li className="text-ink/30">+{rows.length - 8} más</li>}
      </ul>
    )}
  </div>
);

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

// suprimir warning por importar ordenEstadoTecnico solo para exponerlo al Tecnicos.tsx
void ordenEstadoTecnico;

export default Dashboard;
