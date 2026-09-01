/**
 * PERFORMANCE REAL · capa de tipos y traducción.
 *
 * Regla P0 de este módulo: aquí NO se calcula ningún KPI ni se afirma ninguna
 * obligación. Todo lo que se muestra procede literalmente de las RPC
 * `ctr_portfolio_resumen`, `ctr_portfolio_arbol`, `ctr_portfolio_no_resueltas`,
 * `ctr_programa_ficha` y `ctr_obligaciones_programa`. Este fichero solo traduce
 * códigos técnicos a castellano de gestión y nombra los estados de degradación.
 *
 * PRV-A1: prohibido cualquier pseudo-score. Readiness es una secuencia de
 * ETAPAS categóricas reales, no una magnitud ponderada.
 */

export type PortfolioResumenFila = {
  vertical_codigo: string;
  vertical_nombre: string;
  n_programas: number;
  n_clientes: number;
  /** Población CONTRACTUAL RESUELTA: OTs asignadas determinísticamente a programa. */
  n_ots: number;
  /** OTs cuyo origen ERP es reconocible como cliente candidato, sin programa resoluble. */
  n_ots_cliente_identificado: number;
  /** Subconjunto del anterior cuyo alias de identidad SÍ está gobernado. */
  n_ots_alias_gobernado: number;
  /** Subconjunto del anterior cuyo alias de identidad NO está gobernado. */
  n_ots_alias_no_gobernado: number;
  n_instrumentos: number;
  /** Conteo literal de filas de `ctr_claim`. NO es un conteo de obligaciones. */
  n_claims: number;
  claims_validated: number;
  claims_pending: number;
  /** Desglose literal por `ctr_claim.categoria`. */
  claims_por_categoria: Record<string, number> | null;
  n_reglas: number;
  n_aplicabilidad: number;
  n_ots_importe_no_cero: number;
  n_ots_importe_cero: number;
  n_ots_importe_nulo: number;
};

export type PortfolioNoResueltaFila = {
  clase:
    | "cliente_operativo_reconocido_sin_programa"
    | "identidad_gobernada_sin_programa"
    | "identidad_no_establecida"
    | string;
  cliente_wg_origen: string | null;
  cliente_nombre: string | null;
  /** Estado real del alias en `ctr_alias_identidad.gobernado`. */
  alias_gobernado: boolean | null;
  alias_metodo: string | null;
  vertical_codigo: string | null;
  vertical_nombre: string | null;
  n_programas_candidatos: number;
  n_ots: number;
};


export type PortfolioArbolFila = {
  vertical_codigo: string | null;
  vertical_nombre: string | null;
  cliente_id: string | null;
  cliente_nombre: string | null;
  programa_id: string;
  programa_nombre: string | null;
  programa_estado: string | null;
  effective_from: string | null;
  effective_to: string | null;
  n_ots: number;
  n_ots_importe_informado: number;
  n_instrumentos: number;
  n_claims: number;
  claims_validated: number;
};

export type ProgramaFicha = {
  programa: {
    id: string;
    nombre: string | null;
    estado: string | null;
    territorio: string[] | null;
    effective_from: string | null;
    effective_to: string | null;
    cliente: string | null;
    vertical_codigo: string | null;
    vertical_nombre: string | null;
  } | null;
  instrumentos: {
    contrato_id: string;
    titulo: string | null;
    tipo_instrumento: string | null;
    fecha_firma: string | null;
    effective_from: string | null;
    effective_to: string | null;
    estado_evidencia: string | null;
    sociedad_wg: string | null;
    contraparte: string | null;
    alcance_nota: string | null;
  }[];
  /** Los DOS universos, explícitos y nunca intercambiables. */
  poblacion?: {
    resuelta: number;
    servicio: number;
    excluidas_anulado_aviso: number;
  } | null;
  servicio: {
    ots: number;
    cerradas: number;
    abiertas: number;
    dias_cierre_medio: number | null;
    pct_kpi_20d: number | null;
    pct_kpi_30d: number | null;
    completitud_primer_contacto: number | null;
    completitud_primera_visita: number | null;
    aging: {
      b_0_20: number; b_21_30: number; b_31_60: number;
      b_61_90: number; b_90_mas: number; sin_fecha: number;
    };
  };
  economia: {
    n_ots_importe_no_cero?: number;
    n_ots_importe_cero?: number;
    n_ots_importe_nulo?: number;
    fuente_cargada?: boolean;
  };
  as_of_operativo: string | null;
};

export type ObligacionFila = {
  claim_id: string;
  categoria: string | null;
  enunciado: string | null;
  valor_estructurado: unknown;
  estado: string | null;
  doc_fichero: string | null;
  doc_hash: string | null;
  doc_estado_evidencia: string | null;
  regla_version_id: string | null;
  regla_codigo: string | null;
  regla_parametros: unknown;
  regla_unidad: string | null;
  calendario_requerido: boolean | null;
  readiness_estado: string | null;
  readiness_reason: string | null;
};

/** Códigos de vertical → literal corto para cabeceras. */
export const CODIGO_SIN_RESOLVER = "SIN_RESOLVER";

/**
 * P0.1 · TRES NIVELES DISTINTOS, NUNCA INTERCAMBIABLES.
 * (1) cliente operativo reconocido: el dato ERP nombra literalmente a un
 *     cliente y existe un candidato contractual asociado, pero el alias que
 *     lo asocia NO está gobernado.
 * (2) identidad contractual gobernada: `ctr_alias_identidad.gobernado = true`.
 * (3) programa contractual resuelto: resolución vigente determinista.
 * La mera existencia de un alias NO establece identidad contractual.
 */
export const NIVEL_IDENTIDAD = {
  OPERATIVO_RECONOCIDO: "Cliente operativo reconocido",
  GOBERNADA: "Identidad contractual gobernada",
  PROGRAMA_RESUELTO: "Programa contractual resuelto",
  NO_ESTABLECIDA: "Identidad contractual no establecida",
} as const;

export const NOTA_ALIAS_NO_GOBERNADO =
  "La correspondencia entre el nombre del ERP y el cliente contractual existe pero no está gobernada: sirve de indicio operativo, no establece identidad contractual.";

export const etiquetaSinResolver = (codigo: string): string =>
  codigo === "ambiguous"
    ? `${NIVEL_IDENTIDAD.OPERATIVO_RECONOCIDO} · programa contractual no resuelto`
    : codigo === "sin_cliente"
      ? NIVEL_IDENTIDAD.NO_ESTABLECIDA
      : codigo;

export const etiquetaClaseNoResuelta = (clase: string): string => {
  switch (clase) {
    case "cliente_operativo_reconocido_sin_programa":
    // Clase heredada de PRV-A1: se conserva el mapeo, corrigiendo el literal.
    case "cliente_identificado_sin_programa":
      return `${NIVEL_IDENTIDAD.OPERATIVO_RECONOCIDO} · programa contractual no resuelto`;
    case "identidad_gobernada_sin_programa":
      return `${NIVEL_IDENTIDAD.GOBERNADA} · programa contractual no resuelto`;
    case "identidad_no_establecida":
      return NIVEL_IDENTIDAD.NO_ESTABLECIDA;
    default:
      return clase;
  }
};

/** Estado de gobierno del alias, tal cual está en base de datos. */
export const etiquetaGobiernoAlias = (gobernado: boolean | null | undefined): string =>
  gobernado ? "Alias gobernado" : "Alias no gobernado";


/** Estados de degradación soportados por la UI. Literales cerrados. */
export const DEGRADACION = {
  DATO_NO_DISPONIBLE: "DATO NO DISPONIBLE",
  FUENTE_NO_CARGADA: "FUENTE NO CARGADA",
  FUENTE_NO_RECONCILIADA: "FUENTE CARGADA · NO RECONCILIADA PARA AGREGACIÓN ECONÓMICA",
  OBLIGACION_NO_REPRESENTADA: "OBLIGACIÓN AÚN NO REPRESENTADA EN EL SISTEMA",
  /** NUNCA significa «no hay OTs»: significa «ninguna OT asignada a programa». */
  SIN_POBLACION: "SIN POBLACIÓN OPERATIVA RESUELTA A PROGRAMA",
  NO_ATRIBUIBLE: "NO ATRIBUIBLE A PROGRAMA",
  NO_CALCULABLE: "NO CALCULABLE",
  NO_EVALUABLE: "NO EVALUABLE",
} as const;

export type DegradacionKey = keyof typeof DEGRADACION;

/** Nombres canónicos de los dos universos de población. */
export const UNIVERSO = {
  RESUELTA: "Población contractual/programática resuelta",
  SERVICIO: "Población operativa de servicio analizada",
} as const;

export const NOTA_UNIVERSO_RESUELTA =
  "OTs cuya resolución vigente las asigna determinísticamente a un programa contractual. No excluye nada más.";

export const NOTA_UNIVERSO_SERVICIO =
  "Subconjunto de la población resuelta sobre el que se miden hitos y plazos: excluye incidencia 'ANULADO AVISO'.";

/** Literal obligatorio cuando un programa no tiene obligaciones representadas. */
export const TEXTO_SIN_OBLIGACIONES =
  "Obligaciones contractuales aún no representadas en el sistema.";

/** Literal obligatorio para programas sin obligación temporal representada. */
export const TEXTO_SIN_OBLIGACION_TEMPORAL =
  "Sin obligación temporal representada actualmente en el sistema.";

/** Marca visible obligatoria en ≤20d / ≤30d. */
export const MARCA_REFERENCIA_INTERNA = "REFERENCIA INTERNA WG";

export const TEXTO_ECONOMIA_COSTE = "Coste: NO ATRIBUIBLE A PROGRAMA";
export const TEXTO_ECONOMIA_CONTRIBUCION = "Contribución: NO CALCULABLE";

/**
 * Nota económica. Dato ausente ≠ cero: el literal habla de importe NO CERO,
 * nunca de «importe informado».
 */
export const notaImporte = (pct: number | null): string =>
  `El importe por OT (fact_cli) es distinto de cero solo en el ${pct == null ? "—" : pct.toFixed(1)}% de los casos; el resto está a cero, que no equivale a dato ausente. La fuente está cargada pero no reconciliada, por lo que no se agrega.`;

export const TEXTO_ECONOMIA_ESTADO_FUENTE =
  "Fuente ERP cargada · no validada ni reconciliada para agregación económica.";

/**
 * Traducción de `reason_code` a castellano de gestión.
 * El código técnico se conserva SIEMPRE en el atributo `title`/`data-reason`
 * del componente que lo pinta (trazabilidad de auditoría).
 */
export const traducirReason = (code: string | null | undefined): string => {
  if (!code) return "Sin motivo declarado";
  const partes = code.split("+").map((c) => c.trim()).filter(Boolean);
  const traducidas = partes.map(traducirReasonToken);
  // Sin duplicados y en el orden en que los devuelve el motor.
  return [...new Set(traducidas)].join(" · ");
};

export const traducirReasonToken = (token: string): string => {
  if (token === "claim_pending") {
    return "La obligación aún no ha sido validada contra el documento";
  }
  if (token === "calendario_no_cargado") {
    return "No está definido qué calendario laboral aplica a este plazo";
  }
  if (token.startsWith("dimension_requerida_sin_predicado_")) {
    return "La regla exige distinguir un universo de producto que el sistema no puede determinar";
  }
  if (token === "requisitos_no_revisados") {
    return "Requisitos de la regla sin revisar";
  }
  if (token.startsWith("dimension_sin_resolver_")) {
    return "La regla exige distinguir un universo de producto que el sistema no puede determinar";
  }
  if (token.startsWith("mapping_ausente_") || token.startsWith("mapping_otro_programa_")) {
    return "Falta la correspondencia aprobada entre el término del contrato y el dato operativo";
  }
  if (token.startsWith("mapping_expirado_")) {
    return "La correspondencia entre contrato y dato operativo está fuera de vigencia";
  }
  if (token.startsWith("mapping_pendiente_")) {
    return "La correspondencia entre contrato y dato operativo está pendiente de aprobación";
  }
  if (token.startsWith("mapping_ambiguo_") || token.startsWith("mapping_no_determinista_")) {
    return "La correspondencia entre contrato y dato operativo no es unívoca";
  }
  if (token.startsWith("valor_no_mapeado_")) {
    return "El valor exigido por el contrato no está mapeado al dato operativo";
  }
  if (token === "scope_ausente") return "El ámbito de aplicación de la regla no está evidenciado";
  if (token === "scope_fuera_de_vigencia") return "El ámbito de aplicación está fuera de vigencia";
  if (token === "conflicto_sin_precedencia_evidenciada") {
    return "Hay reglas en conflicto y no está evidenciada cuál prevalece";
  }
  if (token === "scope_evidenciado") return "Ámbito de aplicación evidenciado";
  if (token === "programa_fuera_de_scope_con_datos_completos") {
    return "El programa queda fuera del ámbito de la regla";
  }
  if (token === "regla_version_inexistente") return "La versión de la regla no existe";
  return token;
};

/** Etiqueta corta del estado de readiness (nunca semáforo). */
export const etiquetaReadiness = (estado: string | null | undefined): string => {
  switch (estado) {
    case "APPLICABLE": return "Aplicable";
    case "NOT_APPLICABLE": return "Fuera de ámbito";
    case "OUT_OF_VIGENCY": return "Fuera de vigencia";
    case "CONFLICTING": return "Conflicto de reglas";
    case "INSUFFICIENT_EVIDENCE": return "Evidencia insuficiente";
    default: return "Sin evaluar";
  }
};

// ── Etapas categóricas de readiness (PRV-A1) ────────────────────────────────
// Secuencia real del ciclo de vida de una obligación. NO es un porcentaje ni
// admite ponderación: cada etapa se alcanza o no se alcanza.
export const ETAPAS_READINESS = [
  "DESCUBIERTA",
  "REPRESENTADA",
  "VALIDADA",
  "APLICABLE",
  "EVALUABLE",
  "EVALUADA",
] as const;

export type EtapaReadiness = (typeof ETAPAS_READINESS)[number];

export const ETIQUETA_ETAPA: Record<EtapaReadiness, string> = {
  DESCUBIERTA: "Descubierta",
  REPRESENTADA: "Representada",
  VALIDADA: "Validada",
  APLICABLE: "Aplicable",
  EVALUABLE: "Evaluable",
  EVALUADA: "Evaluada",
};

export type EntradaEtapas = {
  /** `ctr_claim.estado` */
  claimEstado: string | null | undefined;
  /** Existe una `ctr_regla_version` derivada del claim. */
  tieneRegla: boolean;
  /** `readiness_estado` devuelto por el motor. */
  readinessEstado: string | null | undefined;
};

/**
 * Etapas alcanzadas, como prefijo contiguo. Sin pesos, sin descuentos, sin %.
 * EVALUABLE y EVALUADA no son alcanzables hoy: no existe motor de evaluación
 * habilitado (ni reloj contractual). Se muestran como etapas pendientes.
 */
export const etapasAlcanzadas = (e: EntradaEtapas): EtapaReadiness[] => {
  const cumple: Record<EtapaReadiness, boolean> = {
    DESCUBIERTA: true,
    REPRESENTADA: e.tieneRegla,
    VALIDADA: e.claimEstado === "VALIDATED",
    APLICABLE: e.readinessEstado === "APPLICABLE",
    EVALUABLE: false,
    EVALUADA: false,
  };
  const out: EtapaReadiness[] = [];
  for (const etapa of ETAPAS_READINESS) {
    if (!cumple[etapa]) break;
    out.push(etapa);
  }
  return out;
};

/** Estados terminales que NO representan progreso sino exclusión de ámbito. */
export const esFueraDeAmbito = (estado: string | null | undefined): boolean =>
  estado === "NOT_APPLICABLE" || estado === "OUT_OF_VIGENCY";

export const pctSeguro = (num: number, den: number): number | null =>
  den > 0 ? (num / den) * 100 : null;
