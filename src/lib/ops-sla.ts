/**
 * ops-sla.ts — Motor puro de SLA y envejecimiento para /operaciones/sla.
 *
 * Reutiliza patrones de ops-performance (umbrales centralizados, hallazgos
 * HECHO/HIPÓTESIS/ACCIÓN, validaciones de calidad). No duplica lógica.
 *
 * LIMITACIÓN ESTRUCTURAL (declarada en la UI): no existe historial de cambios
 * de estado en ops_fact_ot. Se conoce la etapa ACTUAL de cada OT abierta y su
 * antigüedad total desde fecha_creacion, pero NO el tiempo transcurrido en
 * cada etapa. Toda conclusión se redacta como "las OTs envejecidas están
 * actualmente en la etapa X", nunca "la etapa X tarda N días".
 *
 * La reconstrucción histórica del backlog (snapshot a fin de mes pasado) SÍ es
 * exacta en cuanto a conteos y antigüedades (usa fecha_creacion/fecha_cierre),
 * pero NO en cuanto a la etapa (el estado actual pudo ser otro entonces).
 */
import { esDelegacionReal } from "./ops-performance";

// ─── Umbrales centralizados (documentados en el panel de definiciones) ───────
export const UMBRAL_PCT_ABIERTAS_30_CRITICO = 0.25; // 🔴 >25% de abiertas supera 30d
export const MESES_CRECIMIENTO_CONSECUTIVO = 3;     // 🔴 antigüedad media creciendo 3 meses seguidos
export const UMBRAL_PCT_REPUESTO_EN_30 = 0.30;      // 🟡 ≥30% de las +30d actualmente esperando repuesto
export const DELTA_SLA_DETERIORO = 0.02;            // 🟡 caída de SLA > 2 pp con menor carga entrante
export const UMBRAL_BACKLOG_TECNICO_ALERTA = 5;     // 🟡 backlog del técnico creciendo y ≥ 5 abiertas
export const UMBRAL_MUESTRA_CLIENTE_DEF = 30;       // cerradas mínimas para evaluar tendencia de cliente
export const UMBRAL_MUESTRA_PRODUCTO_DEF = 20;      // abiertas mínimas para análisis por producto
export const TOLERANCIA_SLA_DASHBOARD = 0.005;      // 0,5 pp de tolerancia vs dashboard

const pctTxt = (v: number | null | undefined): string =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;

// ─── Buckets de antigüedad ───────────────────────────────────────────────────
// Definición única compartida con la SQL (ops_sla): 0-5, 6-10, 11-20, 21-30,
// 31-45, 46-60, >60 días naturales desde fecha_creacion.
export type BucketId = "0-5" | "6-10" | "11-20" | "21-30" | "31-45" | "46-60" | ">60";
export const BUCKETS_ORDEN: readonly BucketId[] = ["0-5", "6-10", "11-20", "21-30", "31-45", "46-60", ">60"];

export function bucketDeEdad(dias: number): BucketId {
  const d = Math.max(0, dias); // antigüedad negativa se clampea (se reporta en calidad de datos)
  if (d <= 5) return "0-5";
  if (d <= 10) return "6-10";
  if (d <= 20) return "11-20";
  if (d <= 30) return "21-30";
  if (d <= 45) return "31-45";
  if (d <= 60) return "46-60";
  return ">60";
}

// ─── Mapeo de etapas de flujo (estado literal → categoría operativa) ─────────
// Mapeo evidente y documentado en el panel de definiciones. Lo no mapeado cae
// en "otros" y se muestra con su literal — nunca se oculta.
export type CategoriaEtapa =
  | "pendiente_reparacion"
  | "en_red_sat"
  | "esperando_repuesto"
  | "esperando_cliente_datos"
  | "esperando_aprobacion"
  | "baja_en_tramite"
  | "confirmado_pendiente"
  | "otros";

export const LABEL_CATEGORIA: Record<CategoriaEtapa, string> = {
  pendiente_reparacion: "Pendiente de reparación",
  en_red_sat: "En red SAT",
  esperando_repuesto: "Esperando repuesto",
  esperando_cliente_datos: "Esperando cliente / datos",
  esperando_aprobacion: "Esperando aprobación de presupuesto",
  baja_en_tramite: "Baja en trámite",
  confirmado_pendiente: "Aviso confirmado, pendiente de intervención",
  otros: "Otros / sin clasificar",
};

const CATEGORIA_DE_ESTADO: Record<string, CategoriaEtapa> = {
  "PTE. REPARAR": "pendiente_reparacion",
  "AVISADO A SAT": "en_red_sat",
  "PTE. ASIGNAR SAT": "en_red_sat",
  "PTE. PIEZAS": "esperando_repuesto",
  "PENDIENTE DATOS": "esperando_cliente_datos",
  "PRESUPUESTO TRAMITADO": "esperando_aprobacion",
  "SOLICITUD BAJA": "baja_en_tramite",
  "TRAMITANDO BAJA": "baja_en_tramite",
  "CONFIRMADO AVISO": "confirmado_pendiente",
};

export function categoriaDeEstado(estado: string | null | undefined): CategoriaEtapa {
  if (!estado) return "otros";
  const t = estado.trim().toUpperCase();
  if (!t || t === "(SIN ESTADO)") return "otros";
  return CATEGORIA_DE_ESTADO[t] ?? "otros";
}

// Etapas fuera del control directo del técnico (regla de la vista técnicos):
// si la mayoría de sus OTs envejecidas está en estas categorías, se indica
// explícitamente y nunca se presume responsabilidad.
export const ETAPAS_EXTERNAS_TECNICO: ReadonlySet<CategoriaEtapa> = new Set<CategoriaEtapa>([
  "esperando_repuesto",
  "en_red_sat",
  "esperando_cliente_datos",
  "esperando_aprobacion",
]);

// Acción recomendada por categoría dominante (causa operativa posible).
export const ACCION_CATEGORIA: Record<CategoriaEtapa, string> = {
  pendiente_reparacion: "Revisar planificación y capacidad del equipo propio antes de atribuir la demora a individuos.",
  en_red_sat: "Revisar asignación y tiempos de respuesta de la red SAT en la zona afectada.",
  esperando_repuesto: "Revisar plazos de proveedor y stock de recambios antes de ampliar capacidad técnica.",
  esperando_cliente_datos: "Reactivar el contacto con el cliente y escalar los casos sin respuesta.",
  esperando_aprobacion: "Agilizar con el cliente el ciclo de aprobación de presupuestos.",
  baja_en_tramite: "Verificar que el trámite de baja no queda detenido por validaciones pendientes.",
  confirmado_pendiente: "Confirmar el agendamiento de la visita y la capacidad de asignación.",
  otros: "Revisar manualmente el estado de flujo de estas OTs.",
};

// ─── Agregación de etapas (literal → categoría, media ponderada) ─────────────
export type EtapaSql = {
  estado: string;
  n: number;
  edad_media: number | null;
  n30: number;
  n60: number;
};

export type CategoriaResumen = {
  categoria: CategoriaEtapa;
  n: number;
  edadMedia: number | null;
  n30: number;
  n60: number;
  estados: { literal: string; n: number }[];
};

export function agregarEtapas(rows: EtapaSql[]): CategoriaResumen[] {
  const map = new Map<CategoriaEtapa, CategoriaResumen & { _pesoEdad: number }>();
  for (const r of rows) {
    const cat = categoriaDeEstado(r.estado);
    const cur = map.get(cat) ?? { categoria: cat, n: 0, edadMedia: null, n30: 0, n60: 0, estados: [], _pesoEdad: 0 };
    cur.n += r.n;
    cur.n30 += r.n30;
    cur.n60 += r.n60;
    if (r.edad_media != null) cur._pesoEdad += r.edad_media * r.n;
    cur.estados.push({ literal: r.estado, n: r.n });
    map.set(cat, cur);
  }
  const out = [...map.values()].map((c) => ({
    ...c,
    edadMedia: c.n > 0 && c._pesoEdad > 0 ? c._pesoEdad / c.n : null,
    estados: c.estados.sort((a, b) => b.n - a.n),
  }));
  return out.sort((a, b) => b.n - a.n);
}

// ─── Tendencias sobre series reconstruidas ───────────────────────────────────
// Cuenta el tramo final de crecimientos consecutivos (se detiene en nulos).
export function mesesCrecimientoConsecutivo(valores: Array<number | null>): number {
  let n = 0;
  for (let i = valores.length - 1; i > 0; i--) {
    const a = valores[i];
    const b = valores[i - 1];
    if (a == null || b == null) break;
    if (a > b) n++;
    else break;
  }
  return n;
}

export type Tendencia = "creciendo" | "estable" | "mejorando" | "sin_datos";

export function tendenciaSerie(valores: Array<number | null>): Tendencia {
  const validos = valores.filter((x): x is number => x != null);
  if (validos.length < 2) return "sin_datos";
  if (mesesCrecimientoConsecutivo(valores) >= 2) return "creciendo";
  let d = 0;
  for (let i = valores.length - 1; i > 0; i--) {
    const a = valores[i];
    const b = valores[i - 1];
    if (a == null || b == null) break;
    if (a < b) d++;
    else break;
  }
  if (d >= 2) return "mejorando";
  return "estable";
}

// ─── Vista técnicos: concentración del retraso en etapas ajenas ──────────────
export type TecEtapasSql = { tecnico: string; estado: string; n: number; n30: number };

export type ResumenTecnicoBacklog = {
  tecnico: string;
  n30: number;
  n30Externas: number;
  pctExternas: number | null;
  mayoriaExterna: boolean;
  nota: string | null;
};

export function resumenBacklogTecnico(tecnico: string, rows: TecEtapasSql[]): ResumenTecnicoBacklog {
  const propias = rows.filter((r) => r.tecnico === tecnico);
  const n30 = propias.reduce((s, r) => s + r.n30, 0);
  const n30Externas = propias
    .filter((r) => ETAPAS_EXTERNAS_TECNICO.has(categoriaDeEstado(r.estado)))
    .reduce((s, r) => s + r.n30, 0);
  const pctExternas = n30 > 0 ? n30Externas / n30 : null;
  const mayoriaExterna = pctExternas != null && pctExternas >= 0.5;
  return {
    tecnico,
    n30,
    n30Externas,
    pctExternas,
    mayoriaExterna,
    nota: mayoriaExterna ? "El retraso se concentra en etapas ajenas al técnico." : null,
  };
}

// ─── Tendencia de cliente (mejorando / deteriorando) ─────────────────────────
export type TendenciaCliente = "mejorando" | "estable" | "deteriorando" | "muestra_insuficiente";

export function tendenciaCliente(
  c: { cerradas: number; cerradas_prev: number; pct_sla20: number | null; sla_prev: number | null },
  umbralMuestra: number = UMBRAL_MUESTRA_CLIENTE_DEF,
): TendenciaCliente {
  if (c.cerradas < umbralMuestra && c.cerradas_prev < umbralMuestra) return "muestra_insuficiente";
  if (c.pct_sla20 != null && c.sla_prev != null) {
    if (c.pct_sla20 < c.sla_prev - DELTA_SLA_DETERIORO) return "deteriorando";
    if (c.pct_sla20 > c.sla_prev + DELTA_SLA_DETERIORO) return "mejorando";
  }
  return "estable";
}

// ─── Alertas accionables (cada una con evidencia, impacto y acción) ──────────
export type AlertaSla = {
  nivel: "critico" | "atencion";
  clave: string;
  titulo: string;
  evidencia: string;
  impacto: string;
  accion: string;
};

export type AlertasSlaInput = {
  abiertas: number;
  n30: number;
  evoDeleg: { delegacion: string; serieEdad: Array<number | null> }[];
  slaAct: number | null;
  slaPrev: number | null;
  creadasAct: number | null;
  creadasPrev: number | null;
  evoTec: { tecnico: string; serie: Array<number | null> }[];
  pctRepuestoEn30: number | null;
};

export function detectarAlertasSla(i: AlertasSlaInput): AlertaSla[] {
  const out: AlertaSla[] = [];

  // 🔴 >25% de abiertas supera 30 días
  if (i.abiertas > 0) {
    const pct30 = i.n30 / i.abiertas;
    if (pct30 > UMBRAL_PCT_ABIERTAS_30_CRITICO) {
      out.push({
        nivel: "critico",
        clave: "backlog_30",
        titulo: "Más del 25% de las OTs abiertas supera 30 días",
        evidencia: `${i.n30} de ${i.abiertas} abiertas (${pctTxt(pct30)}) llevan más de 30 días sin cierre.`,
        impacto: "Riesgo directo de incumplimiento de compromisos con cliente y deterioro de satisfacción.",
        accion: "Priorizar desbloqueo del tramo 31-45d antes de que migre a envejecimiento crítico (>60d).",
      });
    }
  }

  // 🔴 delegación real con antigüedad media creciendo 3 meses consecutivos
  for (const d of i.evoDeleg) {
    if (!esDelegacionReal(d.delegacion)) continue;
    const meses = mesesCrecimientoConsecutivo(d.serieEdad);
    if (meses >= MESES_CRECIMIENTO_CONSECUTIVO) {
      const serie = d.serieEdad.filter((x): x is number => x != null);
      out.push({
        nivel: "critico",
        clave: "deleg_edad_creciente",
        titulo: `${d.delegacion}: antigüedad media creciendo ${meses} meses consecutivos`,
        evidencia: `Serie mensual de antigüedad media del backlog (reconstruida): ${serie.map((x) => x.toFixed(1)).join(" → ")} días.`,
        impacto: "El envejecimiento se acumula de forma sostenida en la delegación; cada mes el backlog es más viejo.",
        accion: "Identificar en la tabla de flujo en qué etapa están actualmente sus OTs envejecidas y actuar sobre esa etapa.",
      });
    }
  }

  // 🟡 SLA deteriorándose con menor carga entrante
  if (
    i.slaAct != null && i.slaPrev != null &&
    i.slaAct < i.slaPrev - DELTA_SLA_DETERIORO &&
    i.creadasAct != null && i.creadasPrev != null &&
    i.creadasAct < i.creadasPrev
  ) {
    out.push({
      nivel: "atencion",
      clave: "sla_deterioro_menor_carga",
      titulo: "SLA deteriorándose con menor carga entrante",
      evidencia: `SLA ${pctTxt(i.slaPrev)} → ${pctTxt(i.slaAct)} mientras las entradas bajan de ${i.creadasPrev} a ${i.creadasAct} OTs.`,
      impacto: "El deterioro no se explica por mayor volumen de trabajo entrante.",
      accion: "Revisar capacidad disponible, ausencias y etapas de flujo del período antes de cualquier conclusión.",
    });
  }

  // 🟡 backlog de un técnico creciendo (máx 3)
  const tecs = i.evoTec
    .map((t) => ({ t, meses: mesesCrecimientoConsecutivo(t.serie), ultimo: t.serie[t.serie.length - 1] }))
    .filter((x) => x.meses >= MESES_CRECIMIENTO_CONSECUTIVO && (x.ultimo ?? 0) >= UMBRAL_BACKLOG_TECNICO_ALERTA)
    .slice(0, 3);
  for (const { t, meses, ultimo } of tecs) {
    out.push({
      nivel: "atencion",
      clave: "tecnico_backlog_creciente",
      titulo: `${t.tecnico}: backlog creciendo ${meses} meses consecutivos`,
      evidencia: `Serie de abiertas (reconstruida): ${t.serie.map((x) => x ?? "—").join(" → ")}; actualmente ${ultimo ?? "—"} abiertas.`,
      impacto: "Acumulación sostenida de trabajo sin cerrar.",
      accion: "Antes de atribuir, verificar en la vista técnicos en qué etapas están sus OTs envejecidas (pueden ser ajenas al técnico).",
    });
  }

  // 🟡 proporción de OTs actualmente esperando repuesto entre las +30d
  if (i.pctRepuestoEn30 != null && i.pctRepuestoEn30 >= UMBRAL_PCT_REPUESTO_EN_30) {
    out.push({
      nivel: "atencion",
      clave: "repuesto_share_30",
      titulo: "Alta proporción de OTs +30d actualmente esperando repuesto",
      evidencia: `${pctTxt(i.pctRepuestoEn30)} de las OTs de más de 30 días están actualmente en "PTE. PIEZAS". Sin historial de estados, la tendencia no es computable.`,
      impacto: "Cuello de botella probable en suministro de recambios.",
      accion: "Revisar plazos de proveedor y referencias pendientes antes de ampliar capacidad técnica.",
    });
  }

  return out;
}

// ─── Calidad de datos ────────────────────────────────────────────────────────
export type CalidadSql = {
  sin_estado: number;
  edad_negativa: number;
  cierre_prev_apertura: number;
  propios_sin_delegacion: number;
  propios_sin_tecnico: number;
  red_sat_sin_delegacion: number;
  duplicados_abiertas: number;
};

export type AvisoSla = { tipo: string; mensaje: string; severidad: "error" | "info" };

export function validarCalidadDatosSla(c: CalidadSql): AvisoSla[] {
  const out: AvisoSla[] = [];
  if (c.sin_estado > 0)
    out.push({ tipo: "estado_ausente", severidad: "error", mensaje: `${c.sin_estado} OTs abiertas sin estado de flujo — no clasificables por etapa (aparecen en "Otros / sin clasificar").` });
  if (c.edad_negativa > 0)
    out.push({ tipo: "antiguedad_negativa", severidad: "error", mensaje: `${c.edad_negativa} OTs con fecha de creación futura (antigüedad negativa) — revisar origen; se clampean a 0 días en buckets.` });
  if (c.cierre_prev_apertura > 0)
    out.push({ tipo: "cierre_previo_apertura", severidad: "error", mensaje: `${c.cierre_prev_apertura} OTs cerradas con fecha de cierre anterior a la de creación — afectan a tramos de cierre.` });
  if (c.duplicados_abiertas > 0)
    out.push({ tipo: "duplicados", severidad: "error", mensaje: `${c.duplicados_abiertas} números de OT aparecen duplicados entre las abiertas.` });
  if (c.propios_sin_delegacion > 0)
    out.push({ tipo: "propio_sin_delegacion", severidad: "error", mensaje: `${c.propios_sin_delegacion} OTs abiertas de técnico propio sin delegación asignada.` });
  if (c.propios_sin_tecnico > 0)
    out.push({ tipo: "propio_sin_tecnico", severidad: "error", mensaje: `${c.propios_sin_tecnico} OTs abiertas de técnico propio sin técnico asignado.` });
  if (c.red_sat_sin_delegacion > 0)
    out.push({ tipo: "red_sat_sin_delegacion", severidad: "info", mensaje: `${c.red_sat_sin_delegacion} OTs de red SAT sin delegación — esperado: la red externa no tiene delegación propia. Se agrupan como "Red SAT externa".` });
  return out;
}

// Consistencia con el cálculo SLA del dashboard (misma definición kpi_20d).
export function compararSlaDashboard(
  slaPagina: number | null,
  slaDashboard: number | null,
  tol: number = TOLERANCIA_SLA_DASHBOARD,
): AvisoSla | null {
  if (slaPagina == null || slaDashboard == null) return null;
  if (Math.abs(slaPagina - slaDashboard) <= tol) return null;
  return {
    tipo: "inconsistencia_dashboard",
    severidad: "error",
    mensaje: `SLA de esta página (${pctTxt(slaPagina)}) difiere del dashboard (${pctTxt(slaDashboard)}) en más de ${(tol * 100).toFixed(1)} pp — revisar filtros o definición.`,
  };
}

// ─── Hallazgos automáticos (máx 5) — HECHO / HIPÓTESIS / ACCIÓN ──────────────
export type HallazgoSla = { hecho: string; hipotesis: string; accion: string; benchmark: string };

export type HallazgosSlaInput = {
  abiertas: number;
  n30: number;
  n60: number;
  delegaciones: { delegacion: string; n30: number; etapaDominante: string | null }[];
  categorias: CategoriaResumen[];
  marcaTop30: { marca: string; n30: number } | null;
  clienteTop30: { cliente: string; n30: number; diasMasAntigua: number | null } | null;
  tecnicosCreciendo: { tecnico: string; ultimoValor: number }[];
};

export function generarHallazgosSla(i: HallazgosSlaInput): HallazgoSla[] {
  const out: HallazgoSla[] = [];

  // 1) Categoría dominante del envejecimiento
  if (i.n30 > 0 && i.categorias.length > 0) {
    const top = [...i.categorias].sort((a, b) => b.n30 - a.n30)[0];
    if (top.n30 > 0) {
      const share = top.n30 / i.n30;
      out.push({
        hecho: `El ${(share * 100).toFixed(0)}% de las OTs de más de 30 días está actualmente en "${LABEL_CATEGORIA[top.categoria]}" (${top.n30} de ${i.n30} OTs).`,
        hipotesis:
          top.categoria === "esperando_repuesto" && i.marcaTop30
            ? `Se concentra en la marca ${i.marcaTop30.marca} (${i.marcaTop30.n30} OTs +30d). Sin historial de estados no se puede saber cuánto tiempo lleva cada OT en esta etapa.`
            : "Sin historial de estados no se puede saber cuánto tiempo lleva cada OT en esta etapa; validar con el equipo de flujo.",
        accion: ACCION_CATEGORIA[top.categoria],
        benchmark: `Total +30d: ${i.n30} OTs sobre ${i.abiertas} abiertas (${pctTxt(i.abiertas > 0 ? i.n30 / i.abiertas : null)}).`,
      });
    }
  }

  // 2) Delegación con mayor concentración del envejecimiento
  const delegs = i.delegaciones
    .filter((d) => esDelegacionReal(d.delegacion) && d.n30 > 0)
    .sort((a, b) => b.n30 - a.n30);
  if (i.n30 > 0 && delegs.length > 0) {
    const d = delegs[0];
    const share = d.n30 / i.n30;
    if (share >= 0.15) {
      const cat = d.etapaDominante ? categoriaDeEstado(d.etapaDominante) : null;
      out.push({
        hecho: `${d.delegacion} concentra el ${(share * 100).toFixed(0)}% de las OTs de más de 30 días (${d.n30} OTs).`,
        hipotesis: cat
          ? `La mayoría está actualmente en "${LABEL_CATEGORIA[cat]}".`
          : "Distribución por etapa no disponible para esta delegación.",
        accion: cat ? ACCION_CATEGORIA[cat] : "Revisar el backlog de la delegación caso a caso.",
        benchmark: "Umbral de concentración: ≥ 15% del envejecimiento total.",
      });
    }
  }

  // 3) Cliente con backlog más envejecido
  if (i.clienteTop30 && i.clienteTop30.n30 >= 10) {
    out.push({
      hecho: `${i.clienteTop30.cliente} acumula ${i.clienteTop30.n30} OTs abiertas de más de 30 días${i.clienteTop30.diasMasAntigua != null ? `; su OT más antigua lleva ${i.clienteTop30.diasMasAntigua} días` : ""}.`,
      hipotesis: "Puede reflejar complejidad del producto del cliente, aprobaciones lentas o saturación de la red asignada.",
      accion: "Revisar con el cliente los casos +30d y la etapa actual de cada uno antes de reasignar carga.",
      benchmark: "Umbral de inclusión: ≥ 10 OTs +30d.",
    });
  }

  // 4) Técnico con backlog creciente
  if (i.tecnicosCreciendo.length > 0) {
    const t = i.tecnicosCreciendo[0];
    out.push({
      hecho: `${t.tecnico} acumula ${t.ultimoValor} OTs abiertas tras varios meses de crecimiento.`,
      hipotesis: "Antes de atribuir, verificar en qué etapas están sus envejecidas: pueden ser ajenas al técnico (repuesto, red SAT, cliente, presupuesto).",
      accion: "Revisar la vista técnicos y desbloquear primero las etapas externas.",
      benchmark: `Umbral de alerta: backlog creciendo ${MESES_CRECIMIENTO_CONSECUTIVO} meses consecutivos y ≥ ${UMBRAL_BACKLOG_TECNICO_ALERTA} abiertas.`,
    });
  }

  // 5) Envejecimiento crítico >60d
  if (i.n60 > 0 && i.abiertas > 0) {
    out.push({
      hecho: `${i.n60} OTs superan los 60 días de antigüedad (${pctTxt(i.n60 / i.abiertas)} del backlog).`,
      hipotesis: "Son los casos con mayor riesgo de escalado: pueden concentrar averías complejas, recambios de baja rotación o clientes sin respuesta.",
      accion: "Revisar caso a caso el listado de OTs >60d esta semana y decidir cierre, escalado o reprogramación.",
      benchmark: "Umbral de envejecimiento crítico: > 60 días desde la creación.",
    });
  }

  return out.slice(0, 5);
}
