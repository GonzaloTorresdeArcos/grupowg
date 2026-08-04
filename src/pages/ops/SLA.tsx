import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import { Loader2, Download, ChevronDown, ChevronRight, Info, AlertTriangle } from "lucide-react";
import {
  prevPeriod, labelPeriodo, diasEntre, estadoBacklogDeleg, esDelegacionReal, variacion,
} from "@/lib/ops-performance";
import {
  BUCKETS_ORDEN, LABEL_CATEGORIA, categoriaDeEstado, agregarEtapas,
  mesesCrecimientoConsecutivo, tendenciaSerie, resumenBacklogTecnico, tendenciaCliente,
  detectarAlertasSla, validarCalidadDatosSla, compararSlaDashboard, generarHallazgosSla,
  UMBRAL_PCT_ABIERTAS_30_CRITICO, MESES_CRECIMIENTO_CONSECUTIVO, UMBRAL_PCT_REPUESTO_EN_30,
  DELTA_SLA_DETERIORO, UMBRAL_BACKLOG_TECNICO_ALERTA, UMBRAL_MUESTRA_CLIENTE_DEF,
  UMBRAL_MUESTRA_PRODUCTO_DEF, TOLERANCIA_SLA_DASHBOARD,
  type BucketId, type EtapaSql, type TecEtapasSql, type CalidadSql, type Tendencia,
} from "@/lib/ops-sla";

// ─── Tipos del payload RPC ───────────────────────────────────────────────────
type Tramos = { t0_10: number; t11_20: number; t21_30: number; t_30_plus: number; total: number; n_sla20: number; pct_sla20: number | null };
type SlaPrev = { total: number; pct_sla20: number | null };
type Flujo = { creadas: number; creadas_prev: number; cerradas: number; cerradas_prev: number };
type Snapshot = { abiertas: number; edad_media: number | null; n30: number; n60: number };
type BucketRow = { bucket: BucketId; total: number; estado_pred: string | null; estado_pred_n: number | null };
type DelegRow = {
  delegacion: string; abiertas: number; edad_media: number | null; n30: number; n60: number;
  dias_mas_antigua: number | null; ot_mas_antigua: string | null;
  estado_dom: string | null; n_dom: number | null;
  cerradas: number; pct_sla20: number | null;
};
type TecRow = { tecnico: string; delegacion: string | null; abiertas: number; edad_media: number | null; n30: number; cerradas: number; pct_sla20: number | null };
type ClienteRow = {
  cliente: string; abiertas: number; edad_media: number | null; n30: number; dias_mas_antigua: number | null;
  cerradas: number; cerradas_prev: number; pct_sla20: number | null; sla_prev: number | null;
};
type ProdRow = { dim: "gama" | "familia" | "marca"; valor: string; abiertas: number; edad_media: number | null; n30: number };
type EvoDelegRow = { delegacion: string; mes: string; abiertas: number; edad_media: number | null };
type EvoTecRow = { tecnico: string; mes: string; abiertas: number };
type Abierta = {
  num_ot: string; cliente_wg: string | null; familia: string | null; provincia: string | null;
  tecnico: string | null; sat: string | null; delegacion: string | null; estado: string;
  fecha_creacion: string | null; dias_abierta: number;
};
type Payload = {
  tramos: Tramos; sla_prev: SlaPrev | null; flujo: Flujo;
  snapshot: Snapshot; snapshot_prev: Snapshot | null;
  buckets: BucketRow[]; etapas: EtapaSql[];
  delegaciones: DelegRow[]; tecnicos: TecRow[]; tec_etapas: TecEtapasSql[];
  clientes: ClienteRow[]; producto: ProdRow[];
  evo_deleg: EvoDelegRow[]; evo_tec: EvoTecRow[];
  calidad: CalidadSql;
  abiertas: Abierta[];
  prov_30: Array<{ provincia: string; n: number }>;
  sat_30: Array<{ sat: string; n: number }>;
};

// ─── Helpers de presentación ─────────────────────────────────────────────────
type Tone = "favorable" | "desfavorable" | "requiere_interpretacion" | "neutro";
const TONE_TXT: Record<Tone, string> = {
  favorable: "text-emerald-700",
  desfavorable: "text-red-700",
  requiere_interpretacion: "text-amber-700",
  neutro: "text-ink",
};
const fmtPp = (v: number | null | undefined): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pp`;

const Card = ({ label, def, valor, detalle, tone }: { label: string; def: string; valor: string; detalle?: string; tone: Tone }) => (
  <div className="border border-black/[0.06] rounded-2xl bg-white p-4">
    <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 mb-1 cursor-help" title={def}>{label}</p>
    <p className={`text-xl tabular-nums ${TONE_TXT[tone]}`}>{valor}</p>
    {detalle && <p className="text-[11px] text-ink/60 mt-1 leading-snug">{detalle}</p>}
  </div>
);

const LABEL_TENDENCIA: Record<Tendencia, string> = { creciendo: "Creciendo", estable: "Estable", mejorando: "Mejorando", sin_datos: "Sin datos" };
const TONE_TENDENCIA: Record<Tendencia, string> = {
  creciendo: "text-amber-700 bg-amber-50 border-amber-200",
  estable: "text-ink/60 bg-black/[0.03] border-black/[0.06]",
  mejorando: "text-emerald-700 bg-emerald-50 border-emerald-200",
  sin_datos: "text-ink/40 bg-black/[0.03] border-black/[0.06]",
};
const LABEL_BACKLOG = { sano: "Sano", atencion: "Atención", critico: "Crítico", no_evaluable: "No evaluable" } as const;
const TONE_BACKLOG = {
  sano: "text-emerald-700 bg-emerald-50 border-emerald-200",
  atencion: "text-amber-700 bg-amber-50 border-amber-200",
  critico: "text-red-700 bg-red-50 border-red-200",
  no_evaluable: "text-ink/40 bg-black/[0.03] border-black/[0.06]",
} as const;
const LABEL_TEND_CLI = { mejorando: "Mejorando", estable: "Estable", deteriorando: "Deteriorando", muestra_insuficiente: "Muestra insuficiente" } as const;
const TONE_TEND_CLI = {
  mejorando: "text-emerald-700 bg-emerald-50 border-emerald-200",
  estable: "text-ink/60 bg-black/[0.03] border-black/[0.06]",
  deteriorando: "text-amber-700 bg-amber-50 border-amber-200",
  muestra_insuficiente: "text-ink/40 bg-black/[0.03] border-black/[0.06]",
} as const;

const Chip = ({ label, tone, title }: { label: string; tone: string; title?: string }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${tone}`} title={title}>{label}</span>
);

const BUCKET_COLOR: Record<BucketId, string> = {
  "0-5": "bg-emerald-500", "6-10": "bg-emerald-400", "11-20": "bg-emerald-300",
  "21-30": "bg-amber-400", "31-45": "bg-amber-500", "46-60": "bg-red-400", ">60": "bg-red-500",
};

// ─── Página ──────────────────────────────────────────────────────────────────
const SLA = () => {
  const { filters, rpcParams } = useOpsFilters();
  const [data, setData] = useState<Payload | null>(null);
  const [kpisDash, setKpisDash] = useState<{ pct_sla20?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [umbralCliente, setUmbralCliente] = useState(UMBRAL_MUESTRA_CLIENTE_DEF);
  const [umbralProducto, setUmbralProducto] = useState(UMBRAL_MUESTRA_PRODUCTO_DEF);
  const [defsOpen, setDefsOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: d }, { data: k }] = await Promise.all([
        supabase.rpc("ops_sla" as never, rpcParams as never),
        supabase.rpc("ops_kpis" as never, rpcParams as never),
      ]);
      setData((d ?? null) as Payload | null);
      setKpisDash((k ?? null) as { pct_sla20?: number } | null);
      setLoading(false);
    })();
  }, [rpcParams]);

  const prev = prevPeriod(filters.from, filters.to);
  const L = diasEntre(filters.from, filters.to);
  const Lprev = diasEntre(prev.from, prev.to);

  // ── Derivados ──
  const categorias = useMemo(() => agregarEtapas(data?.etapas ?? []), [data]);
  const bucketMap = useMemo(() => new Map((data?.buckets ?? []).map((b) => [b.bucket, b])), [data]);

  const seriesDeleg = useMemo(() => {
    if (!data) return [] as { delegacion: string; serieEdad: Array<number | null> }[];
    const map = new Map<string, Array<number | null>>();
    for (const r of data.evo_deleg) {
      if (!map.has(r.delegacion)) map.set(r.delegacion, []);
      map.get(r.delegacion)!.push(r.edad_media);
    }
    return [...map.entries()].map(([delegacion, serieEdad]) => ({ delegacion, serieEdad }));
  }, [data]);

  const seriesTec = useMemo(() => {
    if (!data) return [] as { tecnico: string; serie: Array<number | null> }[];
    const map = new Map<string, Array<number | null>>();
    for (const r of data.evo_tec) {
      if (!map.has(r.tecnico)) map.set(r.tecnico, []);
      map.get(r.tecnico)!.push(r.abiertas);
    }
    return [...map.entries()].map(([tecnico, serie]) => ({ tecnico, serie }));
  }, [data]);

  const pctRepuesto30 = useMemo(() => {
    if (!data || data.snapshot.n30 <= 0) return null;
    const rep = categorias.find((c) => c.categoria === "esperando_repuesto");
    return (rep?.n30 ?? 0) / data.snapshot.n30;
  }, [data, categorias]);

  const alertas = useMemo(() => {
    if (!data) return [];
    return detectarAlertasSla({
      abiertas: data.snapshot.abiertas,
      n30: data.snapshot.n30,
      evoDeleg: seriesDeleg,
      slaAct: data.tramos.pct_sla20,
      slaPrev: data.sla_prev?.pct_sla20 ?? null,
      creadasAct: data.flujo.creadas,
      creadasPrev: data.flujo.creadas_prev,
      evoTec: seriesTec,
      pctRepuestoEn30: pctRepuesto30,
    });
  }, [data, seriesDeleg, seriesTec, pctRepuesto30]);

  const avisos = useMemo(() => {
    if (!data) return [];
    const a = validarCalidadDatosSla(data.calidad);
    const inc = compararSlaDashboard(data.tramos.pct_sla20, kpisDash?.pct_sla20 ?? null);
    if (inc) a.unshift(inc);
    return a;
  }, [data, kpisDash]);

  const marcaTop30 = useMemo(() => {
    if (!data) return null;
    const ms = data.producto.filter((p) => p.dim === "marca").sort((a, b) => b.n30 - a.n30);
    return ms[0] ? { marca: ms[0].valor, n30: ms[0].n30 } : null;
  }, [data]);

  const tecsCreciendo = useMemo(
    () =>
      seriesTec
        .map((t) => ({ tecnico: t.tecnico, ultimoValor: t.serie[t.serie.length - 1] ?? 0, meses: mesesCrecimientoConsecutivo(t.serie) }))
        .filter((x) => x.meses >= MESES_CRECIMIENTO_CONSECUTIVO && x.ultimoValor >= UMBRAL_BACKLOG_TECNICO_ALERTA)
        .map(({ tecnico, ultimoValor }) => ({ tecnico, ultimoValor })),
    [seriesTec],
  );

  const hallazgos = useMemo(() => {
    if (!data) return [];
    return generarHallazgosSla({
      abiertas: data.snapshot.abiertas,
      n30: data.snapshot.n30,
      n60: data.snapshot.n60,
      delegaciones: data.delegaciones.map((d) => ({ delegacion: d.delegacion, n30: d.n30, etapaDominante: d.estado_dom })),
      categorias,
      marcaTop30,
      clienteTop30: data.clientes[0]
        ? { cliente: data.clientes[0].cliente, n30: data.clientes[0].n30, diasMasAntigua: data.clientes[0].dias_mas_antigua }
        : null,
      tecnicosCreciendo: tecsCreciendo,
    });
  }, [data, categorias, marcaTop30, tecsCreciendo]);

  const delegSlaMap = useMemo(() => new Map((data?.delegaciones ?? []).map((d) => [d.delegacion, d.pct_sla20])), [data]);
  const resumenesTec = useMemo(() => {
    if (!data) return new Map<string, ReturnType<typeof resumenBacklogTecnico>>();
    return new Map(data.tecnicos.map((t) => [t.tecnico, resumenBacklogTecnico(t.tecnico, data.tec_etapas)]));
  }, [data]);

  // ── CSV ──
  const csv = useMemo(() => {
    if (!data) return "";
    const header = "num_ot,cliente,familia,provincia,delegacion,sat,tecnico,etapa_actual,fecha_creacion,dias_abierta\n";
    const rows = data.abiertas.map((a) =>
      [a.num_ot, a.cliente_wg, a.familia, a.provincia, a.delegacion, a.sat, a.tecnico, a.estado, a.fecha_creacion, a.dias_abierta]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","),
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
  const snap = data.snapshot;
  const snapPrev = data.snapshot_prev;
  const slaPrev = data.sla_prev?.pct_sla20 ?? null;
  const deltaSla = t.pct_sla20 != null && slaPrev != null ? t.pct_sla20 - slaPrev : null;
  const pct30 = snap.abiertas > 0 ? snap.n30 / snap.abiertas : null;
  const tot = Math.max(1, t.total);
  const varAbiertas = snapPrev ? variacion(snapPrev.abiertas, snap.abiertas).ratio : null;
  const delegReales = data.delegaciones.filter((d) => esDelegacionReal(d.delegacion));
  const redSat = data.delegaciones.filter((d) => !esDelegacionReal(d.delegacion));
  const productoFiltrado = (dim: ProdRow["dim"]) =>
    data.producto.filter((p) => p.dim === dim && p.abiertas >= umbralProducto).sort((a, b) => b.n30 - a.n30).slice(0, 10);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Envejecimiento</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SLA y envejecimiento</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-3xl">
          El cumplimiento SLA es un resultado, no el objetivo: el objetivo es reducir envejecimiento y desbloquear.
          Una OT envejecida no es necesariamente un problema del técnico — primero se identifica en qué etapa está ahora.
        </p>
      </header>

      {/* Limitación crítica de datos */}
      <section className="border border-sky-200 bg-sky-50/60 rounded-xl p-4 flex gap-3">
        <Info className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-medium text-sky-900">Sin historial de cambios de estado</p>
          <p className="text-xs text-sky-800/80 mt-1 leading-relaxed">
            Se conoce la etapa <b>actual</b> de cada OT abierta y su antigüedad total desde la creación, pero <b>no el tiempo transcurrido en cada etapa</b>.
            Por eso los análisis dicen «las OTs envejecidas están actualmente en la etapa X», nunca «la etapa X tarda N días».
            La reconstrucción histórica del backlog (conteos y antigüedades a fin de cada mes pasado) sí es exacta; la etapa pudo ser otra entonces.
          </p>
        </div>
      </section>

      {/* Comparabilidad de períodos */}
      <section className="border border-black/[0.06] rounded-xl bg-white p-4 text-[13px] text-ink/70 flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <span><span className="text-ink/40">Período actual:</span> <b className="text-ink">{labelPeriodo(filters.from, filters.to)}</b> · {L} días naturales</span>
        <span><span className="text-ink/40">Período anterior:</span> <b className="text-ink">{labelPeriodo(prev.from, prev.to)}</b> · {Lprev} días naturales</span>
        {L !== Lprev && (
          <Chip tone="text-amber-700 bg-amber-50 border-amber-200" label="Distinta duración — compara proporciones, no absolutos" />
        )}
        <span className="text-ink/40 text-[11px]">El backlog anterior se reconstruye a fecha de hoy − {L} días (exacto en conteos y antigüedades).</span>
      </section>

      {/* FASE B — Resumen ejecutivo */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Resumen ejecutivo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card
            label="Cumplimiento SLA ≤20d"
            def="% de OTs cerradas (incluye bajas) en el período dentro de 20 días laborables (kpi_20d). El SLA es un resultado, no el objetivo."
            valor={fmtPct(t.pct_sla20)}
            tone={deltaSla == null ? "neutro" : deltaSla > 0.01 ? "favorable" : deltaSla < -DELTA_SLA_DETERIORO ? "desfavorable" : "neutro"}
            detalle={`${fmtNum(t.n_sla20)} de ${fmtNum(t.total)} cerradas · anterior ${fmtPct(slaPrev)} (${fmtPp(deltaSla)})`}
          />
          <Card
            label="Variación SLA"
            def="Diferencia en puntos porcentuales vs el período anterior inmediato de igual duración."
            valor={fmtPp(deltaSla)}
            tone={deltaSla == null ? "neutro" : deltaSla < -DELTA_SLA_DETERIORO ? "desfavorable" : deltaSla > 0.01 ? "favorable" : "neutro"}
            detalle={
              deltaSla != null && deltaSla < -DELTA_SLA_DETERIORO && data.flujo.creadas < data.flujo.creadas_prev
                ? `Cae con menor carga entrante (${fmtNum(data.flujo.creadas)} vs ${fmtNum(data.flujo.creadas_prev)} entradas): no atribuible a volumen.`
                : `Entradas: ${fmtNum(data.flujo.creadas)} vs ${fmtNum(data.flujo.creadas_prev)} en el período anterior.`
            }
          />
          <Card
            label="Antigüedad media de abiertas"
            def="Días naturales medios desde la creación de las OTs actualmente abiertas."
            valor={`${fmtDec(snap.edad_media)} días`}
            tone={snapPrev?.edad_media != null && snap.edad_media != null
              ? snap.edad_media - snapPrev.edad_media > 1 ? "desfavorable"
              : snap.edad_media - snapPrev.edad_media < -1 ? "favorable" : "neutro" : "neutro"}
            detalle={snapPrev ? `Hace ${L} días: ${fmtDec(snapPrev.edad_media)} días (reconstruido)` : undefined}
          />
          <Card
            label="Abiertas totales"
            def="OTs actualmente en situación Abierto."
            valor={fmtNum(snap.abiertas)}
            tone={varAbiertas == null ? "neutro" : varAbiertas > 0.05 ? "desfavorable" : varAbiertas < -0.05 ? "favorable" : "neutro"}
            detalle={snapPrev ? `Hace ${L} días: ${fmtNum(snapPrev.abiertas)} (reconstruido)` : undefined}
          />
          <Card
            label="Abiertas >30 días"
            def={`OTs abiertas con más de 30 días desde la creación. Umbral de alerta: > ${(UMBRAL_PCT_ABIERTAS_30_CRITICO * 100).toFixed(0)}% del backlog.`}
            valor={`${fmtNum(snap.n30)} · ${fmtPct(pct30)}`}
            tone={pct30 != null && pct30 > UMBRAL_PCT_ABIERTAS_30_CRITICO ? "desfavorable" : "neutro"}
            detalle={snapPrev ? `Hace ${L} días: ${fmtNum(snapPrev.n30)} (reconstruido)` : undefined}
          />
          <Card
            label="Envejecimiento crítico >60 días"
            def="OTs abiertas con más de 60 días desde la creación: mayor riesgo de escalado."
            valor={fmtNum(snap.n60)}
            tone={snapPrev ? snap.n60 > snapPrev.n60 ? "desfavorable" : snap.n60 < snapPrev.n60 ? "favorable" : "neutro" : "neutro"}
            detalle={snapPrev ? `Hace ${L} días: ${fmtNum(snapPrev.n60)} (reconstruido)` : undefined}
          />
        </div>
      </section>

      {/* FASE I — Alertas accionables */}
      {alertas.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Alertas accionables ({alertas.length})</p>
          <div className="space-y-2">
            {alertas.map((a, idx) => (
              <div key={`${a.clave}-${idx}`} className={`border rounded-xl bg-white p-4 border-l-4 ${a.nivel === "critico" ? "border-l-red-500 border-black/[0.06]" : "border-l-amber-400 border-black/[0.06]"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Chip tone={a.nivel === "critico" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"} label={a.nivel === "critico" ? "Crítico" : "Atención"} />
                  <p className="text-sm font-medium text-ink">{a.titulo}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-2 text-[12px] leading-snug">
                  <p className="text-ink/70"><span className="text-ink/40 uppercase text-[10px] tracking-wide block">Evidencia</span>{a.evidencia}</p>
                  <p className="text-ink/70"><span className="text-ink/40 uppercase text-[10px] tracking-wide block">Impacto</span>{a.impacto}</p>
                  <p className="text-ink/70"><span className="text-ink/40 uppercase text-[10px] tracking-wide block">Acción</span>{a.accion}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FASE C — Distribución de antigüedad */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Distribución de antigüedad del backlog · {fmtNum(snap.abiertas)} abiertas</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6 space-y-3">
          {BUCKETS_ORDEN.map((b) => {
            const row = bucketMap.get(b);
            const n = row?.total ?? 0;
            const pct = snap.abiertas > 0 ? n / snap.abiertas : 0;
            const cat = row?.estado_pred ? categoriaDeEstado(row.estado_pred) : null;
            return (
              <div key={b}>
                <div className="flex justify-between text-xs mb-1 gap-2">
                  <span className="text-ink/70 w-14 shrink-0">{b} días</span>
                  <span className="text-ink/40 truncate flex-1 text-right">
                    {cat && row ? <>predomina: <span className="text-ink/60">{LABEL_CATEGORIA[cat]}</span> <span className="text-ink/30">({row.estado_pred}{row.estado_pred_n != null ? `, ${fmtNum(row.estado_pred_n)}` : ""})</span></> : "—"}
                  </span>
                  <span className="tabular-nums text-ink/60 shrink-0 w-28 text-right">{fmtNum(n)} · {fmtPct(pct)}</span>
                </div>
                <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                  <div className={`h-full ${BUCKET_COLOR[b]}`} style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-ink/40 mt-2">«Predomina» = estado de flujo más frecuente <b>actualmente</b> dentro del tramo. No implica que la OT haya permanecido ese tiempo en esa etapa.</p>
      </section>

      {/* FASE D — Análisis de flujo */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Dónde está ahora el backlog — por etapa operativa</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Categoría</th>
                <th className="text-left px-3 py-2.5 font-semibold">Estados literales incluidos</th>
                <th className="text-right px-3 py-2.5 font-semibold">OTs</th>
                <th className="text-right px-3 py-2.5 font-semibold">% backlog</th>
                <th className="text-right px-3 py-2.5 font-semibold">Antigüedad media</th>
                <th className="text-right px-3 py-2.5 font-semibold">+30d</th>
                <th className="text-right px-4 py-2.5 font-semibold">+60d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {categorias.map((c) => (
                <tr key={c.categoria}>
                  <td className="px-4 py-2.5 font-medium text-ink">{LABEL_CATEGORIA[c.categoria]}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.estados.map((e) => (
                        <span key={e.literal} className="inline-flex rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-ink/60">{e.literal} · {fmtNum(e.n)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-ink">{fmtNum(c.n)}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-ink/60">{fmtPct(snap.abiertas > 0 ? c.n / snap.abiertas : null)}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-ink/60">{c.edadMedia != null ? `${fmtDec(c.edadMedia)} d` : "—"}</td>
                  <td className={`text-right px-3 py-2.5 tabular-nums ${c.n30 > 0 ? "text-amber-700 font-medium" : "text-ink/40"}`}>{fmtNum(c.n30)}</td>
                  <td className={`text-right px-4 py-2.5 tabular-nums ${c.n60 > 0 ? "text-red-600 font-medium" : "text-ink/40"}`}>{fmtNum(c.n60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink/40 mt-2">Las OTs envejecidas están <b>actualmente</b> en cada etapa; sin historial de estados no se puede atribuir duración a la etapa.</p>
      </section>

      {/* FASE E — Comparativa por delegación */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Comparativa por delegación</p>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Delegación</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="Cerradas (incluye bajas) en período dentro de 20 días laborables">SLA≤20d</th>
                <th className="text-right px-3 py-2.5 font-semibold">Antigüedad media</th>
                <th className="text-right px-3 py-2.5 font-semibold">Abiertas</th>
                <th className="text-right px-3 py-2.5 font-semibold">+30d</th>
                <th className="text-right px-3 py-2.5 font-semibold">+60d</th>
                <th className="text-center px-3 py-2.5 font-semibold" title="Tendencia de la antigüedad media del backlog, serie reconstruida de 6 meses">Tendencia 6m</th>
                <th className="text-left px-3 py-2.5 font-semibold">OT más antigua</th>
                <th className="text-left px-3 py-2.5 font-semibold" title="Estado de flujo más frecuente entre sus OTs de más de 30 días">Etapa dominante +30d</th>
                <th className="text-center px-4 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {delegReales.map((d) => {
                const serie = seriesDeleg.find((s) => s.delegacion === d.delegacion)?.serieEdad ?? [];
                const tend = tendenciaSerie(serie);
                const est = estadoBacklogDeleg(d.abiertas, d.n30).nivel;
                const catDom = d.estado_dom ? categoriaDeEstado(d.estado_dom) : null;
                return (
                  <tr key={d.delegacion}>
                    <td className="px-4 py-2.5 font-medium text-ink">{d.delegacion}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{fmtPct(d.pct_sla20)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{d.edad_media != null ? `${fmtDec(d.edad_media)} d` : "—"}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink">{fmtNum(d.abiertas)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${d.n30 > 0 ? "text-amber-700 font-medium" : "text-ink/40"}`}>{fmtNum(d.n30)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${d.n60 > 0 ? "text-red-600 font-medium" : "text-ink/40"}`}>{fmtNum(d.n60)}</td>
                    <td className="text-center px-3 py-2.5"><Chip tone={TONE_TENDENCIA[tend]} label={LABEL_TENDENCIA[tend]} title={serie.map((x) => (x == null ? "—" : x.toFixed(1))).join(" → ") + " días"} /></td>
                    <td className="px-3 py-2.5 text-ink/70 text-xs tabular-nums">{d.ot_mas_antigua ? `${d.ot_mas_antigua} · ${fmtNum(d.dias_mas_antigua)} d` : "—"}</td>
                    <td className="px-3 py-2.5 text-ink/70 text-xs">{catDom ? <>{LABEL_CATEGORIA[catDom]} <span className="text-ink/30">({d.estado_dom}{d.n_dom != null ? `, ${fmtNum(d.n_dom)}` : ""})</span></> : "—"}</td>
                    <td className="text-center px-4 py-2.5"><Chip tone={TONE_BACKLOG[est]} label={LABEL_BACKLOG[est]} title={`Regla: >30% del backlog con +30d → crítico; >15% → atención; <10 abiertas → no evaluable`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {redSat.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Red SAT externa <span className="normal-case font-normal text-ink/30">— sin delegación propia; nunca se mezcla con las delegaciones territoriales ni con equipos</span></p>
            <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <tbody className="divide-y divide-black/[0.04]">
                  {redSat.map((d) => {
                    const est = estadoBacklogDeleg(d.abiertas, d.n30).nivel;
                    const catDom = d.estado_dom ? categoriaDeEstado(d.estado_dom) : null;
                    return (
                      <tr key={d.delegacion}>
                        <td className="px-4 py-2.5 font-medium text-ink w-48">{d.delegacion}</td>
                        <td className="px-3 py-2.5 text-ink/70 text-xs">SLA {fmtPct(d.pct_sla20)}</td>
                        <td className="px-3 py-2.5 text-ink/70 text-xs tabular-nums">{d.edad_media != null ? `${fmtDec(d.edad_media)} d media` : "—"}</td>
                        <td className="px-3 py-2.5 text-ink/70 text-xs tabular-nums">{fmtNum(d.abiertas)} abiertas</td>
                        <td className="px-3 py-2.5 text-xs tabular-nums text-amber-700">{fmtNum(d.n30)} +30d</td>
                        <td className="px-3 py-2.5 text-xs tabular-nums text-red-600">{fmtNum(d.n60)} +60d</td>
                        <td className="px-3 py-2.5 text-ink/70 text-xs">{catDom ? LABEL_CATEGORIA[catDom] : "—"}</td>
                        <td className="px-4 py-2.5 text-right"><Chip tone={TONE_BACKLOG[est]} label={LABEL_BACKLOG[est]} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* FASE F — Vista técnicos */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Técnicos con OTs abiertas <span className="normal-case font-normal text-ink/30">— el retraso no se presume responsabilidad del técnico</span></p>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Técnico</th>
                <th className="text-left px-3 py-2.5 font-semibold">Delegación</th>
                <th className="text-right px-3 py-2.5 font-semibold">Abiertas</th>
                <th className="text-right px-3 py-2.5 font-semibold">Antigüedad media</th>
                <th className="text-right px-3 py-2.5 font-semibold">+30d</th>
                <th className="text-right px-3 py-2.5 font-semibold" title="% de sus OTs +30d actualmente en etapas ajenas al técnico (repuesto, red SAT, cliente/datos, presupuesto)">% +30d en etapas ajenas</th>
                <th className="text-right px-3 py-2.5 font-semibold">SLA≤20d</th>
                <th className="text-right px-3 py-2.5 font-semibold">Δ vs delegación</th>
                <th className="text-left px-4 py-2.5 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {data.tecnicos.slice(0, 30).map((tec) => {
                const r = resumenesTec.get(tec.tecnico);
                const slaDeleg = tec.delegacion ? delegSlaMap.get(tec.delegacion) ?? null : null;
                const delta = tec.pct_sla20 != null && slaDeleg != null ? tec.pct_sla20 - slaDeleg : null;
                return (
                  <tr key={tec.tecnico}>
                    <td className="px-4 py-2.5 font-medium text-ink">{tec.tecnico}</td>
                    <td className="px-3 py-2.5 text-ink/70 text-xs">{tec.delegacion || "—"}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink">{fmtNum(tec.abiertas)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{tec.edad_media != null ? `${fmtDec(tec.edad_media)} d` : "—"}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${tec.n30 > 0 ? "text-amber-700 font-medium" : "text-ink/40"}`}>{fmtNum(tec.n30)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{r?.pctExternas != null ? fmtPct(r.pctExternas) : "—"}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{fmtPct(tec.pct_sla20)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${delta != null && delta < -0.05 ? "text-amber-700" : "text-ink/60"}`}>{fmtPp(delta)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r?.mayoriaExterna
                        ? <Chip tone="text-sky-800 bg-sky-50 border-sky-200" label="El retraso se concentra en etapas ajenas al técnico." />
                        : <span className="text-ink/30">—</span>}
                    </td>
                  </tr>
                );
              })}
              {data.tecnicos.length === 0 && (
                <tr><td colSpan={9} className="text-center px-4 py-8 text-ink/40 text-sm">Sin técnicos con OTs abiertas con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* FASE G — Clientes y producto */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Clientes con backlog más antiguo</p>
          <label className="flex items-center gap-1.5 text-[11px] text-ink/50">
            Muestra mínima (cerradas en algún período)
            <input type="number" min={1} value={umbralCliente} onChange={(e) => setUmbralCliente(Math.max(1, Number(e.target.value) || UMBRAL_MUESTRA_CLIENTE_DEF))}
              className="w-16 h-7 px-2 rounded-md border border-black/[0.08] text-[12px] text-ink tabular-nums" />
          </label>
        </div>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
                <th className="text-right px-3 py-2.5 font-semibold">Abiertas</th>
                <th className="text-right px-3 py-2.5 font-semibold">Antigüedad media</th>
                <th className="text-right px-3 py-2.5 font-semibold">+30d</th>
                <th className="text-right px-3 py-2.5 font-semibold">OT más antigua</th>
                <th className="text-right px-3 py-2.5 font-semibold">SLA≤20d</th>
                <th className="text-right px-3 py-2.5 font-semibold">Δ SLA vs anterior</th>
                <th className="text-center px-4 py-2.5 font-semibold">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {data.clientes.slice(0, 15).map((c) => {
                const tend = tendenciaCliente(c, umbralCliente);
                const delta = c.pct_sla20 != null && c.sla_prev != null ? c.pct_sla20 - c.sla_prev : null;
                return (
                  <tr key={c.cliente}>
                    <td className="px-4 py-2.5 font-medium text-ink">{c.cliente}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink">{fmtNum(c.abiertas)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{c.edad_media != null ? `${fmtDec(c.edad_media)} d` : "—"}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${c.n30 > 0 ? "text-amber-700 font-medium" : "text-ink/40"}`}>{fmtNum(c.n30)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{c.dias_mas_antigua != null ? `${fmtNum(c.dias_mas_antigua)} d` : "—"}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-ink/70">{fmtPct(c.pct_sla20)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${delta != null && delta < -DELTA_SLA_DETERIORO ? "text-amber-700" : "text-ink/60"}`}>{fmtPp(delta)}</td>
                    <td className="text-center px-4 py-2.5"><Chip tone={TONE_TEND_CLI[tend]} label={LABEL_TEND_CLI[tend]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-8 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Concentración del envejecimiento por producto</p>
          <label className="flex items-center gap-1.5 text-[11px] text-ink/50">
            Muestra mínima (abiertas)
            <input type="number" min={1} value={umbralProducto} onChange={(e) => setUmbralProducto(Math.max(1, Number(e.target.value) || UMBRAL_MUESTRA_PRODUCTO_DEF))}
              className="w-16 h-7 px-2 rounded-md border border-black/[0.08] text-[12px] text-ink tabular-nums" />
          </label>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {(["gama", "familia", "marca"] as const).map((dim) => (
            <div key={dim}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">{dim === "gama" ? "Por gama" : dim === "familia" ? "Por familia" : "Por marca"}</p>
              <div className="border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.04]">
                {productoFiltrado(dim).length === 0 && <p className="p-4 text-xs text-ink/40">Sin valores con muestra suficiente.</p>}
                {productoFiltrado(dim).map((p) => (
                  <div key={p.valor} className="px-4 py-2 flex justify-between items-baseline gap-2 text-sm">
                    <span className="text-ink truncate" title={p.valor}>{p.valor}</span>
                    <span className="text-[11px] tabular-nums text-ink/60 shrink-0">
                      {fmtNum(p.abiertas)} ab · {p.edad_media != null ? `${fmtDec(p.edad_media)} d` : "—"} · <span className={p.n30 > 0 ? "text-amber-700 font-medium" : ""}>{fmtNum(p.n30)} +30d</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FASE K — Hallazgos */}
      {hallazgos.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Hallazgos ({hallazgos.length})</p>
          <div className="space-y-3">
            {hallazgos.map((h, i) => (
              <div key={i} className="border border-black/[0.06] rounded-2xl bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Hallazgo {i + 1}</p>
                <div className="space-y-2 text-[13px] leading-relaxed">
                  <p className="text-ink"><span className="font-semibold">HECHO:</span> {h.hecho}</p>
                  <p className="text-ink/80"><span className="font-semibold">HIPÓTESIS:</span> {h.hipotesis}</p>
                  <p className="text-ink/80"><span className="font-semibold">ACCIÓN:</span> {h.accion}</p>
                  <p className="text-[11px] text-ink/40">{h.benchmark}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FASE J — Calidad de datos */}
      {avisos.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">Avisos de calidad de datos ({avisos.length})</p>
          <div className="space-y-2">
            {avisos.map((a, i) => (
              <div key={i} className={`border rounded-xl p-3 flex gap-2.5 text-[13px] ${a.severidad === "error" ? "border-amber-200 bg-amber-50/60 text-amber-900" : "border-black/[0.06] bg-white text-ink/70"}`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.severidad === "error" ? "text-amber-600" : "text-ink/30"}`} />
                <span>{a.mensaje}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tramos de cierre (existente) */}
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
                <div className={`h-full ${r.c}`} style={{ width: `${(r.n / tot) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Listado de abiertas + concentraciones */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Abiertas ({fmtNum(data.abiertas.length)}{data.abiertas.length === 500 ? "+" : ""})</p>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        <div className="border border-black/[0.06] rounded-2xl bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-ink/40 border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">OT</th>
                <th className="text-left px-3 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold">Familia</th>
                <th className="text-left px-3 py-2.5 font-semibold">Provincia</th>
                <th className="text-left px-3 py-2.5 font-semibold">Recurso</th>
                <th className="text-left px-3 py-2.5 font-semibold" title="Estado de flujo actual (sin historial: no se conoce el tiempo en esta etapa)">Etapa actual</th>
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
                  <td className="px-3 py-2 text-ink/70 text-xs" title={a.estado}>{LABEL_CATEGORIA[categoriaDeEstado(a.estado)]}</td>
                  <td className="px-3 py-2 text-ink/60 text-xs tabular-nums">{a.fecha_creacion || "—"}</td>
                  <td className={`text-right px-4 py-2 tabular-nums ${a.dias_abierta > 30 ? "text-red-600 font-medium" : a.dias_abierta > 20 ? "text-amber-600" : "text-ink/60"}`}>{a.dias_abierta}</td>
                </tr>
              ))}
              {data.abiertas.length === 0 && (
                <tr><td colSpan={8} className="text-center px-4 py-8 text-ink/40 text-sm">Sin OTs abiertas con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <MiniList title="+30d por provincia" rows={data.prov_30.map((r) => ({ k: r.provincia, n: r.n }))} />
          <MiniList title="+30d por SAT" rows={data.sat_30.map((r) => ({ k: r.sat, n: r.n }))} />
        </div>
      </section>

      {/* Panel de definiciones */}
      <section className="border border-black/[0.06] rounded-2xl bg-white">
        <button onClick={() => setDefsOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Definiciones, mapeo de etapas y umbrales</span>
          {defsOpen ? <ChevronDown className="h-4 w-4 text-ink/40" /> : <ChevronRight className="h-4 w-4 text-ink/40" />}
        </button>
        {defsOpen && (
          <div className="px-5 pb-5 space-y-5 text-[13px] text-ink/70 leading-relaxed">
            <div>
              <p className="font-semibold text-ink mb-2">Mapeo de etapas (estado literal → categoría operativa)</p>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-1">
                {[
                  ["PTE. REPARAR", "pendiente_reparacion"],
                  ["AVISADO A SAT · PTE. ASIGNAR SAT", "en_red_sat"],
                  ["PTE. PIEZAS", "esperando_repuesto"],
                  ["PENDIENTE DATOS", "esperando_cliente_datos"],
                  ["PRESUPUESTO TRAMITADO", "esperando_aprobacion"],
                  ["SOLICITUD BAJA · TRAMITANDO BAJA", "baja_en_tramite"],
                  ["CONFIRMADO AVISO", "confirmado_pendiente"],
                  ["Resto y vacíos", "otros"],
                ].map(([lit, cat]) => (
                  <p key={cat}><span className="text-ink/50">{lit}</span> → {LABEL_CATEGORIA[cat as keyof typeof LABEL_CATEGORIA]}</p>
                ))}
              </div>
              <p className="text-[11px] text-ink/40 mt-2">Los estados siempre se muestran también con su literal. Lo no mapeado cae en «Otros / sin clasificar», nunca se oculta.</p>
            </div>
            <div>
              <p className="font-semibold text-ink mb-2">Umbrales de alerta (centralizados en ops-sla.ts)</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>🔴 Más del {(UMBRAL_PCT_ABIERTAS_30_CRITICO * 100).toFixed(0)}% de las abiertas supera 30 días.</li>
                <li>🔴 Delegación con antigüedad media del backlog creciendo {MESES_CRECIMIENTO_CONSECUTIVO} meses consecutivos (serie reconstruida de 6 meses).</li>
                <li>🟡 SLA cayendo más de {(DELTA_SLA_DETERIORO * 100).toFixed(0)} pp con menor carga entrante.</li>
                <li>🟡 Backlog de un técnico creciendo {MESES_CRECIMIENTO_CONSECUTIVO} meses consecutivos y ≥ {UMBRAL_BACKLOG_TECNICO_ALERTA} abiertas.</li>
                <li>🟡 ≥ {(UMBRAL_PCT_REPUESTO_EN_30 * 100).toFixed(0)}% de las OTs +30d actualmente esperando repuesto (sin historial de estados, la tendencia no es computable).</li>
                <li>Estado de backlog por delegación: &gt;30% del backlog con +30d → crítico; &gt;15% → atención; &lt;10 abiertas → no evaluable.</li>
                <li>Tolerancia de consistencia con el dashboard: {(TOLERANCIA_SLA_DASHBOARD * 100).toFixed(1)} pp.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-ink mb-2">Metodología y limitaciones</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>«Cerradas» incluye bajas (una baja es un cierre). SLA = % dentro de 20 días laborables (kpi_20d) sobre cerradas del período.</li>
                <li>Backlog histórico reconstruido: OTs creadas hasta fin de mes y cerradas después (o sin cerrar). Exacto en conteos y antigüedades; la etapa mostrada es siempre la actual.</li>
                <li>Sin historial de cambios de estado: no se conoce el tiempo en cada etapa. Ninguna lectura atribuye duración a etapas ni responsabilidad a técnicos.</li>
                <li>La red SAT externa no tiene delegación propia: se muestra separada, nunca mezclada con delegaciones territoriales ni con equipos por gama.</li>
                <li>Para atribuir duración por etapa y causas codificadas de demora se necesita: log de cambios de estado, motivos de demora del ERP, plazos de proveedor de recambios y registro de contactos con cliente.</li>
              </ul>
            </div>
          </div>
        )}
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
