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

export function prevPeriod(fromISO: string, toISO: string): { from: string; to: string } {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(fromISO, toISO)) {
    const y = f.getUTCFullYear();
    const m = f.getUTCMonth();
    const pFrom = new Date(Date.UTC(y, m - 1, 1));
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

export function labelPeriodo(fromISO: string, toISO: string): string {
  const f = parseISO(fromISO);
  const t = parseISO(toISO);
  if (isNaturalMonth(fromISO, toISO)) return `${capMes(f.getUTCMonth())} ${f.getUTCFullYear()}`;
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, "0");
  const mm = (d: Date) => String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd(f)}/${mm(f)}/${f.getUTCFullYear()}–${dd(t)}/${mm(t)}/${t.getUTCFullYear()}`;
}

export function labelComparativa(fromISO: string, toISO: string): string {
  const prev = prevPeriod(fromISO, toISO);
  if (isNaturalMonth(fromISO, toISO)) {
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

