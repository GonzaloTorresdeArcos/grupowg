/**
 * SLA-E1.3 · CUMPLIMIENTO CONTRACTUAL TEMPORAL · capa de tipos y literales.
 *
 * Regla P0 heredada de PRV-A1: aquí NO se calcula ningún KPI, NO se clasifica
 * ningún resultado y NO se decide qué es publicable. Todo eso lo hace la base
 * de datos (`ctr_sla_programa_kpis`, que a su vez llama a
 * `ctr_sla_temporal_resumen` / `ctr_sla_evaluabilidad`). Este fichero solo:
 *   (1) tipa el payload,
 *   (2) traduce códigos técnicos a castellano de gestión,
 *   (3) construye el CSV de export con los 5 elementos obligatorios.
 */

// ── Tipos del payload de `ctr_sla_programa_kpis` ────────────────────────────

export type ClasificacionKpi =
  | "CONTRACTUAL_TEMPORAL_RESULT_READY"
  | "SHADOW_RESULT_ONLY"
  | "MANAGEMENT_SCENARIO_ONLY"
  | "NOT_READY";

export type SlaTerritorioFila = {
  grupo: "ES" | "PT" | "UNRESOLVED" | string;
  poblacion: number;
  candidata: number;
  met: number;
  missed: number;
  not_evaluable: number;
  adherencia_pct: number | null;
};

export type SlaCobertura = {
  candidate_population: number;
  evaluables: number;
  not_evaluable: number;
  ratio_evaluables_pct: number | null;
  ratio_no_evaluables_pct: number | null;
  limitada: boolean;
};

export type SlaUniversos = {
  poblacion_programa_resuelta: number;
  poblacion_anulado_aviso: number;
  poblacion_fuera_de_alcance: number;
  poblacion_excluida_baja: number;
  poblacion_servicio: number;
  candidate_kpi: number;
  excluded_from_candidate: number;
  evaluable: number;
  not_evaluable_within_candidate: number;
  met: number;
  missed: number;
  temporal_adherence_pct: number | null;
  completitud_start: number | null;
  completitud_end: number | null;
  motivos_no_evaluable: Record<string, number> | null;
  territorios: Record<string, number> | null;
  rango_start: { min: string | null; max: string | null } | null;
};

export type SlaKpi = {
  regla_version_id: string;
  kpi: string;
  kpi_nombre: string | null;
  programa_id?: string | null;
  cliente?: string | null;
  vertical?: string | null;
  claim_id?: string | null;
  claim_estado?: string | null;
  modo?: string | null;
  literal_contractual?: string | null;
  deadline?: string | null;
  deadline_days?: number | null;
  calendar_type?: string | null;
  escenario_baja?: string | null;
  as_of?: string | null;
  etiqueta?: string | null;
  evaluation_ready?: boolean | null;
  publication_ready?: boolean | null;
  temporal_result_available?: boolean | null;
  contractual_temporal_result_available?: boolean | null;
  scenario_result_available?: boolean | null;
  next_blocker?: string | null;
  remaining_blockers?: string[] | null;
  clasificacion: ClasificacionKpi;
  es_professional_8020?: boolean;
  nota_gobernada?: string | null;
  cobertura?: SlaCobertura | null;
  desglose_territorial?: SlaTerritorioFila[] | null;
  universos_y_resultado?: SlaUniversos | null;
  error_evaluacion?: string | null;
};

export type SlaOtFila = {
  num_ot: string;
  poblacion: string;
  start_date: string | null;
  deadline_date: string | null;
  end_date: string | null;
  temporal_result: string | null;
  reason_not_evaluable: string | null;
  territorio_ot: string | null;
  mapping_status_start?: string | null;
  mapping_status_end?: string | null;
  calendar_type?: string | null;
  calendar_source?: string | null;
};

export type SlaDisponibilidadFila = {
  programa_id: string;
  programa_nombre: string | null;
  cliente_id: string | null;
  vertical_codigo: string | null;
  n_kpis: number;
  n_publicables: number;
  n_shadow: number;
  n_escenario: number;
};

// ── Literales gobernados (Dirección 03-09-2026) ─────────────────────────────

/**
 * DECISIÓN MANAGEMENT 1 · texto literal, no editable. La nota menciona el
 * desfase de registro como POSIBILIDAD; jamás como explicación cuantificada
 * del resultado.
 */
export const NOTA_PROFESSIONAL_8020 =
  "Adherencia temporal observable previa a la aplicación del mecanismo contractual de imputabilidad 80/20. Los resultados se calculan sobre las fechas registradas en ERP; pueden existir desfases entre ejecución física y registro en aplicativo.";

export const TITULO_SECCION = "Cumplimiento contractual temporal";

export const TEXTO_SIN_KPIS =
  "Este programa no tiene indicadores temporales contractuales representados y gobernados en el sistema. No es un resultado de cero: es ausencia de representación.";

export const TEXTO_ZONA_SUBORDINADA =
  "Resultados NO contractuales. No son cumplimiento contractual publicable y no se agregan ni se promedian con los indicadores oficiales.";

export const NOTA_ALC02_PROXY =
  "Población on-site aproximada mediante canal=Domicilio (PROXY, veredicto KEEP_AS_PROXY): el campo es operativo, no contractual, y no hay evidencia documental que lo defina como la población on-site del instrumento.";

export const NOTA_ALC03_ESCENARIO =
  "Escenario de Dirección T+21 días naturales. El claim está PENDIENTE: la unidad temporal, el START y el END no están calificados documentalmente. No es un hecho contractual.";

export const FORMULA_DENOMINADOR = "MET / (MET + MISSED)";

export const TEXTO_NO_EVALUABLE_FUERA =
  "Las OTs NO EVALUABLES quedan FUERA del denominador: no cuentan como incumplimiento ni como cumplimiento.";

export const BADGE_COBERTURA_LIMITADA = "Cobertura limitada";

export const PROCEDENCIA_NORMALIZACION_DEFECTO =
  "Management E0.1 §24 (decisión cerrada): 8 h laborables → T+1 día laborable; 32 h laborables → T+4 días laborables. Granularidad DATE suficiente.";

export const SALVEDAD_OCR =
  "El documento fuente no está digitalizado por completo (OCR parcial): la fidelidad del literal no es verificable por máquina y se sostiene en la atestación del contractual_validator recogida en el acto de gobierno.";

// ── Traducciones ────────────────────────────────────────────────────────────

export const ETIQUETA_CLASIFICACION: Record<ClasificacionKpi, string> = {
  CONTRACTUAL_TEMPORAL_RESULT_READY: "Resultado contractual",
  SHADOW_RESULT_ONLY: "Sombra (shadow)",
  MANAGEMENT_SCENARIO_ONLY: "Escenario de Dirección",
  NOT_READY: "No evaluable todavía",
};

export const esOficial = (c: ClasificacionKpi): boolean =>
  c === "CONTRACTUAL_TEMPORAL_RESULT_READY";

export const ETIQUETA_RESULTADO: Record<string, string> = {
  MET: "Cumplida",
  MISSED: "Incumplida",
  NOT_EVALUABLE: "No evaluable",
};

const MOTIVOS: Record<string, string> = {
  end_missing: "El hito de fin no está registrado en el ERP",
  start_missing: "El hito de inicio no está registrado en el ERP",
  end_previo_a_start: "La fecha de fin es anterior a la de inicio (anomalía de registro)",
  fecha_futura: "La fecha registrada es posterior a la fecha efectiva del dato",
  territorio_no_resuelto: "No se ha podido resolver el territorio de la OT (calendario laboral indeterminable)",
  fuera_de_poblacion_declarada: "La OT queda fuera de la población declarada del indicador",
  aviso_anulado_excluido: "Aviso anulado (incidencia ANULADO AVISO), excluido por regla de negocio",
  excluida_baja: "OT de baja excluida por el escenario seleccionado",
};

export const traducirMotivoNoEvaluable = (code: string | null | undefined): string =>
  !code ? "Sin motivo declarado" : MOTIVOS[code] ?? code;

export const ETIQUETA_TERRITORIO: Record<string, string> = {
  ES: "España",
  PT: "Portugal",
  UNRESOLVED: "Territorio no resuelto",
};

export const etiquetaTerritorio = (g: string): string => ETIQUETA_TERRITORIO[g] ?? g;

/** Motivos ordenados de mayor a menor, ya traducidos. Nunca inventa ceros. */
export const motivosOrdenados = (
  motivos: Record<string, number> | null | undefined,
): { code: string; texto: string; n: number }[] =>
  Object.entries(motivos ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => ({ code, texto: traducirMotivoNoEvaluable(code), n }));

// ── Export CSV (DECISIÓN MANAGEMENT 4 · requisito de gate) ──────────────────

/**
 * Todo export incluye OBLIGATORIAMENTE, en cabecera antes de los datos:
 *   1. as-of del dato
 *   2. clasificación del resultado
 *   3. denominador explícito
 *   4. nota 80/20 cuando aplique
 *   5. marca SHADOW / MANAGEMENT SCENARIO cuando aplique
 * `cabeceraExportObligatoria` es la única fuente de esa cabecera: cualquier
 * export futuro debe reutilizarla.
 */
export const MARCA_SHADOW = "SHADOW · RESULTADO NO PUBLICABLE";
export const MARCA_ESCENARIO = "MANAGEMENT SCENARIO · NO ES HECHO CONTRACTUAL";

export const marcaDe = (c: ClasificacionKpi): string | null =>
  c === "SHADOW_RESULT_ONLY" ? MARCA_SHADOW
    : c === "MANAGEMENT_SCENARIO_ONLY" ? MARCA_ESCENARIO
      : null;

const esc = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const cabeceraExportObligatoria = (k: SlaKpi): string[] => {
  const u = k.universos_y_resultado;
  const met = u?.met ?? 0;
  const missed = u?.missed ?? 0;
  const marca = marcaDe(k.clasificacion);
  const lineas = [
    `Indicador;${esc(k.kpi)} · ${esc(k.kpi_nombre ?? "")}`,
    `As-of del dato;${esc(k.as_of ?? "no disponible")}`,
    `Clasificacion del resultado;${esc(ETIQUETA_CLASIFICACION[k.clasificacion])} (${esc(k.clasificacion)})`,
    `Denominador;${esc(FORMULA_DENOMINADOR)} = ${met} + ${missed} = ${met + missed}`,
    `Poblacion candidata;${u?.candidate_kpi ?? 0}`,
    `No evaluables (fuera del denominador);${u?.not_evaluable_within_candidate ?? 0}`,
    `Estado del claim;${esc(k.claim_estado ?? "")}`,
    `Escenario de baja;${esc(k.escenario_baja ?? "A")}`,
  ];
  if (k.es_professional_8020) lineas.push(`Nota 80/20;${esc(NOTA_PROFESSIONAL_8020)}`);
  if (marca) lineas.push(`Marca;${esc(marca)}`);
  return lineas;
};

export const csvDrilldown = (k: SlaKpi, filas: SlaOtFila[]): string => {
  const cols = ["num_ot", "poblacion", "start_date", "deadline_date", "end_date",
    "temporal_result", "resultado", "motivo", "territorio_ot"];
  const cuerpo = filas.map((f) => [
    f.num_ot, f.poblacion, f.start_date, f.deadline_date, f.end_date,
    f.temporal_result,
    ETIQUETA_RESULTADO[f.temporal_result ?? ""] ?? f.temporal_result,
    f.reason_not_evaluable ? traducirMotivoNoEvaluable(f.reason_not_evaluable) : "",
    f.territorio_ot,
  ].map(esc).join(";"));
  return [
    ...cabeceraExportObligatoria(k),
    `Filas exportadas;${filas.length}`,
    "",
    cols.join(";"),
    ...cuerpo,
  ].join("\n");
};

export const descargarCsv = (nombre: string, contenido: string) => {
  const blob = new Blob([`\uFEFF${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};
