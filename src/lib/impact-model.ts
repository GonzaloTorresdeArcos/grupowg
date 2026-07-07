/**
 * WG Network — Modelo de impacto económico para SATs E INSTALADORES.
 * Volúmenes por gama y por actividad (reparación / instalación).
 * Palancas: (a) trabajo WG, (b) repuesto a coste, (c) venta de equipos,
 * (d) garantías, (e) tiempo→dinero. Constantes ajustables por el CTIO.
 */

export const PRICE_BY_GAMA: Record<string, number> = {
  blanca: 38, marron: 42, pae: 45, confort: 45, movilidad: 40, electronica: 40, profesional: 85,
};
export const INSTALL_PRICE_BY_GAMA: Record<string, number> = {
  blanca: 55, marron: 50, pae: 45, confort: 200, movilidad: 40, electronica: 40, profesional: 120,
};
export const EQUIPO_MARGIN_BY_GAMA: Record<string, number> = {
  blanca: 130, marron: 190, pae: 70, confort: 150, movilidad: 110, electronica: 120, profesional: 300,
};

export const PART_ATTACH_RATE = 0.55;
export const PART_AVG_COST = 45;
export const NOT_WORTH_REPAIR = 0.22;
export const SUBSTITUTION_CONV = 0.35;
export const WARRANTY_ATTACH = 0.08;
export const WARRANTY_COMMISSION = 25;
export const MINUTES_SAVED_PER_JOB = 12;
export const HOUR_VALUE = 18;
export const CASH_FLOAT_MONTHS = 1.5;

export type Perfil = "sat" | "instalador" | "ambos";
export type Pais = "ES" | "PT";

export interface LineaVolumen { rep: number; ins: number }

export interface ImpactInputs {
  perfil: Perfil;
  pais: Pais;
  provincia?: string;
  cp: string;
  gamas: string[];
  volumenes: Record<string, LineaVolumen>;
  intervencionesWGMes: number;
  descuentoRepuesto: number;
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
  reparacionesMes: number;
  instalacionesMes: number;
  ticketMedio: number;
}

export const DEFAULT_INPUTS: ImpactInputs = {
  perfil: "sat",
  pais: "ES",
  provincia: "",
  cp: "",
  gamas: ["blanca"],
  volumenes: { blanca: { rep: 40, ins: 0 } },
  intervencionesWGMes: 15,
  descuentoRepuesto: 0.6,
  pctFueraGarantia: 0.4,
  tecnicos: 1,
};

const avg = (nums: number[]): number => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export function ticketSugerido(perfil: Perfil, gamas: string[]): number {
  if (!gamas.length) return 38;
  const rep = gamas.map((g) => PRICE_BY_GAMA[g] ?? 38);
  const ins = gamas.map((g) => INSTALL_PRICE_BY_GAMA[g] ?? 45);
  if (perfil === "sat") return Math.round(avg(rep));
  if (perfil === "instalador") return Math.round(avg(ins));
  return Math.round((avg(rep) + avg(ins)) / 2);
}

export function equipoMargenMedio(gamas: string[]): number {
  if (!gamas.length) return 130;
  return avg(gamas.map((g) => EQUIPO_MARGIN_BY_GAMA[g] ?? 130));
}

export function defaultWGAsignables(gamas: string[]): number {
  return Math.min(80, 15 * Math.max(1, gamas.length));
}

/** Volumen por defecto de una gama según perfil. */
export function defaultLinea(perfil: Perfil): LineaVolumen {
  return { rep: perfil === "instalador" ? 0 : 20, ins: perfil === "sat" ? 0 : 10 };
}

export function computeImpact(inputs: ImpactInputs): ImpactResult {
  const gamas = inputs.gamas;
  let repMes = 0, insMes = 0, factMesRep = 0, factMesIns = 0, repPriceSum = 0;
  for (const g of gamas) {
    const v = inputs.volumenes[g] ?? { rep: 0, ins: 0 };
    const rep = Math.max(0, v.rep || 0), ins = Math.max(0, v.ins || 0);
    repMes += rep; insMes += ins;
    factMesRep += rep * (PRICE_BY_GAMA[g] ?? 38);
    factMesIns += ins * (INSTALL_PRICE_BY_GAMA[g] ?? 45);
    repPriceSum += rep * (PRICE_BY_GAMA[g] ?? 38);
  }
  const wgMes = Math.max(0, inputs.intervencionesWGMes || 0);
  const descuento = Math.min(0.7, Math.max(0.4, inputs.descuentoRepuesto || 0.6));
  const pctFueraGarantia = inputs.pctFueraGarantia ?? 0.4;

  const repAnio = repMes * 12, insAnio = insMes * 12, wgAnio = wgMes * 12;
  const totalAnio = repAnio + insAnio + wgAnio;
  const repBaseAnio = repAnio + wgAnio;

  const avgRepTicket = repMes > 0 ? repPriceSum / repMes : (gamas.length ? avg(gamas.map((g) => PRICE_BY_GAMA[g] ?? 38)) : 38);

  const ingresoWG = wgAnio * avgRepTicket;
  const ahorroRepuesto = repBaseAnio * PART_ATTACH_RATE * (PART_AVG_COST * descuento);
  const ingresoEquipos = repBaseAnio * pctFueraGarantia * NOT_WORTH_REPAIR * SUBSTITUTION_CONV * equipoMargenMedio(gamas);
  const ingresoGarantias = totalAnio * WARRANTY_ATTACH * WARRANTY_COMMISSION;
  const ahorroTiempo = totalAnio * (MINUTES_SAVED_PER_JOB / 60) * HOUR_VALUE;
  const impactoTotal = ingresoWG + ahorroRepuesto + ingresoEquipos + ingresoGarantias + ahorroTiempo;

  const facturacionActual = (factMesRep + factMesIns) * 12;
  const multiplicador = facturacionActual > 0 ? (facturacionActual + impactoTotal) / facturacionActual : 1 + (impactoTotal > 0 ? 1 : 0);
  const cajaLiberada = wgMes * avgRepTicket * CASH_FLOAT_MONTHS;
  const propiasMes = repMes + insMes;
  const ticketMedio = propiasMes > 0 ? (factMesRep + factMesIns) / propiasMes : avgRepTicket;

  return { ingresoWG, ahorroRepuesto, ingresoEquipos, ingresoGarantias, ahorroTiempo, impactoTotal, facturacionActual, multiplicador, cajaLiberada, reparacionesMes: repMes, instalacionesMes: insMes, ticketMedio };
}

export const ASSUMPTIONS_LIST = [
  { key: "PART_ATTACH_RATE", value: `${Math.round(PART_ATTACH_RATE * 100)}%` },
  { key: "PART_AVG_COST", value: `${PART_AVG_COST} €` },
  { key: "DESCUENTO_REPUESTO", value: "40% – 70% (ajustable)" },
  { key: "NOT_WORTH_REPAIR", value: `${Math.round(NOT_WORTH_REPAIR * 100)}%` },
  { key: "SUBSTITUTION_CONV", value: `${Math.round(SUBSTITUTION_CONV * 100)}%` },
  { key: "WARRANTY_ATTACH", value: `${Math.round(WARRANTY_ATTACH * 100)}%` },
  { key: "WARRANTY_COMMISSION", value: `${WARRANTY_COMMISSION} €` },
  { key: "MINUTES_SAVED_PER_JOB", value: `${MINUTES_SAVED_PER_JOB} min` },
  { key: "HOUR_VALUE", value: `${HOUR_VALUE} €/h` },
  { key: "CASH_FLOAT_MONTHS", value: `${CASH_FLOAT_MONTHS} meses` },
  { key: "WG_ASIGNABLES", value: "estimación editable" },
];
