/**
 * ops-data-quality.ts — Registro central PROVISIONAL de dominios de dato.
 *
 * Fase 3A: la lista es estática y refleja el estado real conocido de las fuentes.
 * Fase 3B la convertirá en data-driven (página /operaciones/calidad-datos leyendo
 * cobertura real de campos y readiness contractual). El componente de chip que
 * consume este módulo NO cambiará: solo cambiará el origen de los datos.
 */

export type EstadoDominio = "disponible" | "parcial" | "pendiente";

/** Glifos discretos usados en la UI (nunca color como único portador de sentido). */
export const GLIFO_DOMINIO: Record<EstadoDominio, string> = {
  disponible: "●",
  parcial: "◐",
  pendiente: "○",
};

export const LABEL_ESTADO_DOMINIO: Record<EstadoDominio, string> = {
  disponible: "Disponible",
  parcial: "Parcial",
  pendiente: "Pendiente",
};

export type DominioDato = {
  id: string;
  /** Nombre corto del dominio, tal y como se muestra en la celda declarada. */
  dominio: string;
  estado: EstadoDominio;
  /** Qué hay hoy y de dónde vendrá lo que falta. */
  detalle: string;
  /** KPIs que quedan limitados o no calculables mientras el dominio no esté completo. */
  kpisBloqueados: string[];
};

export const DOMINIOS_DATOS: readonly DominioDato[] = [
  {
    id: "fte_disponibles",
    dominio: "FTE disponibles",
    estado: "pendiente",
    detalle: "Plantilla efectiva por delegación y mes. Fuente prevista: RRHH (ops_rrhh).",
    kpisBloqueados: ["Producción por FTE", "Utilización", "Capacidad instalada"],
  },
  {
    id: "dias_trabajados",
    dominio: "Días trabajados",
    estado: "parcial",
    detalle: "112 filas cargadas: cobertura insuficiente para normalizar producción por tiempo efectivo.",
    kpisBloqueados: ["Producción/FTE/día", "Productividad normalizada"],
  },
  {
    id: "produccion_fte_dia",
    dominio: "Producción / FTE / día",
    estado: "pendiente",
    detalle: "Derivado: requiere FTE disponibles y días trabajados completos.",
    kpisBloqueados: ["Comparativa real de productividad entre equipos"],
  },
  {
    id: "utilizacion",
    dominio: "Utilización",
    estado: "pendiente",
    detalle: "Requiere horas disponibles y horas imputadas por intervención (modelo ops_visitas).",
    kpisBloqueados: ["Utilización de capacidad", "Holgura por delegación"],
  },
  {
    id: "ftf",
    dominio: "First Time Fix",
    estado: "pendiente",
    detalle: "Requiere historial de visitas por OT (una fila por visita, no por orden).",
    kpisBloqueados: ["FTF", "Coste de revisitas"],
  },
  {
    id: "reincidencias",
    dominio: "Reincidencias",
    estado: "pendiente",
    detalle: "Requiere trazar aparato/serie entre OTs para detectar reaperturas.",
    kpisBloqueados: ["Tasa de reincidencia", "Calidad real de reparación"],
  },
  {
    id: "csat",
    dominio: "Satisfacción (CSAT)",
    estado: "pendiente",
    detalle: "Sin fuente de encuestas integrada.",
    kpisBloqueados: ["CSAT", "Score de calidad percibida"],
  },
  {
    id: "historial_estados",
    dominio: "Historial de estados",
    estado: "pendiente",
    detalle: "ops_fact_ot guarda solo el estado actual: no hay transiciones con fecha.",
    kpisBloqueados: ["Tiempo real por etapa", "Imputabilidad WG vs dependencia externa"],
  },
  {
    id: "reglas_contractuales",
    dominio: "Reglas contractuales por cliente/programa",
    estado: "pendiente",
    detalle:
      "No existe registro que asigne a cada OT su regla aplicable (horas o días, hábiles o naturales, clock-start, exclusiones, imputabilidad).",
    kpisBloqueados: ["% de cumplimiento contractual", "Exposición contractual cuantificada"],
  },
] as const;

export const dominioDato = (id: string): DominioDato | undefined =>
  DOMINIOS_DATOS.find((d) => d.id === id);

/** Dominios que bloquean hoy el cálculo de cumplimiento contractual. */
export const DOMINIOS_CONTRACTUALES: readonly string[] = ["reglas_contractuales", "historial_estados"];
