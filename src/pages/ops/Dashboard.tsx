import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtEur, fmtDec } from "@/lib/ops-filters";
import {
  prevPeriod,
  variacion,
  ratioBajas,
  labelComparativa,
  generarConclusiones,
  type Conclusion,
  type EquipoRow,
  type KpisMin,
  type TecnicoConclInput,
  UMBRAL_ALERTA_CAIDA,
} from "@/lib/ops-performance";

import { DelegacionesResumen } from "@/components/ops/DelegacionesResumen";
import {
  Loader2, AlertTriangle, TrendingDown, MapPin, Gauge,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp, Info,
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
type ScoreRow = {
  tecnico: string; delegacion: string; grupo: string; activo: boolean;
  cerradas: number; cerradas_prev: number; delta_pct: number | null;
  pct_bajas: number; pct_bajas_esp: number;
};

// ---------------- primitives ----------------
type Tone = "ok" | "warn" | "bad" | "ink";
const toneClass: Record<Tone, string> = {
  ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500", ink: "bg-ink",
};

const DeltaPill = ({
  v, favorable, format = "pct",
}: {
  v: number | null; favorable: "up" | "down"; format?: "pct" | "abs";
}) => {
  if (v == null) return <span className="text-ink/30 text-xs tabular-nums">—</span>;
  const positive = v > 0;
  const neutral = Math.abs(v) < (format === "pct" ? 0.005 : 0.5);
  const good = (positive && favorable === "up") || (!positive && favorable === "down");
  const cls = neutral ? "text-ink/50 bg-black/[0.03]" : good ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50";
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const label = format === "pct"
    ? `${positive ? "+" : ""}${(v * 100).toFixed(1)}%`
    : `${positive ? "+" : ""}${fmtNum(v)}`;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

const ExecCard = ({
  label, actual, previo, delta, favorable, tone, warn,
}: {
  label: string; actual: string; previo: string; delta: number | null;
  favorable: "up" | "down"; tone?: Tone; warn?: string;
}) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
    <div className={`h-[2px] w-8 mb-4 ${toneClass[tone ?? "ink"]}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <div className="flex items-baseline gap-2 mt-2">
      <p className="font-display text-3xl tracking-tight text-ink tabular-nums">{actual}</p>
      <DeltaPill v={delta} favorable={favorable} />
    </div>
    <p className="mt-1 text-[11px] text-ink/50">Anterior: <span className="tabular-nums">{previo}</span></p>
    {warn && (
      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        {warn}
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
  const [equiposNow, setEquiposNow] = useState<EquipoRow[]>([]);
  const [equiposPrev, setEquiposPrev] = useState<EquipoRow[]>([]);
  const [score, setScore] = useState<ScoreRow[]>([]);
  const [scorePrev, setScorePrev] = useState<ScoreRow[]>([]);
  const [showComp, setShowComp] = useState(false);
  const [showDefs, setShowDefs] = useState(false);
  const [showPend, setShowPend] = useState(false);

  useEffect(() => {
    setLoading(true);
    const prev = prevPeriod(filters.from, filters.to);
    const filtroSecundarios = {
      p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia, p_marca: rpcParams.p_marca,
      p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat,
      p_tecnico: rpcParams.p_tecnico, p_canal: rpcParams.p_canal,
    };
    const prevRpc = { ...rpcParams, p_from: prev.from, p_to: prev.to };
    const equipParams = {
      p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      p_cliente: rpcParams.p_cliente, p_familia: rpcParams.p_familia,
    };
    const equipPrev = { ...equipParams, p_from: prev.from, p_to: prev.to };
    const scoreParams = {
      p_from: rpcParams.p_from, p_to: rpcParams.p_to,
      p_delegacion: rpcParams.p_delegacion, p_cliente: rpcParams.p_cliente,
      p_gama: rpcParams.p_gama, p_familia: rpcParams.p_familia, p_marca: rpcParams.p_marca,
      p_provincia: rpcParams.p_provincia, p_sat: rpcParams.p_sat, p_canal: rpcParams.p_canal,
    };
    const scorePrevParams = { ...scoreParams, p_from: prev.from, p_to: prev.to };

    (async () => {
      const [k, kp, e, a, eq, eqp, s, sp] = await Promise.all([
        supabase.rpc("ops_kpis" as never, rpcParams as never),
        supabase.rpc("ops_kpis" as never, prevRpc as never),
        supabase.rpc("ops_evolucion" as never, filtroSecundarios as never),
        supabase.rpc("ops_alertas" as never, { p_from: filters.from, p_to: filters.to } as never),
        supabase.rpc("ops_equipos" as never, equipParams as never),
        supabase.rpc("ops_equipos" as never, equipPrev as never),
        supabase.rpc("ops_tecnicos_scorecard" as never, scoreParams as never),
        supabase.rpc("ops_tecnicos_scorecard" as never, scorePrevParams as never),
      ]);
      setKpis((k.data ?? null) as Kpis | null);
      setKpisPrev((kp.data ?? null) as Kpis | null);
      setEvo((e.data ?? []) as EvoRow[]);
      setAlertas((a.data ?? null) as Alertas | null);
      setEquiposNow((eq.data ?? []) as EquipoRow[]);
      setEquiposPrev((eqp.data ?? []) as EquipoRow[]);
      setScore((s.data ?? []) as ScoreRow[]);
      setScorePrev((sp.data ?? []) as ScoreRow[]);
      setLoading(false);
    })();
  }, [rpcParams, filters.from, filters.to]);

  if (loading || !kpis) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  // Resumen ejecutivo
  const vCer = variacion(kpis.cerradas, kpisPrev?.cerradas ?? null);
  const vBaj = variacion(kpis.bajas, kpisPrev?.bajas ?? null);
  const ratioAct = ratioBajas(kpis.bajas, kpis.cerradas);
  const ratioPre = ratioBajas(kpisPrev?.bajas ?? null, kpisPrev?.cerradas ?? null);
  const vRatio = variacion(ratioAct, ratioPre);
  const vSla = variacion(kpis.pct_sla20, kpisPrev?.pct_sla20 ?? null);
  const vAb30 = variacion(kpis.abiertas_30, kpisPrev?.abiertas_30 ?? null);
  const cerradasSubenBajasSuben =
    (vCer.pct ?? 0) > 0 && (vBaj.pct ?? 0) > 0 && (vBaj.pct ?? 0) - (vCer.pct ?? 0) > 0.1;

  // Conclusiones (usa scorecard actual + previo)
  const prevByTec = new Map(scorePrev.map((r) => [r.tecnico, r] as const));
  const mediaByDeleg = new Map<string, number>();
  {
    const acc = new Map<string, { b: number; c: number }>();
    for (const r of score.filter((x) => x.activo)) {
      const cur = acc.get(r.delegacion) ?? { b: 0, c: 0 };
      cur.b += r.pct_bajas * r.cerradas;
      cur.c += r.cerradas;
      acc.set(r.delegacion, cur);
    }
    for (const [k, v] of acc) mediaByDeleg.set(k, v.c > 0 ? v.b / v.c : 0);
  }
  const tecnicosConcl: TecnicoConclInput[] = score.filter((r) => r.activo).map((r) => {
    const p = prevByTec.get(r.tecnico) ?? null;
    return {
      tecnico: r.tecnico, delegacion: r.delegacion,
      cerradas: r.cerradas, pct_bajas: r.pct_bajas,
      cerradas_prev: p?.cerradas ?? null,
      pct_bajas_prev: p?.pct_bajas ?? null,
      mediaDelegacion: mediaByDeleg.get(r.delegacion) ?? null,
    };
  });
  const kpisNowMin: KpisMin = { cerradas: kpis.cerradas, bajas: kpis.bajas, pct_bajas: kpis.pct_bajas };
  const kpisPrevMin: KpisMin | null = kpisPrev
    ? { cerradas: kpisPrev.cerradas, bajas: kpisPrev.bajas, pct_bajas: kpisPrev.pct_bajas }
    : null;
  const conclusiones: Conclusion[] = generarConclusiones(
    kpisNowMin, kpisPrevMin, equiposNow, equiposPrev, tecnicosConcl,
  );

  // Indicador provisional incentivos
  const buckets = classifyIncentive(score, prevByTec);

  // Evolución
  const maxCer = Math.max(1, ...evo.map((e) => Math.max(e.creadas, e.cerradas)));
  const maxBaj = Math.max(0.01, ...evo.map((e) => e.pct_bajas ?? 0));

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cuadro de mando</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">Panorama operativo</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Vista global de la red HIPERSERVICE y SATs externos. Se excluye &quot;ANULADO AVISO&quot; y las OTs anuladas.
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-ink/50 font-semibold">
          Período comparado · {labelComparativa(filters.from, filters.to)}
        </p>
      </header>

      {/* 2. Resumen ejecutivo — 5 cards */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Resumen ejecutivo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <ExecCard
            label="Cerradas"
            actual={fmtNum(kpis.cerradas)}
            previo={fmtNum(kpisPrev?.cerradas ?? null)}
            delta={vCer.pct}
            favorable="up"
            tone={cerradasSubenBajasSuben ? "warn" : "ok"}
            warn={cerradasSubenBajasSuben ? "Los cierres suben, pero las bajas suben desproporcionadamente." : undefined}
          />
          <ExecCard
            label="Bajas"
            actual={fmtNum(kpis.bajas)}
            previo={fmtNum(kpisPrev?.bajas ?? null)}
            delta={vBaj.pct}
            favorable="down"
            tone={(vBaj.pct ?? 0) > 0 ? "warn" : "ok"}
          />
          <ExecCard
            label="Bajas / Cerradas"
            actual={fmtPct(ratioAct)}
            previo={fmtPct(ratioPre)}
            delta={vRatio.pct}
            favorable="down"
          />
          <ExecCard
            label="SLA ≤20 días"
            actual={fmtPct(kpis.pct_sla20)}
            previo={fmtPct(kpisPrev?.pct_sla20 ?? null)}
            delta={vSla.pct}
            favorable="up"
            tone={kpis.pct_sla20 >= 0.8 ? "ok" : kpis.pct_sla20 >= 0.6 ? "warn" : "bad"}
          />
          <ExecCard
            label="Abiertas +30 días"
            actual={fmtNum(kpis.abiertas_30)}
            previo={fmtNum(kpisPrev?.abiertas_30 ?? null)}
            delta={vAb30.pct}
            favorable="down"
            tone={kpis.abiertas_30 > 0 ? "warn" : "ok"}
          />
        </div>

        {/* Indicadores complementarios (fila compacta, sin cards grandes) */}
        <button
          onClick={() => setShowComp((s) => !s)}
          className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors"
        >
          {showComp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Indicadores complementarios
        </button>
        {showComp && (
          <div className="mt-3 border border-black/[0.06] rounded-xl bg-white px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 text-[13px]">
            <MiniStat label="Avisos creados" value={fmtNum(kpis.creadas)} sub={`Balance ${kpis.balance > 0 ? "+" : ""}${fmtNum(kpis.balance)}`} />
            <MiniStat label="% NFF" value={fmtPct(kpis.pct_nff)} sub={`${fmtNum(kpis.nff)} sin avería`} />
            <MiniStat label="SLA ≤30 días" value={fmtPct(kpis.pct_sla30)} />
            <MiniStat label="Días medios cierre" value={fmtDec(kpis.dias_medio, 1)} />
            <MiniStat label="Coste SAT total" value={fmtEur(kpis.coste_sat_total)} />
            <MiniStat label="Coste medio / OT" value={fmtEur(kpis.coste_sat_medio)} />
          </div>
        )}
      </section>

      {/* 3. Comparativa de delegaciones */}
      <DelegacionesResumen
        equiposNow={equiposNow}
        equiposPrev={equiposPrev}
        mediaCompaniaBajas={ratioAct}
      />

      {/* 4. Evolución 18 meses (existente) + serie ratio bajas */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Evolución últimos 18 meses
          <span className="ml-2 text-ink/40 normal-case tracking-normal italic">Responde a los filtros globales activos.</span>
        </p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="flex items-end gap-1.5 h-40">
            {evo.map((e) => (
              <div key={e.mes} className="flex-1 flex flex-col items-center gap-1 relative">
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div className="flex-1 bg-ink/70 rounded-t-sm" style={{ height: `${(e.creadas / maxCer) * 100}%` }} title={`Creadas: ${e.creadas}`} />
                  <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / maxCer) * 100}%` }} title={`Cerradas: ${e.cerradas} · SLA20 ${fmtPct(e.pct_sla20)} · Bajas ${fmtPct(e.pct_bajas)}`} />
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
          </div>
        </div>
      </section>

      {/* 5. Alertas automáticas (existentes) */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Alertas automáticas</p>
        <div className="grid md:grid-cols-3 gap-3">
          <AlertBox title={`Caída de cierres >${(UMBRAL_ALERTA_CAIDA * 100).toFixed(0)}%`} icon={TrendingDown} tone="bad" empty="Sin caídas relevantes en técnicos individuales">
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

      {/* 6. Conclusiones operativas */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Conclusiones operativas</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
          {conclusiones.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/40">Sin desviaciones materiales en el período.</p>
          )}
          {conclusiones.map((c) => (
            <div key={c.texto} className="px-5 py-4 flex items-start gap-3">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${c.tipo === "hecho" ? "bg-ink/[0.06] text-ink" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                {c.tipo === "hecho" ? "Hecho" : "Hipótesis"}
              </span>
              <div>
                <p className="text-sm text-ink">{c.texto}</p>
                <p className="text-[11px] text-ink/40 mt-0.5">Ámbito: {c.ambito}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Indicador provisional para incentivos */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Indicador provisional para incentivos</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-5">
          <p className="font-display text-lg text-ink">Indicador provisional de producción y calidad</p>
          <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
            Este indicador se basa únicamente en los datos de producción y bajas disponibles actualmente.
            No debe utilizarse como base única para decisiones de nómina o incentivos definitivos.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <BucketBox title="Reconocimiento potencial" tone="ok" rows={buckets.reconocimiento_potencial} />
            <BucketBox title="Revisión estándar" tone="ink" rows={buckets.revision_estandar} />
            <BucketBox title="Requiere validación" tone="warn" rows={buckets.requiere_validacion} />
            <BucketBox title="Información insuficiente" tone="ink" rows={buckets.informacion_insuficiente} muted />
          </div>
          <button
            onClick={() => setShowPend((s) => !s)}
            className="mt-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50 hover:text-ink transition-colors"
          >
            {showPend ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Datos pendientes para el modelo definitivo
          </button>
          {showPend && (
            <ul className="text-[12px] text-ink/60 grid sm:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4 mt-3">
              <li>Trabajos asignados</li>
              <li>Días y horas trabajadas</li>
              <li>Vacaciones y bajas laborales</li>
              <li>First Time Fix</li>
              <li>Reincidencias</li>
              <li>Cumplimiento SLA</li>
              <li>Reclamaciones y satisfacción</li>
              <li>Complejidad de producto</li>
              <li>Desplazamientos</li>
              <li>Causas ajenas al técnico</li>
              <li>Disponibilidad y consumo de repuestos</li>
            </ul>
          )}
        </div>
      </section>

      {/* 8. Definiciones */}
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
            <p><strong className="text-ink">Bajas</strong>: OTs con situación &quot;Baja&quot; (aparato irreparable). En este sistema una baja es un cierre.</p>
            <p><strong className="text-ink">Bajas / Cerradas × 100</strong>: bajas del período divididas entre cerradas del período, en porcentaje.</p>
            <p><strong className="text-ink">Período de comparación</strong>: {labelComparativa(filters.from, filters.to)}. Si el rango activo es un mes natural, se compara contra el mes natural anterior; si es un rango arbitrario, contra los mismos días inmediatamente anteriores.</p>
            <p><strong className="text-ink">Variables contextuales aún no disponibles</strong>: días trabajados, ausencias, First Time Fix, reincidencias, satisfacción, reclamaciones, complejidad de producto, disponibilidad de repuestos.</p>
            <p className="text-ink/50 italic">Todos los valores mostrados proceden de <code className="text-[12px]">ops_fact_ot</code> importado. No hay datos simulados.</p>
          </div>
        )}
      </section>
    </div>
  );
};

// ---------------- helpers ----------------
const MiniStat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="text-ink font-medium tabular-nums mt-0.5">{value}</p>
    {sub && <p className="text-[11px] text-ink/40">{sub}</p>}
  </div>
);

const BucketBox = ({
  title, tone, rows, muted,
}: {
  title: string; tone: Tone; rows: ScoreRow[]; muted?: boolean;
}) => (
  <div className={`border rounded-xl p-4 ${muted ? "border-black/[0.05] bg-black/[0.01]" : "border-black/[0.06] bg-white"}`}>
    <div className={`h-[2px] w-6 mb-2 ${toneClass[tone]}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{title}</p>
    <p className="font-display text-2xl tabular-nums text-ink mt-1">{rows.length}</p>
    {rows.length > 0 && (
      <ul className="mt-2 space-y-0.5 text-[11px] text-ink/60 max-h-32 overflow-y-auto">
        {rows.slice().sort((a, b) => b.cerradas - a.cerradas).slice(0, 8).map((r) => (
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

// Clasificación de incentivos: usa estadoTecnico + mediana de producción por grupo.
import { estadoTecnico, indicadorProvisionalIncentivo, mediana, type IndicadorIncentivo } from "@/lib/ops-performance";
function classifyIncentive(
  score: ScoreRow[],
  prevByTec: Map<string, ScoreRow>,
): Record<IndicadorIncentivo, ScoreRow[]> {
  const activos = score.filter((r) => r.activo);
  // Mediana de cerradas por grupo (Central vs Delegaciones)
  const medianaByGrupo = new Map<string, number>();
  const byGrupo = new Map<string, number[]>();
  for (const r of activos) {
    const arr = byGrupo.get(r.grupo) ?? [];
    arr.push(r.cerradas);
    byGrupo.set(r.grupo, arr);
  }
  for (const [g, arr] of byGrupo) medianaByGrupo.set(g, mediana(arr));

  const out: Record<IndicadorIncentivo, ScoreRow[]> = {
    reconocimiento_potencial: [], revision_estandar: [], requiere_validacion: [], informacion_insuficiente: [],
  };
  for (const r of activos) {
    const p = prevByTec.get(r.tecnico) ?? null;
    if (!p) {
      out.informacion_insuficiente.push(r);
      continue;
    }
    const est = estadoTecnico(
      { tecnico: r.tecnico, delegacion: r.delegacion, cerradas: r.cerradas, pct_bajas: r.pct_bajas, pct_bajas_esp: r.pct_bajas_esp },
      { tecnico: p.tecnico, delegacion: p.delegacion, cerradas: p.cerradas, pct_bajas: p.pct_bajas, pct_bajas_esp: p.pct_bajas_esp },
    );
    const med = medianaByGrupo.get(r.grupo) ?? 0;
    out[indicadorProvisionalIncentivo(est, r.cerradas, med)].push(r);
  }
  return out;
}

export default Dashboard;
