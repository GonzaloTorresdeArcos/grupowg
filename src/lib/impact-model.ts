/**
 * WG Network — Modelo de impacto económico para SATs / instaladores.
 *
 * Objetivo: estimar de forma creíble y tuneable cuánto puede ganar/ahorrar
 * al año un colaborador si entra en la red WG. Las constantes están
 * derivadas de benchmarks internos y pueden ser ajustadas por el CTIO.
 *
 * TODAS las constantes están documentadas. Si cambian los benchmarks,
 * modificar solo este archivo.
 */

// ─── Repuesto a coste ─────────────────────────────────────────────
/** % de intervenciones que consumen al menos una pieza. */
export const PART_ATTACH_RATE = 0.55;
/** Precio medio de la pieza a PVP mayorista actual (€). */
export const PART_AVG_RETAIL = 45;
/** Markup medio con el que el SAT compra hoy la pieza (25% ⇒ margen 20%). */
export const CURRENT_MARKUP = 0.25;
/** Ahorro por pieza al comprar a coste WG en vez de con markup actual. */
export const SAVE_PER_PART =
  PART_AVG_RETAIL * (CURRENT_MARKUP / (1 + CURRENT_MARKUP)); // ≈ 9€

// ─── Venta de equipos (cuando no compensa reparar) ───────────────
/** % de intervenciones donde reparar no compensa. */
export const NOT_WORTH_REPAIR = 0.22;
/** % de esas donde el cliente acepta comprar equipo nuevo al SAT. */
export const SUBSTITUTION_CONV = 0.35;
/** Margen medio por unidad vendida (€). */
export const MARGIN_PER_UNIT = 120;

// ─── Garantías extendidas y seguros ──────────────────────────────
/** % de intervenciones donde el SAT coloca una garantía/seguro. */
export const WARRANTY_ATTACH = 0.08;
/** Comisión media por póliza colocada (€). */
export const WARRANTY_COMMISSION = 25;

// ─── Tiempo ganado con la app (parte digital, ruta, dictado) ─────
/** Minutos ahorrados por intervención frente a papel/procesos actuales. */
export const MINUTES_SAVED_PER_JOB = 12;
/** Valor de la hora del técnico (€/h). */
export const HOUR_VALUE = 18;

// ─── Caja (pago a 15 días vs. media del sector) ──────────────────
/** Meses de facturación liberados al cobrar a 15 días en vez de a ~60. */
export const CASH_FLOAT_MONTHS = 1.5;

export type Gama =
  | "blanca"
  | "marron"
  | "clima"
  | "pae"
  | "movilidad"
  | "multi";

export interface ImpactInputs {
  cp: string;
  intervencionesMes: number;
  ticketMedio: number;
  gamaPrincipal: Gama;
  tecnicos?: number;
  pctFueraGarantia?: number;
}

export interface ImpactResult {
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
  cp: "",
  intervencionesMes: 60,
  ticketMedio: 38,
  gamaPrincipal: "blanca",
  tecnicos: 1,
  pctFueraGarantia: 0.4,
};

export function computeImpact(inputs: ImpactInputs): ImpactResult {
  const intervencionesMes = Math.max(0, inputs.intervencionesMes || 0);
  const ticketMedio = Math.max(0, inputs.ticketMedio || 0);
  const pctFueraGarantia = inputs.pctFueraGarantia ?? 0.4;
  const interv = intervencionesMes * 12;

  const ahorroRepuesto = interv * PART_ATTACH_RATE * SAVE_PER_PART;
  const ingresoEquipos =
    interv * pctFueraGarantia * NOT_WORTH_REPAIR * SUBSTITUTION_CONV * MARGIN_PER_UNIT;
  const ingresoGarantias = interv * WARRANTY_ATTACH * WARRANTY_COMMISSION;
  const ahorroTiempo = interv * (MINUTES_SAVED_PER_JOB / 60) * HOUR_VALUE;

  const impactoTotal =
    ahorroRepuesto + ingresoEquipos + ingresoGarantias + ahorroTiempo;

  const facturacionActual = interv * ticketMedio;
  const multiplicador =
    facturacionActual > 0
      ? (facturacionActual + impactoTotal) / facturacionActual
      : 1;

  const cajaLiberada = intervencionesMes * ticketMedio * CASH_FLOAT_MONTHS;

  return {
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
  { key: "PART_AVG_RETAIL", value: `${PART_AVG_RETAIL} €` },
  { key: "CURRENT_MARKUP", value: `${Math.round(CURRENT_MARKUP * 100)}%` },
  { key: "SAVE_PER_PART", value: `${SAVE_PER_PART.toFixed(2)} €` },
  { key: "NOT_WORTH_REPAIR", value: `${Math.round(NOT_WORTH_REPAIR * 100)}%` },
  { key: "SUBSTITUTION_CONV", value: `${Math.round(SUBSTITUTION_CONV * 100)}%` },
  { key: "MARGIN_PER_UNIT", value: `${MARGIN_PER_UNIT} €` },
  { key: "WARRANTY_ATTACH", value: `${Math.round(WARRANTY_ATTACH * 100)}%` },
  { key: "WARRANTY_COMMISSION", value: `${WARRANTY_COMMISSION} €` },
  { key: "MINUTES_SAVED_PER_JOB", value: `${MINUTES_SAVED_PER_JOB} min` },
  { key: "HOUR_VALUE", value: `${HOUR_VALUE} €/h` },
  { key: "CASH_FLOAT_MONTHS", value: `${CASH_FLOAT_MONTHS} meses` },
];
