/**
 * WG Network — Modelo de impacto económico para SATs E INSTALADORES.
 *
 * Refleja las palancas reales del plan WG: (a) trabajo asignado por WG,
 * (b) repuesto a coste con descuento negociable 40–80%, (c) venta de
 * equipos con margen por gama, (d) garantías extendidas con comisión,
 * (e) tiempo convertido en dinero con la app IA.
 *
 * TODAS las constantes están documentadas. Ajustables por el CTIO.
 */

// ─── Precios medios por gama (€) — REPARACIÓN (SAT) ───────────────
// Mano de obra + desplazamiento típicos de la red WG.
export const PRICE_BY_GAMA: Record<string, number> = {
  blanca: 38,
  marron: 42,
  pae: 45,
  confort: 45,
  movilidad: 40,
  electronica: 40,
  profesional: 85,
};

// ─── Precios medios por gama (€) — INSTALACIÓN (Instalador) ───────
// A/C, encastres, TV, etc. Tickets bastante más altos.
export const INSTALL_PRICE_BY_GAMA: Record<string, number> = {
  blanca: 55,
  marron: 50,
  pae: 45,
  confort: 200,
  movilidad: 40,
  electronica: 40,
  profesional: 120,
};

// ─── Margen medio por equipo vendido (€) por gama (venta sustitución)
export const EQUIPO_MARGIN_BY_GAMA: Record<string, number> = {
  blanca: 130,
  marron: 190,
  pae: 70,
  confort: 150,
  movilidad: 110,
  electronica: 120,
  profesional: 300,
};

// ─── Repuesto a coste ─────────────────────────────────────────────
/** % de intervenciones que consumen al menos una pieza. */
export const PART_ATTACH_RATE = 0.55;
/** Coste medio de la pieza en canal WG (€). */
export const PART_AVG_COST = 45;

// ─── Venta de equipos ─────────────────────────────────────────────
/** % de reparaciones donde no compensa reparar. */
export const NOT_WORTH_REPAIR = 0.22;
/** % de esas donde el cliente acepta comprar equipo al SAT/instalador. */
export const SUBSTITUTION_CONV = 0.35;

// ─── Garantías extendidas y seguros ──────────────────────────────
/** % de intervenciones donde se coloca una garantía/seguro. */
export const WARRANTY_ATTACH = 0.08;
/** Comisión media por póliza colocada (€). */
export const WARRANTY_COMMISSION = 25;

// ─── Tiempo ganado con la app IA ─────────────────────────────────
/** Minutos ahorrados por intervención frente a papel/procesos actuales. */
export const MINUTES_SAVED_PER_JOB = 12;
/** Valor de la hora del técnico (€/h). */
export const HOUR_VALUE = 18;

// ─── Caja (pago a 15 días vs. media del sector) ──────────────────
/** Meses de facturación liberados al cobrar a 15 días en vez de a ~60. */
export const CASH_FLOAT_MONTHS = 1.5;

export type Perfil = "sat" | "instalador" | "ambos";
export type Pais = "ES" | "PT";

export interface ImpactInputs {
  perfil: Perfil;
  pais: Pais;
  provincia?: string;
  cp: string;
  gamas: string[];
  intervencionesPropiasMes: number;
  intervencionesWGMes: number;
  ticketMedio: number;
  descuentoRepuesto: number; // 0.40 .. 0.80
  pctFueraGarantia?: number;
  tecnicos?: number;
}

export interface ImpactResult {
  ingresoWG: number;
  ahorroRepuesto: number;
  ingresoEquipos: number;
  ingresoGarantias: number;
  ahorroTiempo: number;
  impactoTotal: number;
  facturacionActual: number;
  multiplicador: number;
  cajaLiberada: number;
}

export const DEFAULT_INPUTS: ImpactInputs = {
  perfil: "sat",
  pais: "ES",
  provincia: "",
  cp: "",
  gamas: ["blanca"],
  intervencionesPropiasMes: 60,
  intervencionesWGMes: 15,
  ticketMedio: 38,
  descuentoRepuesto: 0.6,
  pctFueraGarantia: 0.4,
  tecnicos: 1,
};

const avg = (nums: number[]): number =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

/**
 * Ticket sugerido según perfil y mix de gamas seleccionadas.
 * "sat" usa PRICE_BY_GAMA. "instalador" usa INSTALL_PRICE_BY_GAMA.
 * "ambos" promedia ambos. Si no hay gamas, 38 €.
 */
export function ticketSugerido(perfil: Perfil, gamas: string[]): number {
  if (!gamas.length) return 38;
  const rep = gamas.map((g) => PRICE_BY_GAMA[g] ?? 38);
  const ins = gamas.map((g) => INSTALL_PRICE_BY_GAMA[g] ?? 45);
  if (perfil === "sat") return Math.round(avg(rep));
  if (perfil === "instalador") return Math.round(avg(ins));
  return Math.round((avg(rep) + avg(ins)) / 2);
}

/** Margen medio por equipo según mix de gamas. Default 130 €. */
export function equipoMargenMedio(gamas: string[]): number {
  if (!gamas.length) return 130;
  return avg(gamas.map((g) => EQUIPO_MARGIN_BY_GAMA[g] ?? 130));
}

/** Estimación por defecto de avisos WG asignables/mes = min(80, 15 * nGamas). */
export function defaultWGAsignables(gamas: string[]): number {
  return Math.min(80, 15 * Math.max(1, gamas.length));
}

export function computeImpact(inputs: ImpactInputs): ImpactResult {
  const propiasMes = Math.max(0, inputs.intervencionesPropiasMes || 0);
  const wgMes = Math.max(0, inputs.intervencionesWGMes || 0);
  const ticketMedio = Math.max(0, inputs.ticketMedio || 0);
  const descuento = Math.min(0.8, Math.max(0.4, inputs.descuentoRepuesto || 0.6));
  const pctFueraGarantia = inputs.pctFueraGarantia ?? 0.4;

  const propiasAnio = propiasMes * 12;
  const wgAnio = wgMes * 12;
  const totalAnio = propiasAnio + wgAnio;

  const ingresoWG = wgAnio * ticketMedio;
  const ahorroRepuesto = totalAnio * PART_ATTACH_RATE * (PART_AVG_COST * descuento);
  const ingresoEquipos =
    totalAnio *
    pctFueraGarantia *
    NOT_WORTH_REPAIR *
    SUBSTITUTION_CONV *
    equipoMargenMedio(inputs.gamas);
  const ingresoGarantias = totalAnio * WARRANTY_ATTACH * WARRANTY_COMMISSION;
  const ahorroTiempo = totalAnio * (MINUTES_SAVED_PER_JOB / 60) * HOUR_VALUE;

  const impactoTotal =
    ingresoWG + ahorroRepuesto + ingresoEquipos + ingresoGarantias + ahorroTiempo;

  const facturacionActual = propiasAnio * ticketMedio;
  const multiplicador =
    facturacionActual > 0
      ? (facturacionActual + impactoTotal) / facturacionActual
      : 1 + (impactoTotal > 0 ? 1 : 0);

  const cajaLiberada = wgMes * ticketMedio * CASH_FLOAT_MONTHS;

  return {
    ingresoWG,
    ahorroRepuesto,
    ingresoEquipos,
    ingresoGarantias,
    ahorroTiempo,
    impactoTotal,
    facturacionActual,
    multiplicador,
    cajaLiberada,
  };
}

export const ASSUMPTIONS_LIST = [
  { key: "PART_ATTACH_RATE", value: `${Math.round(PART_ATTACH_RATE * 100)}%` },
  { key: "PART_AVG_COST", value: `${PART_AVG_COST} €` },
  { key: "DESCUENTO_REPUESTO", value: "40% – 80% (ajustable)" },
  { key: "NOT_WORTH_REPAIR", value: `${Math.round(NOT_WORTH_REPAIR * 100)}%` },
  { key: "SUBSTITUTION_CONV", value: `${Math.round(SUBSTITUTION_CONV * 100)}%` },
  { key: "WARRANTY_ATTACH", value: `${Math.round(WARRANTY_ATTACH * 100)}%` },
  { key: "WARRANTY_COMMISSION", value: `${WARRANTY_COMMISSION} €` },
  { key: "MINUTES_SAVED_PER_JOB", value: `${MINUTES_SAVED_PER_JOB} min` },
  { key: "HOUR_VALUE", value: `${HOUR_VALUE} €/h` },
  { key: "CASH_FLOAT_MONTHS", value: `${CASH_FLOAT_MONTHS} meses` },
  { key: "WG_ASIGNABLES", value: "estimación editable" },
];
