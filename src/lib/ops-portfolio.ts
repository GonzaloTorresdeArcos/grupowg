/**
 * PERFORMANCE REAL · capa de tipos y traducción.
 *
 * Regla P0 de este módulo: aquí NO se calcula ningún KPI ni se afirma ninguna
 * obligación. Todo lo que se muestra procede literalmente de las RPC
 * `ctr_portfolio_resumen`, `ctr_portfolio_arbol`, `ctr_programa_ficha` y
 * `ctr_obligaciones_programa`. Este fichero solo traduce códigos técnicos a
 * castellano de gestión y nombra los estados de degradación.
 */

export type PortfolioResumenFila = {
  vertical_codigo: string;
  vertical_nombre: string;
  n_programas: number;
  n_clientes: number;
  n_ots: number;
  n_instrumentos: number;
  n_claims: number;
  claims_validated: number;
  claims_pending: number;
  n_reglas: number;
  n_aplicabilidad: number;
  n_ots_importe_informado: number;
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
  economia: { n_ots_con_importe: number; n_ots_importe_cero: number };
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

export const etiquetaSinResolver = (codigo: string): string =>
  codigo === "ambiguous"
    ? "Identidad contractual ambigua"
    : codigo === "sin_cliente"
      ? "Sin cliente contractual identificado"
      : codigo;

/** Estados de degradación soportados por la UI. Literales cerrados. */
export const DEGRADACION = {
  DATO_NO_DISPONIBLE: "DATO NO DISPONIBLE",
  FUENTE_NO_CARGADA: "FUENTE NO CARGADA",
  OBLIGACION_NO_REPRESENTADA: "OBLIGACIÓN AÚN NO REPRESENTADA EN EL SISTEMA",
  SIN_POBLACION: "SIN POBLACIÓN OPERATIVA RESUELTA",
  NO_ATRIBUIBLE: "NO ATRIBUIBLE A PROGRAMA",
  NO_CALCULABLE: "NO CALCULABLE",
  NO_EVALUABLE: "NO EVALUABLE",
} as const;

export type DegradacionKey = keyof typeof DEGRADACION;

/** Literal obligatorio cuando un programa no tiene obligaciones representadas. */
export const TEXTO_SIN_OBLIGACIONES =
  "Obligaciones contractuales aún no representadas en el sistema.";

/** Literal obligatorio para programas sin obligación temporal (p. ej. Clima). */
export const TEXTO_SIN_OBLIGACION_TEMPORAL =
  "Sin obligación temporal representada actualmente en el sistema.";

/** Marca visible obligatoria en ≤20d / ≤30d. */
export const MARCA_REFERENCIA_INTERNA = "REFERENCIA INTERNA WG";

export const TEXTO_ECONOMIA_COSTE = "Coste: NO ATRIBUIBLE A PROGRAMA";
export const TEXTO_ECONOMIA_CONTRIBUCION = "Contribución: NO CALCULABLE";

export const notaImporte = (pct: number | null): string =>
  `El importe por OT está informado solo en el ${pct == null ? "—" : pct.toFixed(1)}% de los casos; no se agrega hasta validar la fuente.`;

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
    case "APPLICABLE": return "Preparación completa";
    case "NOT_APPLICABLE": return "Fuera de ámbito";
    case "OUT_OF_VIGENCY": return "Fuera de vigencia";
    case "CONFLICTING": return "Conflicto de reglas";
    case "INSUFFICIENT_EVIDENCE": return "Evidencia insuficiente";
    default: return "Sin evaluar";
  }
};

/**
 * Progreso de PREPARACIÓN (0..1). No es rendimiento ni cumplimiento: mide
 * cuánta evidencia falta para que la obligación sea siquiera evaluable.
 */
export const progresoReadiness = (estado: string | null | undefined, reason: string | null | undefined): number => {
  if (estado === "APPLICABLE") return 1;
  if (!estado) return 0;
  const bloqueos = (reason ?? "").split("+").filter(Boolean).length;
  if (estado === "NOT_APPLICABLE" || estado === "OUT_OF_VIGENCY") return 1;
  if (estado === "CONFLICTING") return 0.25;
  // INSUFFICIENT_EVIDENCE: cuantos más bloqueos, menos preparación.
  return Math.max(0.1, 1 - Math.min(bloqueos, 4) * 0.225);
};

export const pctSeguro = (num: number, den: number): number | null =>
  den > 0 ? (num / den) * 100 : null;
