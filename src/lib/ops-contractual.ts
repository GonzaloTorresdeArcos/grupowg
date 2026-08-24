/**
 * ops-contractual.ts — Espejo TypeScript del SLA & CONTRACTUAL REGISTRY
 * (tabla `public.ops_sla_registry`) y MOTOR PURO de evaluación de reglas.
 *
 * PRINCIPIO: el Registry es una CAPA DE REGLAS para interpretar la operación,
 * NO un contract-management system. Aquí no hay gestión documental, workflows
 * legales, firma ni renovaciones: solo qué regla debe cumplir cada OT y qué
 * significa incumplirla.
 *
 * PROHIBIDO fabricar cumplimiento: si faltan eventos, calendario o el target no
 * está cuantificado, el resultado es `evaluable: false` con motivo explícito.
 * Nunca se devuelve `cumple_target` por defecto.
 */

// ─── Enums (espejo de los CHECK de la tabla) ─────────────────────────────────

export const EVENTOS_INICIO = [
  "creacion_ot", "primer_contacto", "asignacion", "primera_visita", "recogida",
  "solicitud_pieza", "disponibilidad_pieza", "entrega", "cierre_anterior", "otro",
] as const;
export type EventoInicio = (typeof EVENTOS_INICIO)[number];

export const EVENTOS_FIN = [
  ...EVENTOS_INICIO, "reparacion", "cierre", "contacto", "visita", "respuesta",
] as const;
export type EventoFin = (typeof EVENTOS_FIN)[number];

export type EventoOT = EventoFin;

export const UNIDADES = [
  "horas_laborables", "horas_naturales", "dias_laborables", "dias_naturales",
  "porcentaje", "media", "recuento",
] as const;
export type Unidad = (typeof UNIDADES)[number];

export const CALENDARIOS = ["natural", "laborable_es", "laborable_local", "otro"] as const;
export type Calendario = (typeof CALENDARIOS)[number];

export const REGLAS_MEDICION = [
  "por_ot", "promedio", "porcentaje_ots", "recurrencia", "meses_consecutivos",
  "reporting", "supply", "quality", "bonus_malus",
] as const;
export type ReglaMedicion = (typeof REGLAS_MEDICION)[number];

export const VENTANAS_MEDICION = ["mes", "trimestre", "rolling_3m", "anual", "por_ot"] as const;
export type VentanaMedicion = (typeof VENTANAS_MEDICION)[number];

export const IMPUTABILIDADES = ["wg", "sat", "cliente", "proveedor_pieza", "mixta", "por_determinar"] as const;
export type Imputabilidad = (typeof IMPUTABILIDADES)[number];

export const TIPOS_CONSECUENCIA = [
  "coste_baja", "reparacion_no_pagada", "devolucion_abono", "bonus", "malus",
  "pct_facturacion_mensual", "rework_absorbido", "incumplimiento_grave",
  "riesgo_sin_cuantificar", "ninguna",
] as const;
export type TipoConsecuencia = (typeof TIPOS_CONSECUENCIA)[number];

export const EXPOSICION_ESTADOS = ["identificada", "cuantificable", "pendiente_cuantificar"] as const;
export type ExposicionEstado = (typeof EXPOSICION_ESTADOS)[number];

/** Reutiliza la taxonomía de targets de F3A (ops-panorama). */
export const TIPOS_TARGET = [
  "contractual_target", "contractual_hard_limit", "internal_operating_target", "operational_reference",
] as const;
export type TipoTargetRegistry = (typeof TIPOS_TARGET)[number];

export const ESTADOS_REGLA = ["borrador", "validada", "obsoleta"] as const;
export type EstadoRegla = (typeof ESTADOS_REGLA)[number];

export const FASES = ["preventa", "postventa"] as const;
export type Fase = (typeof FASES)[number];

// ─── Fila del Registry ───────────────────────────────────────────────────────

export type ReglaSla = {
  id?: string;
  business_line: string;
  cliente: string;
  /** Patrón ILIKE para localizar al cliente en ops_fact_ot.cliente_wg. */
  cliente_wg_patron: string | null;
  programa: string;
  sociedad_wg_ejecutora: string | null;
  /** null = aplica a todas las gamas/familias. */
  gama_familia: string | null;
  tipologia_servicio: string | null;
  /** Condición contractual de aplicación de la regla (p. ej. 'sin_solicitud_pieza_ni_baja'). */
  condicion_aplicacion?: string | null;
  fase: Fase | null;
  kpi: string;
  evento_inicio: EventoInicio;
  evento_fin: EventoFin;
  /** null = contrato sin SLA cuantificado. */
  target: number | null;
  hard_limit: number | null;
  unidad: Unidad;
  calendario: Calendario;
  regla_medicion: ReglaMedicion;
  /** p. ej. % mínimo de OTs en plazo para una regla agregada. */
  umbral_agregado: number | null;
  ventana_medicion: VentanaMedicion;
  meses_consecutivos: number | null;
  /** Ventana de garantía de reparación (repeat repair / repair bounce). */
  ventana_garantia_dias: number | null;
  pausas_exclusiones: string[];
  imputabilidad: Imputabilidad;
  bonus: Record<string, unknown> | null;
  penalizacion: Record<string, unknown> | null;
  tipo_consecuencia: TipoConsecuencia;
  exposicion_estado: ExposicionEstado;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  fuente_contractual: string | null;
  tipo_target: TipoTargetRegistry;
  estado_regla: EstadoRegla;
  notas: string | null;
};

/** Campos obligatorios de una fila del Registry (usado por los tests de fixtures). */
export const CAMPOS_OBLIGATORIOS_REGLA: readonly (keyof ReglaSla)[] = [
  "business_line", "cliente", "programa", "kpi", "evento_inicio", "evento_fin",
  "unidad", "calendario", "regla_medicion", "ventana_medicion", "imputabilidad",
  "tipo_consecuencia", "exposicion_estado", "tipo_target", "estado_regla",
];

// ─── Calendario laboral inyectable ───────────────────────────────────────────

export type CalendarioLaboral = {
  /** Festivos en ISO YYYY-MM-DD. Nunca hardcodeados en este módulo. */
  festivos: string[];
  /** Días laborables de la semana (0 = domingo). Por defecto lunes-viernes. */
  diasLaborables?: number[];
  /** Jornada en horas UTC [inicio, fin). Por defecto 9–18. */
  horaInicio?: number;
  horaFin?: number;
};

// ─── Entrada de eventos de una OT ────────────────────────────────────────────

export type EventosOT = {
  /** Marcas de tiempo ISO por evento. Ausencia = evento no registrado. */
  eventos: Partial<Record<EventoOT, string>>;
  /**
   * Pausas declaradas por tipo (en horas). SOLO se descuentan si la regla las
   * declara en `pausas_exclusiones`. Nunca se pausa un reloj automáticamente.
   */
  pausas?: Partial<Record<string, number>>;
};

// ─── Resultado ───────────────────────────────────────────────────────────────

export type ImputableResultado = "wg" | "externo" | "por_determinar";

export type ResultadoRegla = {
  evaluable: boolean;
  motivo_no_evaluable?: string;
  transcurrido?: number;
  unidad: Unidad;
  cumple_target?: boolean;
  supera_hard_limit?: boolean;
  imputable?: ImputableResultado;
};

const MS_HORA = 3_600_000;
const MS_DIA = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);

const esLaborable = (d: Date, cal: CalendarioLaboral): boolean => {
  const dl = cal.diasLaborables ?? [1, 2, 3, 4, 5];
  if (!dl.includes(d.getUTCDay())) return false;
  return !cal.festivos.includes(iso(d));
};

/** Horas laborables entre dos instantes según jornada y festivos del calendario. */
export const horasLaborables = (from: Date, to: Date, cal: CalendarioLaboral): number => {
  if (to <= from) return 0;
  const hIni = cal.horaInicio ?? 9;
  const hFin = cal.horaFin ?? 18;
  let total = 0;
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let guard = 0;
  while (cursor.getTime() <= to.getTime() && guard++ < 3650) {
    if (esLaborable(cursor, cal)) {
      const ini = cursor.getTime() + hIni * MS_HORA;
      const fin = cursor.getTime() + hFin * MS_HORA;
      const a = Math.max(ini, from.getTime());
      const b = Math.min(fin, to.getTime());
      if (b > a) total += (b - a) / MS_HORA;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
};

/** Días laborables transcurridos: se cuentan los días hábiles posteriores al inicio. */
export const diasLaborables = (from: Date, to: Date, cal: CalendarioLaboral): number => {
  if (to <= from) return 0;
  let total = 0;
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const fin = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  let guard = 0;
  while (cursor.getTime() < fin.getTime() && guard++ < 3650) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (esLaborable(cursor, cal)) total += 1;
  }
  return total;
};

const requiereCalendario = (u: Unidad, c: Calendario): boolean =>
  (u === "horas_laborables" || u === "dias_laborables") || c !== "natural";

const imputableDe = (i: Imputabilidad): ImputableResultado => {
  if (i === "wg") return "wg";
  if (i === "sat" || i === "cliente" || i === "proveedor_pieza") return "externo";
  return "por_determinar";
};

/**
 * MOTOR PURO. Evalúa una regla contra los eventos de una OT.
 * Nunca inventa cumplimiento: cualquier carencia devuelve `evaluable: false`.
 */
export const evaluarRegla = (
  regla: ReglaSla,
  ot: EventosOT,
  calendario?: CalendarioLaboral | null,
): ResultadoRegla => {
  const base: ResultadoRegla = { evaluable: false, unidad: regla.unidad };

  if (regla.target == null) {
    return { ...base, motivo_no_evaluable: "sin_sla_cuantificado" };
  }
  if (regla.unidad === "porcentaje" || regla.unidad === "media" || regla.unidad === "recuento") {
    return { ...base, motivo_no_evaluable: "regla_agregada_requiere_conjunto" };
  }

  const tIni = ot.eventos[regla.evento_inicio];
  if (!tIni) return { ...base, motivo_no_evaluable: `falta ${regla.evento_inicio}` };
  const tFin = ot.eventos[regla.evento_fin];
  if (!tFin) return { ...base, motivo_no_evaluable: `falta ${regla.evento_fin}` };

  const from = new Date(tIni);
  const to = new Date(tFin);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ...base, motivo_no_evaluable: "fechas_invalidas" };
  }

  const necesitaCal = requiereCalendario(regla.unidad, regla.calendario);
  if (necesitaCal && !calendario) {
    return { ...base, motivo_no_evaluable: "sin_calendario_laboral" };
  }

  let transcurrido: number;
  switch (regla.unidad) {
    case "horas_naturales":
      transcurrido = (to.getTime() - from.getTime()) / MS_HORA;
      break;
    case "dias_naturales":
      transcurrido = (to.getTime() - from.getTime()) / MS_DIA;
      break;
    case "horas_laborables":
      transcurrido = horasLaborables(from, to, calendario as CalendarioLaboral);
      break;
    case "dias_laborables":
      transcurrido = diasLaborables(from, to, calendario as CalendarioLaboral);
      break;
  }
  transcurrido = Math.max(0, transcurrido);

  // Pausas: SOLO las que la regla declara explícitamente.
  if (regla.pausas_exclusiones.length > 0 && ot.pausas) {
    let pausaHoras = 0;
    for (const k of regla.pausas_exclusiones) pausaHoras += Number(ot.pausas[k] ?? 0);
    if (pausaHoras > 0) {
      const enUnidad =
        regla.unidad === "horas_naturales" || regla.unidad === "horas_laborables"
          ? pausaHoras
          : pausaHoras / 24;
      transcurrido = Math.max(0, transcurrido - enUnidad);
    }
  }

  return {
    evaluable: true,
    unidad: regla.unidad,
    transcurrido,
    cumple_target: transcurrido <= regla.target,
    supera_hard_limit: regla.hard_limit == null ? false : transcurrido > regla.hard_limit,
    imputable: imputableDe(regla.imputabilidad),
  };
};

// ─── Reglas agregadas ────────────────────────────────────────────────────────

export type ResultadoAgregado = {
  evaluable: boolean;
  motivo_no_evaluable?: string;
  denominador: number;
  numerador: number;
  valor: number | null;
  cumple_umbral?: boolean;
};

/**
 * Regla agregada: % de OTs en plazo sobre un conjunto con denominador declarado,
 * o media del tiempo transcurrido. El denominador son SIEMPRE las OTs evaluables:
 * las no evaluables no cuentan como cumplidas ni como incumplidas.
 */
export const evaluarReglaAgregada = (
  regla: ReglaSla,
  resultados: ResultadoRegla[],
): ResultadoAgregado => {
  const evaluables = resultados.filter((r) => r.evaluable);
  const denominador = evaluables.length;
  if (denominador === 0) {
    return { evaluable: false, motivo_no_evaluable: "sin_denominador_evaluable", denominador: 0, numerador: 0, valor: null };
  }
  if (regla.regla_medicion === "promedio") {
    const media = evaluables.reduce((s, r) => s + (r.transcurrido ?? 0), 0) / denominador;
    return {
      evaluable: true,
      denominador,
      numerador: denominador,
      valor: media,
      cumple_umbral: regla.target == null ? undefined : media <= regla.target,
    };
  }
  const numerador = evaluables.filter((r) => r.cumple_target).length;
  const pct = numerador / denominador;
  if (regla.umbral_agregado == null) {
    return { evaluable: false, motivo_no_evaluable: "sin_umbral_agregado", denominador, numerador, valor: pct };
  }
  return { evaluable: true, denominador, numerador, valor: pct, cumple_umbral: pct >= regla.umbral_agregado };
};

/** Regla de N meses consecutivos de incumplimiento. */
export const evaluarMesesConsecutivos = (
  regla: ReglaSla,
  mesesIncumplidos: boolean[],
): { evaluable: boolean; motivo_no_evaluable?: string; rachaMaxima: number; incumple?: boolean } => {
  const n = regla.meses_consecutivos;
  if (n == null) return { evaluable: false, motivo_no_evaluable: "sin_meses_consecutivos", rachaMaxima: 0 };
  if (mesesIncumplidos.length < n) {
    return { evaluable: false, motivo_no_evaluable: "serie_mensual_insuficiente", rachaMaxima: 0 };
  }
  let racha = 0;
  let max = 0;
  for (const m of mesesIncumplidos) {
    racha = m ? racha + 1 : 0;
    if (racha > max) max = racha;
  }
  return { evaluable: true, rachaMaxima: max, incumple: max >= n };
};

/** Repeat repair / repair bounce: reapertura dentro de la ventana de garantía. */
export const evaluarRepeatRepair = (
  regla: ReglaSla,
  cierreAnteriorISO: string | null,
  nuevaCreacionISO: string | null,
): { evaluable: boolean; motivo_no_evaluable?: string; diasEntre?: number; esRepeat?: boolean } => {
  if (regla.ventana_garantia_dias == null) {
    return { evaluable: false, motivo_no_evaluable: "sin_ventana_garantia" };
  }
  if (!cierreAnteriorISO) return { evaluable: false, motivo_no_evaluable: "falta cierre_anterior" };
  if (!nuevaCreacionISO) return { evaluable: false, motivo_no_evaluable: "falta creacion_ot" };
  const dias = (new Date(nuevaCreacionISO).getTime() - new Date(cierreAnteriorISO).getTime()) / MS_DIA;
  return { evaluable: true, diasEntre: dias, esRepeat: dias >= 0 && dias <= regla.ventana_garantia_dias };
};

// ─── Consecuencias declaradas (sin € inventados) ─────────────────────────────

export const LABEL_CONSECUENCIA: Record<TipoConsecuencia, string> = {
  coste_baja: "Coste de la baja asumido",
  reparacion_no_pagada: "Reparación no abonada",
  devolucion_abono: "Devolución o abono",
  bonus: "Bonus",
  malus: "Malus",
  pct_facturacion_mensual: "% sobre facturación mensual",
  rework_absorbido: "Rework absorbido por WG",
  incumplimiento_grave: "Incumplimiento grave",
  riesgo_sin_cuantificar: "Riesgo sin cuantificar",
  ninguna: "Sin consecuencia declarada",
};

export type ConsecuenciaDeclarada = {
  tipo: TipoConsecuencia;
  etiqueta: string;
  exposicion: ExposicionEstado;
  /** true solo si el contrato define una base cuantificable Y hay dato para calcularla. */
  cuantificable: boolean;
  /** Siempre null en F3B: no hay base económica soportada por datos. */
  importe: null;
  detalle: string;
};

export const consecuenciaDeclarada = (regla: ReglaSla): ConsecuenciaDeclarada => ({
  tipo: regla.tipo_consecuencia,
  etiqueta: LABEL_CONSECUENCIA[regla.tipo_consecuencia],
  exposicion: regla.exposicion_estado,
  cuantificable: regla.exposicion_estado === "cuantificable",
  importe: null,
  detalle:
    regla.exposicion_estado === "cuantificable"
      ? "Consecuencia declarada y cuantificable en contrato; el importe requiere datos de facturación expuesta."
      : "Consecuencia identificada en contrato, pendiente de cuantificar: WG no muestra importe.",
});

// ─── Eventos requeridos por una regla (para el readiness contractual) ────────

/** Campo de ops_fact_ot que hoy soporta cada evento (null = sin fuente). */
export const FUENTE_EVENTO: Record<EventoOT, string | null> = {
  creacion_ot: "fecha_creacion",
  primer_contacto: "fecha_primer_contacto",
  asignacion: null,
  primera_visita: "fecha_primera_visita",
  recogida: null,
  solicitud_pieza: null,
  disponibilidad_pieza: null,
  entrega: null,
  cierre_anterior: null,
  otro: null,
  reparacion: "fecha_cierre",
  cierre: "fecha_cierre",
  contacto: "fecha_primer_contacto",
  visita: "fecha_primera_visita",
  respuesta: null,
};

/** Dimensiones de segmentación que la regla exige poder asignar a cada OT. */
export const eventosRequeridos = (r: ReglaSla): EventoOT[] =>
  Array.from(new Set<EventoOT>([r.evento_inicio, r.evento_fin]));

export const dimensionesRequeridas = (r: ReglaSla): string[] => {
  const out: string[] = ["cliente_wg"];
  if (r.programa) out.push("programa");
  if (r.gama_familia) out.push("gama_real");
  if (r.tipologia_servicio) out.push("tipologia_servicio");
  if (r.fase) out.push("fase");
  if (r.condicion_aplicacion) out.push("condicion_aplicacion");
  if (r.imputabilidad === "por_determinar" || r.imputabilidad === "mixta") out.push("imputabilidad");
  if (r.pausas_exclusiones.length > 0) out.push("exclusion_sla");
  return out;
};
