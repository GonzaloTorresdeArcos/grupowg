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
};

export function kpisProductividad(filas: readonly FilaExpedicion[]): KpisProductividad {
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
  };
}

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
