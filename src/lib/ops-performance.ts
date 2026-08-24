/**
 * ops-performance.ts — Motor de cálculo puro para el módulo /operaciones.
 *
 * Funciones sin efectos, tipadas, sin dependencias de React ni de red.
 * Toda la lógica de comparación de períodos, clasificación de estados y
 * generación de conclusiones vive aquí para poder testearla en aislamiento.
 * Las reglas son PROVISIONALES: se documentan textualmente en cada función.
 */

// -----------------------------------------------------------------------------
// Helpers privados de formato (solo para textos de razones/conclusiones)
// -----------------------------------------------------------------------------
const fmtP = (v: number | null | undefined): string =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtPP = (v: number | null | undefined): string =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)} pp`;
const fmtPctSigned = (v: number | null | undefined): string =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

// -----------------------------------------------------------------------------
// Variacion — diferencia absoluta y porcentual entre dos valores.
// Reglas: si previo es null/undefined → variación no calculable;
//         si previo === 0 → pct = null (evita división por cero).
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
// Ratio bajas/cerradas. Devuelve null si cerradas ≤ 0.
// La definición de "bajas" y "cerradas" ya viene resuelta server-side por las
// RPCs (una Baja es un cierre; se excluye ANULADO AVISO).
// -----------------------------------------------------------------------------
export function ratioBajas(
  bajas: number | null | undefined,
  cerradas: number | null | undefined,
): number | null {
  if (!cerradas || cerradas <= 0) return null;
  return (bajas ?? 0) / cerradas;
}

// -----------------------------------------------------------------------------
// prevPeriod — devuelve el rango inmediatamente anterior de la misma duración.
// Si el rango es un mes natural, devuelve el mes natural anterior.
// Entradas y salidas en formato ISO YYYY-MM-DD.
// -----------------------------------------------------------------------------
const parseISO = (s: string) => new Date(s + "T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const capMes = (i: number) => MESES[i][0].toUpperCase() + MESES[i].slice(1);
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function isNaturalMonth(fromISO: string, toISO: string): boolean {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (f.getUTCFullYear() !== t.getUTCFullYear()) return false;
  if (f.getUTCMonth() !== t.getUTCMonth()) return false;
  if (f.getUTCDate() !== 1) return false;
  return t.getUTCDate() === lastDayOfMonth(t.getUTCFullYear(), t.getUTCMonth());
}

/**
 * Modo de comparación global (Fase 2 V2).
 * - 'anterior'   → período inmediatamente anterior equivalente (comportamiento histórico).
 * - 'interanual' → exactamente las mismas fechas desplazadas un año atrás.
 */
export type ModoComparacion = "anterior" | "interanual";

/**
 * Desplaza una fecha ISO N años, con CLAMP documentado:
 * 29-feb de un bisiesto → 28-feb del año destino si éste no es bisiesto.
 */
export function shiftYearISO(fechaISO: string, delta: number): string {
  const d = parseISO(fechaISO);
  const y = d.getUTCFullYear() + delta;
  const m = d.getUTCMonth();
  const day = Math.min(d.getUTCDate(), lastDayOfMonth(y, m));
  return iso(new Date(Date.UTC(y, m, day)));
}

/**
 * prevPeriod(from, to, modo?) — rango de comparación.
 * modo por defecto 'anterior' (compatibilidad con todos los llamantes previos).
 * En 'interanual' se conservan las mismas fechas y duración, desplazadas 12 meses.
 */
export function prevPeriod(
  fromISO: string,
  toISO: string,
  modo: ModoComparacion = "anterior",
): { from: string; to: string } {
  if (modo === "interanual") {
    return { from: shiftYearISO(fromISO, -1), to: shiftYearISO(toISO, -1) };
  }
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(fromISO, toISO)) {
    const y = f.getUTCFullYear();
    const m = f.getUTCMonth();
    const pFrom = new Date(Date.UTC(y, m - 1, 1));
    const pTo = new Date(Date.UTC(y, m, 0));
    return { from: iso(pFrom), to: iso(pTo) };
  }
  if (isNaturalQuarter(fromISO, toISO)) {
    const y = f.getUTCFullYear();
    const m = f.getUTCMonth();
    const pFrom = new Date(Date.UTC(y, m - 3, 1));
    const pTo = new Date(Date.UTC(y, m, 0));
    return { from: iso(pFrom), to: iso(pTo) };
  }
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const pTo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate() - 1));
  const pFrom = new Date(
    Date.UTC(pTo.getUTCFullYear(), pTo.getUTCMonth(), pTo.getUTCDate() - (days - 1)),
  );
  return { from: iso(pFrom), to: iso(pTo) };
}

/** true si el rango es exactamente un trimestre natural (T1..T4). */
export function isNaturalQuarter(fromISO: string, toISO: string): boolean {
  const f = parseISO(fromISO), t = parseISO(toISO);
  if (f.getUTCFullYear() !== t.getUTCFullYear()) return false;
  if (f.getUTCMonth() % 3 !== 0) return false;
  if (t.getUTCMonth() !== f.getUTCMonth() + 2) return false;
  if (f.getUTCDate() !== 1) return false;
  return t.getUTCDate() === lastDayOfMonth(t.getUTCFullYear(), t.getUTCMonth());
}

export function labelPeriodo(fromISO: string, toISO: string): string {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(fromISO, toISO)) return `${capMes(f.getUTCMonth())} ${f.getUTCFullYear()}`;
  if (isNaturalQuarter(fromISO, toISO)) return `T${Math.floor(f.getUTCMonth() / 3) + 1} ${f.getUTCFullYear()}`;
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, "0");
  const mm = (d: Date) => String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd(f)}/${mm(f)}/${f.getUTCFullYear()}–${dd(t)}/${mm(t)}/${t.getUTCFullYear()}`;
}

export function labelComparativa(
  fromISO: string,
  toISO: string,
  modo: ModoComparacion = "anterior",
): string {
  const prev = prevPeriod(fromISO, toISO, modo);
  if (isNaturalMonth(fromISO, toISO) || isNaturalQuarter(fromISO, toISO) || modo === "interanual") {
    return `${labelPeriodo(fromISO, toISO)} vs. ${labelPeriodo(prev.from, prev.to)}`;
  }
  return `${labelPeriodo(fromISO, toISO)} vs. período anterior`;
}


// -----------------------------------------------------------------------------
// Estado de una delegación (o equipo comparable).
// Reglas provisionales:
//  - 🔴 CRITICO: cae la producción vs mes anterior Y empeora el ratio de bajas
//                vs mes anterior Y el ratio supera 1,5× la media de la compañía.
//  - 🟡 ATENCION: se cumple UNA de estas condiciones materiales:
//        · caída de cierres > 15% vs mes anterior,
//        · subida del ratio de bajas > 3 pp vs mes anterior,
//        · ratio de bajas > 1,25× media compañía del período.
//  - 🟢 OK: el resto.
// Devuelve razones con las cifras concretas para trazabilidad.
// -----------------------------------------------------------------------------
export type EstadoNivel = "ok" | "atencion" | "critico";
export type EstadoResult = { estado: EstadoNivel; razones: string[] };

export type DelegacionInput = {
  delegacion: string;
  cerradas: number;
  pct_bajas: number;
};

export function estadoDelegacion(
  actual: DelegacionInput,
  previo: DelegacionInput | null,
  mediaCompaniaBajas: number | null,
): EstadoResult {
  const razones: string[] = [];
  const vCerr = previo ? variacion(actual.cerradas, previo.cerradas) : { abs: null, pct: null };
  const bajasAct = actual.pct_bajas ?? 0;
  const bajasPrev = previo?.pct_bajas ?? null;
  const dRatio = bajasPrev != null ? bajasAct - bajasPrev : null;
  const media = mediaCompaniaBajas ?? 0;

  const caeProduccion = vCerr.pct != null && vCerr.pct < 0;
  const empeoraRatio = dRatio != null && dRatio > 0;
  const superaMedia15 = media > 0 && bajasAct > media * 1.5;
  const superaMedia125 = media > 0 && bajasAct > media * 1.25;
  const caeMaterial = vCerr.pct != null && vCerr.pct < -0.15;
  const subeRatio3pp = dRatio != null && dRatio > 0.03;

  if (caeProduccion && empeoraRatio && superaMedia15) {
    razones.push(
      `Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior, ratio de bajas ${fmtP(bajasPrev)}→${fmtP(bajasAct)} y supera 1,5× la media de la compañía (${fmtP(media)}).`,
    );
    return { estado: "critico", razones };
  }

  if (caeMaterial) razones.push(`Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior.`);
  if (subeRatio3pp) razones.push(`Ratio de bajas ${fmtP(bajasPrev)}→${fmtP(bajasAct)} (${fmtPP(dRatio)}).`);
  if (superaMedia125) razones.push(`Ratio de bajas ${fmtP(bajasAct)} > 1,25× media compañía (${fmtP(media)}).`);
  if (razones.length) return { estado: "atencion", razones };
  return { estado: "ok", razones: [] };
}

// -----------------------------------------------------------------------------
// Estado de un técnico.
// Reglas provisionales usando pct_bajas_esp (benchmark por mix, ya calculado
// server-side en ops_tecnicos_scorecard):
//  - Volumen mínimo: cerradas < 10 → 'sin_contexto' (nunca crítico por bajo volumen).
//  - 🔴 CRITICO: pct_bajas > 1,5× esperado Y cae producción > 15%.
//  - 🟡 ATENCION: se cumple UNA condición material:
//        · pct_bajas > 1,25× esperado,
//        · caída de cierres > 15% vs período anterior,
//        · subida de cierres > 20% acompañada de subida del ratio de bajas > 3 pp
//          (señal de volumen a costa de calidad).
//  - 🟢 OK: resto.
// -----------------------------------------------------------------------------
export type EstadoTecnicoNivel = EstadoNivel | "sin_contexto";
export type EstadoTecnicoResult = { estado: EstadoTecnicoNivel; razones: string[] };

export type TecnicoInput = {
  tecnico: string;
  delegacion: string;
  cerradas: number;
  pct_bajas: number;
  pct_bajas_esp?: number | null;
};

export function estadoTecnico(
  actual: TecnicoInput,
  previo: TecnicoInput | null,
): EstadoTecnicoResult {
  if ((actual.cerradas ?? 0) < 10) {
    return { estado: "sin_contexto", razones: ["Contexto insuficiente para evaluación definitiva."] };
  }
  const esp = actual.pct_bajas_esp ?? null;
  const vCerr = previo ? variacion(actual.cerradas, previo.cerradas) : { abs: null, pct: null };
  const dRatio = previo ? actual.pct_bajas - previo.pct_bajas : null;

  const bajasSobre15 = esp != null && esp > 0 && actual.pct_bajas > esp * 1.5;
  const bajasSobre125 = esp != null && esp > 0 && actual.pct_bajas > esp * 1.25;
  const cerrDown15 = vCerr.pct != null && vCerr.pct < -0.15;
  const cerrUp20 = vCerr.pct != null && vCerr.pct > 0.2;
  const subeRatio3pp = dRatio != null && dRatio > 0.03;

  if (bajasSobre15 && cerrDown15) {
    return {
      estado: "critico",
      razones: [
        `Ratio de bajas ${fmtP(actual.pct_bajas)} > 1,5× esperado (${fmtP(esp)}) y cierres ${fmtPctSigned(vCerr.pct)} vs período anterior.`,
      ],
    };
  }
  const razones: string[] = [];
  if (bajasSobre125) razones.push(`Ratio de bajas ${fmtP(actual.pct_bajas)} > 1,25× esperado (${fmtP(esp)}).`);
  if (cerrDown15) razones.push(`Cierres ${fmtPctSigned(vCerr.pct)} vs período anterior.`);
  if (cerrUp20 && subeRatio3pp)
    razones.push(
      `Cierres ${fmtPctSigned(vCerr.pct)} con ratio de bajas ${fmtP(previo?.pct_bajas)}→${fmtP(actual.pct_bajas)} (${fmtPP(dRatio)}) — volumen a costa de calidad.`,
    );
  if (razones.length) return { estado: "atencion", razones };
  return { estado: "ok", razones: [] };
}

// -----------------------------------------------------------------------------
// Indicador provisional para incentivos.
// Nunca se premia solo el volumen; exige estadoTecnico=ok Y producción por
// encima de la mediana de su grupo (Central vs Delegaciones o el que se pase).
// -----------------------------------------------------------------------------
export type IndicadorIncentivo =
  | "reconocimiento_potencial"
  | "revision_estandar"
  | "requiere_validacion"
  | "informacion_insuficiente";

export function indicadorProvisionalIncentivo(
  estado: EstadoTecnicoResult,
  cerradas: number,
  medianaGrupo: number,
): IndicadorIncentivo {
  if (estado.estado === "sin_contexto") return "informacion_insuficiente";
  if (estado.estado === "critico" || estado.estado === "atencion") return "requiere_validacion";
  if (cerradas >= medianaGrupo) return "reconocimiento_potencial";
  return "revision_estandar";
}

export function mediana(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// -----------------------------------------------------------------------------
// Prioridad de estado para ordenar tablas.
// -----------------------------------------------------------------------------
export const ordenEstado: Record<EstadoTecnicoNivel, number> = {
  critico: 0,
  atencion: 1,
  ok: 2,
  sin_contexto: 3,
};

// -----------------------------------------------------------------------------
// Conclusiones deterministas — plantillas con cifras interpoladas.
// Se generan SOLO cuando los datos las soportan. Máximo 6.
// Cada conclusión: {tipo: 'hecho'|'hipotesis', texto, ambito}.
// -----------------------------------------------------------------------------
export type ConclusionTipo = "hecho" | "hipotesis";
export type Conclusion = { tipo: ConclusionTipo; texto: string; ambito: string };

export type KpisMin = { cerradas: number; bajas: number; pct_bajas: number };
export type EquipoRow = { equipo: string; cerradas: number; pct_bajas: number };
export type TecnicoConclInput = {
  tecnico: string; delegacion: string; cerradas: number; pct_bajas: number;
  cerradas_prev?: number | null; pct_bajas_prev?: number | null;
  mediaDelegacion?: number | null;
};

export function generarConclusiones(
  kpisNow: KpisMin | null,
  kpisPrev: KpisMin | null,
  equiposNow: EquipoRow[],
  equiposPrev: EquipoRow[],
  tecnicos: TecnicoConclInput[],
): Conclusion[] {
  const out: Conclusion[] = [];

  // 1) A nivel compañía: cierres suben con ratio empeorando (hecho)
  if (kpisNow && kpisPrev && kpisPrev.cerradas > 0) {
    const vC = variacion(kpisNow.cerradas, kpisPrev.cerradas);
    if (vC.pct != null && vC.pct > 0.05 && kpisNow.pct_bajas > kpisPrev.pct_bajas + 0.01) {
      out.push({
        tipo: "hecho",
        ambito: "Compañía",
        texto: `Cierres ${fmtPctSigned(vC.pct)} pero el ratio de bajas pasa de ${fmtP(kpisPrev.pct_bajas)} a ${fmtP(kpisNow.pct_bajas)}.`,
      });
    }
    if (vC.pct != null && vC.pct < -0.1) {
      out.push({
        tipo: "hecho",
        ambito: "Compañía",
        texto: `Cierres ${fmtPctSigned(vC.pct)} vs período anterior (${kpisPrev.cerradas}→${kpisNow.cerradas}).`,
      });
    }
  }

  // 2) Equipos: sube cierres pero empeora ratio de bajas
  const prevMap = new Map(equiposPrev.map((e) => [e.equipo, e] as const));
  for (const e of equiposNow) {
    const p = prevMap.get(e.equipo);
    if (!p || p.cerradas === 0) continue;
    const vC = variacion(e.cerradas, p.cerradas);
    if (vC.pct != null && vC.pct > 0.05 && e.pct_bajas > p.pct_bajas + 0.01) {
      out.push({
        tipo: "hecho",
        ambito: e.equipo,
        texto: `${e.equipo} aumentó cierres un ${fmtPctSigned(vC.pct)} (${p.cerradas}→${e.cerradas}) pero su ratio de bajas pasó de ${fmtP(p.pct_bajas)} a ${fmtP(e.pct_bajas)}.`,
      });
    }
  }

  // 3) Técnicos: mejoran producción reduciendo bajas (hecho positivo)
  for (const t of tecnicos) {
    if (t.cerradas_prev == null || t.pct_bajas_prev == null) continue;
    if (t.cerradas < 10 || t.cerradas_prev < 10) continue;
    const vC = variacion(t.cerradas, t.cerradas_prev);
    if (vC.pct != null && vC.pct > 0.15 && t.pct_bajas < t.pct_bajas_prev - 0.02) {
      out.push({
        tipo: "hecho",
        ambito: `${t.tecnico} · ${t.delegacion}`,
        texto: `${t.tecnico} mejoró producción (${fmtPctSigned(vC.pct)}) reduciendo bajas (${fmtP(t.pct_bajas_prev)}→${fmtP(t.pct_bajas)}).`,
      });
    }
  }

  // 4) Técnicos: ratio de bajas muy por encima de la media de su delegación (hipótesis)
  for (const t of tecnicos) {
    if (t.cerradas < 10) continue;
    if (t.mediaDelegacion == null || t.mediaDelegacion <= 0) continue;
    const diff = t.pct_bajas - t.mediaDelegacion;
    if (diff > 0.05 && t.pct_bajas > t.mediaDelegacion * 1.5) {
      out.push({
        tipo: "hipotesis",
        ambito: `${t.tecnico} · ${t.delegacion}`,
        texto: `${t.tecnico} tiene un ratio de bajas ${fmtP(t.pct_bajas)}, ${fmtPP(diff)} sobre la media de su delegación (${fmtP(t.mediaDelegacion)}) — validar mix de producto y causas antes de decidir.`,
      });
    }
  }

  // Dedupe por texto, máximo 6
  const uniq = new Map<string, Conclusion>();
  for (const c of out) if (!uniq.has(c.texto)) uniq.set(c.texto, c);
  return Array.from(uniq.values()).slice(0, 6);
}

// =============================================================================
// MODELO MULTIDIMENSIONAL DE ESTADO DE TÉCNICO (iteración 2 — reemplaza el
// semáforo 1-D `estadoTecnico`, que se mantiene solo por compat con tests).
//
// Cuatro dimensiones INDEPENDIENTES + un estado global explicable.
// Ninguna dimensión se agrega en un score oculto: la UI muestra la regla que
// produjo cada clasificación. Sin volumen mínimo → nunca crítico ni excelente.
// =============================================================================

export type EstadoProduccion =
  | "sobre_benchmark" | "en_linea" | "bajo_benchmark" | "insuficiente";
export type EstadoCalidad =
  | "mejor_que_benchmark" | "en_linea" | "atencion" | "critico" | "insuficiente";
export type EstadoSLA =
  | "sobre_objetivo" | "en_linea" | "atencion" | "critico" | "no_disponible";
export type EstadoGlobalNivel =
  | "reconocimiento_potencial"
  | "rendimiento_equilibrado"
  | "atencion_requerida"
  | "requiere_validacion"
  | "informacion_insuficiente";

export const LABEL_PRODUCCION: Record<EstadoProduccion, string> = {
  sobre_benchmark: "Sobre benchmark",
  en_linea: "En línea",
  bajo_benchmark: "Bajo benchmark",
  insuficiente: "Información insuficiente",
};
export const LABEL_CALIDAD: Record<EstadoCalidad, string> = {
  mejor_que_benchmark: "Mejor que benchmark",
  en_linea: "En línea",
  atencion: "Atención",
  critico: "Crítico",
  insuficiente: "Información insuficiente",
};
export const LABEL_SLA: Record<EstadoSLA, string> = {
  sobre_objetivo: "Sobre objetivo",
  en_linea: "En línea",
  atencion: "Atención",
  critico: "Crítico",
  no_disponible: "No disponible",
};
export const LABEL_GLOBAL: Record<EstadoGlobalNivel, string> = {
  reconocimiento_potencial: "Reconocimiento potencial",
  rendimiento_equilibrado: "Rendimiento equilibrado",
  atencion_requerida: "Atención requerida",
  requiere_validacion: "Requiere validación",
  informacion_insuficiente: "Información insuficiente",
};

// Percentiles simples sobre lista numérica (interpolación lineal).
export function percentil(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export type ClasificacionDim<T extends string> = { nivel: T; regla: string };

// --- PRODUCCIÓN --------------------------------------------------------------
export function estadoProduccion(
  cerradas: number,
  cerradasPrev: number | null,
  p33Grupo: number,
  p66Grupo: number,
  umbralMinimo: number,
): ClasificacionDim<EstadoProduccion> {
  if (cerradas < umbralMinimo) {
    return { nivel: "insuficiente", regla: `Muestra insuficiente: ${cerradas} cierres < umbral ${umbralMinimo}.` };
  }
  const v = variacion(cerradas, cerradasPrev);
  if (cerradas >= p66Grupo || (v.pct != null && v.pct >= 0.15)) {
    return { nivel: "sobre_benchmark", regla: `${cerradas} cierres ≥ p66 del grupo (${Math.round(p66Grupo)})${v.pct != null && v.pct >= 0.15 ? ` o Δ ${fmtPctSigned(v.pct)} vs anterior` : ""}.` };
  }
  if (cerradas <= p33Grupo && v.pct != null && v.pct <= -0.15) {
    return { nivel: "bajo_benchmark", regla: `${cerradas} cierres ≤ p33 del grupo (${Math.round(p33Grupo)}) y Δ ${fmtPctSigned(v.pct)} vs anterior.` };
  }
  return { nivel: "en_linea", regla: `${cerradas} cierres dentro del rango del grupo (p33 ${Math.round(p33Grupo)} – p66 ${Math.round(p66Grupo)}).` };
}

// --- CALIDAD (proxy bajas vs peer group delegación y vs esperado por mix) ----
export function estadoCalidad(
  pctBajas: number,
  mediaDelegacion: number | null,
  pctBajasEsp: number | null,
  cerradas: number,
  umbralMinimo: number,
): ClasificacionDim<EstadoCalidad> {
  if (cerradas < umbralMinimo) {
    return { nivel: "insuficiente", regla: `Muestra insuficiente: ${cerradas} cierres < umbral ${umbralMinimo}.` };
  }
  const media = mediaDelegacion ?? pctBajasEsp ?? null;
  if (media == null || media <= 0) {
    return { nivel: "insuficiente", regla: "No hay benchmark disponible (media de delegación ni esperado por mix)." };
  }
  const dpp = pctBajas - media;
  const esp = pctBajasEsp ?? media;
  const ratioEsp = esp > 0 ? pctBajas / esp : 0;
  if (dpp >= 0.10 && (esp === 0 || ratioEsp >= 1.5)) {
    return { nivel: "critico", regla: `Ratio ${fmtP(pctBajas)} vs media deleg. ${fmtP(media)} (${fmtPP(dpp)}) y ≥ 1,5× esperado por mix (${fmtP(esp)}).` };
  }
  if (dpp >= 0.05) {
    return { nivel: "atencion", regla: `Ratio ${fmtP(pctBajas)} vs media deleg. ${fmtP(media)} (${fmtPP(dpp)}).` };
  }
  if (dpp <= -0.05) {
    return { nivel: "mejor_que_benchmark", regla: `Ratio ${fmtP(pctBajas)} vs media deleg. ${fmtP(media)} (${fmtPP(dpp)}).` };
  }
  return { nivel: "en_linea", regla: `Ratio ${fmtP(pctBajas)} en el rango de la delegación (${fmtP(media)}).` };
}

// --- SLA ---------------------------------------------------------------------
export function estadoSLA(
  pctSla20: number | null | undefined,
  cerradas: number,
  umbralMinimo: number,
): ClasificacionDim<EstadoSLA> {
  if (pctSla20 == null || cerradas < umbralMinimo) {
    return { nivel: "no_disponible", regla: `SLA no evaluable: cerradas ${cerradas} < umbral ${umbralMinimo} o sin datos.` };
  }
  if (pctSla20 >= 0.80) return { nivel: "sobre_objetivo", regla: `SLA ${fmtP(pctSla20)} ≥ 80%.` };
  if (pctSla20 >= 0.60) return { nivel: "en_linea", regla: `SLA ${fmtP(pctSla20)} en 60–80%.` };
  if (pctSla20 >= 0.40) return { nivel: "atencion", regla: `SLA ${fmtP(pctSla20)} en 40–60%.` };
  return { nivel: "critico", regla: `SLA ${fmtP(pctSla20)} < 40%.` };
}

// --- ESTADO GLOBAL -----------------------------------------------------------
export type TecnicoGlobalInput = {
  cerradas: number;
  cerradasPrev: number | null;
  pctBajas: number;
  mediaDelegacion: number | null;
  pctBajasEsp: number | null;
  pctSla20: number | null;
  abiertas30: number;
  p33Grupo: number;
  p66Grupo: number;
  medianaGrupo: number;
  umbralMinimo: number;
  problemasDatos?: string[];
};

export type EstadoGlobalTecnico = {
  nivel: EstadoGlobalNivel;
  produccion: ClasificacionDim<EstadoProduccion>;
  calidad: ClasificacionDim<EstadoCalidad>;
  sla: ClasificacionDim<EstadoSLA>;
  reglaGlobal: string;
  observacion: string;
};

export function estadoGlobalTecnico(t: TecnicoGlobalInput): EstadoGlobalTecnico {
  const produccion = estadoProduccion(t.cerradas, t.cerradasPrev, t.p33Grupo, t.p66Grupo, t.umbralMinimo);
  const calidad = estadoCalidad(t.pctBajas, t.mediaDelegacion, t.pctBajasEsp, t.cerradas, t.umbralMinimo);
  const sla = estadoSLA(t.pctSla20, t.cerradas, t.umbralMinimo);
  const problemas = t.problemasDatos ?? [];

  if (problemas.length > 0) {
    return {
      nivel: "requiere_validacion", produccion, calidad, sla,
      reglaGlobal: "Existen inconsistencias en los datos que impiden una clasificación definitiva.",
      observacion: problemas.join(" · "),
    };
  }
  if (produccion.nivel === "insuficiente") {
    return {
      nivel: "informacion_insuficiente", produccion, calidad, sla,
      reglaGlobal: `Muestra insuficiente: ${t.cerradas} cierres < umbral configurado (${t.umbralMinimo}).`,
      observacion: "Contexto insuficiente para evaluación definitiva.",
    };
  }
  const atencion =
    calidad.nivel === "atencion" || calidad.nivel === "critico" ||
    sla.nivel === "atencion" || sla.nivel === "critico" ||
    produccion.nivel === "bajo_benchmark" ||
    t.abiertas30 >= 5;
  if (atencion) {
    const motivos: string[] = [];
    if (calidad.nivel === "critico") motivos.push("calidad crítica");
    else if (calidad.nivel === "atencion") motivos.push("calidad en atención");
    if (sla.nivel === "critico") motivos.push("SLA crítico");
    else if (sla.nivel === "atencion") motivos.push("SLA en atención");
    if (produccion.nivel === "bajo_benchmark") motivos.push("producción bajo benchmark");
    if (t.abiertas30 >= 5) motivos.push(`${t.abiertas30} abiertas +30 d`);
    return {
      nivel: "atencion_requerida", produccion, calidad, sla,
      reglaGlobal: `Al menos una dimensión en atención: ${motivos.join(", ")}.`,
      observacion: motivos.join(" · "),
    };
  }
  const reconocimiento =
    (produccion.nivel === "sobre_benchmark" || produccion.nivel === "en_linea") &&
    (calidad.nivel === "mejor_que_benchmark" || calidad.nivel === "en_linea") &&
    (sla.nivel === "sobre_objetivo" || sla.nivel === "en_linea") &&
    t.cerradas >= t.medianaGrupo;
  if (reconocimiento) {
    return {
      nivel: "reconocimiento_potencial", produccion, calidad, sla,
      reglaGlobal: `Producción ≥ mediana del grupo (${Math.round(t.medianaGrupo)}), calidad no peor que benchmark y SLA ≥ 60%.`,
      observacion: "Rendimiento consistente en las tres dimensiones evaluables.",
    };
  }
  return {
    nivel: "rendimiento_equilibrado", produccion, calidad, sla,
    reglaGlobal: "Sin señales de atención en las dimensiones evaluables; producción por debajo de la mediana del grupo.",
    observacion: "Sin señales críticas; producción por debajo de la mediana del grupo.",
  };
}

// -----------------------------------------------------------------------------
// Elegibilidad para revisión de incentivos — expone la razón textual.
// -----------------------------------------------------------------------------
export type Elegibilidad =
  | "reconocimiento_potencial" | "revision_estandar"
  | "requiere_validacion" | "informacion_insuficiente";

export function elegibilidadIncentivo(e: EstadoGlobalTecnico): Elegibilidad {
  switch (e.nivel) {
    case "informacion_insuficiente": return "informacion_insuficiente";
    case "requiere_validacion": return "requiere_validacion";
    case "atencion_requerida": return "requiere_validacion";
    case "reconocimiento_potencial": return "reconocimiento_potencial";
    case "rendimiento_equilibrado": return "revision_estandar";
  }
}

// -----------------------------------------------------------------------------
// Hallazgos automáticos (máx 5) para la tabla de técnicos — texto plantilla
// con cifras interpoladas y validación requerida. Nada de "vigilar/mejorar".
// -----------------------------------------------------------------------------
export type HallazgoTecnico = {
  tecnico: string;
  hecho: string;
  cifras: string;
  benchmark: string;
  relevancia: string;
  validacion: string;
};

export type TecnicoHallazgoInput = {
  tecnico: string;
  delegacion: string;
  cerradas: number;
  cerradasPrev: number | null;
  pctBajas: number;
  mediaDelegacion: number | null;
  abiertas30: number;
  pctSla20: number | null;
  estado: EstadoGlobalTecnico;
};

export function generarHallazgosTecnicos(rows: TecnicoHallazgoInput[]): HallazgoTecnico[] {
  const out: HallazgoTecnico[] = [];

  // 1) Peor desviación de calidad vs media delegación.
  const calAt = rows
    .filter((r) => r.mediaDelegacion != null && r.estado.calidad.nivel !== "insuficiente")
    .map((r) => ({ r, dpp: r.pctBajas - (r.mediaDelegacion ?? 0) }))
    .filter((x) => x.dpp >= 0.05)
    .sort((a, b) => b.dpp - a.dpp)
    .slice(0, 2);
  for (const { r, dpp } of calAt) {
    out.push({
      tecnico: r.tecnico,
      hecho: `${r.tecnico} cerró ${r.cerradas} OTs en el período.`,
      cifras: `Ratio de bajas ${fmtP(r.pctBajas)} frente al ${fmtP(r.mediaDelegacion)} de ${r.delegacion} (${fmtPP(dpp)}).`,
      benchmark: `Media de bajas de la delegación: ${fmtP(r.mediaDelegacion)}.`,
      relevancia: "Diferencia material respecto a compañeros del mismo peer group.",
      validacion: "Antes de decidir incentivo, revisar motivos codificados de baja, mix de producto y carga asignada.",
    });
  }

  // 2) Caídas de producción materiales.
  const caidas = rows
    .filter((r) => r.cerradasPrev != null && r.cerradasPrev >= 10)
    .map((r) => ({ r, v: variacion(r.cerradas, r.cerradasPrev) }))
    .filter((x) => x.v.pct != null && x.v.pct <= -0.15)
    .sort((a, b) => (a.v.pct ?? 0) - (b.v.pct ?? 0))
    .slice(0, 2);
  for (const { r, v } of caidas) {
    out.push({
      tecnico: r.tecnico,
      hecho: `${r.tecnico} pasó de ${r.cerradasPrev} a ${r.cerradas} cierres.`,
      cifras: `Variación ${fmtPctSigned(v.pct)} vs período anterior.`,
      benchmark: `Referencia: su propio período anterior (${r.cerradasPrev} cierres).`,
      relevancia: "Caída de producción superior al 15% vs período anterior.",
      validacion: "Antes de decidir, verificar carga asignada, días trabajados, ausencias y causas externas.",
    });
  }

  // 3) Backlog acumulado.
  const backlog = rows.filter((r) => r.abiertas30 >= 10).sort((a, b) => b.abiertas30 - a.abiertas30).slice(0, 1);
  for (const r of backlog) {
    out.push({
      tecnico: r.tecnico,
      hecho: `${r.tecnico} acumula ${r.abiertas30} OTs abiertas con más de 30 días.`,
      cifras: `Cerró ${r.cerradas} OTs en el período con SLA ${fmtP(r.pctSla20)}.`,
      benchmark: `Umbral operativo interno: > 5 OTs +30 días exige revisión.`,
      relevancia: "Backlog envejecido impacta directamente en satisfacción del cliente.",
      validacion: "Revisar demoras de repuestos, cancelaciones de cliente y planificación de rutas.",
    });
  }

  return out.slice(0, 5);
}

// -----------------------------------------------------------------------------
// Validaciones de calidad de datos por técnico y globales.
// -----------------------------------------------------------------------------
export type AvisoCalidad = {
  ambito: "global" | "tecnico";
  tecnico?: string;
  tipo: string;
  mensaje: string;
};

export type ValidacionTecInput = {
  tecnico: string;
  delegacion: string;
  cerradas: number;
  cerradasPrev: number | null;
  pctBajas: number;
  pctBajasPrev: number | null;
  pctSla20: number | null;
};

export function validarCalidadDatosTecnicos(
  now: ValidacionTecInput[],
  alertaCaidas: Set<string>,
): { global: AvisoCalidad[]; porTecnico: Map<string, AvisoCalidad[]> } {
  const global: AvisoCalidad[] = [];
  const porTec = new Map<string, AvisoCalidad[]>();
  const push = (t: string, tipo: string, mensaje: string) => {
    const arr = porTec.get(t) ?? [];
    arr.push({ ambito: "tecnico", tecnico: t, tipo, mensaje });
    porTec.set(t, arr);
  };

  // Duplicados
  const seen = new Map<string, number>();
  for (const r of now) seen.set(r.tecnico, (seen.get(r.tecnico) ?? 0) + 1);
  for (const [t, n] of seen) if (n > 1) push(t, "duplicado", `Técnico aparece ${n} veces en el scorecard.`);

  // Multi-delegación
  const delegs = new Map<string, Set<string>>();
  for (const r of now) {
    const s = delegs.get(r.tecnico) ?? new Set<string>();
    if (r.delegacion) s.add(r.delegacion);
    delegs.set(r.tecnico, s);
  }
  for (const [t, s] of delegs) if (s.size > 1) push(t, "multi_delegacion", `Aparece en varias delegaciones: ${Array.from(s).join(", ")}.`);

  for (const r of now) {
    if (!r.delegacion) push(r.tecnico, "sin_delegacion", "Delegación ausente en el maestro de técnicos.");
    if (r.cerradas === 0 && r.pctBajas > 0)
      push(r.tecnico, "cerradas_0_bajas_positivas", `Cerradas=0 pero ratio de bajas ${fmtP(r.pctBajas)}.`);
    if (r.pctBajas > 1)
      push(r.tecnico, "bajas_mayor_cerradas", `Ratio de bajas ${fmtP(r.pctBajas)} > 100%.`);
    if (r.cerradasPrev == null)
      push(r.tecnico, "sin_periodo_anterior", "No hay datos del período anterior para comparar.");
    if (r.cerradas > 0 && r.cerradas < 5)
      push(r.tecnico, "muestra_muy_baja", `Solo ${r.cerradas} cierres — evaluación no fiable.`);
    if (r.cerradasPrev != null && r.cerradas === r.cerradasPrev && r.pctBajas === r.pctBajasPrev && r.cerradas > 0)
      push(r.tecnico, "valores_identicos", "Cifras idénticas al período anterior — verificar carga de datos.");
    // Inconsistencia tabla vs alertas del dashboard
    if (alertaCaidas.has(r.tecnico)) {
      const v = variacion(r.cerradas, r.cerradasPrev);
      if (v.pct == null || v.pct > -0.15) {
        push(r.tecnico, "inconsistencia_alertas",
          "Aparece en 'Caída de cierres' del dashboard pero la tabla no refleja caída ≥15%.");
      }
    }
  }

  return { global, porTecnico: porTec };
}

// -----------------------------------------------------------------------------
// Orden por prioridad de atención para la tabla plana.
// 1º crítico, 2º Δpp bajas ≥ +5pp, 3º Δcierres ≤ −15%, 4º abiertas30 ≥ 5, 5º resto.
// -----------------------------------------------------------------------------
export function prioridadAtencion(
  estado: EstadoGlobalTecnico,
  dppVsDeleg: number | null,
  deltaCerrPct: number | null,
  abiertas30: number,
): number {
  if (estado.nivel === "atencion_requerida" && (estado.calidad.nivel === "critico" || estado.sla.nivel === "critico")) return 0;
  if (dppVsDeleg != null && dppVsDeleg >= 0.05) return 1;
  if (deltaCerrPct != null && deltaCerrPct <= -0.15) return 2;
  if (abiertas30 >= 5) return 3;
  if (estado.nivel === "atencion_requerida") return 4;
  if (estado.nivel === "requiere_validacion") return 5;
  if (estado.nivel === "informacion_insuficiente") return 7;
  return 6;
}

// -----------------------------------------------------------------------------
// Días naturales entre dos fechas ISO (inclusive ambos extremos).
// -----------------------------------------------------------------------------
export function diasEntre(fromISO: string, toISO: string): number {
  const f = parseISO(fromISO), t = parseISO(toISO);
  return Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
}


// =============================================================================
// MODELO MULTIDIMENSIONAL DE ESTADO DE DELEGACIÓN (iteración 3)
//
// Entidad válida: SOLO delegaciones reales del ERP (Central San Agustin, Las
// Palmas, Valencia, Barcelona, Tenerife). Se rechaza cualquier valor que
// parezca una gama, marca, cliente, SAT o técnico.
//
// Estado global 4-niveles con reglas explícitas y trazables.
// =============================================================================

// Umbral compartido entre la tabla y las alertas del dashboard, para evitar
// inconsistencias del tipo "Sin caídas relevantes" cuando la tabla muestra
// caídas mayores que este umbral.
export const UMBRAL_ALERTA_CAIDA = 0.4; // −40% cierres vs período anterior
export const UMBRAL_MIN_DELEGACION = 50; // menos → "información insuficiente"

// Etiquetas de gama utilizadas como equipos dentro de Central: si alguno de
// estos strings aparece como "delegación", es un error de clasificación de
// entidades.
const ETIQUETAS_GAMA = /^(gama\s+(pae|marr[oó]n|blanca|movilidad|clima|profesional)|central\s+\(sin gama\)|madrid\s+·\s+.+)$/i;

// Cuando la fuente aporta tipo_entidad ('delegacion' | 'equipo_central') el
// filtro es ESTRUCTURAL. Si no llega el tipo (consumidores antiguos), se
// mantiene el fallback por nombre.
export function esDelegacionReal(
  nombre: string | null | undefined,
  tipoEntidad?: string | null,
): boolean {
  if (tipoEntidad) return tipoEntidad === "delegacion";
  if (!nombre) return false;
  const t = nombre.trim();
  if (!t) return false;
  if (ETIQUETAS_GAMA.test(t)) return false;
  return true;
}


export type EstadoProduccionDeleg =
  | "sobre_periodo_anterior" | "estable" | "por_debajo" | "insuficiente";
export type EstadoCalidadDeleg =
  | "mejor_que_empresa" | "en_linea" | "atencion" | "critico" | "insuficiente";
export type EstadoBacklogDeleg =
  | "sano" | "atencion" | "critico" | "no_evaluable";
export type EstadoGlobalDeleg =
  | "equilibrado" | "atencion" | "critico" | "informacion_insuficiente";

export const LABEL_GLOBAL_DELEG: Record<EstadoGlobalDeleg, string> = {
  equilibrado: "Equilibrado",
  atencion: "Atención",
  critico: "Crítico",
  informacion_insuficiente: "Información insuficiente",
};

// --- Producción --------------------------------------------------------------
export function estadoProduccionDeleg(
  cerradas: number,
  cerradasPrev: number | null,
  umbralMin: number,
): ClasificacionDim<EstadoProduccionDeleg> {
  if (cerradas < umbralMin)
    return { nivel: "insuficiente", regla: `Muestra insuficiente: ${cerradas} cierres < umbral ${umbralMin}.` };
  const v = variacion(cerradas, cerradasPrev);
  if (v.pct == null)
    return { nivel: "estable", regla: `Sin período anterior comparable para evaluar variación.` };
  if (v.pct >= 0.05)
    return { nivel: "sobre_periodo_anterior", regla: `Cierres ${fmtPctSigned(v.pct)} vs período anterior (${cerradasPrev}→${cerradas}).` };
  if (v.pct <= -0.15)
    return { nivel: "por_debajo", regla: `Cierres ${fmtPctSigned(v.pct)} vs período anterior (${cerradasPrev}→${cerradas}). No ajustado por capacidad.` };
  return { nivel: "estable", regla: `Variación ${fmtPctSigned(v.pct)} dentro del rango estable (±15%).` };
}

// --- Calidad (ratio bajas vs media compañía) ---------------------------------
export function estadoCalidadDeleg(
  pctBajas: number,
  mediaEmpresa: number | null,
  cerradas: number,
  umbralMin: number,
): ClasificacionDim<EstadoCalidadDeleg> {
  if (cerradas < umbralMin)
    return { nivel: "insuficiente", regla: `Muestra insuficiente: ${cerradas} cierres < umbral ${umbralMin}.` };
  if (mediaEmpresa == null || mediaEmpresa <= 0)
    return { nivel: "insuficiente", regla: "Sin media de empresa disponible." };
  const dpp = pctBajas - mediaEmpresa;
  if (dpp >= 0.10 && pctBajas >= mediaEmpresa * 1.5)
    return { nivel: "critico", regla: `Ratio ${fmtP(pctBajas)} vs empresa ${fmtP(mediaEmpresa)} (${fmtPP(dpp)}) y ≥ 1,5× empresa.` };
  if (dpp >= 0.05)
    return { nivel: "atencion", regla: `Ratio ${fmtP(pctBajas)} vs empresa ${fmtP(mediaEmpresa)} (${fmtPP(dpp)}).` };
  if (dpp <= -0.05)
    return { nivel: "mejor_que_empresa", regla: `Ratio ${fmtP(pctBajas)} vs empresa ${fmtP(mediaEmpresa)} (${fmtPP(dpp)}).` };
  return { nivel: "en_linea", regla: `Ratio ${fmtP(pctBajas)} en el rango de la empresa (${fmtP(mediaEmpresa)}).` };
}

// --- SLA (reutiliza estadoSLA de técnicos con el mismo umbral) --------------
// Nota: aquí no reutilizamos directamente por semántica ligeramente distinta.
export function estadoSlaDeleg(
  pctSla: number | null | undefined,
  cerradas: number,
  umbralMin: number,
): ClasificacionDim<EstadoSLA> {
  return estadoSLA(pctSla ?? null, cerradas, umbralMin);
}

// --- Backlog (abiertas +30 / abiertas totales) ------------------------------
export function estadoBacklogDeleg(
  abiertas: number,
  abiertas30: number,
): ClasificacionDim<EstadoBacklogDeleg> {
  if (abiertas <= 0)
    return { nivel: "no_evaluable", regla: "No hay OTs abiertas en la delegación." };
  const pct = abiertas30 / abiertas;
  if (abiertas30 >= 20 && pct >= 0.30)
    return { nivel: "critico", regla: `${abiertas30} OTs +30d (${fmtP(pct)} del backlog) ≥ umbrales 20 y 30%.` };
  if (abiertas30 >= 10 || pct >= 0.20)
    return { nivel: "atencion", regla: `${abiertas30} OTs +30d (${fmtP(pct)} del backlog).` };
  return { nivel: "sano", regla: `${abiertas30} OTs +30d (${fmtP(pct)} del backlog).` };
}

// --- Estado global de la delegación -----------------------------------------
export type DelegacionGlobalInput = {
  delegacion: string;
  cerradas: number;
  cerradasPrev: number | null;
  pctBajas: number;
  mediaEmpresaBajas: number | null;
  pctSla20: number | null;
  abiertas: number;
  abiertas30: number;
  problemasDatos?: string[];
  umbralMin?: number;
};

export type EstadoDelegacionMulti = {
  nivel: EstadoGlobalDeleg;
  produccion: ClasificacionDim<EstadoProduccionDeleg>;
  calidad: ClasificacionDim<EstadoCalidadDeleg>;
  sla: ClasificacionDim<EstadoSLA>;
  backlog: ClasificacionDim<EstadoBacklogDeleg>;
  reglaGlobal: string;
  observacion: string;
  bloqueadoPorDatos: boolean;
};

export function estadoDelegacionMulti(t: DelegacionGlobalInput): EstadoDelegacionMulti {
  const umbral = t.umbralMin ?? UMBRAL_MIN_DELEGACION;
  const produccion = estadoProduccionDeleg(t.cerradas, t.cerradasPrev, umbral);
  const calidad = estadoCalidadDeleg(t.pctBajas, t.mediaEmpresaBajas, t.cerradas, umbral);
  const sla = estadoSlaDeleg(t.pctSla20, t.cerradas, umbral);
  const backlog = estadoBacklogDeleg(t.abiertas, t.abiertas30);
  const problemas = t.problemasDatos ?? [];

  if (problemas.length > 0) {
    return {
      nivel: "informacion_insuficiente", produccion, calidad, sla, backlog,
      reglaGlobal: "Inconsistencias en los datos que bloquean clasificación definitiva.",
      observacion: problemas.join(" · "),
      bloqueadoPorDatos: true,
    };
  }
  if (produccion.nivel === "insuficiente") {
    return {
      nivel: "informacion_insuficiente", produccion, calidad, sla, backlog,
      reglaGlobal: `Volumen insuficiente para clasificar (${t.cerradas} < ${umbral}).`,
      observacion: "Contexto insuficiente para evaluación definitiva.",
      bloqueadoPorDatos: false,
    };
  }

  const dimsCriticas =
    (calidad.nivel === "critico" ? 1 : 0) +
    (sla.nivel === "critico" ? 1 : 0) +
    (backlog.nivel === "critico" ? 1 : 0);
  const dimsAtencion =
    (produccion.nivel === "por_debajo" ? 1 : 0) +
    (calidad.nivel === "atencion" || calidad.nivel === "critico" ? 1 : 0) +
    (sla.nivel === "atencion" || sla.nivel === "critico" ? 1 : 0) +
    (backlog.nivel === "atencion" || backlog.nivel === "critico" ? 1 : 0);

  if (dimsCriticas >= 1 && dimsAtencion >= 2) {
    return {
      nivel: "critico", produccion, calidad, sla, backlog,
      reglaGlobal: `Dos o más dimensiones materiales negativas (${dimsAtencion}), con al menos una crítica.`,
      observacion: `Producción ${produccion.nivel} · Calidad ${calidad.nivel} · SLA ${sla.nivel} · Backlog ${backlog.nivel}.`,
      bloqueadoPorDatos: false,
    };
  }
  if (dimsAtencion >= 1) {
    return {
      nivel: "atencion", produccion, calidad, sla, backlog,
      reglaGlobal: `Una dimensión con señal material negativa.`,
      observacion: `Producción ${produccion.nivel} · Calidad ${calidad.nivel} · SLA ${sla.nivel} · Backlog ${backlog.nivel}.`,
      bloqueadoPorDatos: false,
    };
  }
  return {
    nivel: "equilibrado", produccion, calidad, sla, backlog,
    reglaGlobal: "Sin desviación material en producción, calidad, SLA ni backlog.",
    observacion: "Rendimiento estable en las dimensiones evaluables.",
    bloqueadoPorDatos: false,
  };
}

// --- Validaciones de calidad de datos por delegación -------------------------
export type ValidacionDelegInput = {
  delegacion: string;
  cerradas: number;
  cerradasPrev: number | null;
  bajas: number;
  bajasPrev: number | null;
  pctSla20: number | null;
  abiertas: number;
  abiertas30: number;
};

export function validarCalidadDatosDelegaciones(
  rows: ValidacionDelegInput[],
  alertasCaida: Set<string>,
): Map<string, AvisoCalidad[]> {
  const out = new Map<string, AvisoCalidad[]>();
  const push = (d: string, tipo: string, mensaje: string) => {
    const arr = out.get(d) ?? [];
    arr.push({ ambito: "tecnico", tecnico: d, tipo, mensaje });
    out.set(d, arr);
  };
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.delegacion, (seen.get(r.delegacion) ?? 0) + 1);
  for (const [d, n] of seen) if (n > 1) push(d, "duplicado", `Delegación aparece ${n} veces.`);
  for (const r of rows) {
    if (!esDelegacionReal(r.delegacion)) {
      push(r.delegacion, "gama_como_delegacion",
        `"${r.delegacion}" parece un equipo/gama, no una delegación real. No debe aparecer en esta tabla.`);
    }
    if (r.cerradas === 0 && r.bajas > 0)
      push(r.delegacion, "cerradas_0_bajas_positivas", `Cerradas=0 con ${r.bajas} bajas.`);
    if (r.bajas > r.cerradas)
      push(r.delegacion, "bajas_mayor_cerradas", `${r.bajas} bajas > ${r.cerradas} cerradas.`);
    if (r.pctSla20 != null && (r.pctSla20 < 0 || r.pctSla20 > 1))
      push(r.delegacion, "sla_fuera_rango", `SLA ${fmtP(r.pctSla20)} fuera del rango 0-100%.`);
    if (r.abiertas30 > r.abiertas)
      push(r.delegacion, "abiertas30_incoherente", `${r.abiertas30} abiertas +30d > ${r.abiertas} abiertas totales.`);
    if (r.cerradasPrev != null && r.cerradas === r.cerradasPrev && r.bajasPrev != null && r.bajas === r.bajasPrev && r.cerradas > 0)
      push(r.delegacion, "valores_identicos", "Cifras idénticas al período anterior — verificar carga o join.");
    if (alertasCaida.has(r.delegacion)) {
      const v = variacion(r.cerradas, r.cerradasPrev);
      if (v.pct == null || v.pct > -UMBRAL_ALERTA_CAIDA) {
        push(r.delegacion, "inconsistencia_alertas",
          `Marcada como 'caída' en el dashboard pero la tabla no refleja caída ≥ ${(UMBRAL_ALERTA_CAIDA * 100).toFixed(0)}%.`);
      }
    }
  }
  return out;
}

// --- Hallazgos automáticos de delegación (HECHO / HIPÓTESIS / ACCIÓN) --------
export type HallazgoDelegacion = {
  delegacion: string;
  hecho: string;
  hipotesis: string;
  accion: string;
  benchmark: string;
  relevancia: string;
};

export type DelegHallazgoInput = {
  delegacion: string;
  cerradas: number;
  cerradasPrev: number | null;
  bajas: number;
  bajasPrev: number | null;
  pctBajas: number;
  mediaEmpresaBajas: number | null;
  pctSla20: number | null;
  abiertas30: number;
  estado: EstadoDelegacionMulti;
};

export function generarHallazgosDelegaciones(rows: DelegHallazgoInput[]): HallazgoDelegacion[] {
  const out: HallazgoDelegacion[] = [];
  // 1) Cierres suben pero bajas suben más → posible calidad
  for (const r of rows) {
    if (r.cerradasPrev == null || r.bajasPrev == null || r.cerradasPrev === 0 || r.bajasPrev === 0) continue;
    const vC = variacion(r.cerradas, r.cerradasPrev);
    const vB = variacion(r.bajas, r.bajasPrev);
    if (vC.pct != null && vB.pct != null && vC.pct >= 0 && vB.pct - vC.pct >= 0.10) {
      out.push({
        delegacion: r.delegacion,
        hecho: `${r.delegacion} aumentó cierres un ${fmtPctSigned(vC.pct)} mientras sus bajas subieron un ${fmtPctSigned(vB.pct)}; el ratio queda en ${fmtP(r.pctBajas)}.`,
        hipotesis: "El aumento puede concentrarse en una gama, cliente o técnico concreto; revisar la distribución antes de concluir deterioro de calidad.",
        accion: `Revisar bajas por técnico, gama y motivo en ${r.delegacion} antes del próximo comité.`,
        benchmark: `Media de empresa: ${fmtP(r.mediaEmpresaBajas)}.`,
        relevancia: "Divergencia > 10 pp entre variación de cierres y de bajas.",
      });
    }
  }
  // 2) Calidad crítica vs empresa
  for (const r of rows) {
    if (r.estado.calidad.nivel !== "critico") continue;
    const dpp = r.mediaEmpresaBajas != null ? r.pctBajas - r.mediaEmpresaBajas : null;
    if (dpp == null) continue;
    out.push({
      delegacion: r.delegacion,
      hecho: `${r.delegacion} presenta un ratio de bajas de ${fmtP(r.pctBajas)} sobre ${r.cerradas} cierres.`,
      hipotesis: "Puede reflejar mix de producto más complejo o problema real de calidad; requiere validar antes de responsabilizar al equipo.",
      accion: "Descomponer por gama, cliente y técnico; contrastar con benchmark por mix familia×cliente.",
      benchmark: `Media empresa ${fmtP(r.mediaEmpresaBajas)} (${fmtPP(dpp)}).`,
      relevancia: "Ratio ≥ 1,5× media empresa y ≥ +10pp.",
    });
  }
  // 3) Backlog envejecido crítico
  for (const r of rows) {
    if (r.estado.backlog.nivel !== "critico") continue;
    out.push({
      delegacion: r.delegacion,
      hecho: `${r.delegacion} acumula ${r.abiertas30} OTs abiertas con más de 30 días.`,
      hipotesis: "Puede deberse a demoras de repuestos, cancelaciones de cliente o capacidad insuficiente.",
      accion: "Revisar causa raíz por técnico y provincia; priorizar cierre de casos +30d en las próximas 2 semanas.",
      benchmark: `Umbrales operativos: > 20 OTs +30d y > 30% del backlog.`,
      relevancia: "Backlog envejecido crítico.",
    });
  }
  // 4) Caída material de producción no ajustada por capacidad
  for (const r of rows) {
    if (r.cerradasPrev == null || r.cerradasPrev < UMBRAL_MIN_DELEGACION) continue;
    const v = variacion(r.cerradas, r.cerradasPrev);
    if (v.pct != null && v.pct <= -UMBRAL_ALERTA_CAIDA) {
      out.push({
        delegacion: r.delegacion,
        hecho: `${r.delegacion} pasó de ${r.cerradasPrev} a ${r.cerradas} cierres (${fmtPctSigned(v.pct)}).`,
        hipotesis: "La caída puede reflejar menor entrada, cambios de plantilla, vacaciones o cierre de puntos. No es en sí misma peor rendimiento.",
        accion: "Antes de calificar como deterioro, comprobar entradas, capacidad disponible y comparabilidad de días laborables.",
        benchmark: `Umbral operativo: caída ≥ ${(UMBRAL_ALERTA_CAIDA * 100).toFixed(0)}%.`,
        relevancia: "Variación superior al umbral compartido con alertas del dashboard.",
      });
    }
  }
  // Dedup por delegación+acción, máx 5
  const seen = new Set<string>();
  const uniq: HallazgoDelegacion[] = [];
  for (const h of out) {
    const k = h.delegacion + "|" + h.accion;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(h);
    if (uniq.length >= 5) break;
  }
  return uniq;
}
