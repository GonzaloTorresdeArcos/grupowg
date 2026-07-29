/**
 * ops-costes.ts — Motor puro de coste y productividad para /operaciones/costes.
 *
 * Reutiliza `variacion` y `prevPeriod` de ops-performance. No introduce ni
 * inventa costes, tarifas ni salarios: solo agrega y clasifica lo que ya viene
 * etiquetado desde la BD como real (nómina, fact_sat, importe_desplazamiento,
 * fact_cli) o marcado como no disponible.
 */
import { variacion, type Variacion } from "./ops-performance";

// ─── Tipos de coste (metodología visible) ────────────────────────────────────
export type TipoCoste =
  | "real_registrado"     // nómina interna, fact_sat, desplazamiento
  | "no_disponible";      // repuestos, logística, retrabajo, otros

export type ComponenteCoste = {
  clave: "nomina" | "sat" | "desplazamiento" | "repuestos" | "logistica" | "retrabajo" | "otros";
  etiqueta: string;
  importe: number | null;   // null = no disponible
  tipo: TipoCoste;
  metodologia: string;
  cobertura?: number | null; // % de OTs con este componente cuando aplique
};

export const LABEL_COMPONENTE: Record<ComponenteCoste["clave"], string> = {
  nomina: "Nómina interna",
  sat: "Coste SAT externo",
  desplazamiento: "Desplazamiento",
  repuestos: "Repuestos",
  logistica: "Logística",
  retrabajo: "Retrabajo / reincidencias",
  otros: "Otros",
};

// ─── Lectura de una tarjeta ejecutiva ────────────────────────────────────────
// tri-tonal — favorable / desfavorable / requiere_interpretacion / neutro
export type LecturaKpi = "favorable" | "desfavorable" | "requiere_interpretacion" | "neutro";

export type TarjetaKpi = {
  clave: string;
  etiqueta: string;
  valor: number | null;
  valorPrev: number | null;
  variacion: Variacion;
  lectura: LecturaKpi;
  motivo: string;
  definicion: string;
};

// ─── Reglas de lectura ───────────────────────────────────────────────────────
// Una bajada de coste NO es favorable si coincide con menor producción,
// peor calidad o menor cobertura de datos.
export function lecturaCoste(params: {
  costeAct: number; costePrev: number | null;
  cerradasAct: number; cerradasPrev: number | null;
  bajasAct: number; bajasPrev: number | null;
  ingresoCoberturaAct: number | null; ingresoCoberturaPrev: number | null;
}): { lectura: LecturaKpi; motivo: string } {
  const v = variacion(params.costeAct, params.costePrev);
  if (v.pct == null) return { lectura: "neutro", motivo: "Sin período anterior comparable." };
  const vCerr = variacion(params.cerradasAct, params.cerradasPrev);
  const ratioAct = params.cerradasAct > 0 ? params.bajasAct / params.cerradasAct : null;
  const ratioPrev = params.cerradasPrev && params.cerradasPrev > 0
    ? (params.bajasPrev ?? 0) / params.cerradasPrev : null;
  const empeoraCalidad = ratioAct != null && ratioPrev != null && ratioAct > ratioPrev + 0.01;
  const bajaProduccion = vCerr.pct != null && vCerr.pct < -0.05;
  const bajaCobertura = params.ingresoCoberturaAct != null && params.ingresoCoberturaPrev != null
    && params.ingresoCoberturaAct < params.ingresoCoberturaPrev - 0.05;

  if (Math.abs(v.pct) < 0.02) return { lectura: "neutro", motivo: "Variación de coste inferior al 2%." };
  if (v.pct < 0) {
    if (bajaProduccion) return { lectura: "requiere_interpretacion", motivo: "Coste baja pero también baja la producción; puede reflejar menor actividad, no eficiencia." };
    if (empeoraCalidad) return { lectura: "requiere_interpretacion", motivo: "Coste baja mientras empeora el ratio de bajas; verificar antes de calificar como ahorro." };
    if (bajaCobertura) return { lectura: "requiere_interpretacion", motivo: "Coste baja con menor cobertura de datos de ingreso; comparabilidad reducida." };
    return { lectura: "favorable", motivo: "Coste baja sin caída de producción ni deterioro de calidad." };
  }
  // sube coste
  if (vCerr.pct != null && vCerr.pct > 0.05 && !empeoraCalidad) {
    return { lectura: "requiere_interpretacion", motivo: "Coste sube pero también sube la producción; revisar coste por cerrada." };
  }
  return { lectura: "desfavorable", motivo: "Coste sube sin aumento equivalente de producción." };
}

export function lecturaCostePorCerrada(actual: number | null, previo: number | null): { lectura: LecturaKpi; motivo: string } {
  const v = variacion(actual, previo);
  if (v.pct == null) return { lectura: "neutro", motivo: "Sin período anterior comparable." };
  if (Math.abs(v.pct) < 0.02) return { lectura: "neutro", motivo: "Variación inferior al 2%." };
  if (v.pct < 0) return { lectura: "favorable", motivo: `Coste por cerrada baja ${(v.pct * 100).toFixed(1)}%.` };
  return { lectura: "desfavorable", motivo: `Coste por cerrada sube ${(v.pct * 100).toFixed(1)}%.` };
}

export function lecturaProduccion(actual: number, previo: number | null): { lectura: LecturaKpi; motivo: string } {
  const v = variacion(actual, previo);
  if (v.pct == null) return { lectura: "neutro", motivo: "Sin período anterior comparable." };
  if (Math.abs(v.pct) < 0.02) return { lectura: "neutro", motivo: "Variación inferior al 2%." };
  if (v.pct > 0) return { lectura: "favorable", motivo: `Producción sube ${(v.pct * 100).toFixed(1)}%.` };
  return { lectura: "desfavorable", motivo: `Producción baja ${(v.pct * 100).toFixed(1)}%.` };
}

// ─── Composición del coste ───────────────────────────────────────────────────
export function componentesCoste(input: {
  nomina: number | null; sat: number | null; desplazamiento: number | null;
  cerradasTotales: number;
  cerradasConCosteSat: number | null;
  cerradasConDesplazamiento: number | null;
}): ComponenteCoste[] {
  const cob = (n: number | null | undefined) =>
    n != null && input.cerradasTotales > 0 ? n / input.cerradasTotales : null;
  return [
    { clave: "nomina", etiqueta: LABEL_COMPONENTE.nomina, importe: input.nomina, tipo: "real_registrado",
      metodologia: "Coste empresa (SS incluida) por técnico interno con nómina casada. Fuente: resúmenes de nómina de las 3 sociedades." },
    { clave: "sat", etiqueta: LABEL_COMPONENTE.sat, importe: input.sat, tipo: "real_registrado",
      metodologia: "Coste facturado por SAT externo (fact_sat). Metodología distinta a nómina interna.",
      cobertura: cob(input.cerradasConCosteSat) },
    { clave: "desplazamiento", etiqueta: LABEL_COMPONENTE.desplazamiento, importe: input.desplazamiento, tipo: "real_registrado",
      metodologia: "Importe de desplazamiento imputado por OT (importe_desplazamiento).",
      cobertura: cob(input.cerradasConDesplazamiento) },
    { clave: "repuestos", etiqueta: LABEL_COMPONENTE.repuestos, importe: null, tipo: "no_disponible",
      metodologia: "No disponible en el modelo actual. Requiere integración con almacén/compras." },
    { clave: "logistica", etiqueta: LABEL_COMPONENTE.logistica, importe: null, tipo: "no_disponible",
      metodologia: "No disponible. Sin registro estructurado de logística por OT." },
    { clave: "retrabajo", etiqueta: LABEL_COMPONENTE.retrabajo, importe: null, tipo: "no_disponible",
      metodologia: "No disponible. Requiere identificación de reincidencias y FTF." },
    { clave: "otros", etiqueta: LABEL_COMPONENTE.otros, importe: null, tipo: "no_disponible",
      metodologia: "No disponible." },
  ];
}

// ─── Contribución operativa parcial ──────────────────────────────────────────
// SIEMPRE etiquetada como "parcial" con badge de completitud.
export function contribucionParcial(input: {
  ingresoCli: number | null;
  costesDirectos: number;
  cerradasConIngreso: number | null;
  cerradasTotales: number;
}): { valor: number | null; completitud: number | null; etiqueta: string } {
  if (input.ingresoCli == null || input.cerradasConIngreso == null || input.cerradasConIngreso === 0) {
    return { valor: null, completitud: 0, etiqueta: "Sin ingresos registrados en el período." };
  }
  const completitud = input.cerradasTotales > 0 ? input.cerradasConIngreso / input.cerradasTotales : 0;
  return {
    valor: input.ingresoCli - input.costesDirectos,
    completitud,
    etiqueta: `Cobertura de ingreso: ${(completitud * 100).toFixed(0)}% de OTs. No es margen, EBITDA ni rentabilidad.`,
  };
}

// ─── Estado provisional de productividad ajustada por calidad ────────────────
export type EstadoProductividad =
  | "equilibrado_eficiente"
  | "productivo_costoso"
  | "coste_bajo_riesgo_calidad"
  | "atencion"
  | "critico"
  | "informacion_insuficiente";

export const LABEL_PRODUCTIVIDAD: Record<EstadoProductividad, string> = {
  equilibrado_eficiente: "Equilibrado y eficiente",
  productivo_costoso: "Productivo pero costoso",
  coste_bajo_riesgo_calidad: "Coste bajo con riesgo de calidad",
  atencion: "Atención",
  critico: "Crítico",
  informacion_insuficiente: "Información insuficiente",
};

export type EntidadCosteInput = {
  entidad: string;
  cerradas: number;
  pctBajas: number | null;      // ratio 0..1
  pctSla20: number | null;      // ratio 0..1
  eurCierre: number | null;
  eurCierreMediana: number;      // referencia del universo comparable
  ratioBajasMediana: number | null;
  umbralMin: number;
};

export type ClasificacionProductividad = {
  nivel: EstadoProductividad;
  regla: string;
  motivos: string[];
};

export function estadoProductividad(t: EntidadCosteInput): ClasificacionProductividad {
  if (t.cerradas < t.umbralMin) {
    return {
      nivel: "informacion_insuficiente",
      regla: `Muestra insuficiente: ${t.cerradas} cierres < umbral ${t.umbralMin}.`,
      motivos: [],
    };
  }
  const motivos: string[] = [];
  const eurAlto = t.eurCierre != null && t.eurCierreMediana > 0 && t.eurCierre > t.eurCierreMediana * 1.25;
  const eurBajo = t.eurCierre != null && t.eurCierreMediana > 0 && t.eurCierre < t.eurCierreMediana * 0.75;
  const calidadMala = t.pctBajas != null && t.ratioBajasMediana != null && t.pctBajas > t.ratioBajasMediana + 0.05;
  const calidadCritica = t.pctBajas != null && t.ratioBajasMediana != null && t.pctBajas > t.ratioBajasMediana + 0.10;
  const slaBajo = t.pctSla20 != null && t.pctSla20 < 0.40;

  if (eurAlto) motivos.push(`Coste/cerrada ${Math.round(t.eurCierre!)}€ > 1,25× mediana (${Math.round(t.eurCierreMediana)}€).`);
  if (eurBajo) motivos.push(`Coste/cerrada ${Math.round(t.eurCierre!)}€ < 0,75× mediana (${Math.round(t.eurCierreMediana)}€).`);
  if (calidadMala) motivos.push(`Ratio de bajas ${(t.pctBajas! * 100).toFixed(1)}% sobre mediana (${(t.ratioBajasMediana! * 100).toFixed(1)}%).`);
  if (slaBajo) motivos.push(`SLA ${(t.pctSla20! * 100).toFixed(1)}% < 40%.`);

  if ((calidadCritica && eurAlto) || (calidadCritica && slaBajo)) {
    return { nivel: "critico", regla: "Coste alto o SLA bajo con calidad crítica.", motivos };
  }
  if (eurBajo && calidadMala) {
    return { nivel: "coste_bajo_riesgo_calidad", regla: "Coste por cerrada bajo pero ratio de bajas sobre benchmark.", motivos };
  }
  if (eurAlto && !calidadMala && !slaBajo) {
    return { nivel: "productivo_costoso", regla: "Coste por cerrada elevado sin señales de mala calidad ni SLA bajo.", motivos };
  }
  if (calidadMala || slaBajo) {
    return { nivel: "atencion", regla: "Una dimensión de calidad/SLA con señal negativa.", motivos };
  }
  return { nivel: "equilibrado_eficiente", regla: "Coste/cerrada en rango y calidad/SLA sin señales negativas.", motivos };
}

// Orden por prioridad de atención de dirección
export const ordenProductividad: Record<EstadoProductividad, number> = {
  critico: 0,
  coste_bajo_riesgo_calidad: 1,
  atencion: 2,
  productivo_costoso: 3,
  equilibrado_eficiente: 4,
  informacion_insuficiente: 5,
};

// ─── Hallazgos automáticos (HECHO/HIPÓTESIS/ACCIÓN) ──────────────────────────
export type HallazgoCoste = {
  entidad: string;
  hecho: string;
  hipotesis: string;
  accion: string;
  benchmark: string;
  relevancia: string;
};

export function generarHallazgosCostes(
  filas: (EntidadCosteInput & { clasificacion: ClasificacionProductividad })[],
): HallazgoCoste[] {
  const out: HallazgoCoste[] = [];
  // 1) coste alto con calidad crítica
  const criticos = filas.filter((f) => f.clasificacion.nivel === "critico").slice(0, 2);
  for (const f of criticos) {
    out.push({
      entidad: f.entidad,
      hecho: `${f.entidad} tiene coste/cerrada de ${Math.round(f.eurCierre ?? 0)}€ frente a mediana ${Math.round(f.eurCierreMediana)}€, con ratio de bajas ${((f.pctBajas ?? 0) * 100).toFixed(1)}%.`,
      hipotesis: "Puede reflejar mix de producto complejo, baja carga asignada o problema real de calidad; requiere análisis antes de concluir ineficiencia.",
      accion: `Revisar composición del coste, mix de producto y motivos de baja en ${f.entidad} antes del próximo comité.`,
      benchmark: `Mediana €/cierre: ${Math.round(f.eurCierreMediana)}€. Ratio bajas mediana: ${((f.ratioBajasMediana ?? 0) * 100).toFixed(1)}%.`,
      relevancia: "Coste elevado combinado con calidad crítica.",
    });
  }
  // 2) coste bajo con calidad peor
  const sospechosos = filas.filter((f) => f.clasificacion.nivel === "coste_bajo_riesgo_calidad").slice(0, 2);
  for (const f of sospechosos) {
    out.push({
      entidad: f.entidad,
      hecho: `${f.entidad} presenta coste/cerrada bajo (${Math.round(f.eurCierre ?? 0)}€) pero ratio de bajas ${((f.pctBajas ?? 0) * 100).toFixed(1)}% sobre la mediana ${((f.ratioBajasMediana ?? 0) * 100).toFixed(1)}%.`,
      hipotesis: "Un coste bajo con calidad peor puede reflejar reparaciones incompletas o mayor tasa de retorno; no debe interpretarse como eficiencia.",
      accion: "Antes de replicar el modelo, revisar reincidencias, satisfacción y motivos codificados de baja.",
      benchmark: `Mediana €/cierre ${Math.round(f.eurCierreMediana)}€.`,
      relevancia: "Riesgo de confundir ahorro con degradación operativa.",
    });
  }
  // 3) desviación material de coste sin problemas de calidad
  const costoso = filas.filter((f) => f.clasificacion.nivel === "productivo_costoso").slice(0, 1);
  for (const f of costoso) {
    out.push({
      entidad: f.entidad,
      hecho: `${f.entidad} tiene coste/cerrada ${Math.round(f.eurCierre ?? 0)}€, ${(((f.eurCierre ?? 0) / f.eurCierreMediana - 1) * 100).toFixed(0)}% sobre la mediana, con calidad y SLA sin señales negativas.`,
      hipotesis: "Puede reflejar mix de producto de mayor complejidad, mayor peso de desplazamiento o menor volumen por técnico.",
      accion: "Descomponer el coste por técnico y por componente (nómina, desplazamiento) antes de tomar acciones.",
      benchmark: `Mediana €/cierre ${Math.round(f.eurCierreMediana)}€.`,
      relevancia: "Diferencia de coste material sin explicación por calidad.",
    });
  }
  return out.slice(0, 5);
}

// ─── Calidad de datos de costes ──────────────────────────────────────────────
export type AvisoCosteDatos = { tipo: string; mensaje: string; entidad?: string };

export function validarCalidadDatosCostes(input: {
  cerradasTotales: number;
  cerradasConIngreso: number | null;
  cerradasConCosteSat: number | null;
  cerradasConDesplazamiento: number | null;
  coste: number | null;
  cierres: number | null;
  costePrev: number | null;
  ciclesPrev: number | null;
  filas?: { entidad: string; cerradas: number; costeDirecto: number | null }[];
}): AvisoCosteDatos[] {
  const out: AvisoCosteDatos[] = [];
  if (input.coste != null && input.coste < 0) out.push({ tipo: "coste_negativo", mensaje: "Coste registrado con valor negativo — verificar carga de nóminas." });
  if ((input.cierres ?? 0) === 0 && (input.coste ?? 0) > 0)
    out.push({ tipo: "cierres_0_coste_positivo", mensaje: "Coste > 0 sin cierres en el período — revisar imputación de nómina." });
  if (input.costePrev != null && input.coste === input.costePrev && input.ciclesPrev != null && input.cierres === input.ciclesPrev && (input.coste ?? 0) > 0)
    out.push({ tipo: "valores_identicos", mensaje: "Cifras del período anterior idénticas — verificar join o carga estática." });
  const cob = (n: number | null) => n != null && input.cerradasTotales > 0 ? n / input.cerradasTotales : 0;
  if (cob(input.cerradasConIngreso) < 0.25)
    out.push({ tipo: "cobertura_ingreso_baja", mensaje: `Solo ${(cob(input.cerradasConIngreso) * 100).toFixed(0)}% de OTs tienen ingreso registrado — la contribución operativa es parcial.` });
  if (cob(input.cerradasConCosteSat) > 0 && cob(input.cerradasConCosteSat) < 0.20)
    out.push({ tipo: "cobertura_sat_baja", mensaje: `Coste SAT presente en ${(cob(input.cerradasConCosteSat) * 100).toFixed(0)}% de OTs.` });
  for (const f of input.filas ?? []) {
    if (f.cerradas > 0 && (f.costeDirecto == null || f.costeDirecto <= 0))
      out.push({ tipo: "sin_coste", mensaje: `${f.entidad}: ${f.cerradas} cierres sin coste directo imputado.`, entidad: f.entidad });
  }
  return out;
}

// Mediana simple (evita depender de ops-performance para tests aislados).
export function medianaLocal(xs: number[]): number {
  const s = xs.filter((n) => Number.isFinite(n) && n > 0).slice().sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
