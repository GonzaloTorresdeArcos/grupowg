/**
 * ops-supply.ts — Motor puro de SUPPLY & FULFILMENT (F4A del plan V2).
 *
 * Cadena modelada:
 *   OT → necesidad de pieza → solicitud → disponibilidad → picking →
 *   expedición → entrega → montaje/reparación → cierre
 *
 * PRINCIPIOS NO NEGOCIABLES
 *  - PROHIBIDO cualquier dato simulado, de demo o de ejemplo. Si una etapa no
 *    tiene fuente, se declara `pendiente` y NO se emite ninguna cifra (ni 0).
 *  - Un lead time solo cuenta cuando AMBAS fechas existen. Una fecha ausente no
 *    cuenta como 0: se excluye del denominador.
 *  - ≤20 días es SIEMPRE "Referencia operativa WG (no contractual)".
 *  - La exposición contractual por falta de repuesto se declara cualitativa:
 *    sin importes y sin % de cumplimiento.
 *
 * Sin React, sin red, sin dependencias externas.
 */

import { resolverClienteContractual, type ClienteAlias, type ReglaPatron } from "@/lib/ops-cliente-alias";
import { fmtFechaEs } from "@/lib/ops-as-of";
import type { ReglaSla } from "@/lib/ops-contractual";

// ─── Etapas de la cadena ─────────────────────────────────────────────────────

export type EtapaCadena =
  | "necesidad"
  | "solicitud"
  | "disponibilidad"
  | "picking"
  | "expedicion"
  | "entrega"
  | "montaje"
  | "cierre";

export const ETAPAS_CADENA: readonly EtapaCadena[] = [
  "necesidad", "solicitud", "disponibilidad", "picking", "expedicion", "entrega", "montaje", "cierre",
] as const;

export const LABEL_ETAPA: Record<EtapaCadena, string> = {
  necesidad: "Necesidad de pieza",
  solicitud: "Solicitud",
  disponibilidad: "Disponibilidad",
  picking: "Picking",
  expedicion: "Expedición",
  entrega: "Entrega",
  montaje: "Montaje / reparación",
  cierre: "Cierre de la OT",
};

/** Fuente de dato que sostiene cada etapa. */
export const FUENTE_ETAPA: Record<EtapaCadena, string> = {
  necesidad: "ops_fact_ot.tiene_piezas",
  solicitud: "ops_pieza_solicitud.fecha_solicitud",
  disponibilidad: "ops_pieza_solicitud.fecha_disponibilidad",
  picking: "ops_pieza_solicitud.fecha_picking",
  expedicion: "ops_expedicion.fecha_expedicion",
  entrega: "ops_expedicion.fecha_entrega_real",
  montaje: "ops_pieza_solicitud.fecha_montaje",
  cierre: "ops_fact_ot.fecha_cierre",
};

export type EstadoFuente = "disponible" | "parcial" | "pendiente";

export const GLIFO_FUENTE: Record<EstadoFuente, string> = {
  disponible: "●",
  parcial: "◐",
  pendiente: "○",
};

export const LABEL_FUENTE: Record<EstadoFuente, string> = {
  disponible: "Disponible",
  parcial: "Parcial",
  pendiente: "Pendiente",
};

// ─── Payload de la RPC ops_supply ────────────────────────────────────────────

export type EntidadDemanda = { entidad: string; ots: number; con_pieza: number; pct: number | null };
export type EntidadPte = { entidad: string; n: number; edad_media: number | null; n30: number };

export type BloqueDemanda = {
  ots: number;
  con_pieza: number;
  pct: number | null;
  por_cliente: EntidadDemanda[];
  por_gama: EntidadDemanda[];
  por_delegacion: EntidadDemanda[];
  por_sat: EntidadDemanda[];
  por_provincia: EntidadDemanda[];
};

export type BloquePte = {
  n: number;
  n_prev: number;
  n30: number;
  edad_media: number | null;
  abiertas_total: number;
  buckets: Record<string, number>;
  por_cliente: EntidadPte[];
  /**
   * F4B · Agrupación por CLIENTE CONTRACTUAL resuelto por alias en la propia RPC.
   * Es la única agrupación válida para dirección: `cliente_wg` mezcla razones
   * sociales distintas y separa las que comparten contrato.
   */
  por_cliente_contractual: EntidadPte[];
  por_gama: EntidadPte[];
  por_delegacion: EntidadPte[];
  por_sat: EntidadPte[];
  por_provincia: EntidadPte[];
};

export type GrupoConversion = {
  n: number;
  dias_medio: number | null;
  dias_mediana: number | null;
  pct_20d: number | null;
  pct_bajas: number | null;
  pct_nff: number | null;
};

export type BloqueConversion = { con_pieza?: GrupoConversion; sin_pieza?: GrupoConversion };

/** Fila cruda del desglose de conversión por gama que devuelve la RPC. */
export type FilaConversionGama = GrupoConversion & { gama: string; grupo: "con_pieza" | "sin_pieza" };

export type LeadTimeCrudo = { n: number; medio: number | null; mediana: number | null };

export type BloqueCadena = {
  solicitudes: number;
  expediciones: number;
  stock_filas: number;
  ots_con_pieza_periodo: number;
  ots_con_pieza_trazadas: number;
  etapas: Record<string, number>;
  expediciones_estado: Record<string, number>;
  lead_times: Record<string, LeadTimeCrudo>;
};

export type SupplyPayload = {
  /**
   * F4B · Fecha efectiva del dato operativo. Todas las antigüedades del bloque
   * PTE. PIEZAS están medidas contra ella, NO contra el día de hoy.
   */
  as_of: string | null;
  rango: { from: string; to: string; prev_from: string; prev_to: string };
  pieza_demanda: BloqueDemanda;
  pieza_demanda_prev: { ots: number; con_pieza: number; pct: number | null };
  pte_piezas_actual: BloquePte;
  conversion: BloqueConversion;
  conversion_prev: BloqueConversion;
  conversion_por_gama: FilaConversionGama[];
  exposicion_pieza: Array<{ cliente_wg: string; n: number; n30: number }>;
  cadena: BloqueCadena;
};


export const BUCKETS_ANTIGUEDAD: readonly string[] = ["0-5", "6-10", "11-20", "21-30", "31-45", "46-60", ">60"];

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, number> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, number>) : {};
const numOrNull = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));
const int = (v: unknown): number => (v == null ? 0 : Number(v) || 0);

const normDemanda = (v: unknown): EntidadDemanda[] =>
  arr<Record<string, unknown>>(v).map((x) => ({
    entidad: String(x.entidad ?? "(sin dato)"),
    ots: int(x.ots),
    con_pieza: int(x.con_pieza),
    pct: numOrNull(x.pct),
  }));

const normPte = (v: unknown): EntidadPte[] =>
  arr<Record<string, unknown>>(v).map((x) => ({
    entidad: String(x.entidad ?? "(sin dato)"),
    n: int(x.n),
    edad_media: numOrNull(x.edad_media),
    n30: int(x.n30),
  }));

const normGrupo = (v: unknown): GrupoConversion | undefined => {
  if (!v || typeof v !== "object") return undefined;
  const g = v as Record<string, unknown>;
  return {
    n: int(g.n),
    dias_medio: numOrNull(g.dias_medio),
    dias_mediana: numOrNull(g.dias_mediana),
    pct_20d: numOrNull(g.pct_20d),
    pct_bajas: numOrNull(g.pct_bajas),
    pct_nff: numOrNull(g.pct_nff),
  };
};

/** Normaliza el jsonb de la RPC. Nunca inventa: lo ausente queda a 0 / null / []. */
export function normalizarSupply(raw: unknown): SupplyPayload {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dem = (r.pieza_demanda ?? {}) as Record<string, unknown>;
  const demPrev = (r.pieza_demanda_prev ?? {}) as Record<string, unknown>;
  const pte = (r.pte_piezas_actual ?? {}) as Record<string, unknown>;
  const cad = (r.cadena ?? {}) as Record<string, unknown>;
  const rango = (r.rango ?? {}) as Record<string, unknown>;
  const lt = (cad.lead_times ?? {}) as Record<string, unknown>;
  const leadTimes: Record<string, LeadTimeCrudo> = {};
  for (const [k, v] of Object.entries(lt)) {
    const o = (v ?? {}) as Record<string, unknown>;
    leadTimes[k] = { n: int(o.n), medio: numOrNull(o.medio), mediana: numOrNull(o.mediana) };
  }
  const conv = (r.conversion ?? {}) as Record<string, unknown>;
  const convPrev = (r.conversion_prev ?? {}) as Record<string, unknown>;

  return {
    as_of: r.as_of == null || r.as_of === "" ? null : String(r.as_of).slice(0, 10),
    rango: {
      from: String(rango.from ?? ""), to: String(rango.to ?? ""),
      prev_from: String(rango.prev_from ?? ""), prev_to: String(rango.prev_to ?? ""),
    },
    pieza_demanda: {
      ots: int(dem.ots), con_pieza: int(dem.con_pieza), pct: numOrNull(dem.pct),
      por_cliente: normDemanda(dem.por_cliente),
      por_gama: normDemanda(dem.por_gama),
      por_delegacion: normDemanda(dem.por_delegacion),
      por_sat: normDemanda(dem.por_sat),
      por_provincia: normDemanda(dem.por_provincia),
    },
    pieza_demanda_prev: { ots: int(demPrev.ots), con_pieza: int(demPrev.con_pieza), pct: numOrNull(demPrev.pct) },
    pte_piezas_actual: {
      n: int(pte.n), n_prev: int(pte.n_prev), n30: int(pte.n30),
      edad_media: numOrNull(pte.edad_media),
      abiertas_total: int(pte.abiertas_total),
      buckets: obj(pte.buckets),
      por_cliente: normPte(pte.por_cliente),
      por_cliente_contractual: normPte(pte.por_cliente_contractual),
      por_gama: normPte(pte.por_gama),
      por_delegacion: normPte(pte.por_delegacion),
      por_sat: normPte(pte.por_sat),
      por_provincia: normPte(pte.por_provincia),
    },
    conversion: { con_pieza: normGrupo(conv.con_pieza), sin_pieza: normGrupo(conv.sin_pieza) },
    conversion_prev: { con_pieza: normGrupo(convPrev.con_pieza), sin_pieza: normGrupo(convPrev.sin_pieza) },
    conversion_por_gama: arr<Record<string, unknown>>(r.conversion_por_gama).map((x) => ({
      gama: String(x.gama ?? "(sin dato)"),
      grupo: x.grupo === "con_pieza" ? "con_pieza" : "sin_pieza",
      n: int(x.n),
      dias_medio: numOrNull(x.dias_medio),
      dias_mediana: numOrNull(x.dias_mediana),
      pct_20d: numOrNull(x.pct_20d),
      pct_bajas: numOrNull(x.pct_bajas),
      pct_nff: numOrNull(x.pct_nff),
    })),

    exposicion_pieza: arr<Record<string, unknown>>(r.exposicion_pieza).map((x) => ({
      cliente_wg: String(x.cliente_wg ?? "(sin dato)"),
      n: int(x.n), n30: int(x.n30),
    })),
    cadena: {
      solicitudes: int(cad.solicitudes),
      expediciones: int(cad.expediciones),
      stock_filas: int(cad.stock_filas),
      ots_con_pieza_periodo: int(cad.ots_con_pieza_periodo),
      ots_con_pieza_trazadas: int(cad.ots_con_pieza_trazadas),
      etapas: obj(cad.etapas),
      expediciones_estado: obj(cad.expediciones_estado),
      lead_times: leadTimes,
    },
  };
}

// ─── Lead times ──────────────────────────────────────────────────────────────

export type ParFechas = { desde: string | null | undefined; hasta: string | null | undefined };

export type LeadTime = {
  /** Nº de pares con AMBAS fechas presentes. Nunca incluye pares incompletos. */
  n: number;
  medio: number | null;
  mediana: number | null;
};

export const medianaNum = (xs: readonly number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Días entre dos fechas consecutivas de la cadena. Solo cuentan los pares con
 * las DOS fechas informadas: una fecha ausente NO cuenta como 0, se excluye.
 */
export function calcularLeadTime(pares: readonly ParFechas[]): LeadTime {
  const dias: number[] = [];
  for (const p of pares) {
    if (!p.desde || !p.hasta) continue;
    const a = Date.parse(p.desde);
    const b = Date.parse(p.hasta);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    dias.push((b - a) / 86_400_000);
  }
  if (dias.length === 0) return { n: 0, medio: null, mediana: null };
  return {
    n: dias.length,
    medio: dias.reduce((x, y) => x + y, 0) / dias.length,
    mediana: medianaNum(dias),
  };
}

/** Tramos consecutivos de la cadena y la clave con la que llegan de la RPC. */
export const TRAMOS_CADENA: readonly { clave: string; desde: EtapaCadena; hasta: EtapaCadena }[] = [
  { clave: "necesidad_solicitud", desde: "necesidad", hasta: "solicitud" },
  { clave: "solicitud_disponibilidad", desde: "solicitud", hasta: "disponibilidad" },
  { clave: "disponibilidad_picking", desde: "disponibilidad", hasta: "picking" },
  { clave: "picking_expedicion", desde: "picking", hasta: "expedicion" },
  { clave: "expedicion_entrega", desde: "expedicion", hasta: "entrega" },
  { clave: "entrega_montaje", desde: "entrega", hasta: "montaje" },
  { clave: "montaje_cierre", desde: "montaje", hasta: "cierre" },
] as const;

/**
 * F4A.1 · La antigüedad de PTE. PIEZAS se calcula sobre la etapa ACTUAL de la
 * OT, no sobre el momento en que la pieza entró en espera. Es un PROXY.
 */
export const NOTA_PTE_PIEZAS =
  "Proxy de antigüedad, no tiempo real de espera de pieza: se mide desde la creación de la OT que está en PTE. PIEZAS hasta la FECHA EFECTIVA DEL DATO (no hasta hoy), no desde la fecha de solicitud del repuesto (ops_pieza_solicitud aún no la aporta).";


// ─── Readiness por etapa ─────────────────────────────────────────────────────

export type ReadinessEtapa = {
  etapa: EtapaCadena;
  label: string;
  fuente: string;
  estado: EstadoFuente;
  /** Frase con la medida real. Con fuente vacía, nunca contiene cifras de flujo. */
  medida: string;
  /** Lead time hacia la etapa siguiente. `null` cuando no hay fuente. */
  leadTime: LeadTime | null;
};

const UMBRAL_TRAZABILIDAD = 0.8;

/**
 * Estado de fuente por etapa a partir del payload real.
 * Con `ops_pieza_solicitud` / `ops_expedicion` vacías, TODAS las etapas
 * intermedias quedan `pendiente` y sin ninguna cifra.
 */
export function readinessCadena(c: BloqueCadena): ReadinessEtapa[] {
  const cobertura =
    c.ots_con_pieza_periodo > 0 ? c.ots_con_pieza_trazadas / c.ots_con_pieza_periodo : null;

  const estadoTabla = (filas: number): EstadoFuente => {
    if (filas === 0) return "pendiente";
    if (cobertura == null || cobertura < UMBRAL_TRAZABILIDAD) return "parcial";
    return "disponible";
  };

  const leadDe = (etapa: EtapaCadena): LeadTime | null => {
    const tramo = TRAMOS_CADENA.find((t) => t.desde === etapa);
    if (!tramo) return null;
    const raw = c.lead_times[tramo.clave];
    if (!raw || raw.n === 0) return null;
    return { n: raw.n, medio: raw.medio, mediana: raw.mediana };
  };

  return ETAPAS_CADENA.map((etapa): ReadinessEtapa => {
    // Extremos de la cadena: se sostienen sobre ops_fact_ot, que sí existe.
    if (etapa === "necesidad" || etapa === "cierre") {
      return {
        etapa, label: LABEL_ETAPA[etapa], fuente: FUENTE_ETAPA[etapa],
        estado: "disponible",
        medida:
          etapa === "necesidad"
            ? "Flag tiene_piezas en la OT: indica que hubo pieza, no qué pieza ni cuántas."
            : "Fecha de cierre de la OT.",
        leadTime: leadDe(etapa),
      };
    }
    const filas = etapa === "expedicion" || etapa === "entrega" ? c.expediciones : c.solicitudes;
    const tabla = etapa === "expedicion" || etapa === "entrega" ? "ops_expedicion" : "ops_pieza_solicitud";
    const estado = estadoTabla(filas);
    return {
      etapa, label: LABEL_ETAPA[etapa], fuente: FUENTE_ETAPA[etapa],
      estado,
      medida:
        filas === 0
          ? `Sin fuente: ${tabla} está vacía. Se activa al cargar la plantilla correspondiente.`
          : `${filas.toLocaleString("es-ES")} filas en ${tabla}` +
            (cobertura == null
              ? "."
              : ` · trazabilidad ${(cobertura * 100).toFixed(1)}% de las OTs con pieza del período.`),
      leadTime: estado === "pendiente" ? null : leadDe(etapa),
    };
  });
}

/** % de OTs con pieza del período que tienen trazabilidad en la cadena. */
export function pctTrazabilidad(c: BloqueCadena): number | null {
  if (c.solicitudes === 0 || c.ots_con_pieza_periodo === 0) return null;
  return c.ots_con_pieza_trazadas / c.ots_con_pieza_periodo;
}

// ─── F4A.1 · Cadena E2E como intervalos consecutivos ─────────────────────────

/**
 * La cadena se lee como INTERVALOS entre dos etapas consecutivas, cada uno con
 * su propio readiness. Un intervalo solo emite cifra si sus dos extremos tienen
 * fuente; si no, se declara pendiente y no se muestra ningún número.
 */
export type IntervaloCadena = {
  clave: string;
  desde: EtapaCadena;
  hasta: EtapaCadena;
  label: string;
  estado: EstadoFuente;
  leadTime: LeadTime | null;
  medida: string;
};

const PEOR: Record<EstadoFuente, number> = { disponible: 0, parcial: 1, pendiente: 2 };

export function intervalosCadena(c: BloqueCadena): IntervaloCadena[] {
  const readiness = new Map(readinessCadena(c).map((r) => [r.etapa, r]));
  return TRAMOS_CADENA.map((t): IntervaloCadena => {
    const a = readiness.get(t.desde);
    const b = readiness.get(t.hasta);
    const estado: EstadoFuente =
      !a || !b ? "pendiente" : PEOR[a.estado] >= PEOR[b.estado] ? a.estado : b.estado;
    const raw = c.lead_times[t.clave];
    const leadTime = estado === "pendiente" || !raw || raw.n === 0 ? null : { n: raw.n, medio: raw.medio, mediana: raw.mediana };
    const label = `${LABEL_ETAPA[t.desde]} → ${LABEL_ETAPA[t.hasta]}`;
    const medida =
      estado === "pendiente"
        ? `Sin fuente en uno de los extremos (${FUENTE_ETAPA[t.desde]} / ${FUENTE_ETAPA[t.hasta]}): el intervalo no es calculable.`
        : leadTime == null
          ? "Fuentes presentes pero ningún par de fechas completo: sin pares no hay intervalo."
          : `${leadTime.n.toLocaleString("es-ES")} pares con ambas fechas · mediana ${d1(leadTime.mediana)} d.`;
    return { clave: t.clave, desde: t.desde, hasta: t.hasta, label, estado, leadTime, medida };
  });
}

// ─── F4A.1 · Stock: fill rate y stock-out ────────────────────────────────────

export type FilaStock = {
  referencia: string;
  stock_fisico: number;
  stock_disponible: number | null;
  reservado: number | null;
  en_transito: number | null;
};

export type IndicadoresStock = {
  referencias: number;
  /** Referencias con disponible ≤ 0 (usa físico − reservado si no viene disponible). */
  stockOut: number;
  pctStockOut: number | null;
  unidadesFisicas: number;
  unidadesReservadas: number | null;
  unidadesEnTransito: number | null;
  /** Frase con la medida. Vacío de datos ⇒ nada de cifras. */
  medida: string;
};

const disponibleDe = (f: FilaStock): number =>
  f.stock_disponible != null ? f.stock_disponible : f.stock_fisico - (f.reservado ?? 0);

export function indicadoresStock(filas: readonly FilaStock[]): IndicadoresStock {
  if (filas.length === 0) {
    return {
      referencias: 0, stockOut: 0, pctStockOut: null,
      unidadesFisicas: 0, unidadesReservadas: null, unidadesEnTransito: null,
      medida: "Sin foto de stock cargada: ops_stock_snapshot está vacía.",
    };
  }
  const stockOut = filas.filter((f) => disponibleDe(f) <= 0).length;
  const reservadas = filas.some((f) => f.reservado != null)
    ? filas.reduce((a, f) => a + (f.reservado ?? 0), 0)
    : null;
  const transito = filas.some((f) => f.en_transito != null)
    ? filas.reduce((a, f) => a + (f.en_transito ?? 0), 0)
    : null;
  return {
    referencias: filas.length,
    stockOut,
    pctStockOut: stockOut / filas.length,
    unidadesFisicas: filas.reduce((a, f) => a + f.stock_fisico, 0),
    unidadesReservadas: reservadas,
    unidadesEnTransito: transito,
    medida: `${n0(filas.length)} referencias en la foto · ${n0(stockOut)} sin disponible (${p1(stockOut / filas.length)}).`,
  };
}

export type FillRate = { valor: number | null; lineas: number; servidas: number; medida: string };

/**
 * Fill rate = líneas servidas desde stock sobre líneas solicitadas. Requiere
 * detalle de línea; sin él NO se estima: se devuelve null con el motivo.
 */
export function fillRate(lineasSolicitadas: number, lineasServidasDeStock: number): FillRate {
  if (lineasSolicitadas <= 0) {
    return {
      valor: null, lineas: 0, servidas: 0,
      medida: "Sin líneas de solicitud cargadas: el fill rate no es calculable (ops_pieza_solicitud / ops_expedicion_linea vacías).",
    };
  }
  const v = lineasServidasDeStock / lineasSolicitadas;
  return {
    valor: v,
    lineas: lineasSolicitadas,
    servidas: lineasServidasDeStock,
    medida: `${n0(lineasServidasDeStock)} de ${n0(lineasSolicitadas)} líneas servidas desde stock (${p1(v)}).`,
  };
}


// ─── Comparación con pieza vs sin pieza ──────────────────────────────────────

/** Muestra mínima por grupo para poder comparar. Por debajo, no se concluye. */
export const MUESTRA_MINIMA = 30;

export type ComparacionPieza = {
  suficiente: boolean;
  con: GrupoConversion | null;
  sin: GrupoConversion | null;
  /** Diferencias (con − sin). null cuando la muestra no llega al mínimo. */
  deltaDias: number | null;
  deltaPct20d: number | null;
  deltaBajas: number | null;
  deltaNff: number | null;
  motivo: string | null;
};

const dif = (a: number | null | undefined, b: number | null | undefined): number | null =>
  a == null || b == null ? null : a - b;

export function compararConSinPieza(c: BloqueConversion): ComparacionPieza {
  const con = c.con_pieza ?? null;
  const sin = c.sin_pieza ?? null;
  const nCon = con?.n ?? 0;
  const nSin = sin?.n ?? 0;
  if (nCon < MUESTRA_MINIMA || nSin < MUESTRA_MINIMA) {
    return {
      suficiente: false, con, sin,
      deltaDias: null, deltaPct20d: null, deltaBajas: null, deltaNff: null,
      motivo: `Muestra insuficiente para comparar (con pieza ${nCon}, sin pieza ${nSin}; mínimo ${MUESTRA_MINIMA} por grupo).`,
    };
  }
  return {
    suficiente: true, con, sin,
    deltaDias: dif(con?.dias_medio, sin?.dias_medio),
    deltaPct20d: dif(con?.pct_20d, sin?.pct_20d),
    deltaBajas: dif(con?.pct_bajas, sin?.pct_bajas),
    deltaNff: dif(con?.pct_nff, sin?.pct_nff),
    motivo: null,
  };
}

// ─── F4B · Comparación por gama (mix controlado) ─────────────────────────────

/**
 * La diferencia global entre OTs con y sin pieza NO es un efecto del suministro:
 * los dos grupos tienen mix de producto distinto. Comparar DENTRO de cada gama
 * es la única forma honesta de acercarse, y aun así el resultado es una
 * asociación observada, nunca una relación causal demostrada.
 */
export type ComparacionGama = {
  gama: string;
  con: GrupoConversion | null;
  sin: GrupoConversion | null;
  suficiente: boolean;
  deltaDias: number | null;
  deltaPct20d: number | null;
  motivo: string | null;
};

export function compararPorGama(filas: readonly FilaConversionGama[]): ComparacionGama[] {
  const gamas = [...new Set(filas.map((f) => f.gama))];
  const out: ComparacionGama[] = gamas.map((gama) => {
    const con = filas.find((f) => f.gama === gama && f.grupo === "con_pieza") ?? null;
    const sin = filas.find((f) => f.gama === gama && f.grupo === "sin_pieza") ?? null;
    const nCon = con?.n ?? 0;
    const nSin = sin?.n ?? 0;
    const suficiente = nCon >= MUESTRA_MINIMA && nSin >= MUESTRA_MINIMA;
    return {
      gama,
      con,
      sin,
      suficiente,
      deltaDias: suficiente ? dif(con?.dias_medio, sin?.dias_medio) : null,
      deltaPct20d: suficiente ? dif(con?.pct_20d, sin?.pct_20d) : null,
      motivo: suficiente
        ? null
        : `Muestra insuficiente en ${gama} (con pieza ${nCon}, sin pieza ${nSin}; mínimo ${MUESTRA_MINIMA} por grupo): no se compara.`,
    };
  });
  return out.sort((a, b) => (b.con?.n ?? 0) + (b.sin?.n ?? 0) - ((a.con?.n ?? 0) + (a.sin?.n ?? 0)));
}

// ─── F4B · Disciplina causal ─────────────────────────────────────────────────

/**
 * Aviso obligatorio en todo bloque que enfrente OTs con y sin pieza. Sin
 * trazabilidad de la solicitud (ops_pieza_solicitud vacía) no se puede separar
 * espera de proveedor de tiempo de taller ni controlar el mix de producto.
 */
export const AVISO_NO_CAUSAL =
  "Diferencia OBSERVADA entre grupos, no efecto medido del suministro: las OTs con pieza tienen otro mix de producto y de complejidad. Sin trazabilidad de la solicitud de repuesto no se puede atribuir el plazo a la cadena de suministro.";

/** Fórmula única para hablar del vínculo entre pieza y plazo. */
export const TERMINO_EFECTO = "potencial efecto";


// ─── Hallazgos HECHO / HIPÓTESIS / ACCIÓN ────────────────────────────────────

export type Hallazgo = {

  id: string;
  hecho: string;
  hipotesis: string;
  accion: string;
  confianza: "alta" | "media" | "baja";
};

const n0 = (v: number): string => new Intl.NumberFormat("es-ES").format(Math.round(v));
const p1 = (v: number | null | undefined): string => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const d1 = (v: number | null | undefined): string => (v == null ? "—" : v.toFixed(1).replace(".", ","));

export function hallazgosImpactoPieza(cmp: ComparacionPieza): Hallazgo[] {
  if (!cmp.suficiente || !cmp.con || !cmp.sin) {
    return [{
      id: "muestra_insuficiente",
      hecho: cmp.motivo ?? "Sin muestra suficiente en el período.",
      hipotesis: "Ninguna: con esta muestra cualquier diferencia sería ruido.",
      accion: "Ampliar el período de análisis antes de concluir sobre el efecto de la pieza.",
      confianza: "baja",
    }];
  }
  const out: Hallazgo[] = [];
  if (cmp.deltaDias != null && cmp.deltaDias > 0) {
    out.push({
      id: "dias_con_pieza",
      hecho: `Las OTs con pieza cierran en ${d1(cmp.con.dias_medio)} días de media frente a ${d1(cmp.sin.dias_medio)} sin pieza (+${d1(cmp.deltaDias)} d sobre ${n0(cmp.con.n)} OTs con pieza).`,
      hipotesis: `Diferencia observada entre dos grupos con mix de producto distinto: ${TERMINO_EFECTO} de la cadena de suministro sobre el plazo, no medido. Sin trazabilidad de la solicitud no se puede separar espera de proveedor de tiempo de taller.`,
      accion: "Cargar ops_pieza_solicitud y contrastar la diferencia dentro de cada gama antes de atribuirla al suministro.",
      confianza: "media",
    });
  }
  if (cmp.deltaPct20d != null && cmp.deltaPct20d < 0) {
    out.push({
      id: "ref20_con_pieza",
      hecho: `Referencia operativa WG ≤20 d (no contractual): ${p1(cmp.con.pct_20d)} con pieza frente a ${p1(cmp.sin.pct_20d)} sin pieza (${(cmp.deltaPct20d * 100).toFixed(1)} pp).`,
      hipotesis: `El grupo con pieza queda por debajo de la referencia: ${TERMINO_EFECTO} de la dependencia de repuesto sobre el plazo, pendiente de confirmar con la trazabilidad de la solicitud y a mix comparable.`,
      accion: "Revisar el backlog en PTE. PIEZAS por gama y cliente antes de concluir que el suministro condiciona el plazo.",
      confianza: "media",
    });
  }
  if (cmp.deltaBajas != null && Math.abs(cmp.deltaBajas) >= 0.03) {
    out.push({
      id: "bajas_con_pieza",
      hecho: `% de bajas: ${p1(cmp.con.pct_bajas)} con pieza frente a ${p1(cmp.sin.pct_bajas)} sin pieza.`,
      hipotesis: cmp.deltaBajas > 0
        ? "Puede reflejar aparatos más deteriorados en el grupo con pieza, no peor reparación."
        : "Las OTs sin pieza pueden concentrar diagnósticos que terminan en baja o NFF sin intervención.",
      accion: "Contrastar contra el benchmark de familia y cliente antes de leerlo como calidad.",
      confianza: "media",
    });
  }
  if (out.length === 0) {
    out.push({
      id: "sin_diferencia",
      hecho: `No se observa diferencia material entre OTs con pieza (${n0(cmp.con.n)}) y sin pieza (${n0(cmp.sin.n)}) en el período.`,
      hipotesis: "Con los filtros activos no aparece asociación entre la necesidad de pieza y el plazo; tampoco se descarta.",
      accion: "Mantener el seguimiento; revisar por cliente y gama antes de generalizar.",
      confianza: "media",
    });
  }

  return out;
}

// ─── Potencial exposición contractual asociada a la falta de repuesto ────────────────────────────

/** Claves del Registry que declaran pausa o exclusión por falta de repuesto. */
export const CLAVES_EXCLUSION_REPUESTO: readonly string[] = [
  "falta_repuesto", "espera_repuesto", "tiempo_imputable_sat",
] as const;

export type EstadoExposicion = "exposicion_identificada" | "regla_sin_exclusion" | "cliente_sin_regla";

export const LABEL_EXPOSICION: Record<EstadoExposicion, string> = {
  exposicion_identificada: "Potencial exposición identificada",
  regla_sin_exclusion: "Regla sin exclusión declarada",
  cliente_sin_regla: "Cliente sin regla en el Registry",
};

export const DESC_EXPOSICION: Record<EstadoExposicion, string> = {
  exposicion_identificada:
    "El Registry declara para este cliente una pausa o exclusión por falta de repuesto: hay backlog en PTE. PIEZAS al que podría aplicar.",
  regla_sin_exclusion:
    "El cliente tiene regla en el Registry pero ninguna declara exclusión por falta de repuesto: el reloj corre igual.",
  cliente_sin_regla:
    "No hay regla contractual extraída para este cliente: no se puede afirmar nada sobre exclusiones.",
};

export type FilaExposicion = {
  clienteWg: string[];
  clienteContractual: string | null;
  metodo: "alias_explicito" | "patron_fallback" | "sin_resolver";
  n: number;
  n30: number;
  estado: EstadoExposicion;
  clavesDeclaradas: string[];
  /** Impacto por volumen relativo del backlog en espera de pieza. */
  impacto: "alto" | "medio" | "bajo";
  confianza: "alta" | "media" | "baja";
};

/**
 * Clasificación CUALITATIVA: sin importes, sin % de cumplimiento y sin extrapolar.
 * Las reglas están en borrador, así que la confianza nunca es "alta" por sí sola.
 */
export function exposicionContractualPieza(
  filas: readonly { cliente_wg: string; n: number; n30: number }[],
  aliases: readonly ClienteAlias[],
  reglas: readonly ReglaSla[],
): FilaExposicion[] {
  const patrones: ReglaPatron[] = reglas.map((r) => ({
    cliente: r.cliente, cliente_wg_patron: r.cliente_wg_patron, programa: r.programa,
  }));
  const total = filas.reduce((a, f) => a + f.n, 0);

  const grupos = new Map<string, FilaExposicion>();
  for (const f of filas) {
    const res = resolverClienteContractual(f.cliente_wg, aliases, patrones);
    const clave = res.cliente_contractual ?? `__sin__:${f.cliente_wg}`;
    const previo = grupos.get(clave);
    if (previo) {
      previo.clienteWg.push(f.cliente_wg);
      previo.n += f.n;
      previo.n30 += f.n30;
      continue;
    }
    const reglasCliente = res.cliente_contractual
      ? reglas.filter((r) => r.cliente === res.cliente_contractual)
      : [];
    const claves = [
      ...new Set(
        reglasCliente.flatMap((r) =>
          (r.pausas_exclusiones ?? []).filter((k) => CLAVES_EXCLUSION_REPUESTO.includes(k)),
        ),
      ),
    ];
    const estado: EstadoExposicion =
      reglasCliente.length === 0
        ? "cliente_sin_regla"
        : claves.length > 0
          ? "exposicion_identificada"
          : "regla_sin_exclusion";
    grupos.set(clave, {
      clienteWg: [f.cliente_wg],
      clienteContractual: res.cliente_contractual,
      metodo: res.metodo,
      n: f.n,
      n30: f.n30,
      estado,
      clavesDeclaradas: claves,
      impacto: "bajo",
      confianza: "baja",
    });
  }

  const out = [...grupos.values()];
  for (const g of out) {
    const share = total > 0 ? g.n / total : 0;
    g.impacto = share >= 0.15 ? "alto" : share >= 0.05 ? "medio" : "bajo";
    // Las 36 reglas siguen en borrador: la confianza se topa en "media".
    g.confianza = g.estado === "cliente_sin_regla" ? "baja" : g.n >= 50 ? "media" : "baja";
  }
  return out.sort((a, b) => b.n - a.n);
}

// ─── Línea ejecutiva determinista ────────────────────────────────────────────

/**
 * Frase de cabecera de /operaciones/repuestos. Solo cifras reales; si no hay
 * fuente para la cadena, lo dice en vez de inventar un número.
 */
export function lineaEjecutivaRepuestos(
  p: SupplyPayload,
  etiquetaPeriodo: string,
  hayComparable: boolean,
): string {
  const d = p.pieza_demanda;
  const pte = p.pte_piezas_actual;
  const partes: string[] = [etiquetaPeriodo];

  partes.push(
    d.ots === 0
      ? "sin OTs creadas con los filtros activos"
      : `${n0(d.con_pieza)} OTs con pieza de ${n0(d.ots)} (${p1(d.pct)})`,
  );

  if (hayComparable && p.pieza_demanda_prev.pct != null && d.pct != null) {
    const pp = (d.pct - p.pieza_demanda_prev.pct) * 100;
    partes.push(`${pp >= 0 ? "+" : ""}${pp.toFixed(1)} pp vs período anterior`);
  } else {
    partes.push("sin período comparable");
  }

  partes.push(
    pte.n === 0
      ? "ninguna OT en PTE. PIEZAS a la fecha del dato"
      : `${n0(pte.n)} OTs en PTE. PIEZAS a ${fmtFechaEs(p.as_of)}, antigüedad media ${d1(pte.edad_media)} d`,
  );

  const traz = pctTrazabilidad(p.cadena);
  partes.push(
    traz == null
      ? "cadena de suministro: trazabilidad pendiente de fuente"
      : `trazabilidad de la cadena ${p1(traz)} de las OTs con pieza`,
  );

  return `${partes.join(" · ")}.`;
}


/** Frase de cabecera de /operaciones/logistica. */
export function lineaEjecutivaLogistica(
  totalExpediciones: number,
  nPeriodo: number,
  etiquetaPeriodo: string,
): string {
  if (totalExpediciones === 0) {
    return `${etiquetaPeriodo} · sin expediciones registradas: ops_expedicion está vacía. Los indicadores de transporte se activan al cargar la plantilla de expediciones.`;
  }
  return `${etiquetaPeriodo} · ${n0(nPeriodo)} expediciones registradas en el período sobre ${n0(totalExpediciones)} cargadas en total.`;
}

// ─── Consistencia con el Panorama ────────────────────────────────────────────

/**
 * El asunto "espera_repuesto" del Panorama y el bloque B de Repuestos deben
 * mostrar la MISMA cifra: ambos son el recuento de OTs abiertas cuya etapa
 * actual es "PTE. PIEZAS" con los mismos filtros.
 */
export const cifraEsperaRepuesto = (p: SupplyPayload): number => p.pte_piezas_actual.n;
