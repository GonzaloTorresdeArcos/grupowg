import { etiquetaVentana, ventanaPropia } from "@/lib/ops-modelo";
import { useMemo, useState } from "react";
import { DataAsOf } from "@/components/ops/DataAsOf";
import { Link } from "react-router-dom";
import { useOpsRpcs } from "@/lib/ops-query";
import { useOpsFilters, fmtNum, fmtPct, fmtDec } from "@/lib/ops-filters";
import {
  variacion,
  ratioBajas,
  labelComparativa,
  labelPeriodo,
  generarConclusiones,
  type Conclusion,
  type EquipoRow,
  type KpisMin,
  type TecnicoConclInput,
} from "@/lib/ops-performance";
import { LABEL_CATEGORIA } from "@/lib/ops-sla";
import { normalizarSupply, type SupplyPayload } from "@/lib/ops-supply";
import {
  agruparEtapasPanorama,
  construirAsuntos,
  cuadraBalance,
  descuadreBalance,
  lecturaBalance,
  pctBajasSalida,
  situationLine,
  DESC_TARGET,
  ETIQUETA_REFERENCIA_OPERATIVA,
  LABEL_CONFIANZA,
  LABEL_IMPACTO,
  LABEL_TARGET,
  REGLAS_PRIORIZACION,
  type Asunto,
  type Balance,
  type EtapaSqlPanorama,
} from "@/lib/ops-panorama";
import {
  GLIFO_DOMINIO,
  LABEL_ESTADO_DOMINIO,
  type DominioDato,
} from "@/lib/ops-data-quality";
import { useDataQuality } from "@/hooks/useDataQuality";
import {
  Loader2, ChevronDown, ChevronUp, Info, ArrowRight, Lock, AlertTriangle,
} from "lucide-react";

// ─── Tipos de payload ────────────────────────────────────────────────────────
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
type PanoramaPayload = {
  balance: {
    backlog_ini: number; entrantes: number; reparadas: number; bajas: number;
    backlog_fin: number; sin_fecha_creacion: number;
  };
  etapas: EtapaSqlPanorama[];
  serie: Array<{ mes: string; backlog: number; pct_sla20: number | null }>;
};

// ─── Primitivas visuales ─────────────────────────────────────────────────────
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{children}</p>
);

const Delta = ({ v, favorable }: { v: number | null; favorable: "up" | "down" | null }) => {
  if (v == null) {
    return (
      <span className="text-ink/30 text-[11px] tabular-nums" title="Sin período comparable en los datos cargados">
        —
      </span>
    );
  }
  const neutro = favorable == null || Math.abs(v) < 0.005;
  const bueno = (v > 0 && favorable === "up") || (v < 0 && favorable === "down");
  const cls = neutro ? "text-ink/50 bg-black/[0.03]" : bueno ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${cls}`}>
      {v > 0 ? "+" : ""}{(v * 100).toFixed(1)}%
    </span>
  );
};

const Sparkline = ({ values, title }: { values: Array<number | null>; title: string }) => {
  const pts = values.map((v, i) => ({ v, i }));
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2) return <div className="h-8 text-[11px] text-ink/30 flex items-end">Sin serie suficiente</div>;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const w = 120, h = 32;
  const d = pts
    .map(({ v, i }, k) => {
      if (v == null) return null;
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      const prev = k > 0 ? pts[k - 1].v : null;
      return `${prev == null ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-ink/60" role="img" aria-label={title}>
      <title>{title}</title>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

/** Estado de carga propio de un bloque secundario. */
type EstadoBloque = { cargando: boolean; error: boolean; vacio: boolean };

/**
 * Indicador de bloque: etiqueta «Actualizando…» mientras su propia query esté
 * pendiente o refrescando, y su propio error si falla. Independiente del
 * indicador global de cabecera.
 */
const BloqueEstado = ({ estado, nombre }: { estado: EstadoBloque; nombre: string }) => {
  if (estado.error) {
    return (
      <p data-testid={`error-${nombre}`} className="text-[11px] text-red-700 inline-flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3" aria-hidden /> No se ha podido cargar este bloque.
      </p>
    );
  }
  if (!estado.cargando) return null;
  return (
    <p data-testid={`actualizando-${nombre}`} className="text-[11px] text-ink/40 inline-flex items-center gap-1.5">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Actualizando…
    </p>
  );
};

/** Esqueleto propio del bloque mientras no hay ningún dato que mostrar. */
const BloqueSkeleton = ({ alto = "h-24", nombre }: { alto?: string; nombre: string }) => (
  <div
    data-testid={`skeleton-${nombre}`}
    aria-busy="true"
    className={`${alto} rounded-xl border border-black/[0.06] bg-black/[0.02] animate-pulse`}
  />
);

const TargetChip = ({ tipo }: { tipo: keyof typeof LABEL_TARGET }) => (

  <span
    className="inline-flex items-center rounded-full border border-black/[0.08] bg-black/[0.02] px-2 py-0.5 text-[10px] text-ink/60 cursor-help"
    title={DESC_TARGET[tipo]}
  >
    {LABEL_TARGET[tipo]}
  </span>
);

const DominioChip = ({ id }: { id: string }) => {
  const { dominio } = useDataQuality();
  const d: DominioDato | undefined = dominio(id);
  if (!d) return null;
  return (
    <div
      className="border border-black/[0.06] rounded-xl bg-black/[0.01] p-3 cursor-help"
      title={`${d.detalle} — ver Calidad de datos`}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 flex items-center gap-1.5">
        <span aria-hidden>{GLIFO_DOMINIO[d.estado]}</span>
        {d.dominio}
      </p>
      <p className="text-sm text-ink/50 mt-1">{LABEL_ESTADO_DOMINIO[d.estado]}</p>
      <Link to="/operaciones/calidad-datos" className="text-[11px] text-ink/40 underline underline-offset-2 mt-1 inline-block">
        Ver Calidad de datos
      </Link>
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { rpcParams, filters, prevRange, modo, sinComparable } = useOpsFilters();
  const { dominios, dominio: dominioDq } = useDataQuality();
  const [showEvo, setShowEvo] = useState(false);
  const [showDefs, setShowDefs] = useState(false);

  // ARQUITECTURA DE CARGA EN DOS ETAPAS.
  // CRÍTICO: lo que sostiene la Situation Line y el balance (KPIs + panorama
  // resumen, sin series). SECUNDARIO: series, alertas, equipos, scorecard y
  // supply, que se habilitan cuando el crítico ya está en pantalla.
  const { criticos, secundarios: especSecundarios } = useMemo(() => {
    const prev = prevRange;
    const dims = {
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
    const scoreParams: Record<string, unknown> = { p_from: rpcParams.p_from, p_to: rpcParams.p_to, ...dims };
    delete scoreParams.p_tecnico;
    const scorePrevParams = { ...scoreParams, p_from: prev.from, p_to: prev.to };
    return {
      criticos: [
        { rpc: "ops_kpis", params: rpcParams },
        { rpc: "ops_kpis", params: prevRpc },
        { rpc: "ops_panorama_resumen", params: rpcParams },
        { rpc: "ops_panorama_resumen", params: prevRpc },
      ],
      secundarios: [
        { rpc: "ops_panorama_series", params: { ...rpcParams, p_meses: 12 } },
        { rpc: "ops_evolucion", params: dims },
        { rpc: "ops_alertas", params: rpcParams },
        { rpc: "ops_equipos", params: equipParams },
        { rpc: "ops_equipos", params: equipPrev },
        { rpc: "ops_tecnicos_scorecard", params: scoreParams },
        { rpc: "ops_tecnicos_scorecard", params: scorePrevParams },
        { rpc: "ops_supply_resumen", params: { ...rpcParams, p_prev_from: prev.from, p_prev_to: prev.to } },
      ],
    };
  }, [rpcParams, prevRange]);

  const qc = useOpsRpcs<unknown>(criticos);
  const criticoListo = qc.every((r) => !r.isPending);
  // El secundario arranca en cuanto el crítico deja de estar pendiente: nunca
  // compite con la primera pintura.
  const specsSec = useMemo(
    () => especSecundarios.map((s) => ({ ...s, enabled: criticoListo })),
    [especSecundarios, criticoListo],
  );
  const qs = useOpsRpcs<unknown>(specsSec);

  const loading = qc.some((r) => r.isPending);
  const cargandoSecundario = qs.some((r) => r.isPending || r.fetchStatus === "fetching");
  const kpis = (qc[0].data ?? null) as Kpis | null;
  const kpisPrev = (qc[1].data ?? null) as Kpis | null;
  const panoBase = (qc[2].data ?? null) as PanoramaPayload | null;
  const panoPrev = (qc[3].data ?? null) as PanoramaPayload | null;
  const serie = (qs[0].data ?? null) as { serie?: unknown[] } | null;
  // El resumen no trae series: se completan cuando llega la etapa secundaria.
  const pano = useMemo<PanoramaPayload | null>(
    () => (panoBase ? ({ ...panoBase, serie: (serie?.serie ?? []) } as PanoramaPayload) : null),
    [panoBase, serie],
  );
  const evo = useMemo(() => (qs[1].data ?? []) as EvoRow[], [qs[1].data]);
  const alertas = (qs[2].data ?? null) as Alertas | null;
  const equiposNow = useMemo(() => (qs[3].data ?? []) as EquipoRow[], [qs[3].data]);
  const equiposPrev = useMemo(() => (qs[4].data ?? []) as EquipoRow[], [qs[4].data]);
  const score = useMemo(() => (qs[5].data ?? []) as ScoreRow[], [qs[5].data]);
  const scorePrev = useMemo(() => (qs[6].data ?? []) as ScoreRow[], [qs[6].data]);
  // F4B · Supply manda sobre la etapa derivada para la cifra de espera de pieza.
  const supply = useMemo<SupplyPayload | null>(
    () => (qs[7].error || !qs[7].data ? null : normalizarSupply(qs[7].data)),
    [qs[7].data, qs[7].error],
  );

  // UX POR BLOQUE. Cada bloque secundario expone su propio estado: mientras su
  // query esté pendiente o refrescando muestra su esqueleto / etiqueta
  // «Actualizando…», y si falla muestra su propio error. Ninguno bloquea el
  // render de Situation Line / A / B1, que dependen solo de la tanda crítica.
  const estadoDe = (...idx: number[]): EstadoBloque => {
    const rs = idx.map((i) => qs[i]).filter(Boolean);
    return {
      cargando: rs.some((r) => (r.isPending && !r.data) || r.fetchStatus === "fetching"),
      error: rs.some((r) => !!r.error),
      vacio: rs.every((r) => !r.data),
    };
  };
  const stSeries = estadoDe(0, 1);
  const stCapacidad = estadoDe(5, 6);
  const stFlujo = estadoDe(7);
  const stAtencion = estadoDe(2, 3, 4, 5, 6, 7);
  const stComparativa = estadoDe(3, 4);




  const hayComparable = !sinComparable && !!kpisPrev;

  const balance: Balance | null = useMemo(() => {
    if (!pano?.balance) return null;
    const b = pano.balance;
    return {
      backlogIni: Number(b.backlog_ini ?? 0),
      entrantes: Number(b.entrantes ?? 0),
      reparadas: Number(b.reparadas ?? 0),
      bajas: Number(b.bajas ?? 0),
      backlogFin: Number(b.backlog_fin ?? 0),
      sinFechaCreacion: Number(b.sin_fecha_creacion ?? 0),
    };
  }, [pano]);

  const balancePrev: Balance | null = useMemo(() => {
    if (!panoPrev?.balance || !hayComparable) return null;
    const b = panoPrev.balance;
    return {
      backlogIni: Number(b.backlog_ini ?? 0),
      entrantes: Number(b.entrantes ?? 0),
      reparadas: Number(b.reparadas ?? 0),
      bajas: Number(b.bajas ?? 0),
      backlogFin: Number(b.backlog_fin ?? 0),
      sinFechaCreacion: Number(b.sin_fecha_creacion ?? 0),
    };
  }, [panoPrev, hayComparable]);

  const etapas = useMemo(() => agruparEtapasPanorama(pano?.etapas ?? []), [pano]);
  const etapasPrev = useMemo(() => agruparEtapasPanorama(panoPrev?.etapas ?? []), [panoPrev]);

  const conclusiones: Conclusion[] = useMemo(() => {
    if (!kpis) return [];
    const prevByTec = new Map(scorePrev.map((r) => [r.tecnico, r] as const));
    const acc = new Map<string, { b: number; c: number }>();
    for (const r of score.filter((x) => x.activo)) {
      const cur = acc.get(r.delegacion) ?? { b: 0, c: 0 };
      cur.b += r.pct_bajas * r.cerradas;
      cur.c += r.cerradas;
      acc.set(r.delegacion, cur);
    }
    const mediaByDeleg = new Map<string, number>();
    for (const [k, v] of acc) mediaByDeleg.set(k, v.c > 0 ? v.b / v.c : 0);
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
    const nowMin: KpisMin = { cerradas: kpis.cerradas, bajas: kpis.bajas, pct_bajas: kpis.pct_bajas };
    const prevMin: KpisMin | null = kpisPrev
      ? { cerradas: kpisPrev.cerradas, bajas: kpisPrev.bajas, pct_bajas: kpisPrev.pct_bajas }
      : null;
    return generarConclusiones(nowMin, prevMin, equiposNow, equiposPrev, tecnicosConcl);
  }, [kpis, kpisPrev, score, scorePrev, equiposNow, equiposPrev]);

  const ratioAct = kpis ? ratioBajas(kpis.bajas, kpis.cerradas) : null;
  const ratioPre = kpisPrev && hayComparable ? ratioBajas(kpisPrev.bajas, kpisPrev.cerradas) : null;

  const asuntos: Asunto[] = useMemo(() => {
    if (!kpis || !balance) return [];
    return construirAsuntos({
      universo: balance.backlogIni + balance.entrantes,
      hayComparable,
      balance,
      abiertas: kpis.abiertas_total,
      abiertas30: kpis.abiertas_30,
      referencia20: kpis.pct_sla20 ?? null,
      referencia20Prev: hayComparable ? (kpisPrev?.pct_sla20 ?? null) : null,
      ratioBajas: ratioAct,
      ratioBajasPrev: ratioPre,
      etapas,
      caidas: alertas?.caidas ?? [],
      calidadTec: alertas?.calidad ?? [],
      provincias: alertas?.provincias ?? [],
      conclusiones,
      supplyPte: supply
        ? {
            n: supply.pte_piezas_actual.n,
            n30: supply.pte_piezas_actual.n30,
            edad_media: supply.pte_piezas_actual.edad_media,
            n_prev: supply.pte_piezas_actual.n_prev,
            asOf: supply.as_of,
            topClientes: supply.pte_piezas_actual.por_cliente_contractual
              .slice(0, 3)
              .map((c) => ({ cliente: c.entidad, n: c.n })),
          }
        : null,

    });
  }, [kpis, kpisPrev, balance, hayComparable, etapas, alertas, conclusiones, ratioAct, ratioPre, supply]);

  if (loading || !kpis) {
    // Esqueleto inmediato: el crítico (KPIs + balance) es lo único que bloquea.
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando panorama">
        <div className="h-6 w-2/3 rounded bg-black/[0.06]" />
        <div className="h-4 w-1/3 rounded bg-black/[0.04]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-black/[0.06] bg-black/[0.02]" />
          ))}
        </div>
        <div className="h-40 rounded-2xl border border-black/[0.06] bg-black/[0.02]" />
      </div>
    );
  }


  const periodoLbl = labelPeriodo(filters.from, filters.to);
  const comparadaLbl = hayComparable ? labelComparativa(filters.from, filters.to, modo).split(" vs. ")[1] ?? null : null;
  const vBacklog =
    balance && balancePrev ? variacion(balance.backlogFin, balancePrev.backlogFin).pct : null;
  const vSla = hayComparable ? variacion(kpis.pct_sla20, kpisPrev?.pct_sla20 ?? null).pct : null;
  const vAb30 = hayComparable ? variacion(kpis.abiertas_30, kpisPrev?.abiertas_30 ?? null).pct : null;
  const vRatio = variacion(ratioAct, ratioPre).pct;
  const vNff = hayComparable ? variacion(kpis.pct_nff, kpisPrev?.pct_nff ?? null).pct : null;

  const serieBacklog = (pano?.serie ?? []).map((s) => s.backlog);
  const serieSla = (pano?.serie ?? []).map((s) => (s.pct_sla20 == null ? null : Number(s.pct_sla20)));

  const maxCer = Math.max(1, ...evo.map((e) => Math.max(e.creadas, e.cerradas)));
  const totalAbiertas = etapas.reduce((s, e) => s + e.n, 0);

  // Capacidad disponible hoy (sin normalizar por tiempo de trabajo efectivo)
  const activosConProduccion = score.filter((r) => r.activo && r.cerradas > 0).length;
  const cierresPorTecnico = activosConProduccion > 0 ? kpis.cerradas / activosConProduccion : null;
  const entrantesPorTecnico =
    activosConProduccion > 0 && balance ? balance.entrantes / activosConProduccion : null;

  return (
    <div className="space-y-12">
      <header>
        <Eyebrow>Cuadro de mando</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink mt-2">Panorama operativo</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Vista global de la red HIPERSERVICE y SATs externos. Se excluye &quot;ANULADO AVISO&quot; y las OTs anuladas.
        </p>
        {cargandoSecundario && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink/40">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Completando análisis (series, equipos y supply)…
          </p>
        )}
      </header>



      <DataAsOf className="mt-3" cruza={["pieza_solicitud", "expedicion"]} />

      {/* 0 — EXECUTIVE SITUATION LINE */}
      <p className="text-[13px] text-ink/70 leading-relaxed border-l-2 border-ink/15 pl-4">
        {situationLine({
          periodoLabel: periodoLbl,
          comparadaLabel: comparadaLbl,
          totalOts: balance ? balance.entrantes : kpis.creadas,
          backlogFin: balance?.backlogFin ?? null,
          varBacklogPct: vBacklog,
          referencia20: kpis.pct_sla20 ?? null,
          nAsuntos: asuntos.length,
          asOf: supply?.as_of ?? null,
        })}
      </p>

      {/* A — DEMANDA & OUTPUT */}
      <section>
        <Eyebrow>A · Demanda y output</Eyebrow>
        <div className="mt-3 border border-black/[0.06] rounded-2xl bg-white p-6">
          {balance ? (
            <>
              <div className="flex flex-wrap items-stretch gap-3">
                <FlowBox label="Backlog inicial" value={fmtNum(balance.backlogIni)} tone="ink" />
                <Op>+</Op>
                <FlowBox label="Entrantes" value={fmtNum(balance.entrantes)} tone="ink" />
                <Op>−</Op>
                <FlowBox label="Reparadas" value={fmtNum(balance.reparadas)} tone="ok" />
                <Op>−</Op>
                <FlowBox label="Bajas" value={fmtNum(balance.bajas)} tone="warn" sub="No son reparaciones" />
                <Op>=</Op>
                <FlowBox
                  label="Backlog final"
                  value={fmtNum(balance.backlogFin)}
                  tone="ink"
                  delta={<Delta v={vBacklog} favorable="down" />}
                />
              </div>

              <p className="text-sm text-ink/70 mt-5 leading-relaxed">{lecturaBalance(balance)}</p>
              {!cuadraBalance(balance) && (
                <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  La ecuación no cuadra por {fmtNum(Math.abs(descuadreBalance(balance)))} OTs (fechas incompletas en el origen).
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-[11px] text-ink/50 mb-1">Backlog a fin de mes · últimos {ventanaPropia("panorama_backlog").meses} meses</p>
                  <Sparkline values={serieBacklog} title="Evolución del backlog a fin de mes" />
                  <p className="text-[10px] text-ink/40 italic mt-1">
                    {etiquetaVentana("panorama_backlog")}
                  </p>
                </div>
                <div className="text-[12px] text-ink/60">
                  <p>
                    Peso de las bajas sobre la salida: <span className="tabular-nums text-ink">{fmtPct(pctBajasSalida(balance))}</span>
                  </p>
                  <Link to="/operaciones/sla" className="inline-flex items-center gap-1 text-ink/60 hover:text-ink mt-1">
                    Ver SLA y envejecimiento <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/40">Sin datos de balance en el período seleccionado.</p>
          )}

          <button
            onClick={() => setShowEvo((s) => !s)}
            className="mt-6 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors"
          >
            {showEvo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Evolución últimos {ventanaPropia("panorama_evolucion").meses} meses
          </button>
          {showEvo && (
            <div className="mt-4">
              <p className="text-[11px] text-ink/40 italic mb-3">
                {etiquetaVentana("panorama_evolucion")}
              </p>
              <div className="flex items-end gap-1.5 h-40">
                {evo.map((e) => (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-32">
                      <div className="flex-1 bg-ink/70 rounded-t-sm" style={{ height: `${(e.creadas / maxCer) * 100}%` }} title={`Creadas: ${e.creadas}`} />
                      <div className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${(e.cerradas / maxCer) * 100}%` }} title={`Cerradas: ${e.cerradas} · ≤20d ${fmtPct(e.pct_sla20)} · Bajas ${fmtPct(e.pct_bajas)}`} />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-ink/40">
                      {new Date(e.mes).toLocaleString("es-ES", { month: "short", year: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-ink/60 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-ink/70 rounded-sm" /> Creadas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500 rounded-sm" /> Cerradas</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* B — SERVICIO & CALIDAD */}
      <section className="space-y-4">
        <Eyebrow>B · Servicio y calidad</Eyebrow>

        {/* B1 · Performance operativa */}
        <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">B1 · Performance operativa</p>
            <TargetChip tipo="operational_reference" />
          </div>

          <div className="flex flex-wrap items-end gap-8">
            <div>
              <p className="text-[11px] text-ink/50">Resolución ≤20 días</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="font-display text-4xl tabular-nums text-ink tracking-tight">{fmtPct(kpis.pct_sla20)}</p>
                <Delta v={vSla} favorable="up" />
              </div>
              <p className="text-[11px] text-ink/50 mt-1">{ETIQUETA_REFERENCIA_OPERATIVA}</p>
              <Link to="/operaciones/sla" className="inline-flex items-center gap-1 text-[11px] text-ink/60 hover:text-ink mt-1">
                Ver detalle <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div>
              <p className="text-[11px] text-ink/50 mb-1">Serie mensual de resolución ≤20d</p>
              <Sparkline values={serieSla} title="Evolución de la resolución ≤20 días" />
              <p className="text-[10px] text-ink/40 italic mt-1">{etiquetaVentana("panorama_resolucion")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <MiniMetric
              label="Abiertas +30 días"
              value={fmtNum(kpis.abiertas_30)}
              delta={<Delta v={vAb30} favorable="down" />}
              tipo="operational_reference"
              def="OTs abiertas cuya antigüedad desde la fecha de creación supera 30 días naturales. Referencia operativa de WG, no un límite contractual."
              to="/operaciones/sla"
            />
            <MiniMetric
              label="Ratio de bajas"
              value={fmtPct(ratioAct)}
              delta={<Delta v={vRatio} favorable="down" />}
              tipo="historical_benchmark"
              def="Bajas sobre cierres del período. Se interpreta contra el benchmark histórico del mix familia × cliente: en frío la baja estructural es alta y no indica mal rendimiento."
              to="/operaciones/delegaciones"
            />
            <MiniMetric
              label="NFF (sin avería)"
              value={fmtPct(kpis.pct_nff)}
              delta={<Delta v={vNff} favorable="down" />}
              tipo="historical_benchmark"
              def="OTs con incidencia 'NO PRESENTA AVERIA' sobre cierres. Distinto de baja: el aparato funcionaba correctamente."
              to="/operaciones/delegaciones"
            />
          </div>

          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 mb-2">Pendiente de fuente de datos</p>
            <div className="flex flex-wrap gap-2 text-[12px] text-ink/40">
              {["ftf", "reincidencias", "csat"].map((id) => {
                const d = dominioDq(id);
                return d ? (
                  <span key={id} className="inline-flex items-center gap-1.5 border border-black/[0.06] rounded-full px-2.5 py-1 cursor-help" title={d.detalle}>
                    <span aria-hidden>{GLIFO_DOMINIO[d.estado]}</span>{d.dominio}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* B2 · Cumplimiento contractual */}
        <div className="border border-black/[0.06] rounded-2xl bg-black/[0.015] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-3.5 w-3.5 text-ink/40" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">B2 · Cumplimiento contractual</p>
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink/40 border border-black/[0.08] rounded-full px-2 py-0.5">
              Pendiente de data readiness
            </span>
          </div>
          <p className="text-[13px] text-ink/60 leading-relaxed max-w-3xl">
            Cada OT debe evaluarse contra la regla contractual de su cliente, programa, gama y tipología: horas o días,
            hábiles o naturales, clock-start propio, exclusiones e imputabilidad. Los datos actuales no permiten asignar
            con certeza la regla aplicable a cada OT, por lo que WG no muestra aquí ningún porcentaje de cumplimiento:
            sería inventado.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-ink/30">
            {["WG", "Business Line", "Cliente", "Programa", "Gama / Tipología", "KPI", "OT"].map((n, idx, arr) => (
              <span key={n} className="inline-flex items-center gap-1.5">
                <span className="border border-dashed border-black/[0.12] rounded-full px-2 py-0.5">{n}</span>
                {idx < arr.length - 1 && <span aria-hidden>›</span>}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-ink/50 mt-4">
            Potencial exposición contractual asociada: <span className="text-ink/70">identificada de forma cualitativa, pendiente de validar el Registry</span>.
          </p>
          <Link to="/operaciones/calidad-datos" className="inline-flex items-center gap-1 text-[12px] text-ink/60 hover:text-ink mt-3">
            Ver Calidad de datos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* C — CAPACIDAD & PRODUCTIVIDAD */}
      <section>
        <Eyebrow>C · Capacidad y productividad</Eyebrow>
        <div className="mt-3 border border-black/[0.06] rounded-2xl bg-white p-6">
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="Técnicos activos con producción" value={fmtNum(activosConProduccion)} />
            <Stat label="Cierres por técnico activo" value={fmtDec(cierresPorTecnico, 1)} />
            <Stat label="Carga entrante por técnico activo" value={fmtDec(entrantesPorTecnico, 1)} />
          </div>
          <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-4 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            No normalizado por tiempo de trabajo efectivo: no hay días trabajados ni ausencias completos. No es una medida
            de productividad real.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {["fte_disponibles", "dias_trabajados", "produccion_fte_dia", "utilizacion"].map((id) => (
              <DominioChip key={id} id={id} />
            ))}
          </div>
        </div>
      </section>

      {/* D — FLUJO & CUELLOS DE BOTELLA */}
      <section>
        <Eyebrow>D · Flujo y cuellos de botella</Eyebrow>
        <div className="mt-3 border border-black/[0.06] rounded-2xl bg-white p-6">
          <p className="text-[12px] text-ink/50 mb-4">
            Reparto de las OTs que están <strong className="text-ink/70">actualmente en cada etapa</strong>. Sin historial
            de estados no es posible medir cuánto tiempo pasa una OT en una etapa concreta.
          </p>
          {totalAbiertas === 0 ? (
            <p className="text-sm text-ink/40">Sin OTs abiertas con los filtros activos.</p>
          ) : (
            <>
              <div className="flex h-8 w-full rounded-lg overflow-hidden border border-black/[0.06]">
                {etapas.map((e, idx) => (
                  <div
                    key={e.categoria}
                    className={ETAPA_BG[idx % ETAPA_BG.length]}
                    style={{ width: `${(e.n / totalAbiertas) * 100}%` }}
                    title={`${LABEL_CATEGORIA[e.categoria]}: ${fmtNum(e.n)} OTs`}
                  />
                ))}
              </div>
              <table className="w-full text-[13px] mt-4">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-ink/40">
                    <th className="py-2 font-semibold">Etapa actual</th>
                    <th className="py-2 font-semibold text-right">OTs</th>
                    <th className="py-2 font-semibold text-right">% del backlog</th>
                    <th className="py-2 font-semibold text-right">Antigüedad media</th>
                    <th className="py-2 font-semibold text-right">vs período anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {etapas.map((e, idx) => {
                    const p = etapasPrev.find((x) => x.categoria === e.categoria);
                    const v = p && hayComparable ? variacion(e.n, p.n).pct : null;
                    const esRepuesto = e.categoria === "esperando_repuesto";
                    return (
                      <tr key={e.categoria}>
                        <td className="py-2">
                          <span className={`inline-block h-2 w-2 rounded-sm mr-2 align-middle ${ETAPA_BG[idx % ETAPA_BG.length]}`} />
                          {esRepuesto ? (
                            <Link to="/operaciones/repuestos" className="text-ink underline underline-offset-2 hover:text-ink/70">
                              {LABEL_CATEGORIA[e.categoria]}
                            </Link>
                          ) : (
                            LABEL_CATEGORIA[e.categoria]
                          )}
                        </td>
                        <td className="py-2 text-right tabular-nums">{fmtNum(e.n)}</td>
                        <td className="py-2 text-right tabular-nums text-ink/60">{fmtPct(e.n / totalAbiertas)}</td>
                        <td className="py-2 text-right tabular-nums text-ink/60">{e.edadMedia == null ? "—" : `${fmtDec(e.edadMedia, 1)} d`}</td>
                        <td className="py-2 text-right"><Delta v={v} favorable="down" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </section>

      {/* E — MANAGEMENT ATTENTION */}
      <section>
        <Eyebrow>E · Asuntos que requieren atención</Eyebrow>
        <div className="mt-3 border border-black/[0.06] rounded-2xl bg-white divide-y divide-black/[0.05]">
          {asuntos.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/40">Sin desviaciones materiales en el período con los filtros activos.</p>
          )}
          {asuntos.map((a) => (
            <article key={a.fenomeno} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink flex-1 min-w-[16rem]">{a.titulo}</p>
                <span className="text-[10px] uppercase tracking-[0.12em] rounded-full border border-black/[0.08] px-2 py-0.5 text-ink/60">
                  Impacto: {LABEL_IMPACTO[a.impacto]}
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] rounded-full border border-black/[0.08] px-2 py-0.5 text-ink/60">
                  Confianza: {LABEL_CONFIANZA[a.confianza]}
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-[13px]">
                <div className="flex gap-2"><dt className="text-ink/40 w-20 shrink-0">Hecho</dt><dd className="text-ink/80">{a.hecho}</dd></div>
                <div className="flex gap-2"><dt className="text-ink/40 w-20 shrink-0">Hipótesis</dt><dd className="text-ink/60">{a.hipotesis}</dd></div>
                <div className="flex gap-2"><dt className="text-ink/40 w-20 shrink-0">Acción</dt><dd className="text-ink/60">{a.accion}</dd></div>
              </dl>
              <Link to={a.destino} className="inline-flex items-center gap-1 text-[12px] text-ink/60 hover:text-ink mt-2">
                {a.destinoLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            </article>
          ))}
        </div>
        <p className="text-[11px] text-ink/40 mt-3 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Nunca sugerir reducción de incentivo sin revisar carga, territorio, ausencias y causas externas.
        </p>
      </section>

      {/* Definiciones */}
      <section>
        <button
          onClick={() => setShowDefs((s) => !s)}
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 hover:text-ink transition-colors mb-3"
        >
          {showDefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Definición de métricas y limitaciones
        </button>
        {showDefs && (
          <div className="border border-black/[0.06] rounded-2xl bg-white p-5 text-[13px] text-ink/70 space-y-4">
            <div>
              <p className="text-ink font-medium mb-1">Performance operativa vs. cumplimiento contractual</p>
              <p>
                No existe un &quot;SLA WG&quot; universal: cada cliente y programa tiene reglas propias (horas o días,
                hábiles o naturales, clock-start, hard limits, reglas agregadas). Los indicadores ≤20d y +30d de esta
                página son <strong className="text-ink">referencia operativa de WG</strong> para comparar equipos, gamas y
                delegaciones y observar la evolución. No son objetivos contractuales.
              </p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Taxonomía de targets</p>
              <ul className="space-y-1">
                {(Object.keys(LABEL_TARGET) as Array<keyof typeof LABEL_TARGET>).map((k) => (
                  <li key={k}><strong className="text-ink">{LABEL_TARGET[k]}</strong>: {DESC_TARGET[k]}</li>
                ))}
              </ul>
              <p className="mt-1 text-ink/60">Una variación negativa sin target aplicable se muestra neutra-informativa, nunca como &quot;mala&quot; automáticamente.</p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Ecuación de balance</p>
              <p>
                Backlog inicial (OTs creadas antes del período y aún abiertas al empezar) + entrantes − reparadas − bajas
                = backlog final. Reparadas y bajas se muestran siempre por separado: reducir backlog dando de baja
                aparatos no equivale a repararlos.
              </p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Etapa actual, no duración por etapa</p>
              <p>
                ops_fact_ot guarda solo el estado actual de cada OT. El bloque de flujo indica en qué etapa están
                <em> actualmente</em> las OTs abiertas. Con historial de estados este bloque pasará a tiempo real por etapa
                e imputabilidad (tiempo total vs. imputable a WG vs. bloqueado por dependencia externa, según la regla del
                Registry contractual — sin pausar relojes automáticamente).
              </p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Reglas de priorización de los asuntos</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                {REGLAS_PRIORIZACION.map((r) => <li key={r}>{r}</li>)}
              </ol>
              <p className="mt-1 text-ink/60">Un fenómeno = un asunto: señales distintas sobre el mismo hecho se fusionan y deduplican. Máximo 6 asuntos.</p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Período de comparación</p>
              <p>{labelComparativa(filters.from, filters.to, modo)}. {sinComparable && "El período de comparación cae fuera de los datos cargados: las variaciones se muestran como «—», nunca como cero."}</p>
            </div>
            <div>
              <p className="text-ink font-medium mb-1">Dominios de dato pendientes</p>
              <ul className="space-y-0.5">
                {dominios.filter((d) => d.estado !== "disponible").map((d) => (
                  <li key={d.id}>
                    <span aria-hidden className="mr-1">{GLIFO_DOMINIO[d.estado]}</span>
                    <strong className="text-ink">{d.dominio}</strong> — {d.medida ?? d.detalle}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-ink/50 italic">Todos los valores proceden de <code className="text-[12px]">ops_fact_ot</code> importado. No hay datos simulados.</p>
          </div>
        )}
      </section>
    </div>
  );
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────
const ETAPA_BG = [
  "bg-ink/70", "bg-ink/50", "bg-amber-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-400", "bg-red-400", "bg-ink/25",
];

const Op = ({ children }: { children: React.ReactNode }) => (
  <span className="self-center text-lg text-ink/30 tabular-nums px-0.5" aria-hidden>{children}</span>
);

const FlowBox = ({
  label, value, tone, sub, delta,
}: {
  label: string; value: string; tone: "ink" | "ok" | "warn"; sub?: string; delta?: React.ReactNode;
}) => {
  const accent = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-ink";
  return (
    <div className="flex-1 min-w-[8.5rem] border border-black/[0.06] rounded-xl p-4">
      <div className={`h-[2px] w-6 mb-3 ${accent}`} />
      <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="font-display text-2xl tabular-nums text-ink tracking-tight">{value}</p>
        {delta}
      </div>
      {sub && <p className="text-[10px] text-ink/40 mt-1">{sub}</p>}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-black/[0.06] rounded-xl p-4">
    <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40">{label}</p>
    <p className="font-display text-2xl tabular-nums text-ink mt-1">{value}</p>
  </div>
);

const MiniMetric = ({
  label, value, delta, tipo, def, to,
}: {
  label: string; value: string; delta: React.ReactNode;
  tipo: keyof typeof LABEL_TARGET; def: string; to: string;
}) => (
  <div className="border border-black/[0.06] rounded-xl p-4">
    <p className="text-[10px] uppercase tracking-[0.12em] text-ink/40 cursor-help" title={def}>{label}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <p className="text-xl tabular-nums text-ink">{value}</p>
      {delta}
    </div>
    <div className="mt-2 flex items-center gap-2">
      <TargetChip tipo={tipo} />
      <Link to={to} className="text-[11px] text-ink/40 hover:text-ink">Detalle</Link>
    </div>
  </div>
);

export default Dashboard;
