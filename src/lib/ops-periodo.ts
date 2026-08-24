/**
 * ops-periodo.ts — Contexto temporal único de /operaciones (Fase 2 del plan V2).
 *
 * Funciones puras, sin React ni red. Definen:
 *  - los presets del selector global (mes · trimestre · YTD · 12 meses · histórico · rango),
 *  - la cobertura real de datos y el recorte/validación de rangos contra ella,
 *  - helpers de granularidad diaria (día anterior / siguiente / hoy).
 *
 * NOTA DE ARQUITECTURA: el módulo "Rutas & Planificación" (Fase de Route Planning)
 * REUTILIZARÁ este mismo contexto temporal con el preset 'dia', en lugar de crear
 * una segunda lógica de fechas incompatible. Por eso el tipo `PresetKey` ya
 * contempla 'dia' y los helpers diarios están exportados y testeados, aunque la
 * UI general todavía no expone ningún selector diario.
 */

export type PresetKey =
  | "mes"
  | "trimestre"
  | "ytd"
  | "doce_meses"
  | "historico"
  | "rango"
  /** Reservado para Rutas & Planificación. No expuesto aún en la UI general. */
  | "dia";

export type Rango = { from: string; to: string };

export type Cobertura = {
  /** Primera fecha con datos reales (ISO) o null si no hay datos cargados. */
  min: string | null;
  /** Última fecha con datos reales (ISO) o null. */
  max: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const parse = (s: string) => new Date(s + "T00:00:00Z");
export const isoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const firstOfMonth = (y: number, m: number) => `${y}-${pad(m + 1)}-01`;
const lastOfMonth = (y: number, m: number) => `${y}-${pad(m + 1)}-${pad(lastDay(y, m))}`;

/** Año mínimo navegable en el picker. */
export const ANIO_MIN = 2019;

// -----------------------------------------------------------------------------
// Helpers de granularidad diaria (preparación Route Planning)
// -----------------------------------------------------------------------------
export function diaAnterior(fechaISO: string): string {
  const d = parse(fechaISO);
  d.setUTCDate(d.getUTCDate() - 1);
  return isoDate(d);
}
export function diaSiguiente(fechaISO: string): string {
  const d = parse(fechaISO);
  d.setUTCDate(d.getUTCDate() + 1);
  return isoDate(d);
}
export function hoyISO(ref: Date = new Date()): string {
  return isoDate(new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())));
}
/** Rango de un único día (granularidad 'dia'). */
export function rangoDia(fechaISO: string): Rango {
  return { from: fechaISO, to: fechaISO };
}

// -----------------------------------------------------------------------------
// Presets
// -----------------------------------------------------------------------------

/** Mes natural que contiene `ref`. */
export function presetMes(refISO: string): Rango {
  const d = parse(refISO);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  return { from: firstOfMonth(y, m), to: lastOfMonth(y, m) };
}

/** Trimestre natural que contiene `ref`. */
export function presetTrimestre(refISO: string): Rango {
  const d = parse(refISO);
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3);
  return { from: firstOfMonth(y, q * 3), to: lastOfMonth(y, q * 3 + 2) };
}

/**
 * YTD: 1 de enero del año de referencia → último día CON DATOS cargados.
 * Nunca llega hasta hoy si no hay datos de hoy. Si no hay cobertura, cae al
 * último día del mes de referencia.
 */
export function presetYTD(refISO: string, cobertura: Cobertura): Rango {
  const d = parse(refISO);
  const y = d.getUTCFullYear();
  const from = firstOfMonth(y, 0);
  const maxCob = cobertura.max;
  let to: string;
  if (maxCob && maxCob >= from) {
    to = maxCob < `${y}-12-31` ? maxCob : `${y}-12-31`;
  } else {
    to = lastOfMonth(y, d.getUTCMonth());
  }
  return { from, to };
}

/** Últimos 12 meses COMPLETOS anteriores (inclusive) al mes de referencia. */
export function preset12Meses(refISO: string): Rango {
  const d = parse(refISO);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  return {
    from: firstOfMonth(start.getUTCFullYear(), start.getUTCMonth()),
    to: lastOfMonth(end.getUTCFullYear(), end.getUTCMonth()),
  };
}

/**
 * Histórico: desde la primera hasta la última fecha con datos reales.
 * Sin cobertura conocida devuelve null (la UI no debe inventar un rango).
 */
export function presetHistorico(cobertura: Cobertura): Rango | null {
  if (!cobertura.min || !cobertura.max) return null;
  return { from: cobertura.min, to: cobertura.max };
}

/** Resuelve un preset a un rango concreto. 'rango' y 'dia' se devuelven tal cual. */
export function resolverPreset(
  key: PresetKey,
  actual: Rango,
  cobertura: Cobertura,
  refISO?: string,
): Rango {
  const ref = refISO ?? actual.from;
  switch (key) {
    case "mes": return presetMes(ref);
    case "trimestre": return presetTrimestre(ref);
    case "ytd": return presetYTD(cobertura.max ?? ref, cobertura);
    case "doce_meses": return preset12Meses(cobertura.max ?? ref);
    case "historico": return presetHistorico(cobertura) ?? actual;
    case "dia": return rangoDia(ref);
    case "rango":
    default: return actual;
  }
}

/** Detecta a qué preset corresponde un rango dado (para resaltar en la UI). */
export function detectarPreset(r: Rango, cobertura: Cobertura): PresetKey {
  if (r.from === r.to) return "dia";
  const h = presetHistorico(cobertura);
  if (h && h.from === r.from && h.to === r.to) return "historico";
  const y = Number(r.from.slice(0, 4));
  if (r.from === firstOfMonth(y, 0)) {
    const ytd = presetYTD(r.from, cobertura);
    if (ytd.to === r.to) return "ytd";
  }
  const m = presetMes(r.from);
  if (m.from === r.from && m.to === r.to) return "mes";
  const t = presetTrimestre(r.from);
  if (t.from === r.from && t.to === r.to) return "trimestre";
  const doce = preset12Meses(r.to);
  if (doce.from === r.from && doce.to === r.to) return "doce_meses";
  return "rango";
}

// -----------------------------------------------------------------------------
// Cobertura de datos
// -----------------------------------------------------------------------------

export type EstadoCobertura = "dentro" | "parcial" | "fuera" | "desconocida";

/**
 * Compara un rango con la cobertura real de datos.
 * NUNCA se rellenan huecos con ceros: los tramos sin cobertura son "sin datos".
 */
export function estadoCobertura(r: Rango, cobertura: Cobertura): EstadoCobertura {
  if (!cobertura.min || !cobertura.max) return "desconocida";
  if (r.to < cobertura.min || r.from > cobertura.max) return "fuera";
  if (r.from < cobertura.min || r.to > cobertura.max) return "parcial";
  return "dentro";
}

/** true si el rango de comparación no tiene NINGÚN dato disponible. */
export function sinPeriodoComparable(prev: Rango, cobertura: Cobertura): boolean {
  return estadoCobertura(prev, cobertura) === "fuera";
}

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "12 de marzo de 2024" — para banners de cobertura. */
export function fechaLarga(fechaISO: string | null): string {
  if (!fechaISO) return "—";
  const d = parse(fechaISO);
  return `${d.getUTCDate()} de ${MESES_LARGO[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export const TOOLTIP_SIN_COMPARABLE = "Sin período comparable en los datos cargados";
