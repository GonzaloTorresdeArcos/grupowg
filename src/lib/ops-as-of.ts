/**
 * ops-as-of.ts — F4B · FECHA EFECTIVA DEL DATO (`data_as_of_date`).
 *
 * PRINCIPIO NO NEGOCIABLE: ninguna métrica operativa se calcula contra el reloj
 * del servidor. "Abierta hace N días", "backlog +30d" o "pendiente de pieza" se
 * miden SIEMPRE contra la fecha efectiva del dato de su dominio, no contra
 * CURRENT_DATE. Con datos de julio, un backlog medido en agosto envejecería
 * artificialmente un mes entero sin que haya pasado nada en la operación.
 *
 * Espejo TS de `public.ops_carga_log` y de la función `public.ops_as_of(dominio)`.
 * Módulo puro: sin React, sin red.
 */

// ─── Dominios de carga ───────────────────────────────────────────────────────

export type DominioCarga =
  | "ot"
  | "rrhh"
  | "coste"
  | "pieza_solicitud"
  | "expedicion"
  | "expedicion_linea"
  | "stock"
  | "geo"
  | "registry"
  | "alias"
  | "calendario";

export const LABEL_DOMINIO_CARGA: Record<DominioCarga, string> = {
  ot: "Órdenes de trabajo",
  rrhh: "RRHH (días trabajados)",
  coste: "Coste mensual",
  pieza_solicitud: "Solicitudes de pieza",
  expedicion: "Expediciones",
  expedicion_linea: "Líneas de expedición",
  stock: "Foto de stock",
  geo: "Maestro geográfico",
  registry: "Registry contractual",
  alias: "Alias cliente ERP → contrato",
  calendario: "Calendario laboral",
};

/** Dominio que gobierna el reloj operativo de toda la sección. */
export const DOMINIO_OPERATIVO: DominioCarga = "ot";

export type CargaDominio = {
  dominio: string;
  fuente: string;
  /** Momento en que la carga entró en el sistema (auditoría). */
  last_successful_load: string | null;
  /** Fecha hasta la que el dato refleja la realidad operativa. */
  data_as_of_date: string | null;
  filas: number;
  origen: string;
  notas: string | null;
};

const int = (v: unknown): number => (v == null ? 0 : Number(v) || 0);
const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));

/** Normaliza el bloque `cargas[]` de la RPC. Lo ausente queda null, nunca 0. */
export function normalizarCargas(raw: unknown): CargaDominio[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      dominio: String(o.dominio ?? ""),
      fuente: String(o.fuente ?? ""),
      last_successful_load: str(o.last_successful_load),
      data_as_of_date: str(o.data_as_of_date),
      filas: int(o.filas),
      origen: String(o.origen ?? "desconocido"),
      notas: str(o.notas),
    };
  });
}

/** Fecha efectiva de un dominio. `null` cuando la fuente está vacía. */
export const asOf = (cargas: readonly CargaDominio[], dominio: DominioCarga | string): string | null =>
  cargas.find((c) => c.dominio === dominio)?.data_as_of_date ?? null;

export const cargaDe = (
  cargas: readonly CargaDominio[],
  dominio: DominioCarga | string,
): CargaDominio | undefined => cargas.find((c) => c.dominio === dominio);

// ─── Formato ─────────────────────────────────────────────────────────────────

const MESES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** `2026-07-25` → `25-jul-2026`. Devuelve "—" si no hay fecha. */
export function fmtFechaEs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  return `${m[3]}-${MESES_ABR[Number(m[2]) - 1]}-${m[1]}`;
}

/** Cabecera obligatoria de toda página operativa. */
export function etiquetaAsOf(fecha: string | null | undefined, dominio: DominioCarga = DOMINIO_OPERATIVO): string {
  if (!fecha) {
    return `Sin datos cargados de ${LABEL_DOMINIO_CARGA[dominio].toLowerCase()}: no hay fecha efectiva.`;
  }
  return dominio === DOMINIO_OPERATIVO
    ? `Datos operativos a ${fmtFechaEs(fecha)}`
    : `${LABEL_DOMINIO_CARGA[dominio]} a ${fmtFechaEs(fecha)}`;
}

// ─── Obsolescencia ───────────────────────────────────────────────────────────

/** Más de 7 días entre la fecha efectiva y hoy: el cuadro de mando va por detrás. */
export const UMBRAL_OBSOLESCENCIA_DIAS = 7;

export type EstadoFrescuraDominio = "al_dia" | "obsoleto" | "sin_dato";

export const LABEL_FRESCURA_DOMINIO: Record<EstadoFrescuraDominio, string> = {
  al_dia: "Al día",
  obsoleto: "Obsoleto",
  sin_dato: "Sin dato",
};

export type FrescuraDominio = {
  dominio: string;
  label: string;
  asOf: string | null;
  ultimaCarga: string | null;
  filas: number;
  /** Días entre la fecha efectiva y hoy. `null` si no hay fecha efectiva. */
  dias: number | null;
  estado: EstadoFrescuraDominio;
  texto: string;
};

const diasEntre = (desdeIso: string, ahora: Date): number =>
  Math.floor((Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()) -
    Date.parse(`${desdeIso.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

export function frescuraDominio(
  cargas: readonly CargaDominio[],
  dominio: DominioCarga | string,
  ahora: Date = new Date(),
): FrescuraDominio {
  const c = cargaDe(cargas, dominio);
  const label = LABEL_DOMINIO_CARGA[dominio as DominioCarga] ?? dominio;
  if (!c || !c.data_as_of_date) {
    return {
      dominio: String(dominio),
      label,
      asOf: null,
      ultimaCarga: c?.last_successful_load ?? null,
      filas: c?.filas ?? 0,
      dias: null,
      estado: "sin_dato",
      texto: c
        ? `${label}: fuente registrada sin fecha efectiva (${c.filas.toLocaleString("es-ES")} filas).`
        : `${label}: sin registro de carga.`,
    };
  }
  const dias = diasEntre(c.data_as_of_date, ahora);
  const estado: EstadoFrescuraDominio = dias > UMBRAL_OBSOLESCENCIA_DIAS ? "obsoleto" : "al_dia";
  return {
    dominio: String(dominio),
    label,
    asOf: c.data_as_of_date,
    ultimaCarga: c.last_successful_load,
    filas: c.filas,
    dias,
    estado,
    texto:
      estado === "obsoleto"
        ? `${label}: dato a ${fmtFechaEs(c.data_as_of_date)}, ${dias} días por detrás de hoy.`
        : `${label}: dato a ${fmtFechaEs(c.data_as_of_date)} (${dias} días).`,
  };
}

/**
 * Aviso visible cuando el dato va por detrás. Es explícito sobre la consecuencia:
 * lo que se lee NO es la foto de hoy.
 */
export function avisoObsolescencia(f: FrescuraDominio): string | null {
  if (f.estado === "sin_dato") return null;
  if (f.estado !== "obsoleto" || f.dias == null) return null;
  return `Los datos de ${f.label.toLowerCase()} reflejan la situación a ${fmtFechaEs(f.asOf)}, hace ${f.dias} días. Las antigüedades y el backlog se miden contra esa fecha, no contra hoy: la foto real de hoy puede diferir.`;
}

/** Frescura de todos los dominios cargados, ordenada por obsolescencia. */
export function frescuraTodos(cargas: readonly CargaDominio[], ahora: Date = new Date()): FrescuraDominio[] {
  const orden: Record<EstadoFrescuraDominio, number> = { obsoleto: 0, al_dia: 1, sin_dato: 2 };
  return cargas
    .map((c) => frescuraDominio(cargas, c.dominio, ahora))
    .sort((a, b) => orden[a.estado] - orden[b.estado] || (b.dias ?? -1) - (a.dias ?? -1));
}

/**
 * Dos dominios que se leen juntos (p. ej. OTs y expediciones) con fechas
 * efectivas distintas producen conclusiones falsas. Se declara el desfase.
 */
export function desfaseEntre(
  cargas: readonly CargaDominio[],
  a: DominioCarga,
  b: DominioCarga,
): { dias: number | null; texto: string } {
  const fa = asOf(cargas, a);
  const fb = asOf(cargas, b);
  if (!fa || !fb) {
    return {
      dias: null,
      texto: `Sin fecha efectiva en ${LABEL_DOMINIO_CARGA[!fa ? a : b].toLowerCase()}: los dos dominios no son comparables en el tiempo.`,
    };
  }
  const dias = Math.round((Date.parse(fb) - Date.parse(fa)) / 86_400_000);
  return {
    dias,
    texto:
      dias === 0
        ? `${LABEL_DOMINIO_CARGA[a]} y ${LABEL_DOMINIO_CARGA[b].toLowerCase()} están a la misma fecha (${fmtFechaEs(fa)}).`
        : `${LABEL_DOMINIO_CARGA[a]} a ${fmtFechaEs(fa)} frente a ${LABEL_DOMINIO_CARGA[b].toLowerCase()} a ${fmtFechaEs(fb)}: ${Math.abs(dias)} días de desfase entre ambas fuentes.`,
  };
}
