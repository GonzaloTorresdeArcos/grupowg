// CSV utils + auto-detección de tipo de tabla + normalización de valores para ops_*.
// Todo en español, sin dependencias externas.

export type OpsTable =
  | "ops_fact_ot"
  | "ops_tecnicos"
  | "ops_portfolio_gamas"
  | "ops_benchmark"
  | "ops_pieza_solicitud"
  | "ops_expedicion"
  | "ops_expedicion_linea"
  | "ops_stock_snapshot"
  | "ops_rrhh_logistica";


// ---------- Mapas de columnas por tabla ----------
const FACT_MAP: Record<string, string> = {
  num_ot: "num_ot", numot: "num_ot", ot: "num_ot",
  fecha_creacion: "fecha_creacion", fecha_cierre: "fecha_cierre",
  fecha_primer_contacto: "fecha_primer_contacto", fecha_primera_visita: "fecha_primera_visita",
  fecha_baja: "fecha_baja",
  cliente_wg: "cliente_wg", cliente: "cliente_wg",
  sat: "sat", tipo_recurso: "tipo_recurso", tecnico: "tecnico",
  canal: "canal", delegacion: "delegacion",
  estado: "estado", situacion: "situacion", incidencia: "incidencia",
  aparato: "aparato", marca: "marca", modelo: "modelo",
  familia: "familia", subfamilia: "subfamilia",
  gama_origen: "gama_origen", seccion: "seccion",
  provincia: "provincia", municipio: "municipio",
  codigo_postal: "codigo_postal", cp: "codigo_postal",
  capital: "capital",
  dias_cierre: "dias_cierre", sla_cierre_dlab: "sla_cierre_dlab",
  kpi_20d: "kpi_20d", kpi_30d: "kpi_30d",
  tiene_piezas: "tiene_piezas", anio_garantia: "anio_garantia",
  importe_mo: "importe_mo", importe_desplazamiento: "importe_desplazamiento",
  fact_cli: "fact_cli", fact_sat: "fact_sat",
};

const TEC_MAP: Record<string, string> = {
  tecnico: "tecnico", nombre: "tecnico",
  delegacion: "delegacion",
  activo: "activo",
  motivo_inactivo: "motivo_inactivo", motivo: "motivo_inactivo",
};

const PORT_MAP: Record<string, string> = {
  marca: "marca", cliente_wg: "cliente_wg", cliente: "cliente_wg",
  gama_real: "gama_real", gama: "gama_real",
};

const BENCH_MAP: Record<string, string> = {
  familia: "familia", cliente_wg: "cliente_wg", cliente: "cliente_wg",
  ots: "ots", dias_medio: "dias_medio",
  pct_bajas: "pct_bajas", pct_nff: "pct_nff",
};

// ---------- F4A · Supply & Fulfilment ----------
const PIEZA_MAP: Record<string, string> = {
  num_ot: "num_ot", ot: "num_ot",
  referencia: "referencia", descripcion: "descripcion",
  cantidad: "cantidad", proveedor: "proveedor",
  fecha_necesidad: "fecha_necesidad", fecha_solicitud: "fecha_solicitud",
  fecha_disponibilidad: "fecha_disponibilidad", fecha_picking: "fecha_picking",
  fecha_expedicion: "fecha_expedicion", fecha_entrega: "fecha_entrega",
  fecha_montaje: "fecha_montaje",
  estado_pieza: "estado_pieza", coste_unitario: "coste_unitario",
  imputabilidad_retraso: "imputabilidad_retraso",
};

const EXPED_MAP: Record<string, string> = {
  num_ot: "num_ot", ot: "num_ot",
  almacen_base: "almacen_base", almacen: "almacen_base", base: "almacen_base",
  expedicion_id: "expedicion_id",
  referencia_expedicion: "referencia_expedicion",
  transportista: "transportista", origen: "origen",
  destino: "destino", destino_cp: "destino_cp", destino_tipo: "destino_tipo",
  preparado_por: "preparado_por", persona_id: "persona_id", equipo: "equipo",
  picking_inicio: "picking_inicio", picking_fin: "picking_fin",
  expedicion_timestamp: "expedicion_timestamp",
  fecha_expedicion: "fecha_expedicion",
  fecha_entrega_prevista: "fecha_entrega_prevista",
  fecha_entrega_real: "fecha_entrega_real",
  estado_expedicion: "estado_expedicion",
  tipo_incidencia: "tipo_incidencia",
  reexpedicion: "reexpedicion", expedicion_origen_id: "expedicion_origen_id",
  coste_envio: "coste_envio", coste_transporte: "coste_transporte",
  num_lineas: "num_lineas", num_unidades: "num_unidades",
  num_ot_abastecidas: "num_ot_abastecidas",
  incidencia: "incidencia",
};

const EXPED_LINEA_MAP: Record<string, string> = {
  almacen_base: "almacen_base", almacen: "almacen_base", base: "almacen_base",
  expedicion_id: "expedicion_id",
  linea: "linea", num_linea: "linea",
  referencia: "referencia", descripcion: "descripcion",
  cantidad: "cantidad", unidades: "cantidad",
  num_ot: "num_ot", ot: "num_ot",
};

const STOCK_MAP: Record<string, string> = {
  fecha: "fecha_snapshot", fecha_snapshot: "fecha_snapshot",
  almacen: "almacen_base", almacen_base: "almacen_base",
  referencia: "referencia", descripcion: "descripcion",
  cantidad: "stock_fisico", stock_fisico: "stock_fisico",
  cantidad_reservada: "reservado", reservado: "reservado",
  stock_disponible: "stock_disponible", disponible: "stock_disponible",
  en_transito: "en_transito",
  coste_medio: "coste_medio",
};

/** F4B · Presencia diaria real por persona de logística. Sin esta fuente no se
 *  publica ningún ratio por persona y día: no se admite proxy. */
const RRHH_LOG_MAP: Record<string, string> = {
  persona_id: "persona_id", id_persona: "persona_id", persona: "persona_id",
  nombre: "nombre", nombre_persona: "nombre",
  equipo: "equipo",
  almacen: "almacen_base", almacen_base: "almacen_base",
  fecha: "fecha", dia: "fecha",
  jornada_horas: "jornada_horas", horas: "jornada_horas",
  presente: "presente", asistencia: "presente",
};

/** Estados admitidos por las tablas de supply. Un valor fuera de lista invalida la fila. */
export const ESTADOS_PIEZA = [
  "solicitada", "pendiente_proveedor", "disponible", "en_picking",
  "expedida", "entregada", "montada", "anulada",
] as const;
export const ESTADOS_EXPEDICION = [
  "preparada", "en_transito", "entregada", "incidencia", "devuelta",
] as const;
export const DESTINOS_EXPEDICION = ["cliente", "sat", "delegacion", "taller", "proveedor"] as const;
export const IMPUTABILIDADES_PIEZA = ["wg", "proveedor", "cliente", "sat", "por_determinar"] as const;
/** Valores admitidos por la CHECK de ops_expedicion.procedencia_conteo. */
export const PROCEDENCIAS_CONTEO = ["declarado", "derivado_lineas"] as const;
export type ProcedenciaConteo = (typeof PROCEDENCIAS_CONTEO)[number];

const NUMERIC = new Set([
  "dias_cierre", "sla_cierre_dlab", "anio_garantia",
  "importe_mo", "importe_desplazamiento", "fact_cli", "fact_sat",
  "ots", "dias_medio", "pct_bajas", "pct_nff",
  "cantidad", "coste_unitario", "coste_envio", "cantidad_reservada", "coste_medio",
  "coste_transporte", "num_lineas", "num_unidades", "num_ot_abastecidas", "linea",
  "stock_fisico", "stock_disponible", "reservado", "en_transito",
  "jornada_horas",
]);
const DATE_FIELDS = new Set([
  "fecha_creacion", "fecha_cierre", "fecha_primer_contacto", "fecha_primera_visita", "fecha_baja",
  "fecha_necesidad", "fecha_solicitud", "fecha_disponibilidad", "fecha_picking",
  "fecha_expedicion", "fecha_entrega", "fecha_montaje",
  "fecha_entrega_prevista", "fecha_entrega_real", "fecha", "fecha_snapshot",
  "picking_inicio", "picking_fin", "expedicion_timestamp",
]);
const BOOL_FIELDS = new Set(["kpi_20d", "kpi_30d", "tiene_piezas", "activo", "reexpedicion", "presente"]);


// ---------- Helpers ----------
export const norm = (s: string) =>
  s.trim().toLowerCase()
    .replace(/[\s.]+/g, "_")
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");

const parseBool = (v: string): boolean | null => {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (["1", "true", "si", "sí", "y", "yes", "x", "verdadero"].includes(s)) return true;
  if (["0", "false", "no", "n", "falso"].includes(s)) return false;
  return null;
};

const parseDate = (v: string): string | null => {
  const s = v.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
};

const parseNum = (v: string): number | null => {
  let s = v.trim().replace(/%/g, "").replace(/\s/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  if (dots && commas) {
    if (lastDot > lastComma) {
      // punto es decimal, coma es miles
      s = s.replace(/,/g, "");
    } else {
      // coma es decimal, punto es miles
      s = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (commas) {
    if (commas === 1) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (dots) {
    if (dots > 1) s = s.replace(/\./g, "");
    // si dots === 1, es decimal → conservar
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const INT_FIELDS = new Set([
  "dias_cierre", "sla_cierre_dlab", "anio_garantia",
  "linea", "num_lineas", "num_ot_abastecidas",
]);

/**
 * F4A.1 · Campos con HORA. La productividad de picking se mide en minutos, así
 * que estos no se pueden truncar a fecha: se conserva el timestamp completo.
 */
const TS_FIELDS = new Set(["picking_inicio", "picking_fin", "expedicion_timestamp"]);

const parseTimestamp = (v: string): string | null => {
  const s = v.trim();
  if (!s) return null;
  const hora = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const fecha = parseDate(s);
  if (!fecha) return null;
  if (!hora) return fecha;
  const hh = hora[1].padStart(2, "0");
  return `${fecha}T${hh}:${hora[2]}:${(hora[3] ?? "00").padStart(2, "0")}`;
};


// ---------- CSV parser ----------
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  let sep = ",";
  // Detectar ; si no hay comas en la primera línea
  const firstLine = text.slice(0, 2000).split("\n")[0] ?? "";
  if (firstLine.includes(";") && !firstLine.includes(",")) sep = ";";
  else if (firstLine.split(";").length > firstLine.split(",").length) sep = ";";

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x && x.trim().length));
}

// ---------- Detección de tabla por cabeceras ----------
export function detectTable(header: string[]): OpsTable | null {
  const h = new Set(header.map(norm));
  const base = h.has("almacen_base") || h.has("almacen") || h.has("base");
  // Supply primero: comparten cabeceras genéricas con ops_fact_ot.
  if (h.has("expedicion_id") && h.has("linea") && h.has("referencia")) return "ops_expedicion_linea";
  if (h.has("referencia_expedicion") || (h.has("expedicion_id") && base && !h.has("referencia"))) return "ops_expedicion";
  if (base && h.has("referencia") && (h.has("fecha") || h.has("fecha_snapshot") || h.has("stock_fisico"))) return "ops_stock_snapshot";
  if ((h.has("num_ot") || h.has("ot")) && h.has("referencia") && !h.has("situacion")) return "ops_pieza_solicitud";
  if (h.has("num_ot") || h.has("numot") || h.has("ot")) return "ops_fact_ot";
  if ((h.has("tecnico") || h.has("nombre")) && (h.has("activo") || h.has("delegacion")) && !h.has("mes")) return "ops_tecnicos";
  if (h.has("marca") && (h.has("gama_real") || h.has("gama"))) return "ops_portfolio_gamas";
  if (h.has("familia") && (h.has("pct_bajas") || h.has("dias_medio") || h.has("ots"))) return "ops_benchmark";
  return null;
}

export function conflictKey(t: OpsTable): string {
  return {
    ops_fact_ot: "num_ot",
    ops_tecnicos: "tecnico",
    ops_portfolio_gamas: "marca,cliente_wg",
    ops_benchmark: "familia,cliente_wg",
    ops_pieza_solicitud: "num_ot,referencia",
    ops_expedicion: "almacen_base,expedicion_id",
    ops_expedicion_linea: "almacen_base,expedicion_id,linea",
    ops_stock_snapshot: "fecha_snapshot,almacen_base,referencia",
  }[t];
}

// ---------- Normalización de fila ----------
export function normalizeRow(t: OpsTable, header: string[], raw: string[]): Record<string, unknown> | null {
  const map = {
    ops_fact_ot: FACT_MAP, ops_tecnicos: TEC_MAP, ops_portfolio_gamas: PORT_MAP, ops_benchmark: BENCH_MAP,
    ops_pieza_solicitud: PIEZA_MAP, ops_expedicion: EXPED_MAP, ops_expedicion_linea: EXPED_LINEA_MAP,
    ops_stock_snapshot: STOCK_MAP, ops_rrhh_logistica: RRHH_LOG_MAP,
  }[t];
  const rec: Record<string, unknown> = {};
  for (let i = 0; i < header.length; i++) {
    const col = map[norm(header[i])];
    if (!col) continue;
    const v = (raw[i] ?? "").trim();

    if (TS_FIELDS.has(col)) rec[col] = parseTimestamp(v);
    else if (DATE_FIELDS.has(col)) rec[col] = parseDate(v);

    else if (NUMERIC.has(col)) {
      const n = parseNum(v);
      rec[col] = n !== null && INT_FIELDS.has(col) ? Math.round(n) : n;
    }
    else if (BOOL_FIELDS.has(col)) rec[col] = parseBool(v);
    else rec[col] = v || null;
  }

  // Validaciones + derivados por tabla
  if (t === "ops_fact_ot") {
    if (!rec.num_ot) return null;
    const inc = String(rec.incidencia ?? "").toUpperCase();
    rec.es_anulado = inc === "ANULADO AVISO";
    rec.es_nff = inc.includes("NO PRESENTA AVERIA");
    rec.es_baja = String(rec.situacion ?? "").toLowerCase() === "baja";
  }
  if (t === "ops_tecnicos") {
    if (!rec.tecnico) return null;
    if (rec.activo === null || rec.activo === undefined) rec.activo = true;
  }
  if (t === "ops_portfolio_gamas") {
    if (!rec.marca || !rec.cliente_wg || !rec.gama_real) return null;
  }
  if (t === "ops_benchmark") {
    if (!rec.familia || !rec.cliente_wg) return null;
  }
  if (t === "ops_pieza_solicitud") {
    if (!rec.num_ot || !rec.referencia) return null;
    if (rec.cantidad == null) rec.cantidad = 1;
    const est = String(rec.estado_pieza ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (est && !(ESTADOS_PIEZA as readonly string[]).includes(est)) return null;
    rec.estado_pieza = est || "solicitada";
    const imp = String(rec.imputabilidad_retraso ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (imp && !(IMPUTABILIDADES_PIEZA as readonly string[]).includes(imp)) return null;
    rec.imputabilidad_retraso = imp || null;
    rec.origen_dato = "importador";
  }
  if (t === "ops_expedicion") {
    // Clave natural F4A.1: almacén base + identificador de expedición.
    if (!rec.expedicion_id && rec.referencia_expedicion) rec.expedicion_id = rec.referencia_expedicion;
    if (!rec.referencia_expedicion && rec.expedicion_id) rec.referencia_expedicion = rec.expedicion_id;
    if (!rec.expedicion_id) return null;
    if (!rec.almacen_base) rec.almacen_base = "SIN_ALMACEN";
    const est = String(rec.estado_expedicion ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (est && !(ESTADOS_EXPEDICION as readonly string[]).includes(est)) return null;
    rec.estado_expedicion = est || "preparada";
    const dest = String(rec.destino_tipo ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (dest && !(DESTINOS_EXPEDICION as readonly string[]).includes(dest)) return null;
    rec.destino_tipo = dest || null;
    if (rec.reexpedicion == null) rec.reexpedicion = false;
    // Si la cabecera trae conteos, quedan DECLARADOS; si no, los derivará el trigger de líneas.
    rec.procedencia_conteo =
      rec.num_lineas != null || rec.num_unidades != null || rec.num_ot_abastecidas != null
        ? "declarado"
        : "derivado_lineas";

    if (rec.fecha_expedicion == null && rec.expedicion_timestamp != null) rec.fecha_expedicion = rec.expedicion_timestamp;
    rec.origen_dato = "importador";
  }
  if (t === "ops_expedicion_linea") {
    if (!rec.expedicion_id || !rec.referencia) return null;
    if (!rec.almacen_base) rec.almacen_base = "SIN_ALMACEN";
    if (rec.linea == null) return null;
    if (rec.cantidad == null) rec.cantidad = 1;
    rec.origen_dato = "importador";
  }
  if (t === "ops_stock_snapshot") {
    if (!rec.fecha_snapshot || !rec.almacen_base || !rec.referencia) return null;
    if (rec.stock_fisico == null) rec.stock_fisico = 0;
    // Disponible declarado o derivado; nunca inventado si falta reservado.
    if (rec.stock_disponible == null && rec.reservado != null) {
      rec.stock_disponible = Number(rec.stock_fisico) - Number(rec.reservado);
    }
    rec.origen_dato = "importador";
  }
  return rec;
}

export const TABLE_LABEL: Record<OpsTable, string> = {
  ops_fact_ot: "Órdenes de trabajo (ops_fact_ot)",
  ops_tecnicos: "Maestro técnicos (ops_tecnicos)",
  ops_portfolio_gamas: "Portfolio marca → gama (ops_portfolio_gamas)",
  ops_benchmark: "Benchmark familia × cliente (ops_benchmark)",
  ops_pieza_solicitud: "Solicitudes de pieza (ops_pieza_solicitud)",
  ops_expedicion: "Expediciones — cabecera (ops_expedicion)",
  ops_expedicion_linea: "Expediciones — líneas (ops_expedicion_linea)",
  ops_stock_snapshot: "Foto de stock (ops_stock_snapshot)",
  ops_rrhh_logistica: "Presencia diaria logística (ops_rrhh_logistica)",
};

/** Cabeceras EXACTAS de cada plantilla de carga, en orden. Documentadas en Calidad de datos. */
export const PLANTILLAS: Record<OpsTable, readonly string[]> = {
  ops_fact_ot: [
    "num_ot", "fecha_creacion", "fecha_cierre", "fecha_primer_contacto", "fecha_primera_visita",
    "fecha_baja", "cliente_wg", "sat", "tipo_recurso", "tecnico", "canal", "delegacion",
    "estado", "situacion", "incidencia", "aparato", "marca", "modelo", "familia", "subfamilia",
    "gama_origen", "seccion", "provincia", "municipio", "codigo_postal", "capital",
    "dias_cierre", "sla_cierre_dlab", "kpi_20d", "kpi_30d", "tiene_piezas", "anio_garantia",
    "importe_mo", "importe_desplazamiento", "fact_cli", "fact_sat",
  ],
  ops_tecnicos: ["tecnico", "delegacion", "activo", "motivo_inactivo"],
  ops_portfolio_gamas: ["marca", "cliente_wg", "gama_real"],
  ops_benchmark: ["familia", "cliente_wg", "ots", "dias_medio", "pct_bajas", "pct_nff"],
  ops_pieza_solicitud: [
    "num_ot", "referencia", "descripcion", "cantidad", "proveedor",
    "fecha_necesidad", "fecha_solicitud", "fecha_disponibilidad", "fecha_picking",
    "fecha_expedicion", "fecha_entrega", "fecha_montaje",
    "estado_pieza", "coste_unitario", "imputabilidad_retraso",
  ],
  ops_expedicion: [
    "almacen_base", "expedicion_id", "num_ot", "preparado_por", "persona_id", "equipo",
    "picking_inicio", "picking_fin", "expedicion_timestamp",
    "transportista", "origen", "destino", "destino_cp", "destino_tipo",
    "fecha_entrega_prevista", "fecha_entrega_real",
    "estado_expedicion", "tipo_incidencia", "reexpedicion", "expedicion_origen_id",
    "coste_transporte", "num_lineas", "num_unidades", "num_ot_abastecidas",
  ],
  ops_expedicion_linea: [
    "almacen_base", "expedicion_id", "linea", "referencia", "descripcion", "cantidad", "num_ot",
  ],
  ops_stock_snapshot: [
    "fecha_snapshot", "almacen_base", "referencia", "descripcion",
    "stock_fisico", "reservado", "stock_disponible", "en_transito", "coste_medio",
  ],
  ops_rrhh_logistica: [
    "persona_id", "nombre", "equipo", "almacen_base", "fecha", "jornada_horas", "presente",
  ],
};


/** Fila de cabecera lista para pegar en un CSV. */
export const cabeceraPlantilla = (t: OpsTable): string => PLANTILLAS[t].join(",");

/**
 * Columnas reales de las tablas de supply tal y como existen en la migración.
 * Sirve de contrato: toda cabecera de PLANTILLAS debe existir aquí.
 */
export const COLUMNAS_TABLA: Partial<Record<OpsTable, readonly string[]>> = {
  ops_pieza_solicitud: [
    "id", "num_ot", "referencia", "descripcion", "cantidad", "proveedor",
    "fecha_necesidad", "fecha_solicitud", "fecha_disponibilidad", "fecha_picking",
    "fecha_expedicion", "fecha_entrega", "fecha_montaje", "estado_pieza",
    "coste_unitario", "imputabilidad_retraso", "origen_dato", "created_at", "updated_at",
  ],
  ops_expedicion: [
    "id", "num_ot", "referencia_expedicion", "transportista", "origen", "destino_cp",
    "destino_tipo", "fecha_expedicion", "fecha_entrega_prevista", "fecha_entrega_real",
    "estado_expedicion", "coste_envio", "incidencia", "origen_dato", "created_at",
    "updated_at", "almacen_base", "expedicion_id", "preparado_por", "persona_id", "equipo",
    "picking_inicio", "picking_fin", "expedicion_timestamp", "destino", "tipo_incidencia",
    "reexpedicion", "expedicion_origen_id", "coste_transporte", "num_lineas",
    "num_unidades", "num_ot_abastecidas", "procedencia_conteo",
  ],
  ops_expedicion_linea: [
    "id", "almacen_base", "expedicion_id", "linea", "referencia", "descripcion",
    "cantidad", "num_ot", "pieza_solicitud_id", "origen_dato", "created_at",
  ],
  ops_stock_snapshot: [
    "id", "fecha_snapshot", "almacen_base", "referencia", "descripcion", "stock_fisico",
    "reservado", "coste_medio", "origen_dato", "created_at", "stock_disponible", "en_transito",
  ],
};

// ─── F4B · Registro de carga: qué dominio alimenta cada fichero ──────────────

import type { DominioCarga } from "./ops-as-of";

/**
 * Cada tabla importable alimenta UN dominio del reloj de datos. El importador
 * escribe en `ops_carga_log` para que las RPCs midan contra la fecha efectiva
 * del dato y no contra el día de hoy.
 */
export const DOMINIO_POR_TABLA: Record<OpsTable, DominioCarga> = {
  ops_fact_ot: "ot",
  ops_tecnicos: "ot",
  ops_portfolio_gamas: "ot",
  ops_benchmark: "ot",
  ops_pieza_solicitud: "pieza_solicitud",
  ops_expedicion: "expedicion",
  ops_expedicion_linea: "expedicion_linea",
  ops_stock_snapshot: "stock",
};

/**
 * Campos cuya fecha máxima define hasta cuándo llega el dato de cada tabla.
 * Se ordenan por prioridad: se usa el primero que exista en la fila.
 */
const CAMPOS_AS_OF: Partial<Record<OpsTable, readonly string[]>> = {
  ops_fact_ot: ["fecha_cierre", "fecha_creacion"],
  ops_pieza_solicitud: ["fecha_entrega", "fecha_expedicion", "fecha_solicitud"],
  ops_expedicion: ["fecha_entrega_real", "expedicion_timestamp", "fecha_expedicion"],
  ops_stock_snapshot: ["fecha_snapshot"],
};

const soloFecha = (v: unknown): string | null => {
  if (typeof v !== "string" || v.length < 10) return null;
  const d = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

/**
 * Fecha efectiva del lote = máxima fecha observada que NO sea futura respecto
 * al momento de la carga. Las fechas futuras del ERP son errores de captura y
 * adelantarían el reloj de toda la sección, así que se descartan.
 */
export function fechaAsOfDelLote(
  t: OpsTable,
  registros: readonly Record<string, unknown>[],
  ahora: Date = new Date(),
): string | null {
  const campos = CAMPOS_AS_OF[t];
  if (!campos) return null;
  const hoy = ahora.toISOString().slice(0, 10);
  let max: string | null = null;
  for (const r of registros) {
    for (const c of campos) {
      const d = soloFecha(r[c]);
      if (!d || d > hoy) continue;
      if (!max || d > max) max = d;
      break;
    }
  }
  return max;
}
