/**
 * ops-contractual-fixtures.ts — Casuísticas del SLA & CONTRACTUAL REGISTRY.
 *
 * ⚠️ REGLAS EN BORRADOR, NO VALIDADAS DOCUMENTALMENTE.
 * Recogen las casuísticas revisadas por Dirección sobre los contratos reales.
 * PROHIBIDO INVENTAR VALORES: si el contrato revisado no aporta un número,
 * `target` queda a null y la nota lo declara como pendiente de extraer. El motor
 * trata esas reglas como NO EVALUABLES; nunca se sustituye por un valor supuesto
 * ni por la referencia operativa interna (≤20 días).
 */

import type { EstadoExtraccion, ReglaSla } from "@/lib/ops-contractual";

/**
 * Fila del pliego sin los dos campos derivados (`estado_extraccion` se deduce de
 * si el contrato aporta valor; `territorio_calendario`, del calendario declarado).
 */
type RowBase = Omit<ReglaSla, "estado_extraccion" | "territorio_calendario">;


export const AVISO_FIXTURES =
  "Reglas en estado borrador procedentes de la revisión contractual de Dirección. Pendientes de verificación documental campo a campo. No se usan para calcular cumplimiento contractual.";

const FUENTE = "Contrato revisado por Dirección — pendiente de verificación documental campo a campo";
const PENDIENTE = "valor pendiente de extraer del contrato";
const POR_CONFIRMAR = "natural/hábil por confirmar en contrato";

const base = {
  sociedad_wg_ejecutora: "por confirmar",
  gama_familia: null,
  tipologia_servicio: null,
  condicion_aplicacion: null,
  hard_limit: null,
  umbral_agregado: null,
  meses_consecutivos: null,
  ventana_garantia_dias: null,
  pausas_exclusiones: [] as string[],
  bonus: null,
  penalizacion: null,
  vigencia_desde: null,
  vigencia_hasta: null,
  fuente_contractual: FUENTE,
  estado_regla: "borrador" as const,
  /** null = la regla NO condiciona por fase y no exige conocer la fase de la OT. */
  fase: null as ReglaSla["fase"],

  ventana_medicion: "por_ot" as const,
  calendario: "natural" as const,
  regla_medicion: "por_ot" as const,
  imputabilidad: "wg" as const,
  tipo_consecuencia: "riesgo_sin_cuantificar" as const,
  exposicion_estado: "identificada" as const,
  tipo_target: "contractual_target" as const,
  notas: null as string | null,
};

const metro = {
  ...base,
  business_line: "Profesional",
  cliente: "METRO / MAKRO",
  cliente_wg_patron: "MAKRO%",
  programa: "Servicio profesional METRO/MAKRO",
  unidad: "horas_laborables" as const,
  calendario: "laborable_es" as const,
  evento_inicio: "creacion_ot" as const,
};

const carrefour = {
  ...base,
  business_line: "Retail",
  cliente: "CARREFOUR",
  cliente_wg_patron: "CARREFOUR%",
  programa: "Postventa Carrefour",
  // Único cliente con obligaciones diferenciadas por fase.
  fase: "postventa" as const,
  tipo_consecuencia: "coste_baja" as const,
  exposicion_estado: "identificada" as const,
  evento_inicio: "creacion_ot" as const,
};


const alcampo = {
  ...base,
  business_line: "Retail",
  cliente: "ALCAMPO / AUCHAN",
  cliente_wg_patron: "ALCAMPO%",
  programa: "Postventa Alcampo/Auchan",
  evento_inicio: "creacion_ot" as const,
  evento_fin: "reparacion" as const,
  pausas_exclusiones: ["falta_repuesto"],
  imputabilidad: "wg" as const,
  tipo_consecuencia: "riesgo_sin_cuantificar" as const,
  exposicion_estado: "identificada" as const,
};

const vestel = {
  ...base,
  business_line: "Fabricante",
  cliente: "VESTEL",
  cliente_wg_patron: "VESTEL%",
  programa: "Garantía fabricante Vestel",
  tipo_consecuencia: "riesgo_sin_cuantificar" as const,
  exposicion_estado: "identificada" as const,
};

const cecotec = {
  ...base,
  business_line: "Fabricante",
  cliente: "CECOTEC",
  cliente_wg_patron: "CECOTEC%",
  programa: "Garantía fabricante Cecotec",
};

const assurant = {
  ...base,
  business_line: "Seguros/garantía extendida",
  cliente: "ASSURANT",
  cliente_wg_patron: "ASSURANT%",
  programa: "Garantía extendida Assurant",
};

const pccom = {
  ...base,
  business_line: "E-commerce",
  cliente: "PC COMPONENTES",
  cliente_wg_patron: "PC COMPONENTES%",
  programa: "Postventa PC Componentes",
};

const navee = {
  ...base,
  business_line: "Fabricante",
  cliente: "NAVEE / BRIGHTWAY",
  cliente_wg_patron: "BRIGHTWAY%",
  programa: "Garantía fabricante Navee/Brightway",
};

const FILAS: readonly RowBase[] = [
  // ── PROFESIONAL · METRO / MAKRO ────────────────────────────────────────────
  {
    ...metro,
    kpi: "Primer contacto ≤8 horas laborables",
    evento_fin: "primer_contacto",
    target: 8,
    notas: "Reloj en horas laborables: exige calendario laboral con festivos, hoy no disponible.",
  },
  {
    ...metro,
    kpi: "Primera visita ≤32 horas laborables",
    evento_fin: "primera_visita",
    target: 32,
    notas: "Reloj en horas laborables: exige calendario laboral con festivos, hoy no disponible.",
  },
  {
    ...metro,
    kpi: "Cierre ≤40 horas laborables sin solicitud de pieza ni baja",
    evento_fin: "cierre",
    target: 40,
    condicion_aplicacion: "sin_solicitud_pieza_ni_baja",
    notas: "Requiere distinguir OTs con solicitud de pieza o baja: hoy no hay evento de solicitud de pieza.",
  },
  {
    ...metro,
    kpi: "Cierre ≤64 horas laborables con solicitud de pieza o baja",
    evento_fin: "cierre",
    target: 64,
    condicion_aplicacion: "con_solicitud_pieza_o_baja",
    notas: "Requiere distinguir OTs con solicitud de pieza o baja: hoy no hay evento de solicitud de pieza.",
  },
  {
    ...metro,
    kpi: "Cumplimiento agregado con excepciones contractuales",
    evento_fin: "cierre",
    target: null,
    unidad: "porcentaje",
    regla_medicion: "porcentaje_ots",
    ventana_medicion: "mes",
    umbral_agregado: null,
    pausas_exclusiones: ["excepciones_contractuales"],
    notas: "umbral y excepciones pendientes de extraer",
  },

  // ── RETAIL · CARREFOUR ─────────────────────────────────────────────────────
  {
    ...carrefour,
    kpi: "Postventa GAE — primer contacto ≤48 h",
    gama_familia: "GAE",
    evento_fin: "primer_contacto",
    target: 48,
    unidad: "horas_naturales",
    notas: POR_CONFIRMAR,
  },
  {
    ...carrefour,
    kpi: "Postventa GAE — reparación ≤5 días hábiles",
    gama_familia: "GAE",
    evento_fin: "reparacion",
    target: 5,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    notas: "clock-start por confirmar",
  },
  {
    ...carrefour,
    kpi: "Postventa resto de gamas — reparación ≤15 días",
    condicion_aplicacion: "no_GAE",
    evento_fin: "reparacion",
    target: 15,
    unidad: "dias_naturales",
    notas: POR_CONFIRMAR,
  },
  {
    ...carrefour,
    fase: "preventa",
    kpi: "Preventa — ≤20 días",
    evento_fin: "cierre",
    target: 20,
    unidad: "dias_naturales",
    notas: POR_CONFIRMAR,
  },
  {
    ...carrefour,
    fase: "preventa",
    kpi: "Preventa — obligación de preaviso",
    evento_fin: "cierre",
    target: null,
    unidad: "recuento",
    regla_medicion: "reporting",
    ventana_medicion: "mes",
    notas: "obligación de preaviso pendiente de detallar",
  },

  // ── RETAIL · ALCAMPO / AUCHAN ──────────────────────────────────────────────
  {
    ...alcampo,
    kpi: "Reparación interna — objetivo operativo normal 5–7 días laborables",
    tipologia_servicio: "Reparación interna",
    target: 7,
    hard_limit: 21,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    tipo_target: "internal_operating_target",
    notas: "rango normal 5–7 dl · tratamiento específico de retrasos por falta de repuesto",
  },
  {
    ...alcampo,
    kpi: "On-site — estándar ≤5 días laborables",
    tipologia_servicio: "On-site",
    target: 5,
    hard_limit: 21,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    tipo_target: "contractual_target",
    notas: "tratamiento específico de retrasos por falta de repuesto",
  },
  {
    ...alcampo,
    kpi: "Límite duro 21 días",
    target: 21,
    unidad: "dias_naturales",
    tipo_target: "contractual_hard_limit",
    notas: `${POR_CONFIRMAR} · tratamiento específico de retrasos por falta de repuesto; consecuencia económica solo si el retraso es imputable a WG`,
  },

  // ── FABRICANTE · VESTEL ────────────────────────────────────────────────────
  {
    ...vestel,
    kpi: "Primer contacto ≤24 h",
    evento_inicio: "creacion_ot",
    evento_fin: "primer_contacto",
    target: 24,
    unidad: "horas_naturales",
    notas: POR_CONFIRMAR,
  },
  {
    ...vestel,
    kpi: "Reparación ≤5 días hábiles desde la visita",
    tipologia_servicio: "Domicilio",
    evento_inicio: "primera_visita",
    evento_fin: "reparacion",
    target: 5,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    notas: null,
  },
  {
    ...vestel,
    kpi: "Reparación ≤5 días hábiles desde la recogida",
    tipologia_servicio: "Taller",
    evento_inicio: "recogida",
    evento_fin: "reparacion",
    target: 5,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    notas: "No existe evento de recogida en ops_fact_ot.",
  },
  {
    ...vestel,
    kpi: "Permanencia máxima en prueba",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    notas: PENDIENTE,
  },
  {
    ...vestel,
    kpi: "Reclamaciones",
    evento_inicio: "otro",
    evento_fin: "otro",
    target: null,
    unidad: "recuento",
    regla_medicion: "quality",
    ventana_medicion: "mes",
    notas: PENDIENTE,
  },
  {
    ...vestel,
    kpi: "Obligaciones vinculadas a repuestos",
    evento_inicio: "otro",
    evento_fin: "otro",
    target: null,
    unidad: "recuento",
    regla_medicion: "supply",
    ventana_medicion: "mes",
    notas: PENDIENTE,
  },

  // ── FABRICANTE · CECOTEC ───────────────────────────────────────────────────
  {
    ...cecotec,
    kpi: "TAT contractual",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    notas: `${PENDIENTE} · ${POR_CONFIRMAR}`,
  },
  {
    ...cecotec,
    kpi: "Regla agregada de cumplimiento",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "porcentaje",
    regla_medicion: "porcentaje_ots",
    ventana_medicion: "mes",
    umbral_agregado: null,
    notas: `Umbral agregado ${PENDIENTE}`,
  },
  {
    ...cecotec,
    kpi: "Bonus/malus sobre facturación",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "porcentaje",
    regla_medicion: "bonus_malus",
    ventana_medicion: "mes",
    bonus: { cuantia: "pendiente" },
    penalizacion: { cuantia: "pendiente" },
    tipo_consecuencia: "pct_facturacion_mensual",
    exposicion_estado: "pendiente_cuantificar",
    notas: `Cuantías ${PENDIENTE}`,
  },
  {
    ...cecotec,
    kpi: "Obligaciones de stock",
    evento_inicio: "otro",
    evento_fin: "otro",
    target: null,
    unidad: "recuento",
    regla_medicion: "supply",
    ventana_medicion: "mes",
    notas: PENDIENTE,
  },
  {
    ...cecotec,
    kpi: "Obligaciones de reporting",
    evento_inicio: "otro",
    evento_fin: "otro",
    target: null,
    unidad: "recuento",
    regla_medicion: "reporting",
    ventana_medicion: "mes",
    notas: PENDIENTE,
  },

  // ── SEGUROS · ASSURANT ─────────────────────────────────────────────────────
  {
    ...assurant,
    kpi: "Hitos temporales de proceso",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    regla_medicion: "por_ot",
    notas: "hitos pendientes de detallar",
  },
  {
    ...assurant,
    kpi: "Repair Bounce dentro de la garantía de reparación (90 días)",
    evento_inicio: "cierre_anterior",
    evento_fin: "creacion_ot",
    target: 0,
    unidad: "recuento",
    regla_medicion: "recurrencia",
    ventana_garantia_dias: 90,
    notas: "Requiere enlace entre OTs del mismo aparato: hoy no existe.",
  },
  {
    ...assurant,
    kpi: "Segundo Repair Bounce con consecuencia económica",
    evento_inicio: "cierre_anterior",
    evento_fin: "creacion_ot",
    target: 1,
    unidad: "recuento",
    regla_medicion: "recurrencia",
    ventana_garantia_dias: 90,
    tipo_consecuencia: "riesgo_sin_cuantificar",
    exposicion_estado: "identificada",
    notas: "segundo bounce activa consecuencia económica",
  },
  {
    ...assurant,
    kpi: "Reporting y trazabilidad",
    evento_inicio: "otro",
    evento_fin: "otro",
    target: null,
    unidad: "recuento",
    regla_medicion: "reporting",
    ventana_medicion: "mes",
    notas: PENDIENTE,
  },

  // ── E-COMMERCE · PC COMPONENTES ────────────────────────────────────────────
  {
    ...pccom,
    kpi: "Average Repair TAT 7 días laborables — clock-start creación",
    tipologia_servicio: "Domicilio",
    evento_inicio: "creacion_ot",
    evento_fin: "reparacion",
    target: 7,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    regla_medicion: "promedio",
    ventana_medicion: "mes",
    pausas_exclusiones: ["tiempo_imputable_sat"],
    imputabilidad: "mixta",
    notas: "clock-start varía por familia/tipología — asignación por familia pendiente",
  },
  {
    ...pccom,
    kpi: "Average Repair TAT 7 días laborables — clock-start recogida",
    tipologia_servicio: "Taller/Recogida",
    evento_inicio: "recogida",
    evento_fin: "reparacion",
    target: 7,
    unidad: "dias_laborables",
    calendario: "laborable_es",
    regla_medicion: "promedio",
    ventana_medicion: "mes",
    pausas_exclusiones: ["tiempo_imputable_sat"],
    imputabilidad: "mixta",
    notas: "clock-start varía por familia/tipología — asignación por familia pendiente",
  },
  {
    ...pccom,
    kpi: "Incumplimiento tres meses consecutivos",
    evento_inicio: "creacion_ot",
    evento_fin: "reparacion",
    target: null,
    unidad: "porcentaje",
    regla_medicion: "meses_consecutivos",
    ventana_medicion: "mes",
    meses_consecutivos: 3,
    umbral_agregado: null,
    tipo_consecuencia: "incumplimiento_grave",
    notas: `Umbral mensual ${PENDIENTE}`,
  },

  // ── FABRICANTE · NAVEE / BRIGHTWAY ─────────────────────────────────────────
  {
    ...navee,
    kpi: "TAT",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    notas: PENDIENTE,
  },
  {
    ...navee,
    kpi: "Repeat Repair",
    evento_inicio: "cierre_anterior",
    evento_fin: "creacion_ot",
    target: 0,
    unidad: "recuento",
    regla_medicion: "recurrencia",
    ventana_garantia_dias: null,
    notas: `Ventana de reincidencia: ${PENDIENTE}`,
  },
  {
    ...navee,
    kpi: "Garantía de reparación",
    evento_inicio: "cierre_anterior",
    evento_fin: "creacion_ot",
    target: null,
    unidad: "recuento",
    regla_medicion: "recurrencia",
    ventana_garantia_dias: null,
    notas: "plazo de garantía pendiente de extraer",
  },

  // ── SIN SLA CUANTIFICADO ───────────────────────────────────────────────────
  {
    ...base,
    business_line: "Retail",
    cliente: "ELECTRO DEPOT",
    cliente_wg_patron: "ELECTRO DEPOT%",
    programa: "Postventa Electro Depot",
    kpi: "SLA no cuantificado en el contrato disponible",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    tipo_consecuencia: "riesgo_sin_cuantificar",
    exposicion_estado: "pendiente_cuantificar",
    notas: "la arquitectura admite programas sin SLA cuantificado; no aplicar ≤20d como contractual",
  },
  {
    ...base,
    business_line: "Fabricante",
    cliente: "SAUBER",
    cliente_wg_patron: "SAUBER%",
    programa: "Garantía fabricante Sauber",
    kpi: "SLA no cuantificado en el contrato disponible",
    evento_inicio: "creacion_ot",
    evento_fin: "cierre",
    target: null,
    unidad: "dias_naturales",
    tipo_consecuencia: "riesgo_sin_cuantificar",
    exposicion_estado: "pendiente_cuantificar",
    notas: "la arquitectura admite programas sin SLA cuantificado; no aplicar ≤20d como contractual",
  },
];

/**
 * (a) Estado de EXTRACCIÓN: `extraida_contrato` solo si el contrato revisado
 * aporta un valor u obligación cuantificada. Es INDEPENDIENTE del estado de
 * validación (`estado_regla`, hoy siempre `borrador`) y de la medibilidad
 * técnica, que la deriva el readiness y nunca se almacena.
 */
export const estadoExtraccionDe = (r: RowBase): EstadoExtraccion =>
  r.target != null || r.meses_consecutivos != null || r.ventana_garantia_dias != null
    ? "extraida_contrato"
    : "pendiente_extraer";

export const FIXTURES_REGISTRY: readonly ReglaSla[] = FILAS.map((r) => ({
  ...r,
  estado_extraccion: estadoExtraccionDe(r),
  territorio_calendario: r.calendario === "laborable_es" ? "ES" : null,
}));


/** Targets numéricos declarados por cliente (control anti-invención). */
export const TARGETS_DECLARADOS: Record<string, number[]> = {
  "METRO / MAKRO": [8, 32, 40, 64],
  CARREFOUR: [48, 5, 15, 20],
  "ALCAMPO / AUCHAN": [7, 5, 21],
  VESTEL: [24, 5, 5],
  CECOTEC: [],
  ASSURANT: [0, 1],
  "PC COMPONENTES": [7, 7],
  "NAVEE / BRIGHTWAY": [0],
  "ELECTRO DEPOT": [],
  SAUBER: [],
};
