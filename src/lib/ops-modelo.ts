/**
 * ops-modelo.ts — CATÁLOGO ÚNICO DE MODELO de /operaciones (hardening F0–F4).
 *
 * Este módulo NO calcula nada: declara, en un solo sitio, las decisiones de
 * modelo que antes vivían dispersas en literales de página:
 *
 *  1. VENTANAS_PROPIAS — las seis excepciones de ventana temporal que no siguen
 *     el período global (F2).
 *  2. SEMANTICA_KM — qué significa cada cifra de kilómetros y cuál de ellas es
 *     realmente dato disponible (F0/F1).
 *  3. TRAZABILIDAD_F0 — inventario campo fuente → tabla → RPC → frontend → KPI
 *     de los 7 campos críticos congelados en F0.
 *  4. DECISION_RUTAS_LEGADO — decisión ratificada F1-7 (rutas antiguas vivas).
 *
 * Regla: cualquier página que muestre una ventana propia, una cifra de km o una
 * definición de campo crítico debe leer de aquí. Nada de literales paralelos.
 */

// ─── 1. Ventanas temporales propias (F2) ─────────────────────────────────────

export type VentanaPropiaId =
  | "costes_evolucion"
  | "panorama_backlog"
  | "panorama_evolucion"
  | "panorama_resolucion"
  | "hub_evolucion"
  | "tecnicos_evolucion";

export type VentanaPropia = {
  id: VentanaPropiaId;
  /** Página donde se muestra. */
  pagina: string;
  ruta: string;
  /** Bloque concreto dentro de la página. */
  bloque: string;
  meses: 12 | 18;
  /** Por qué no sigue el período global. */
  motivo: string;
  /** ¿Responde al resto de filtros activos (delegación, cliente, gama…)? */
  respetaFiltros: boolean;
};

export const VENTANAS_PROPIAS: readonly VentanaPropia[] = [
  {
    id: "panorama_backlog",
    pagina: "Panorama",
    ruta: "/operaciones",
    bloque: "Backlog a fin de mes",
    meses: 12,
    motivo: "Un backlog solo es legible como serie: con un mes aislado no se distingue nivel de tendencia.",
    respetaFiltros: true,
  },
  {
    id: "panorama_evolucion",
    pagina: "Panorama",
    ruta: "/operaciones",
    bloque: "Evolución creadas / cerradas",
    meses: 18,
    motivo: "18 meses cubren un ciclo completo más el mismo tramo del año anterior (estacionalidad de clima y PAE).",
    respetaFiltros: true,
  },
  {
    id: "panorama_resolucion",
    pagina: "Panorama",
    ruta: "/operaciones",
    bloque: "Resolución ≤20 días (serie)",
    meses: 12,
    motivo: "La referencia operativa se lee contra su propio histórico anual, no contra el período seleccionado.",
    respetaFiltros: true,
  },
  {
    id: "costes_evolucion",
    pagina: "Coste y productividad",
    ruta: "/operaciones/costes",
    bloque: "Evolución de coste y productividad",
    meses: 18,
    motivo: "El coste mensual es una serie con inercia: se necesita ciclo completo + comparable interanual.",
    respetaFiltros: true,
  },
  {
    id: "hub_evolucion",
    pagina: "HUB Central San Agustín",
    ruta: "/operaciones/hub",
    bloque: "Evolución mensual del HUB",
    meses: 18,
    motivo: "El HUB se evalúa como unidad estable; su carga estacional exige ciclo completo + interanual.",
    respetaFiltros: true,
  },
  {
    id: "tecnicos_evolucion",
    pagina: "Técnicos",
    ruta: "/operaciones/tecnicos",
    bloque: "Evolución de la ficha del técnico",
    meses: 12,
    motivo: "La trayectoria individual se juzga a 12 meses para no penalizar un mes atípico.",
    respetaFiltros: false,
  },
] as const;

export const ventanaPropia = (id: VentanaPropiaId): VentanaPropia => {
  const v = VENTANAS_PROPIAS.find((x) => x.id === id);
  if (!v) throw new Error(`Ventana propia desconocida: ${id}`);
  return v;
};

/** Etiqueta única y uniforme para toda la app. */
export const etiquetaVentana = (id: VentanaPropiaId): string => {
  const v = ventanaPropia(id);
  return `Ventana propia: últimos ${v.meses} meses (independiente del período global).${
    v.respetaFiltros ? " Responde al resto de filtros activos." : ""
  }`;
};

// ─── 2. Semántica única de kilómetros (F0/F1) ────────────────────────────────

export type NivelKm = "real" | "aproximacion" | "pendiente";

export const LABEL_NIVEL_KM: Record<NivelKm, string> = {
  real: "Dato real",
  aproximacion: "Aproximación",
  pendiente: "Pendiente de fuente",
};

export type SemanticaKm = {
  id: "km_tecnico_mes" | "km_base_cp" | "km_ruta";
  concepto: string;
  fuente: string;
  nivel: NivelKm;
  /** Cómo debe etiquetarse SIEMPRE en la UI. */
  etiquetaUi: string;
  detalle: string;
};

/**
 * Estado verificado (consulta de solo lectura sobre ops_coste_mensual):
 * 470 filas, 27 técnicos, 0 filas con km > 0 y suma total de km = 0.
 * Por tanto el km técnico/mes NO es dato disponible: la columna existe pero la
 * fuente no la está cargando. No puede presentarse como dato real.
 */
export const KM_TECNICO_MES_DISPONIBLE = false;

export const SEMANTICA_KM: readonly SemanticaKm[] = [
  {
    id: "km_tecnico_mes",
    concepto: "Km por técnico y mes",
    fuente: "ops_coste_mensual.km",
    nivel: KM_TECNICO_MES_DISPONIBLE ? "real" : "pendiente",
    etiquetaUi: "no disponible",
    detalle:
      "La columna existe y se carga, pero todos los registros llegan a 0: no hay ningún técnico/mes con km > 0. " +
      "Mientras la fuente no informe el valor, no puede mostrarse como dato real ni usarse en ratios.",
  },
  {
    id: "km_base_cp",
    concepto: "Distancia base → código postal del aviso",
    fuente: "ops_bases + ops_cp_geo (haversine)",
    nivel: "aproximacion",
    etiquetaUi: "aprox.",
    detalle:
      "Línea recta entre la base de la delegación y el CP del aviso, solo para plantilla propia en canal Domicilio con " +
      "CP geocodificado. No es ruta, no es km recorrido y no incluye retornos ni encadenamientos.",
  },
  {
    id: "km_ruta",
    concepto: "Km por ruta o por intervención",
    fuente: "—",
    nivel: "pendiente",
    etiquetaUi: "pendiente",
    detalle: "Requiere una fuente de rutas o telemetría por OT. No existe con los campos actuales.",
  },
] as const;

export const semanticaKm = (id: SemanticaKm["id"]): SemanticaKm => {
  const s = SEMANTICA_KM.find((x) => x.id === id);
  if (!s) throw new Error(`Semántica de km desconocida: ${id}`);
  return s;
};

/** Frase única que deben usar todas las páginas al hablar de km. */
export const AVISO_KM =
  "La distancia real de desplazamiento por OT no está disponible. La única cifra publicable es una aproximación en " +
  "línea recta base→CP (etiquetada siempre «aprox.»). Los km por técnico y mes de ops_coste_mensual están a 0 en " +
  "todos los registros cargados: se declaran pendientes de fuente, no como dato real. Rutas, tiempos de viaje y km " +
  "por intervención: pendientes.";

/**
 * UAT-6 · Versión de una línea para la cabecera de las páginas operativas.
 * El texto completo (AVISO_KM) se lee en el panel de Definiciones del módulo y
 * en Calidad de datos: no se pierde ninguna limitación, cambia dónde se lee.
 */
export const AVISO_KM_CORTO =
  "Distancia aproximada base→CP; no hay km reales por intervención.";



// ─── 3. Trazabilidad de los 7 campos críticos (F0) ───────────────────────────

export type TrazaCampo = {
  id: string;
  /** Campo tal y como llega de la fuente / ERP. */
  campoFuente: string;
  tabla: string;
  /** Transformación o regla aplicada al cargar. */
  regla: string;
  rpcs: readonly string[];
  frontend: readonly string[];
  kpis: readonly string[];
};

export const TRAZABILIDAD_F0: readonly TrazaCampo[] = [
  {
    id: "gama_real",
    campoFuente: "GAMA (3 valores del ERP) + marca + cliente",
    tabla: "ops_fact_ot.gama_real (trigger ops_trg_gama_real sobre ops_portfolio_gamas / ops_regla_marca / ops_regla_familia)",
    regla:
      "La gama del ERP no es la gama real. Se resuelve por portfolio marca×cliente y, en su defecto, por reglas de marca y familia. Presentación vía GAMA_LABELS (Profesional → Industrial / Profesional).",
    rpcs: ["ops_kpis", "ops_panorama", "ops_equipos", "ops_tecnicos_scorecard", "ops_filter_options"],
    frontend: ["Panorama", "HUB", "Técnicos", "Delegaciones", "Filtros globales"],
    kpis: ["Mix por gama", "Comparativa de equipos", "Calidad esperada por mix"],
  },
  {
    id: "cliente_wg",
    campoFuente: "CLIENTE (razón comercial del ERP)",
    tabla: "ops_fact_ot.cliente_wg + ops_cliente_contrato_alias",
    regla:
      "El cliente del ERP no es el cliente contractual. El alias resuelve valor ERP → cliente contractual del Registry. Electro Depot y Sauber se mantienen separados.",
    rpcs: ["ops_kpis", "ops_panorama", "ops_supply", "ops_costes_entidades"],
    frontend: ["Panorama", "Repuestos", "Calidad de datos"],
    kpis: ["Exposición contractual", "Concentración por cliente", "Readiness contractual"],
  },
  {
    id: "delegacion",
    campoFuente: "DELEGACIÓN / centro de trabajo",
    tabla: "ops_fact_ot.delegacion + ops_bases",
    regla:
      "Unidad organizativa. Central San Agustín es HUB (taller) y no es comparable con las delegaciones de calle: toda comparativa se hace dentro del grupo.",
    rpcs: ["ops_delegaciones", "ops_delegacion_ficha", "ops_dispersion", "ops_equipos"],
    frontend: ["Delegaciones", "HUB", "Dispersión"],
    kpis: ["Producción por base", "Dependencia territorial", "Backlog por base"],
  },
  {
    id: "tecnico",
    campoFuente: "TÉCNICO (nombre en el ERP, con sufijos T/D)",
    tabla: "ops_fact_ot.tecnico + ops_tecnicos (maestro, activo/motivo_inactivo)",
    regla:
      "Los sufijos T/D se unifican en el campo canal. Los técnicos inactivos quedan fuera de medias y rankings, pero conservan su histórico.",
    rpcs: ["ops_tecnicos_scorecard", "ops_tecnico_ficha", "ops_equipos"],
    frontend: ["Técnicos", "HUB · pestaña Técnicos"],
    kpis: ["Producción por persona", "Performance Score (provisional)", "Backlog por persona"],
  },
  {
    id: "canal",
    campoFuente: "Sufijo T/D del recurso + tipo de intervención",
    tabla: "ops_fact_ot.canal (Taller / Domicilio / Único)",
    regla:
      "Separa taller de calle. Domicilio soporta desplazamiento; Taller no. Nunca se comparan productividades entre canales sin declararlo.",
    rpcs: ["ops_costes", "ops_costes_entidades", "ops_dispersion"],
    frontend: ["Coste y productividad", "Dispersión", "HUB"],
    kpis: ["Coste de desplazamiento por OT", "Productividad por canal"],
  },
  {
    id: "fecha_cierre",
    campoFuente: "FECHA CIERRE",
    tabla: "ops_fact_ot.fecha_cierre + dias_cierre + kpi_20d / kpi_30d",
    regla:
      "Reloj de la resolución. El plazo ≤20/≤30 días es REFERENCIA OPERATIVA, no SLA contractual. Las antigüedades se miden contra la fecha efectiva del dato (ops_as_of), nunca contra hoy.",
    rpcs: ["ops_kpis", "ops_sla", "ops_panorama", "ops_evolucion"],
    frontend: ["Panorama", "SLA y envejecimiento", "Técnicos", "Delegaciones"],
    kpis: ["Resolución ≤20d", "Días medios de cierre", "Backlog +30d"],
  },
  {
    id: "es_baja_es_nff",
    campoFuente: "SITUACIÓN = Baja · INCIDENCIA = NO PRESENTA AVERIA",
    tabla: "ops_fact_ot.es_baja / es_nff / es_anulado",
    regla:
      "Baja (aparato irreparable) y NFF (no presentaba avería) son conceptos distintos. 'ANULADO AVISO' se excluye SIEMPRE de todo KPI. El % se contextualiza contra ops_benchmark del mix familia×cliente.",
    rpcs: ["ops_kpis", "ops_panorama", "ops_tecnicos_scorecard", "ops_equipos"],
    frontend: ["Panorama", "Técnicos", "Delegaciones", "Calidad de datos"],
    kpis: ["% Bajas vs esperado", "% NFF vs esperado", "Universo de OTs válidas"],
  },
] as const;

// ─── 4. Decisión ratificada sobre rutas antiguas (F1-7) ──────────────────────

export const DECISION_RUTAS_LEGADO = {
  id: "F1-7",
  estado: "SUPERSEDED · ratificado",
  decision:
    "Las rutas antiguas de /operaciones permanecen vivas por compatibilidad con enlaces existentes.",
  condiciones: [
    "No aparecen en la navegación V2: no constituyen una arquitectura paralela.",
    "No tienen lógica ni datos propios: consumen las mismas RPCs y el mismo contexto temporal global.",
    "Cualquier módulo nuevo se cuelga de la navegación V2, nunca de una ruta legada.",
  ],
} as const;

// ─── 5. Ámbito conceptual: Producto vs Organización (F1) ─────────────────────

export type Ambito = "producto" | "organizacion";

export const LABEL_AMBITO: Record<Ambito, string> = {
  producto: "Producto",
  organizacion: "Organización",
};

export const DESC_AMBITO: Record<Ambito, string> = {
  producto: "Dimensión de producto: gama, familia, marca. Describe QUÉ se repara.",
  organizacion: "Dimensión organizativa: unidad, base, equipo, persona. Describe QUIÉN lo repara.",
};

/** Jerarquía conceptual única del drill-down organizativo. */
export const JERARQUIA_ORGANIZACION = ["WG", "Unidad", "Base", "Equipo", "Persona"] as const;
export type NivelOrganizacion = (typeof JERARQUIA_ORGANIZACION)[number];
