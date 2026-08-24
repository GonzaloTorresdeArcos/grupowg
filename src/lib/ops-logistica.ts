// F4A.1 · Logística de almacén: productividad de picking y expedición.
// Módulo PURO: sin llamadas a red, sin React. Solo cifras derivadas de la
// fuente real (ops_expedicion / ops_expedicion_linea). Si falta el dato NO se
// estima: se devuelve null con el motivo escrito.
//
// Dispersión geográfica NO vive aquí: el desplazamiento del técnico se mide en
// /operaciones/dispersion. Este módulo es exclusivamente almacén y transporte.

export type FilaExpedicion = {
  almacen_base: string;
  expedicion_id: string;
  preparado_por: string | null;
  equipo: string | null;
  picking_inicio: string | null;
  picking_fin: string | null;
  expedicion_timestamp: string | null;
  /** Fecha de salida declarada en cabecera; respaldo cuando no hay marca horaria. */
  fecha_expedicion?: string | null;
  fecha_entrega_prevista: string | null;
  fecha_entrega_real: string | null;
  estado_expedicion: string;
  tipo_incidencia: string | null;
  reexpedicion: boolean;
  coste_transporte: number | null;
  num_lineas: number | null;
  num_unidades: number | null;
  num_ot_abastecidas: number | null;
};

/**
 * Enlace expedición → disponibilidad de la pieza (ops_expedicion_linea → ops_pieza_solicitud).
 * Se usa como referencia preferente para medir la rapidez de salida.
 */
export type RefDisponibilidad = {
  almacen_base: string;
  expedicion_id: string;
  fecha_disponibilidad: string | null;
};


const ms = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  const t = Date.parse(b) - Date.parse(a);
  return Number.isFinite(t) && t >= 0 ? t : null;
};

const media = (xs: readonly number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

export const mediana = (xs: readonly number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Cobertura de un campo sobre el universo de expediciones. */
export type Cobertura = { n: number; total: number; pct: number | null };

const cobertura = (n: number, total: number): Cobertura => ({
  n, total, pct: total > 0 ? n / total : null,
});

/** Referencia usada para medir la rapidez de salida del bulto. */
export type BaseSalida = "fecha_disponibilidad_pieza" | "picking_inicio" | null;

export type KpisProductividad = {
  expediciones: number;
  /** Minutos de picking por expedición. Solo con inicio y fin. */
  minutosPickingMedio: number | null;
  minutosPickingMediana: number | null;
  coberturaPicking: Cobertura;
  /** Líneas y unidades por hora de picking, sobre expediciones con ambos datos. */
  lineasHora: number | null;
  unidadesHora: number | null;
  coberturaLineas: Cobertura;
  /** Horas entre fin de picking y expedición: tiempo muerto en muelle. */
  horasMuelleMediana: number | null;
  coberturaMuelle: Cobertura;
  /** Reexpediciones sobre el total: retrabajo logístico. */
  reexpediciones: number;
  pctReexpedicion: number | null;
  /** Expediciones con incidencia tipificada. */
  incidencias: number;
  pctIncidencia: number | null;
  /** Coste medio de transporte, solo sobre las que lo informan. */
  costeTransporteMedio: number | null;
  coberturaCoste: Cobertura;

  // --- F4A.2 · productividad por persona y día trabajado ---
  /**
   * @internal PROXY: días-persona con al menos una expedición. NO son días
   * efectivamente trabajados. Prohibido publicarlo en pantalla: solo diagnóstico
   * en este módulo hasta que `ops_rrhh` esté Disponible en Calidad de datos.
   */
  diasPersona: number;
  personas: number;
  /** @internal PROXY — ver `diasPersona`. No usar en páginas. */
  expedicionesPorPersonaDia: number | null;
  /** @internal PROXY — ver `diasPersona`. No usar en páginas. */
  lineasPorPersonaDia: number | null;
  /** @internal PROXY — ver `diasPersona`. No usar en páginas. */
  unidadesPorPersonaDia: number | null;
  /** @internal PROXY — ver `diasPersona`. No usar en páginas. */
  otsAbastecidasPorPersonaDia: number | null;
  coberturaPersonaDia: Cobertura;

  /** Cobertura de las líneas/unidades/OTs dentro de las expediciones con persona y día. */
  coberturaLineasPersonaDia: Cobertura;
  coberturaUnidadesPersonaDia: Cobertura;
  coberturaOtsPersonaDia: Cobertura;

  // --- F4A.2 · servicio de transporte ---
  /** OTD: entrega real ≤ prevista, solo sobre expediciones con ambas fechas. */
  otdPct: number | null;
  coberturaOtd: Cobertura;

  // --- F4A.2 · rapidez de salida ---
  baseSalida: BaseSalida;
  pctSalidaMismoDia: number | null;
  pctSalidaMenos24h: number | null;
  coberturaSalida: Cobertura;
};

const dia = (ts: string | null | undefined): string | null => {
  if (!ts) return null;
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

/** Marca temporal de salida efectiva de la expedición. */
const salida = (f: FilaExpedicion): string | null => f.expedicion_timestamp ?? f.fecha_expedicion ?? null;

export function kpisProductividad(
  filas: readonly FilaExpedicion[],
  refs: readonly RefDisponibilidad[] = [],
): KpisProductividad {
  const total = filas.length;
  const pickMs = filas.map((f) => ms(f.picking_inicio, f.picking_fin)).filter((x): x is number => x != null);
  const pickMin = pickMs.map((x) => x / 60_000);

  const conLineas = filas.filter(
    (f) => ms(f.picking_inicio, f.picking_fin) != null && (f.num_lineas ?? 0) > 0,
  );
  const horasPick = conLineas.reduce((a, f) => a + (ms(f.picking_inicio, f.picking_fin) ?? 0) / 3_600_000, 0);
  const lineas = conLineas.reduce((a, f) => a + (f.num_lineas ?? 0), 0);
  const unidades = conLineas.reduce((a, f) => a + (f.num_unidades ?? 0), 0);

  const muelle = filas
    .map((f) => ms(f.picking_fin, f.expedicion_timestamp))
    .filter((x): x is number => x != null)
    .map((x) => x / 3_600_000);

  const conCoste = filas.filter((f) => f.coste_transporte != null);
  const reexp = filas.filter((f) => f.reexpedicion).length;
  const inc = filas.filter((f) => f.estado_expedicion === "incidencia" || !!f.tipo_incidencia).length;

  // --- persona × día trabajado (día con ≥1 expedición de esa persona) ---
  const conPersonaDia = filas.filter((f) => !!f.preparado_por && dia(salida(f)) != null);
  const clavesDia = new Set(conPersonaDia.map((f) => `${f.preparado_por}§${dia(salida(f))}`));
  const personas = new Set(conPersonaDia.map((f) => f.preparado_por as string)).size;
  const diasPersona = clavesDia.size;
  const conL = conPersonaDia.filter((f) => f.num_lineas != null);
  const conU = conPersonaDia.filter((f) => f.num_unidades != null);
  const conO = conPersonaDia.filter((f) => f.num_ot_abastecidas != null);
  const sum = (xs: readonly FilaExpedicion[], k: "num_lineas" | "num_unidades" | "num_ot_abastecidas") =>
    xs.reduce((a, f) => a + (f[k] ?? 0), 0);

  // --- OTD ---
  const conOtd = filas.filter((f) => !!f.fecha_entrega_prevista && !!f.fecha_entrega_real);
  const otdOk = conOtd.filter(
    (f) => Date.parse(f.fecha_entrega_real as string) <= Date.parse(f.fecha_entrega_prevista as string),
  ).length;

  // --- rapidez de salida: disponibilidad de pieza si existe; si no, picking_inicio ---
  const mapaRef = new Map<string, string>();
  for (const r of refs) {
    if (!r.fecha_disponibilidad) continue;
    const k = `${r.almacen_base}§${r.expedicion_id}`;
    const prev = mapaRef.get(k);
    // La pieza que marca el ritmo es la última en estar disponible.
    if (!prev || Date.parse(r.fecha_disponibilidad) > Date.parse(prev)) mapaRef.set(k, r.fecha_disponibilidad);
  }
  const conDisp = filas.filter(
    (f) => mapaRef.has(`${f.almacen_base}§${f.expedicion_id}`) && salida(f) != null,
  );
  const conPick = filas.filter((f) => f.picking_inicio != null && salida(f) != null);
  const usaDisp = conDisp.length > 0;
  const universoSalida = usaDisp ? conDisp : conPick;
  const baseSalida: BaseSalida = universoSalida.length === 0 ? null : usaDisp ? "fecha_disponibilidad_pieza" : "picking_inicio";
  const refSalida = (f: FilaExpedicion): string | null =>
    usaDisp ? (mapaRef.get(`${f.almacen_base}§${f.expedicion_id}`) ?? null) : f.picking_inicio;
  const mismoDia = universoSalida.filter((f) => dia(refSalida(f)) === dia(salida(f))).length;
  const menos24 = universoSalida.filter((f) => {
    const d = ms(refSalida(f), salida(f));
    return d != null && d <= 86_400_000;
  }).length;

  return {
    expediciones: total,
    minutosPickingMedio: media(pickMin),
    minutosPickingMediana: mediana(pickMin),
    coberturaPicking: cobertura(pickMin.length, total),
    lineasHora: horasPick > 0 ? lineas / horasPick : null,
    unidadesHora: horasPick > 0 && unidades > 0 ? unidades / horasPick : null,
    coberturaLineas: cobertura(conLineas.length, total),
    horasMuelleMediana: mediana(muelle),
    coberturaMuelle: cobertura(muelle.length, total),
    reexpediciones: reexp,
    pctReexpedicion: total > 0 ? reexp / total : null,
    incidencias: inc,
    pctIncidencia: total > 0 ? inc / total : null,
    costeTransporteMedio: media(conCoste.map((f) => f.coste_transporte as number)),
    coberturaCoste: cobertura(conCoste.length, total),

    diasPersona,
    personas,
    expedicionesPorPersonaDia: diasPersona > 0 ? conPersonaDia.length / diasPersona : null,
    lineasPorPersonaDia: diasPersona > 0 && conL.length > 0 ? sum(conL, "num_lineas") / diasPersona : null,
    unidadesPorPersonaDia: diasPersona > 0 && conU.length > 0 ? sum(conU, "num_unidades") / diasPersona : null,
    otsAbastecidasPorPersonaDia:
      diasPersona > 0 && conO.length > 0 ? sum(conO, "num_ot_abastecidas") / diasPersona : null,
    coberturaPersonaDia: cobertura(conPersonaDia.length, total),
    coberturaLineasPersonaDia: cobertura(conL.length, conPersonaDia.length),
    coberturaUnidadesPersonaDia: cobertura(conU.length, conPersonaDia.length),
    coberturaOtsPersonaDia: cobertura(conO.length, conPersonaDia.length),

    otdPct: conOtd.length > 0 ? otdOk / conOtd.length : null,
    coberturaOtd: cobertura(conOtd.length, total),

    baseSalida,
    pctSalidaMismoDia: universoSalida.length > 0 ? mismoDia / universoSalida.length : null,
    pctSalidaMenos24h: universoSalida.length > 0 ? menos24 / universoSalida.length : null,
    coberturaSalida: cobertura(universoSalida.length, total),
  };
}

/** Texto que declara qué referencia se ha usado para la rapidez de salida. */
export const LABEL_BASE_SALIDA: Record<"fecha_disponibilidad_pieza" | "picking_inicio", string> = {
  fecha_disponibilidad_pieza: "referencia: fecha de disponibilidad de la pieza (vía líneas de expedición)",
  picking_inicio: "referencia: inicio de picking (no hay disponibilidad de pieza enlazada)",
};


/** Productividad por persona o por equipo. Nunca se mezclan almacenes distintos. */
export type FilaProductividad = {
  entidad: string;
  almacen_base: string;
  expediciones: number;
  lineas: number;
  unidades: number;
  horasPicking: number | null;
  lineasHora: number | null;
  minutosPorLinea: number | null;
  /** Cobertura del tiempo de picking dentro de esta entidad. */
  coberturaTiempo: Cobertura;
  comparable: boolean;
  motivo: string;
};

/** Por debajo de esta muestra no se publica ranking de personas. */
export const MUESTRA_MINIMA_PERSONA = 20;

export function productividadPor(
  filas: readonly FilaExpedicion[],
  dimension: "persona" | "equipo" | "almacen",
): FilaProductividad[] {
  const clave = (f: FilaExpedicion): string | null =>
    dimension === "persona" ? f.preparado_por : dimension === "equipo" ? f.equipo : f.almacen_base;

  const grupos = new Map<string, FilaExpedicion[]>();
  for (const f of filas) {
    const k = clave(f);
    if (!k) continue;
    const g = grupos.get(`${f.almacen_base}§${k}`);
    if (g) g.push(f);
    else grupos.set(`${f.almacen_base}§${k}`, [f]);
  }

  const out: FilaProductividad[] = [];
  for (const [k, g] of grupos) {
    const [almacen, entidad] = k.split("§");
    const conTiempo = g.filter((f) => ms(f.picking_inicio, f.picking_fin) != null);
    const horas = conTiempo.reduce((a, f) => a + (ms(f.picking_inicio, f.picking_fin) ?? 0) / 3_600_000, 0);
    const lineas = conTiempo.reduce((a, f) => a + (f.num_lineas ?? 0), 0);
    const unidades = conTiempo.reduce((a, f) => a + (f.num_unidades ?? 0), 0);
    const cob = cobertura(conTiempo.length, g.length);
    const comparable =
      g.length >= MUESTRA_MINIMA_PERSONA && cob.pct != null && cob.pct >= 0.8 && horas > 0 && lineas > 0;
    out.push({
      entidad,
      almacen_base: almacen,
      expediciones: g.length,
      lineas,
      unidades,
      horasPicking: horas > 0 ? horas : null,
      lineasHora: comparable ? lineas / horas : null,
      minutosPorLinea: comparable ? (horas * 60) / lineas : null,
      coberturaTiempo: cob,
      comparable,
      motivo: comparable
        ? "Muestra y cobertura suficientes para comparar dentro del mismo almacén."
        : g.length < MUESTRA_MINIMA_PERSONA
          ? `Solo ${g.length} expediciones: por debajo de ${MUESTRA_MINIMA_PERSONA} no se publica productividad.`
          : cob.pct == null || cob.pct < 0.8
            ? "Menos del 80 % de las expediciones tienen inicio y fin de picking: el ratio sería engañoso."
            : "Sin líneas informadas: no hay unidad de trabajo con la que dividir el tiempo.",
    });
  }
  return out.sort((a, b) => b.expediciones - a.expediciones);
}

/** Comparativas SIEMPRE dentro del mismo almacén base. */
export const NOTA_COMPARABILIDAD =
  "La productividad se compara solo dentro del mismo almacén base: mix de referencias, layout y volumen no son equiparables entre bases.";

export type IndicadorLogistica = {
  clave: string;
  label: string;
  definicion: string;
  /** Campos de la fuente sin los que el indicador no se calcula. */
  requiere: readonly string[];
};

export const INDICADORES_PRODUCTIVIDAD: readonly IndicadorLogistica[] = [
  {
    clave: "minutos_picking",
    label: "Minutos de picking por expedición",
    definicion: "Tiempo entre inicio y fin de picking. Solo cuenta la expedición que tiene las dos marcas.",
    requiere: ["picking_inicio", "picking_fin"],
  },
  {
    clave: "lineas_hora",
    label: "Líneas por hora de picking",
    definicion: "Líneas preparadas dividido entre las horas efectivas de picking de esas mismas expediciones.",
    requiere: ["picking_inicio", "picking_fin", "num_lineas"],
  },
  {
    clave: "horas_muelle",
    label: "Horas entre fin de picking y expedición",
    definicion: "Tiempo muerto en muelle: mide la espera del bulto ya preparado hasta que sale.",
    requiere: ["picking_fin", "expedicion_timestamp"],
  },
  {
    clave: "expediciones_persona_dia",
    label: "Expediciones por persona y día trabajado",
    definicion:
      "Expediciones con persona identificada divididas entre los días-persona con al menos una expedición. Día trabajado declarado como proxy hasta disponer de RRHH.",
    requiere: ["preparado_por", "expedicion_timestamp"],
  },
  {
    clave: "lineas_persona_dia",
    label: "Líneas por persona y día trabajado",
    definicion: "Líneas preparadas divididas entre los días-persona con expedición. Solo cuentan las expediciones que informan líneas.",
    requiere: ["preparado_por", "expedicion_timestamp", "num_lineas"],
  },
  {
    clave: "unidades_persona_dia",
    label: "Unidades por persona y día trabajado",
    definicion: "Unidades expedidas divididas entre los días-persona con expedición; sin num_unidades el indicador no se calcula.",
    requiere: ["preparado_por", "expedicion_timestamp", "num_unidades"],
  },
  {
    clave: "ots_persona_dia",
    label: "OTs abastecidas por persona y día trabajado",
    definicion: "Órdenes de trabajo servidas por las expediciones de esa persona ese día, entre los días-persona con expedición.",
    requiere: ["preparado_por", "expedicion_timestamp", "num_ot_abastecidas"],
  },
  {
    clave: "otd",
    label: "OTD — % de entrega en plazo",
    definicion: "Entrega real ≤ entrega prevista, medido solo sobre las expediciones que tienen las dos fechas; la cobertura se declara junto al dato.",
    requiere: ["fecha_entrega_prevista", "fecha_entrega_real"],
  },
  {
    clave: "salida_rapida",
    label: "% de expediciones el mismo día y en menos de 24 h",
    definicion:
      "Rapidez de salida respecto a la fecha de disponibilidad de la pieza cuando existe enlace vía líneas; si no existe, respecto al inicio de picking. La referencia usada se declara siempre.",
    requiere: ["expedicion_timestamp", "fecha_disponibilidad (pieza) o picking_inicio"],
  },
  {

    clave: "reexpedicion",
    label: "% de reexpediciones",
    definicion: "Envíos que repiten uno anterior. Es retrabajo logístico, no volumen nuevo.",
    requiere: ["reexpedicion"],
  },
  {
    clave: "coste_transporte",
    label: "Coste medio de transporte",
    definicion: "Media sobre las expediciones que informan coste; las que no lo informan quedan fuera del denominador.",
    requiere: ["coste_transporte"],
  },
] as const;

/** Frase determinista de cabecera del bloque de productividad. */
export function lineaProductividad(k: KpisProductividad, etiquetaPeriodo: string): string {
  if (k.expediciones === 0) {
    return `${etiquetaPeriodo} · sin expediciones cargadas: la productividad de almacén no es calculable.`;
  }
  const partes = [`${etiquetaPeriodo}`, `${k.expediciones.toLocaleString("es-ES")} expediciones`];
  partes.push(
    k.minutosPickingMediana == null
      ? "sin tiempos de picking informados"
      : `mediana de picking ${k.minutosPickingMediana.toFixed(1)} min (cobertura ${((k.coberturaPicking.pct ?? 0) * 100).toFixed(1)} %)`,
  );
  partes.push(
    k.lineasHora == null
      ? "líneas por hora no calculable sin num_lineas"
      : `${k.lineasHora.toFixed(1)} líneas/hora`,
  );
  return `${partes.join(" · ")}.`;
}

// ─── F4B · Días efectivos: el proxy no se publica como productividad ─────────

/**
 * Los ratios "por persona y día" se calculan hoy sobre DÍAS-PERSONA CON
 * EXPEDICIÓN, no sobre días efectivamente trabajados. Ese proxy infla la
 * productividad de quien trabaja a tiempo parcial y penaliza a quien tuvo días
 * sin expedir estando presente. Hasta que `ops_rrhh` aporte días trabajados y
 * ausencias del personal de almacén, estos indicadores se muestran como
 * DIAGNÓSTICO INTERNO y nunca como medida de rendimiento de una persona.
 */
export const INDICADORES_REQUIEREN_RRHH: readonly string[] = [
  "expediciones_persona_dia",
  "lineas_persona_dia",
  "unidades_persona_dia",
  "ots_persona_dia",
] as const;

export const NOTA_DIAS_EFECTIVOS =
  "Denominador provisional: días-persona con al menos una expedición, no días efectivamente trabajados. Sin días trabajados y ausencias en ops_rrhh estos ratios no son una medida de rendimiento personal y no deben usarse para comparar personas.";

export type EstadoIndicador = "publicable" | "diagnostico_interno";

export const estadoIndicador = (clave: string, hayRrhh: boolean): EstadoIndicador =>
  !hayRrhh && INDICADORES_REQUIEREN_RRHH.includes(clave) ? "diagnostico_interno" : "publicable";

export const LABEL_ESTADO_INDICADOR: Record<EstadoIndicador, string> = {
  publicable: "Medida",
  diagnostico_interno: "Diagnóstico interno (pendiente RRHH)",
};

// ─── F4B · Vista jerárquica almacén → equipo → persona ───────────────────────

/**
 * San Agustín concentra el grueso de la preparación: leer una lista plana de
 * personas mezcla equipos con mix de trabajo distinto. La jerarquía mantiene la
 * regla de comparabilidad: SOLO se compara dentro del mismo almacén y equipo.
 */
export type NodoProductividad = FilaProductividad & {
  nivel: "almacen" | "equipo" | "persona";
  padre: string | null;
  hijos: NodoProductividad[];
};

const nodo = (f: FilaProductividad, nivel: NodoProductividad["nivel"], padre: string | null): NodoProductividad => ({
  ...f,
  nivel,
  padre,
  hijos: [],
});

export function jerarquiaProductividad(filas: readonly FilaExpedicion[]): NodoProductividad[] {
  const almacenes = productividadPor(filas, "almacen").map((f) => nodo(f, "almacen", null));

  for (const a of almacenes) {
    const delAlmacen = filas.filter((f) => f.almacen_base === a.almacen_base);
    const equipos = productividadPor(delAlmacen, "equipo").map((f) => nodo(f, "equipo", a.entidad));

    for (const e of equipos) {
      const delEquipo = delAlmacen.filter((f) => (f.equipo ?? "") === e.entidad);
      e.hijos = productividadPor(delEquipo, "persona").map((f) => nodo(f, "persona", e.entidad));
    }

    // Personas sin equipo declarado cuelgan directamente del almacén: no se
    // inventa un equipo para ellas ni se reparten entre los existentes.
    const sinEquipo = delAlmacen.filter((f) => !f.equipo);
    const sueltas = productividadPor(sinEquipo, "persona").map((f) => nodo(f, "persona", a.entidad));

    a.hijos = [...equipos, ...sueltas];
  }
  return almacenes;
}

/** Aplana la jerarquía conservando el orden de lectura para pintar la tabla. */
export function aplanarJerarquia(nodos: readonly NodoProductividad[]): NodoProductividad[] {
  const out: NodoProductividad[] = [];
  const rec = (ns: readonly NodoProductividad[]) => {
    for (const n of ns) {
      out.push(n);
      rec(n.hijos);
    }
  };
  rec(nodos);
  return out;
}
