/**
 * ops-performance.ts
 *
 * Motor de cálculo puro para el módulo /operaciones.
 * Todas las reglas son PROVISIONALES y se documentan con la fórmula usada.
 * No accede a red ni a Supabase — solo funciones deterministas.
 */

// -----------------------------------------------------------------------------
// Helpers privados de formato (solo para textos de razones/conclusiones)
// -----------------------------------------------------------------------------
const fmtP = (v: number | null | undefined): string =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtPctSigned = (v: number | null | undefined): string =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

// -----------------------------------------------------------------------------
// Variación entre dos valores comparables.
// - previo null/undefined      → variación no calculable
// - previo === 0               → % no calculable (división por cero)
// -----------------------------------------------------------------------------
export type Variacion = { abs: number | null; pct: number | null };

export function variacion(
  actual: number | null | undefined,
  previo: number | null | undefined,
): Variacion {
  if (actual == null || previo == null) return { abs: null, pct: null };
  const abs = actual - previo;
  const pct = previo === 0 ? null : abs / previo;
  return { abs, pct };
}

// -----------------------------------------------------------------------------
// Ratio bajas/cerradas. Respeta la definición vigente (es_baja sobre cerradas
// del período, excluyendo es_anulado — cálculo hecho ya server-side en las
// RPCs; aquí solo se consume). Devuelve null si cerradas === 0.
// -----------------------------------------------------------------------------
export function ratioBajas(
  bajas: number | null | undefined,
  cerradas: number | null | undefined,
): number | null {
  if (!cerradas || cerradas <= 0) return null;
  return (bajas ?? 0) / cerradas;
}

// -----------------------------------------------------------------------------
// Períodos: previo equivalente + etiquetas
// -----------------------------------------------------------------------------
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const capMes = (i: number) => MESES[i][0].toUpperCase() + MESES[i].slice(1);
const parseISO = (s: string) => new Date(s + "T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isNaturalMonth = (from: Date, to: Date): boolean => {
  if (from.getUTCFullYear() !== to.getUTCFullYear()) return false;
  if (from.getUTCMonth() !== to.getUTCMonth()) return false;
  if (from.getUTCDate() !== 1) return false;
  const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate();
  return to.getUTCDate() === last;
};

/**
 * Devuelve el período inmediatamente anterior de la misma longitud.
 * Si (from,to) es un mes natural, devuelve el mes natural anterior.
 */
export function computePrevPeriod(fromISO: string, toISO: string): { from: string; to: string } {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(f, t)) {
    const pFrom = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() - 1, 1));
    const pTo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 0));
    return { from: iso(pFrom), to: iso(pTo) };
  }
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const pTo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate() - 1));
  const pFrom = new Date(
    Date.UTC(pTo.getUTCFullYear(), pTo.getUTCMonth(), pTo.getUTCDate() - (days - 1)),
  );
  return { from: iso(pFrom), to: iso(pTo) };
}

export function labelPeriodo(fromISO: string, toISO: string): string {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(f, t)) return `${capMes(f.getUTCMonth())} ${f.getUTCFullYear()}`;
  return `${f.getUTCDate()} ${MESES[f.getUTCMonth()]} – ${t.getUTCDate()} ${MESES[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

export function labelComparativa(fromISO: string, toISO: string): string {
  const prev = computePrevPeriod(fromISO, toISO);
  return `${labelPeriodo(fromISO, toISO)} vs. ${labelPeriodo(prev.from, prev.to)}`;
}

// -----------------------------------------------------------------------------
// Estado de una delegación
// -----------------------------------------------------------------------------
export type EstadoNivel = "ok" | "atencion" | "critico";

export type DelegacionRow = {
  delegacion: string;
  cerradas: number;
  pct_bajas: number; // ratio bajas/cerradas ya calculado por la RPC
  bajas?: number;
};

export type EstadoDelegResult = {
  estado: EstadoNivel;
  razones: string[];
};

/**
 * Reglas provisionales — semáforo de delegación:
 * - CRITICO: caída >25% de cierres vs período anterior Y el ratio de bajas empeora;
 *            o ratio de bajas > 1,5 × media global.
 * - ATENCION: caída >15% de cierres; o ratio de bajas > media global y empeorando;
 *             o cierres suben pero bajas suben desproporcionadamente
 *             (Δ% bajas > Δ% cierres + 10 pp).
 * - OK: el resto.
 * Cada razón incluye cifras concretas para que el usuario pueda reproducirla.
 */
export function estadoDelegacion(
  row: DelegacionRow,
  prev: DelegacionRow | null | undefined,
  mediaGlobalBajas: number | null,
): EstadoDelegResult {
  const razones: string[] = [];
  const vCerr = prev ? variacion(row.cerradas, prev.cerradas) : { abs: null, pct: null };
  const bajasAct = row.pct_bajas ?? 0;
  const bajasPrev = prev?.pct_bajas ?? null;
  const empeoraBajas = bajasPrev != null && bajasAct > bajasPrev;
  const media = mediaGlobalBajas ?? 0;

  const cerrDown25 = vCerr.pct != null && vCerr.pct < -0.25;
  const cerrDown15 = vCerr.pct != null && vCerr.pct < -0.15;
  const cerrUp = vCerr.pct != null && vCerr.pct > 0;
  const bajasVsMedia15 = media > 0 && bajasAct > media * 1.5;
  const bajasVsMedia = media > 0 && bajasAct > media;

  if (cerrDown25 && empeoraBajas) {
    razones.push(
      `Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior y ratio de bajas empeora (${fmtP(bajasPrev)}→${fmtP(bajasAct)}).`,
    );
    return { estado: "critico", razones };
  }
  if (bajasVsMedia15) {
    razones.push(`Ratio de bajas ${fmtP(bajasAct)} supera 1,5× la media global (${fmtP(media)}).`);
    return { estado: "critico", razones };
  }

  if (cerrDown15) razones.push(`Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior.`);
  if (bajasVsMedia && empeoraBajas)
    razones.push(`Ratio de bajas ${fmtP(bajasAct)} > media global ${fmtP(media)} y empeorando.`);
  if (cerrUp && prev && bajasPrev != null) {
    const bajasAbsA = row.bajas ?? Math.round(bajasAct * row.cerradas);
    const bajasAbsP = prev.bajas ?? Math.round(bajasPrev * prev.cerradas);
    const vB = variacion(bajasAbsA, bajasAbsP);
    if (vB.pct != null && vCerr.pct != null && vB.pct - vCerr.pct > 0.1) {
      razones.push(
        `Cierres suben ${fmtPctSigned(vCerr.pct)} pero bajas suben ${fmtPctSigned(vB.pct)}.`,
      );
    }
  }
  if (razones.length) return { estado: "atencion", razones };
  return { estado: "ok", razones: [] };
}

// -----------------------------------------------------------------------------
// Estado de un técnico
// -----------------------------------------------------------------------------
export type EstadoTecnico = "ok" | "atencion" | "critico" | "sin_contexto";
export type Dimension = "mejora" | "estable" | "deteriora";
export type Calidad = "mejor" | "esperado" | "peor";

export type TecnicoRow = {
  tecnico: string;
  delegacion: string;
  cerradas: number;
  cerradas_prev?: number | null;
  pct_bajas: number;
  pct_bajas_esp?: number | null;
  delta_pct?: number | null;
};

export type EstadoTecResult = {
  estado: EstadoTecnico;
  produccion: Dimension;
  calidad: Calidad;
  razones: string[];
};

/**
 * Reglas provisionales — semáforo de técnico:
 * - Volumen mínimo: <15 cerradas → 'sin_contexto' (nunca crítico por bajo volumen).
 * - CRITICO: deterioro significativo en AMBAS dimensiones (producción deteriora
 *            Y calidad peor o ratio bajas > 2× media de su delegación).
 * - ATENCION: deterioro material en una dimensión, o señales contradictorias
 *             (más cierres con calidad peor), o ratio bajas > 2× media delegación.
 * - OK: producción en/sobre benchmark de su delegación sin ratio excesivo.
 * Producción: mejora (>+10%), estable (±), deteriora (<-15%) vs previo.
 * Calidad: peor si pct_bajas > 1,3 × esperado; mejor si < 0,8 × esperado.
 */
export function estadoTecnico(
  row: TecnicoRow,
  prev: TecnicoRow | null | undefined,
  mediaDelegacionBajas: number | null,
): EstadoTecResult {
  if ((row.cerradas ?? 0) < 15) {
    return {
      estado: "sin_contexto",
      produccion: "estable",
      calidad: "esperado",
      razones: ["Contexto insuficiente para valoración definitiva."],
    };
  }
  const vCerr = prev
    ? variacion(row.cerradas, prev.cerradas)
    : { abs: null, pct: row.delta_pct ?? null };
  const prod: Dimension =
    vCerr.pct == null ? "estable" : vCerr.pct > 0.1 ? "mejora" : vCerr.pct < -0.15 ? "deteriora" : "estable";

  const esp = row.pct_bajas_esp ?? null;
  let calidad: Calidad = "esperado";
  if (esp != null && esp > 0) {
    if (row.pct_bajas > esp * 1.3) calidad = "peor";
    else if (row.pct_bajas < esp * 0.8) calidad = "mejor";
  }
  const razones: string[] = [];
  const bajasExc =
    mediaDelegacionBajas != null && mediaDelegacionBajas > 0 && row.pct_bajas > 2 * mediaDelegacionBajas;

  if (prod === "deteriora" && (calidad === "peor" || bajasExc)) {
    razones.push(
      `Cierres ${fmtPctSigned(vCerr.pct)} y ratio de bajas ${fmtP(row.pct_bajas)}${esp != null ? ` (esperado ${fmtP(esp)})` : ""}.`,
    );
    return { estado: "critico", produccion: prod, calidad, razones };
  }
  if (bajasExc)
    razones.push(
      `Ratio de bajas ${fmtP(row.pct_bajas)} supera 2× la media de su delegación (${fmtP(mediaDelegacionBajas)}).`,
    );
  if (prod === "deteriora") razones.push(`Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior.`);
  if (calidad === "peor" && esp != null)
    razones.push(`Ratio de bajas ${fmtP(row.pct_bajas)} > 1,3× esperado (${fmtP(esp)}).`);
  if (prod === "mejora" && calidad === "peor")
    razones.push(`Producción sube pero calidad se deteriora — señales contradictorias.`);
  if (razones.length) return { estado: "atencion", produccion: prod, calidad, razones };
  return { estado: "ok", produccion: prod, calidad, razones: [] };
}

// -----------------------------------------------------------------------------
// Indicador provisional para incentivos.
// - reconocimiento_potencial: producción mejora Y calidad no peor.
// - revision_estandar: estado ok sin señales de reconocimiento.
// - requiere_validacion: atencion o critico.
// - informacion_insuficiente: sin_contexto (volumen bajo).
// Nunca se premia solo el volumen: exige calidad al menos esperada.
// -----------------------------------------------------------------------------
export type IndicadorIncentivo =
  | "reconocimiento_potencial"
  | "revision_estandar"
  | "requiere_validacion"
  | "informacion_insuficiente";

export function indicadorProvisionalIncentivo(estado: EstadoTecResult): IndicadorIncentivo {
  if (estado.estado === "sin_contexto") return "informacion_insuficiente";
  if (estado.estado === "critico" || estado.estado === "atencion") return "requiere_validacion";
  if (estado.produccion === "mejora" && estado.calidad !== "peor") return "reconocimiento_potencial";
  return "revision_estandar";
}

// -----------------------------------------------------------------------------
// Conclusiones deterministas: plantillas con cifras interpoladas.
// Máx 6, priorizadas (calidad primero, mejoras al final).
// -----------------------------------------------------------------------------
export type Conclusion = {
  titulo: string;
  detalle: string;
  alcance: string;
  faltan?: string;
};

export type DelegEntry = { actual: DelegacionRow; previo: DelegacionRow | null };
export type TecEntry = {
  actual: TecnicoRow;
  previo: TecnicoRow | null;
  mediaDelegacionBajas: number | null;
};

export function generarConclusiones(
  delegaciones: DelegEntry[],
  tecnicos: TecEntry[],
): Conclusion[] {
  const out: Conclusion[] = [];

  // 1) Delegación con bajas creciendo más rápido que cierres (prioridad alta)
  for (const d of delegaciones) {
    if (!d.previo || d.previo.cerradas === 0) continue;
    const vC = variacion(d.actual.cerradas, d.previo.cerradas);
    const bajasA = Math.round(d.actual.pct_bajas * d.actual.cerradas);
    const bajasP = Math.round(d.previo.pct_bajas * d.previo.cerradas);
    const vB = variacion(bajasA, bajasP);
    if (vC.pct != null && vB.pct != null && vB.pct - vC.pct > 0.15 && vB.pct > 0.05) {
      out.push({
        titulo: `${d.actual.delegacion}: bajas crecen más rápido que cierres`,
        detalle: `Bajas absolutas ${fmtPctSigned(vB.pct)} (${bajasP}→${bajasA}) frente a cierres ${fmtPctSigned(vC.pct)}.`,
        alcance: `Delegación ${d.actual.delegacion}`,
        faltan: "Antes de decidir, validar mix de familia/marca y causas codificadas de las bajas.",
      });
    }
  }

  // 2) Delegación sube cierres pero empeora el ratio de bajas
  for (const d of delegaciones) {
    if (!d.previo) continue;
    const vC = variacion(d.actual.cerradas, d.previo.cerradas);
    if (vC.pct != null && vC.pct > 0.05 && d.actual.pct_bajas > d.previo.pct_bajas) {
      out.push({
        titulo: `${d.actual.delegacion}: más cierres, peor ratio de bajas`,
        detalle: `Cierres ${fmtPctSigned(vC.pct)} (${d.previo.cerradas}→${d.actual.cerradas}) mientras el ratio de bajas pasa de ${fmtP(d.previo.pct_bajas)} a ${fmtP(d.actual.pct_bajas)}.`,
        alcance: `Delegación ${d.actual.delegacion}`,
        faltan: "Mix de producto y causas codificadas de las bajas del período.",
      });
    }
  }

  // 3) Técnico con ratio bajas muy superior a media de su delegación
  for (const t of tecnicos) {
    if (t.actual.cerradas < 15) continue;
    if (t.mediaDelegacionBajas == null || t.mediaDelegacionBajas === 0) continue;
    if (t.actual.pct_bajas > 2 * t.mediaDelegacionBajas) {
      out.push({
        titulo: `${t.actual.tecnico}: ratio de bajas muy superior a su delegación`,
        detalle: `Ratio de bajas ${fmtP(t.actual.pct_bajas)} vs media ${fmtP(t.mediaDelegacionBajas)} en ${t.actual.cerradas} cierres.`,
        alcance: `Técnico · ${t.actual.delegacion}`,
        faltan: "Antes de decidir, validar carga asignada, mix de producto y causas codificadas de cada baja.",
      });
    }
  }

  // 4) Técnico que mejora producción y reduce bajas (positivo, al final)
  for (const t of tecnicos) {
    if (!t.previo) continue;
    const vC = variacion(t.actual.cerradas, t.previo.cerradas);
    const prevBajas = t.previo.pct_bajas;
    if (vC.pct != null && vC.pct > 0.15 && t.actual.pct_bajas < prevBajas) {
      out.push({
        titulo: `${t.actual.tecnico}: mejora producción reduciendo bajas`,
        detalle: `Cierres ${fmtPctSigned(vC.pct)} (${t.previo.cerradas}→${t.actual.cerradas}) con ratio de bajas ${fmtP(prevBajas)}→${fmtP(t.actual.pct_bajas)}.`,
        alcance: `Técnico · ${t.actual.delegacion}`,
      });
    }
  }

  const uniq = new Map<string, Conclusion>();
  for (const c of out) if (!uniq.has(c.titulo)) uniq.set(c.titulo, c);
  return Array.from(uniq.values()).slice(0, 6);
}

// -----------------------------------------------------------------------------
// Prioridad de estado para ordenar tablas: crítico primero, sin_contexto último.
// -----------------------------------------------------------------------------
export const ordenEstadoTecnico: Record<EstadoTecnico, number> = {
  critico: 0,
  atencion: 1,
  ok: 2,
  sin_contexto: 3,
};
