/**
 * ops-data-quality.ts — Registro de dominios de dato.
 *
 * F3A: la lista era estática y escrita a mano.
 * F3B: los estados se DERIVAN de medidas reales devueltas por la RPC
 * `ops_data_quality` (cobertura por campo, existencia de tablas, meses cargados).
 * El contrato de la UI no cambia: `DominioDato` conserva `id`, `dominio`,
 * `estado`, `detalle` y `kpisBloqueados`, y añade campos opcionales con la
 * medida que produjo el estado.
 *
 * PRINCIPIO: si un dominio no tiene fuente, se declara `pendiente`. Nunca se
 * estima, se interpola ni se rellena por defecto.
 */

import type { EstadoCobertura, EventoOT, ReglaSla } from "@/lib/ops-contractual";
import { FUENTE_EVENTO, clasificarCoberturaEvento, dimensionesRequeridas, eventosRequeridos } from "@/lib/ops-contractual";


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
  /** Fuente de dato requerida (tabla o sistema origen). */
  fuente?: string;
  /** Campos concretos que sostienen el dominio. */
  campos?: string[];
  /** Cobertura medida 0-1 (null si el dominio no se mide por cobertura de campo). */
  cobertura?: number | null;
  /** Cobertura mínima exigida para considerarlo disponible. */
  esperado?: number;
  /** Frase con la medida real que produjo el estado. */
  medida?: string;
};

// ─── Medidas reales (payload de la RPC ops_data_quality) ─────────────────────

export type MedidasDataQuality = {
  generado_en: string;
  fact_ot: {
    filas: number;
    min_fecha_creacion: string | null;
    max_fecha_creacion: string | null;
    ultima_importacion: string | null;
    ultima_actualizacion: string | null;
  };
  campos_fact_ot: Record<string, number>;
  campos_ausentes_fact_ot: string[];
  rrhh: { filas: number; meses: number; ultimo_mes: string | null };
  coste_mensual: { filas: number; meses: number; ultimo_mes: string | null };
  geo: {
    filas_cp_geo: number;
    ots_domicilio: number;
    ots_domicilio_geocodificables: number;
    pct_geocodificable: number | null;
  };
  tablas: Record<string, boolean>;
  registry_reglas: number;
  /** Festivos cargados por territorio en ops_calendario_laboral (hoy vacía). */
  calendario_laboral?: Record<string, number>;
  /** Valores reales de cliente_wg con su volumen y cobertura de eventos. */
  clientes_erp?: Array<{
    cliente_wg: string;
    ots: number;
    cob_primer_contacto: number | null;
    cob_primera_visita: number | null;
    cob_cierre: number | null;
  }>;
};



// ─── Definiciones de dominio ─────────────────────────────────────────────────

export type ReglaCompletitud =
  | { tipo: "campos"; campos: string[]; minimo: number }
  | { tipo: "tabla"; tabla: string }
  | { tipo: "meses"; fuente: "rrhh" | "coste_mensual"; minimo: number }
  | { tipo: "geo"; minimo: number }
  | { tipo: "derivado"; depende: string[] };

export type DefinicionDominio = {
  id: string;
  dominio: string;
  fuente: string;
  detalle: string;
  kpisBloqueados: string[];
  regla: ReglaCompletitud;
};

export const DEFINICIONES_DOMINIO: readonly DefinicionDominio[] = [
  {
    id: "identificacion_ot",
    dominio: "Identificación de la OT",
    fuente: "ops_fact_ot",
    detalle: "Número de OT, cliente y situación: base de todo recuento.",
    kpisBloqueados: ["Cualquier recuento"],
    regla: { tipo: "campos", campos: ["num_ot", "cliente_wg", "situacion", "estado"], minimo: 0.99 },
  },
  {
    id: "fechas_ciclo",
    dominio: "Fechas del ciclo",
    fuente: "ops_fact_ot",
    detalle: "Creación, primer contacto, primera visita y cierre: sostienen todos los relojes de plazo.",
    kpisBloqueados: ["Plazos por evento", "Referencia operativa ≤20d por tramo"],
    regla: { tipo: "campos", campos: ["fecha_creacion", "fecha_cierre", "fecha_primer_contacto", "fecha_primera_visita"], minimo: 0.95 },
  },
  {
    id: "producto",
    dominio: "Producto y gama",
    fuente: "ops_fact_ot + ops_portfolio_gamas",
    detalle: "Gama real, familia, subfamilia y marca: base del benchmark de complejidad.",
    kpisBloqueados: ["Benchmark por mix", "Comparabilidad entre equipos"],
    regla: { tipo: "campos", campos: ["gama_real", "familia", "subfamilia", "marca"], minimo: 0.99 },
  },
  {
    id: "recurso",
    dominio: "Recurso asignado",
    fuente: "ops_fact_ot",
    detalle: "Técnico propio o SAT externo por OT. El campo técnico solo está informado en las OTs de red propia.",
    kpisBloqueados: ["Scorecard por técnico sobre el total", "Reparto propio vs externo por OT"],
    regla: { tipo: "campos", campos: ["tipo_recurso", "tecnico", "sat"], minimo: 0.95 },
  },
  {
    id: "delegacion",
    dominio: "Delegación",
    fuente: "ops_fact_ot",
    detalle: "Delegación responsable de la OT. Ausente en las OTs derivadas a SAT externo.",
    kpisBloqueados: ["Comparativa territorial completa", "Coste por delegación sobre el total"],
    regla: { tipo: "campos", campos: ["delegacion"], minimo: 0.95 },
  },
  {
    id: "geografia",
    dominio: "Geografía y geocodificación",
    fuente: "ops_fact_ot + ops_cp_geo",
    detalle: "Código postal siempre presente; la geocodificación depende de la cobertura de ops_cp_geo.",
    kpisBloqueados: ["Dispersión real", "Kilómetros y coste de desplazamiento"],
    regla: { tipo: "geo", minimo: 0.9 },
  },
  {
    id: "canal",
    dominio: "Canal (taller / domicilio)",
    fuente: "ops_fact_ot",
    detalle: "Determina el coste de desplazamiento imputable y la comparabilidad de productividad.",
    kpisBloqueados: ["Productividad comparable taller vs domicilio"],
    regla: { tipo: "campos", campos: ["canal"], minimo: 0.98 },
  },
  {
    id: "economico",
    dominio: "Importes por OT",
    fuente: "ops_fact_ot",
    detalle: "Mano de obra, desplazamiento y facturación a cliente y a SAT.",
    kpisBloqueados: ["Contribución por OT", "Coste directo real"],
    regla: { tipo: "campos", campos: ["importe_mo", "importe_desplazamiento", "fact_cli", "fact_sat"], minimo: 0.98 },
  },
  {
    id: "fte_disponibles",
    dominio: "FTE disponibles",
    fuente: "ops_rrhh",
    detalle: "Plantilla efectiva por delegación y mes.",
    kpisBloqueados: ["Producción por FTE", "Utilización", "Capacidad instalada"],
    regla: { tipo: "meses", fuente: "rrhh", minimo: 12 },
  },
  {
    id: "dias_trabajados",
    dominio: "Días trabajados",
    fuente: "ops_rrhh",
    detalle: "Días efectivos y ausencias por técnico y mes: sin ellos no se normaliza la producción por tiempo.",
    kpisBloqueados: ["Producción/FTE/día", "Productividad normalizada"],
    regla: { tipo: "meses", fuente: "rrhh", minimo: 12 },
  },
  {
    id: "coste_mensual",
    dominio: "Coste mensual por técnico",
    fuente: "ops_coste_mensual",
    detalle: "Coste total, variable y kilómetros por técnico y mes.",
    kpisBloqueados: ["Coste real por OT", "Contribución por técnico"],
    regla: { tipo: "meses", fuente: "coste_mensual", minimo: 12 },
  },
  {
    id: "produccion_fte_dia",
    dominio: "Producción / FTE / día",
    fuente: "Derivado",
    detalle: "Requiere FTE disponibles y días trabajados completos.",
    kpisBloqueados: ["Comparativa real de productividad entre equipos"],
    regla: { tipo: "derivado", depende: ["fte_disponibles", "dias_trabajados"] },
  },
  {
    id: "utilizacion",
    dominio: "Utilización",
    fuente: "ops_visitas (no existe) + ops_rrhh",
    detalle: "Requiere horas disponibles y horas imputadas por intervención.",
    kpisBloqueados: ["Utilización de capacidad", "Holgura por delegación"],
    regla: { tipo: "tabla", tabla: "ops_visitas" },
  },
  {
    id: "ftf",
    dominio: "First Time Fix",
    fuente: "ops_visitas (no existe)",
    detalle: "Requiere historial de visitas por OT: una fila por visita, no por orden.",
    kpisBloqueados: ["FTF", "Coste de revisitas"],
    regla: { tipo: "tabla", tabla: "ops_visitas" },
  },
  {
    id: "reincidencias",
    dominio: "Reincidencias",
    fuente: "ops_fact_ot (campo ot_anterior ausente)",
    detalle: "Requiere trazar aparato o número de serie entre OTs para detectar reaperturas.",
    kpisBloqueados: ["Tasa de reincidencia", "Repeat repair contractual", "Calidad real de reparación"],
    regla: { tipo: "campos", campos: ["ot_anterior"], minimo: 0.9 },
  },
  {
    id: "csat",
    dominio: "Satisfacción (CSAT)",
    fuente: "ops_csat (no existe)",
    detalle: "Sin fuente de encuestas integrada.",
    kpisBloqueados: ["CSAT", "Score de calidad percibida"],
    regla: { tipo: "tabla", tabla: "ops_csat" },
  },
  {
    id: "reclamaciones",
    dominio: "Reclamaciones",
    fuente: "ops_reclamaciones (no existe)",
    detalle: "Sin registro de reclamaciones de cliente final ni de cliente WG.",
    kpisBloqueados: ["Tasa de reclamación", "Calidad ponderada del scorecard"],
    regla: { tipo: "tabla", tabla: "ops_reclamaciones" },
  },
  {
    id: "historial_estados",
    dominio: "Historial de estados",
    fuente: "ops_historial_estados (no existe)",
    detalle: "ops_fact_ot guarda solo el estado actual: no hay transiciones con fecha.",
    kpisBloqueados: ["Tiempo real por etapa", "Pausas de reloj", "Imputabilidad WG vs dependencia externa"],
    regla: { tipo: "tabla", tabla: "ops_historial_estados" },
  },
  {
    id: "repuestos",
    dominio: "Ciclo de repuesto",
    fuente: "ops_repuestos (no existe)",
    detalle: "Solo existe el flag tiene_piezas: no hay fecha de solicitud ni de disponibilidad.",
    kpisBloqueados: ["Tiempo de espera de repuesto", "Exclusión de reloj por espera de pieza"],
    regla: { tipo: "tabla", tabla: "ops_repuestos" },
  },
  {
    id: "imputabilidad",
    dominio: "Imputabilidad de la demora",
    fuente: "ops_fact_ot (campo ausente)",
    detalle: "No se puede distinguir demora imputable a WG de demora por cliente, SAT o proveedor de pieza.",
    kpisBloqueados: ["Cumplimiento neto de exclusiones", "Defensa contractual de la demora"],
    regla: { tipo: "campos", campos: ["imputabilidad"], minimo: 0.9 },
  },
  {
    id: "motivo_cierre",
    dominio: "Motivo de cierre y de baja",
    fuente: "ops_fact_ot (campo ausente)",
    detalle: "El flag es_baja indica que hubo baja, pero no por qué.",
    kpisBloqueados: ["Causa raíz de bajas", "Bajas evitables vs estructurales"],
    regla: { tipo: "campos", campos: ["motivo_cierre", "motivo_baja"], minimo: 0.9 },
  },
  {
    id: "segmentacion_contractual",
    dominio: "Segmentación contractual de la OT",
    fuente: "ops_fact_ot (campos ausentes)",
    detalle: "Ninguna OT lleva programa, línea de negocio, tipología ni fase: no se puede asignar su regla aplicable.",
    kpisBloqueados: ["Asignación de regla por OT", "% de cumplimiento contractual"],
    regla: { tipo: "campos", campos: ["programa", "business_line", "tipologia_servicio", "fase"], minimo: 0.9 },
  },
  {
    id: "calendario_laboral",
    dominio: "Calendario laboral y festivos",
    fuente: "No disponible",
    detalle: "Sin calendario de festivos no se pueden medir relojes en horas ni días laborables.",
    kpisBloqueados: ["SLA en horas laborables", "SLA en días laborables"],
    regla: { tipo: "campos", campos: ["calendario_laboral"], minimo: 0.9 },
  },
  {
    id: "reglas_contractuales",
    dominio: "Reglas contractuales por cliente/programa",
    fuente: "ops_sla_registry",
    detalle:
      "El Registry ya existe como estructura, pero las reglas cargadas son fixtures en borrador sin validar contra clausulado.",
    kpisBloqueados: ["% de cumplimiento contractual", "Exposición contractual cuantificada"],
    regla: { tipo: "tabla", tabla: "ops_sla_registry" },
  },
] as const;

// ─── Derivación de estado a partir de las medidas ────────────────────────────

const clasificarCobertura = (cob: number, minimo: number): EstadoDominio => {
  if (cob >= minimo) return "disponible";
  if (cob >= 0.5) return "parcial";
  return "pendiente";
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const derivarDominio = (def: DefinicionDominio, m: MedidasDataQuality): DominioDato => {
  const salida = (estado: EstadoDominio, medida: string, extra: Partial<DominioDato> = {}): DominioDato => ({
    id: def.id,
    dominio: def.dominio,
    estado,
    detalle: def.detalle,
    kpisBloqueados: def.kpisBloqueados,
    fuente: def.fuente,
    medida,
    cobertura: null,
    ...extra,
  });

  switch (def.regla.tipo) {
    case "campos": {
      const { campos, minimo } = def.regla;
      const ausentes = campos.filter((c) => m.campos_ausentes_fact_ot.includes(c) || m.campos_fact_ot[c] === undefined);
      if (ausentes.length === campos.length) {
        return salida("pendiente", `Campos inexistentes en el origen: ${ausentes.join(", ")}.`, { campos, esperado: minimo, cobertura: 0 });
      }
      const presentes = campos.filter((c) => !ausentes.includes(c));
      const cob = Math.min(...presentes.map((c) => m.campos_fact_ot[c] ?? 0));
      const peor = presentes.reduce((a, b) => ((m.campos_fact_ot[a] ?? 0) <= (m.campos_fact_ot[b] ?? 0) ? a : b));
      const estado = ausentes.length > 0 ? "parcial" : clasificarCobertura(cob, minimo);
      const medida =
        ausentes.length > 0
          ? `Cobertura mínima ${pct(cob)} (peor campo: ${peor}); faltan en origen: ${ausentes.join(", ")}.`
          : `Cobertura mínima ${pct(cob)} sobre ${m.fact_ot.filas.toLocaleString("es-ES")} OTs (peor campo: ${peor}; exigido ${pct(minimo)}).`;
      return salida(estado, medida, { campos, cobertura: cob, esperado: minimo });
    }
    case "tabla": {
      const existe = m.tablas[def.regla.tabla] === true;
      if (def.regla.tabla === "ops_sla_registry") {
        const n = m.registry_reglas;
        return salida(
          existe && n > 0 ? "parcial" : "pendiente",
          existe
            ? `Registry creado con ${n} regla(s) en borrador: ninguna validada contra clausulado.`
            : "El Registry no existe todavía.",
        );
      }
      return salida(
        existe ? "disponible" : "pendiente",
        existe ? `Tabla ${def.regla.tabla} disponible.` : `La tabla ${def.regla.tabla} no existe en el modelo de datos.`,
      );
    }
    case "meses": {
      const f = def.regla.fuente === "rrhh" ? m.rrhh : m.coste_mensual;
      const cob = def.regla.minimo === 0 ? 0 : Math.min(1, f.meses / def.regla.minimo);
      const estado: EstadoDominio = f.filas === 0 ? "pendiente" : f.meses >= def.regla.minimo ? "disponible" : "parcial";
      return salida(
        estado,
        `${f.filas} filas cargadas, ${f.meses} de ${def.regla.minimo} meses requeridos${f.ultimo_mes ? ` (último: ${f.ultimo_mes})` : ""}.`,
        { cobertura: cob, esperado: 1 },
      );
    }
    case "geo": {
      const cob = m.geo.pct_geocodificable ?? 0;
      return salida(
        clasificarCobertura(cob, def.regla.minimo),
        `${m.geo.ots_domicilio_geocodificables.toLocaleString("es-ES")} de ${m.geo.ots_domicilio.toLocaleString("es-ES")} OTs a domicilio geocodificables (${pct(cob)}) con ${m.geo.filas_cp_geo} CPs en el maestro.`,
        { cobertura: cob, esperado: def.regla.minimo },
      );
    }
    case "derivado": {
      const deps = def.regla.depende.map((id) => {
        const d = DEFINICIONES_DOMINIO.find((x) => x.id === id);
        return d ? derivarDominio(d, m) : null;
      });
      const peor: EstadoDominio = deps.some((d) => !d || d.estado === "pendiente")
        ? "pendiente"
        : deps.some((d) => d?.estado === "parcial")
          ? "parcial"
          : "disponible";
      return salida(peor === "disponible" ? "disponible" : "pendiente", `Derivado de: ${def.regla.depende.join(", ")}.`);
    }
  }
};

export const derivarDominios = (m: MedidasDataQuality): DominioDato[] =>
  DEFINICIONES_DOMINIO.map((d) => derivarDominio(d, m));

// ─── Fallback estático (sin medidas cargadas todavía) ────────────────────────

/**
 * Estado por defecto mientras la RPC no ha respondido. Refleja lo peor conocido:
 * nada se declara disponible sin medida.
 */
export const DOMINIOS_DATOS: readonly DominioDato[] = DEFINICIONES_DOMINIO.map((d) => ({
  id: d.id,
  dominio: d.dominio,
  // "parcial" solo donde consta carga incompleta conocida; el resto, pendiente.
  estado: (d.id === "dias_trabajados" ? "parcial" : "pendiente") as EstadoDominio,
  detalle: d.detalle,
  kpisBloqueados: d.kpisBloqueados,
  fuente: d.fuente,
  cobertura: null,
  medida: "Medida no cargada todavía.",
}));

export const dominioDato = (id: string, dominios: readonly DominioDato[] = DOMINIOS_DATOS): DominioDato | undefined =>
  dominios.find((d) => d.id === id);

/** Dominios que bloquean hoy el cálculo de cumplimiento contractual. */
export const DOMINIOS_CONTRACTUALES: readonly string[] = [
  "reglas_contractuales",
  "historial_estados",
  "segmentacion_contractual",
  "imputabilidad",
  "calendario_laboral",
  "repuestos",
];

// ─── Frescura del dato ───────────────────────────────────────────────────────

export type Frescura = { dias: number | null; estado: "fresco" | "envejecido" | "desconocido"; texto: string };

export const frescura = (m: MedidasDataQuality, ahora: Date = new Date()): Frescura => {
  const ts = m.fact_ot.ultima_importacion;
  if (!ts) return { dias: null, estado: "desconocido", texto: "Sin registro de última importación." };
  const dias = Math.floor((ahora.getTime() - new Date(ts).getTime()) / 86_400_000);
  return {
    dias,
    estado: dias <= 45 ? "fresco" : "envejecido",
    texto: `Última importación hace ${dias} día(s). Datos de OT desde ${m.fact_ot.min_fecha_creacion ?? "?"} hasta ${m.fact_ot.max_fecha_creacion ?? "?"}.`,
  };
};

// ─── Contractual data readiness ──────────────────────────────────────────────

export type BloqueoReadiness = { tipo: "evento" | "dimension" | "calendario" | "target" | "validacion"; clave: string; motivo: string };

export type Medibilidad = "medible" | "parcial" | "pendiente";

export const LABEL_MEDIBILIDAD: Record<Medibilidad, string> = {
  medible: "Medible",
  parcial: "Parcial",
  pendiente: "Pendiente",
};

export type ReadinessRegla = {
  regla: ReglaSla;
  medible: boolean;
  /** (c) Medibilidad técnica DERIVADA. Nunca es una columna del Registry. */
  medibilidad: Medibilidad;
  bloqueos: BloqueoReadiness[];
  /** Cobertura del peor evento con fuente disponible (null si ninguno la tiene). */
  coberturaEventos: number | null;
  /** Clasificación de esa cobertura: disponible ≥95%, parcial ≥80%, limitado <80%. */
  estadoCobertura: EstadoCobertura | null;
  /** OTs del universo del cliente contractual de la regla (null si no se resolvió). */
  universoCliente: number | null;
  /** De dónde sale la cobertura declarada arriba. */
  fuenteCobertura: "cliente" | "global";
};

// ─── Universo de OTs por cliente contractual ─────────────────────────────────

/** Campos de ops_fact_ot cuya cobertura se mide por cliente en la RPC. */
const COBERTURA_POR_CLIENTE: Record<string, "cob_primer_contacto" | "cob_primera_visita" | "cob_cierre"> = {
  fecha_primer_contacto: "cob_primer_contacto",
  fecha_primera_visita: "cob_primera_visita",
  fecha_cierre: "cob_cierre",
};

export type UniversoCliente = {
  cliente_contractual: string;
  universo_total: number;
  /** Cobertura ponderada por volumen de OTs, por campo de ops_fact_ot. */
  cobertura: Record<string, number>;
  valoresPorAlias: number;
  valoresPorPatron: number;
};

/**
 * Agrega los valores reales de `cliente_wg` en universos por cliente CONTRACTUAL
 * (alias explícito → patrón del Registry → sin resolver) y pondera la cobertura
 * de cada evento por volumen de OTs. Sin esto, el readiness mediría la cobertura
 * global de la tabla, que no es la del cliente de la regla.
 */
export const universosPorCliente = (
  m: MedidasDataQuality,
  aliases: readonly ClienteAlias[],
  reglas: readonly ReglaSla[],
): Map<string, UniversoCliente> | null => {
  const valores = m.clientes_erp;
  if (!valores?.length) return null;
  const patrones: ReglaPatron[] = reglas.map((r) => ({
    cliente: r.cliente,
    cliente_wg_patron: r.cliente_wg_patron,
    programa: r.programa,
  }));
  const acc = new Map<string, UniversoCliente & { sumas: Record<string, number> }>();
  for (const v of valores) {
    const res = resolverClienteContractual(v.cliente_wg, aliases, patrones);
    if (!res.cliente_contractual) continue;
    const prev =
      acc.get(res.cliente_contractual) ??
      {
        cliente_contractual: res.cliente_contractual,
        universo_total: 0,
        cobertura: {},
        valoresPorAlias: 0,
        valoresPorPatron: 0,
        sumas: {} as Record<string, number>,
      };
    prev.universo_total += v.ots;
    if (res.metodo === "alias_explicito") prev.valoresPorAlias += 1;
    else prev.valoresPorPatron += 1;
    for (const [campo, clave] of Object.entries(COBERTURA_POR_CLIENTE)) {
      prev.sumas[campo] = (prev.sumas[campo] ?? 0) + v.ots * (v[clave] ?? 0);
    }
    acc.set(res.cliente_contractual, prev);
  }
  const out = new Map<string, UniversoCliente>();
  for (const [k, u] of acc) {
    const cobertura: Record<string, number> = {};
    for (const campo of Object.keys(COBERTURA_POR_CLIENTE)) {
      cobertura[campo] = u.universo_total > 0 ? (u.sumas[campo] ?? 0) / u.universo_total : 0;
    }
    out.set(k, {
      cliente_contractual: u.cliente_contractual,
      universo_total: u.universo_total,
      cobertura,
      valoresPorAlias: u.valoresPorAlias,
      valoresPorPatron: u.valoresPorPatron,
    });
  }
  return out;
};

export type ContextoReadiness = { universos?: Map<string, UniversoCliente> | null };

const coberturaEvento = (ev: EventoOT, m: MedidasDataQuality): number | null => {
  const campo = FUENTE_EVENTO[ev];
  if (!campo) return null;
  return m.campos_fact_ot[campo] ?? null;
};

/**
 * Determina si una regla del Registry es HOY medible con los datos existentes.
 * Cualquier bloqueo la deja como no medible; una cobertura de evento entre el
 * 80% y el 95% no bloquea pero degrada la medibilidad a «parcial».
 *
 * La cobertura se mide en el UNIVERSO DEL CLIENTE de la regla cuando hay datos
 * por cliente; solo si la medida no los trae se cae a la cobertura global, y se
 * declara como tal.
 */
export const readinessRegla = (
  regla: ReglaSla,
  m: MedidasDataQuality,
  ctx: ContextoReadiness = {},
): ReadinessRegla => {
  const bloqueos: BloqueoReadiness[] = [];
  const coberturas: number[] = [];

  const universos = ctx.universos ?? null;
  const universo = universos?.get(regla.cliente) ?? null;
  const fuenteCobertura: "cliente" | "global" = universo ? "cliente" : "global";
  if (universos && !universo) {
    bloqueos.push({
      tipo: "cliente",
      clave: "cliente_no_identificado_en_datos",
      motivo: `Ningún valor de cliente_wg resuelve al cliente contractual «${regla.cliente}»: sin universo de OTs no hay nada que medir.`,
    });
  }

  for (const ev of eventosRequeridos(regla)) {
    const campo = FUENTE_EVENTO[ev];
    if (!campo) {
      bloqueos.push({ tipo: "evento", clave: ev, motivo: `El evento «${ev}» no tiene campo de origen en ops_fact_ot.` });
      continue;
    }
    const porCliente = universo && campo in universo.cobertura ? universo.cobertura[campo] : null;
    const cob = porCliente ?? coberturaEvento(ev, m);
    if (cob == null) {
      bloqueos.push({ tipo: "evento", clave: ev, motivo: `Campo ${campo} no medido.` });
      continue;
    }
    coberturas.push(cob);
    const ambito = porCliente == null ? " (cobertura global, no por cliente)" : ` en ${regla.cliente}`;
    if (clasificarCoberturaEvento(cob) === "limitado") {
      bloqueos.push({
        tipo: "evento",
        clave: ev,
        motivo: `Cobertura de ${campo}${ambito}: ${pct(cob)} (<80%): readiness limitado, no representativo.`,
      });
    }
  }


  for (const dim of dimensionesRequeridas(regla)) {
    const presente = m.campos_fact_ot[dim] !== undefined && !m.campos_ausentes_fact_ot.includes(dim);
    if (!presente) {
      bloqueos.push({ tipo: "dimension", clave: dim, motivo: `La OT no lleva «${dim}»: no se puede asignar la regla.` });
    } else if ((m.campos_fact_ot[dim] ?? 0) < 0.95) {
      bloqueos.push({ tipo: "dimension", clave: dim, motivo: `Cobertura de ${dim}: ${pct(m.campos_fact_ot[dim] ?? 0)}.` });
    }
  }

  if (regla.calendario !== "natural" || regla.unidad === "horas_laborables" || regla.unidad === "dias_laborables") {
    const filas = m.calendario_laboral?.[regla.territorio_calendario ?? ""] ?? 0;
    if (filas === 0) {
      bloqueos.push({
        tipo: "calendario",
        clave: regla.territorio_calendario ?? regla.calendario,
        motivo: `Sin festivos cargados para el territorio «${regla.territorio_calendario ?? "no declarado"}»: no se sustituye por lunes–viernes.`,
      });
    }
  }
  if (regla.target == null) {
    bloqueos.push({ tipo: "target", clave: regla.kpi, motivo: "El contrato no define un objetivo cuantificado." });
  }
  if (regla.pausas_exclusiones.length > 0 && m.tablas.ops_historial_estados !== true) {
    bloqueos.push({ tipo: "evento", clave: "pausas", motivo: "Las exclusiones de reloj exigen historial de estados, que no existe." });
  }
  if (regla.ventana_garantia_dias != null && !m.campos_fact_ot.ot_anterior) {
    bloqueos.push({ tipo: "evento", clave: "ot_anterior", motivo: "No hay enlace entre OTs para detectar reincidencia." });
  }
  if (regla.estado_regla !== "validada") {
    bloqueos.push({ tipo: "validacion", clave: regla.estado_regla, motivo: "Regla en borrador: no validada contra el clausulado." });
  }

  const coberturaEventos = coberturas.length ? Math.min(...coberturas) : null;
  const estadoCobertura = coberturaEventos == null ? null : clasificarCoberturaEvento(coberturaEventos);
  const medible = bloqueos.length === 0;

  return {
    regla,
    medible,
    medibilidad: !medible ? "pendiente" : estadoCobertura === "parcial" ? "parcial" : "medible",
    bloqueos,
    coberturaEventos,
    estadoCobertura,
  };
};


export type ResumenReadiness = {
  total: number;
  medibles: number;
  noMedibles: number;
  /** Reparto por las tres dimensiones independientes del Registry. */
  porMedibilidad: Record<Medibilidad, number>;
  porExtraccion: { extraida_contrato: number; pendiente_extraer: number };
  porValidacion: Record<string, number>;
  /** Motivos agregados ordenados por frecuencia. */
  bloqueosTop: Array<{ clave: string; motivo: string; n: number }>;
  /** Siempre false en F3B: no se declara cumplimiento contractual. */
  puedeDeclararCumplimiento: boolean;
};

export const resumenReadiness = (reglas: readonly ReglaSla[], m: MedidasDataQuality): ResumenReadiness => {
  const evaluadas = reglas.map((r) => readinessRegla(r, m));
  const mapa = new Map<string, { clave: string; motivo: string; n: number }>();
  for (const e of evaluadas) {
    for (const b of e.bloqueos) {
      const k = `${b.tipo}:${b.clave}`;
      const prev = mapa.get(k);
      if (prev) prev.n += 1;
      else mapa.set(k, { clave: k, motivo: b.motivo, n: 1 });
    }
  }
  const medibles = evaluadas.filter((e) => e.medible).length;
  const porMedibilidad: Record<Medibilidad, number> = { medible: 0, parcial: 0, pendiente: 0 };
  for (const e of evaluadas) porMedibilidad[e.medibilidad] += 1;
  const porValidacion: Record<string, number> = {};
  for (const r of reglas) porValidacion[r.estado_regla] = (porValidacion[r.estado_regla] ?? 0) + 1;
  return {
    total: reglas.length,
    medibles,
    noMedibles: reglas.length - medibles,
    porMedibilidad,
    porExtraccion: {
      extraida_contrato: reglas.filter((r) => r.estado_extraccion === "extraida_contrato").length,
      pendiente_extraer: reglas.filter((r) => r.estado_extraccion === "pendiente_extraer").length,
    },
    porValidacion,
    bloqueosTop: [...mapa.values()].sort((a, b) => b.n - a.n),
    puedeDeclararCumplimiento: medibles > 0 && medibles === reglas.length,
  };

};

export const AVISO_NO_CUMPLIMIENTO =
  "WG no calcula hoy % de cumplimiento contractual. Lo que se muestra es performance operativa medida con referencias internas, no cumplimiento de contrato.";
