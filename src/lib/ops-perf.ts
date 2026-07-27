/**
 * ops-perf.ts — Motor de cálculo puro para el módulo /operaciones.
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
