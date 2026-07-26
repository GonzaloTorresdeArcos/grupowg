// CSV utils + auto-detección de tipo de tabla + normalización de valores para ops_*.
// Todo en español, sin dependencias externas.

export type OpsTable = "ops_fact_ot" | "ops_tecnicos" | "ops_portfolio_gamas" | "ops_benchmark";

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

const NUMERIC = new Set([
  "dias_cierre", "sla_cierre_dlab", "anio_garantia",
  "importe_mo", "importe_desplazamiento", "fact_cli", "fact_sat",
  "ots", "dias_medio", "pct_bajas", "pct_nff",
]);
const DATE_FIELDS = new Set([
  "fecha_creacion", "fecha_cierre", "fecha_primer_contacto", "fecha_primera_visita", "fecha_baja",
]);
const BOOL_FIELDS = new Set(["kpi_20d", "kpi_30d", "tiene_piezas", "activo"]);

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

const INT_FIELDS = new Set(["dias_cierre", "sla_cierre_dlab", "anio_garantia"]);

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
  }[t];
}

// ---------- Normalización de fila ----------
export function normalizeRow(t: OpsTable, header: string[], raw: string[]): Record<string, unknown> | null {
  const map = { ops_fact_ot: FACT_MAP, ops_tecnicos: TEC_MAP, ops_portfolio_gamas: PORT_MAP, ops_benchmark: BENCH_MAP }[t];
  const rec: Record<string, unknown> = {};
  for (let i = 0; i < header.length; i++) {
    const col = map[norm(header[i])];
    if (!col) continue;
    const v = (raw[i] ?? "").trim();
    if (DATE_FIELDS.has(col)) rec[col] = parseDate(v);
    else if (NUMERIC.has(col)) rec[col] = parseNum(v);
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
  return rec;
}

export const TABLE_LABEL: Record<OpsTable, string> = {
  ops_fact_ot: "Órdenes de trabajo (ops_fact_ot)",
  ops_tecnicos: "Maestro técnicos (ops_tecnicos)",
  ops_portfolio_gamas: "Portfolio marca → gama (ops_portfolio_gamas)",
  ops_benchmark: "Benchmark familia × cliente (ops_benchmark)",
};
