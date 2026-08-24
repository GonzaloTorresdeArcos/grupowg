/**
 * ops-panorama.ts — Motor puro del Panorama operativo (/operaciones, F3A).
 *
 * PRINCIPIO: separar PERFORMANCE OPERATIVA de CUMPLIMIENTO CONTRACTUAL.
 * No existe un "SLA WG" universal: cada cliente/programa tiene su regla. Por eso
 * ≤20d y +30d se etiquetan SIEMPRE como "Referencia operativa (no contractual)".
 *
 * Reutiliza los módulos existentes (ops-performance, ops-sla): aquí solo vive la
 * ecuación de balance, la taxonomía de targets, la Situation Line y la cola
 * priorizada de asuntos de dirección (fusión y deduplicación de señales).
 */
import type { Conclusion } from "./ops-performance";
import { fmtFechaEs } from "./ops-as-of";
import { categoriaDeEstado, LABEL_CATEGORIA, type CategoriaEtapa } from "./ops-sla";

// ─── Taxonomía de targets ────────────────────────────────────────────────────
export type TipoTarget =
  | "contractual_target"
  | "contractual_hard_limit"
  | "internal_operating_target"
  | "operational_reference"
  | "historical_benchmark"
  | "no_target";

export const LABEL_TARGET: Record<TipoTarget, string> = {
  contractual_target: "Contractual Target",
  contractual_hard_limit: "Contractual Hard Limit",
  internal_operating_target: "Internal Operating Target",
  operational_reference: "Operational Reference",
  historical_benchmark: "Historical Benchmark",
  no_target: "No Target",
};

export const DESC_TARGET: Record<TipoTarget, string> = {
  contractual_target: "Objetivo pactado con el cliente en contrato. Su incumplimiento tiene consecuencia contractual.",
  contractual_hard_limit: "Límite contractual duro: superarlo genera penalización o incidencia formal.",
  internal_operating_target: "Objetivo interno fijado por WG; no pactado con cliente.",
  operational_reference: "Referencia operativa de WG para comparar equipos, gamas y delegaciones. No es contractual.",
  historical_benchmark: "Referencia estadística construida con el histórico propio (mix de familia y cliente).",
  no_target: "Métrica descriptiva sin objetivo aplicable: se lee en contexto, nunca como buena o mala por sí sola.",
};

/** Etiqueta única para ≤20d / +30d. Prohibido llamarlo "SLA contractual". */
export const ETIQUETA_REFERENCIA_OPERATIVA = "Referencia operativa WG (no contractual)";

/** Una variación sin target aplicable se muestra neutra-informativa, nunca "mala". */
export function tonoVariacion(
  tipo: TipoTarget,
  favorable: boolean | null,
): "favorable" | "desfavorable" | "neutro" {
  if (tipo === "no_target") return "neutro";
  if (favorable == null) return "neutro";
  return favorable ? "favorable" : "desfavorable";
}

// ─── Ecuación de balance ─────────────────────────────────────────────────────
export type Balance = {
  backlogIni: number;
  entrantes: number;
  reparadas: number;
  bajas: number;
  backlogFin: number;
  /** OTs cerradas en el período sin fecha de creación: rompen el cuadre. */
  sinFechaCreacion: number;
};

export const balanceCalculado = (b: Balance): number =>
  b.backlogIni + b.entrantes - b.reparadas - b.bajas;

export const descuadreBalance = (b: Balance): number => b.backlogFin - balanceCalculado(b);

export const cuadraBalance = (b: Balance): boolean => descuadreBalance(b) === 0;

/** Peso de las bajas sobre la salida total (reparadas + bajas). */
export function pctBajasSalida(b: Balance): number | null {
  const salida = b.reparadas + b.bajas;
  return salida > 0 ? b.bajas / salida : null;
}

const pct1 = (v: number | null): string => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const num = (v: number): string => new Intl.NumberFormat("es-ES").format(Math.round(v));

/**
 * Lectura determinista del balance. SIEMPRE distingue reparaciones de bajas:
 * reducir backlog dando de baja aparatos no es lo mismo que repararlos.
 */
export function lecturaBalance(b: Balance): string {
  const delta = b.backlogFin - b.backlogIni;
  const pb = pctBajasSalida(b);
  const cabecera =
    delta < 0
      ? `Absorbiendo demanda: el backlog baja de ${num(b.backlogIni)} a ${num(b.backlogFin)} OTs (${num(Math.abs(delta))} menos).`
      : delta > 0
        ? `Acumulando demanda: el backlog sube de ${num(b.backlogIni)} a ${num(b.backlogFin)} OTs (${num(delta)} más).`
        : `Backlog estable en ${num(b.backlogFin)} OTs.`;
  const salida =
    b.reparadas + b.bajas > 0
      ? ` De la salida del período, ${num(b.reparadas)} son reparaciones y ${num(b.bajas)} son bajas: el ${pct1(pb)} de lo que sale del backlog no se repara.`
      : " No hay salidas registradas en el período.";
  const aviso =
    b.sinFechaCreacion > 0
      ? ` ${num(b.sinFechaCreacion)} OTs cerradas no tienen fecha de creación y no cuadran la ecuación.`
      : "";
  return cabecera + salida + aviso;
}

// ─── Executive Situation Line ────────────────────────────────────────────────
export type SituationInput = {
  periodoLabel: string;
  /** null si no hay período comparable con datos. */
  comparadaLabel: string | null;
  totalOts: number | null;
  backlogFin: number | null;
  /** Variación relativa del backlog vs comparable; null si no hay comparable. */
  varBacklogPct: number | null;
  referencia20: number | null;
  nAsuntos: number;
  /** F4B · Fecha efectiva del dato operativo (`ops_as_of('ot')`). */
  asOf?: string | null;
};

/**
 * Una sola frase, solo con datos reales del período/modo activos.
 * Si falta comparable, se omite la variación (nunca se inventa un cero).
 * F4B: abre declarando a qué fecha corresponde el dato, porque el backlog y las
 * antigüedades están medidos contra esa fecha y no contra el día de hoy.
 */
export function situationLine(i: SituationInput): string {
  const partes: string[] = [];
  if (i.asOf) partes.push(`Datos operativos a ${fmtFechaEs(i.asOf)}`);
  partes.push(i.periodoLabel);
  if (i.totalOts != null) partes.push(`${num(i.totalOts)} OTs`);
  if (i.backlogFin != null) {
    const v =
      i.varBacklogPct != null && i.comparadaLabel
        ? ` ${i.varBacklogPct > 0 ? "↑" : i.varBacklogPct < 0 ? "↓" : "="}${Math.abs(i.varBacklogPct * 100).toFixed(1)}% vs ${i.comparadaLabel}`
        : "";
    partes.push(`Backlog ${num(i.backlogFin)}${v}`);
  }
  if (i.referencia20 != null) partes.push(`Referencia operativa ≤20d: ${pct1(i.referencia20)}`);
  partes.push(
    i.nAsuntos === 0
      ? "sin asuntos que requieran atención"
      : i.nAsuntos === 1
        ? "1 asunto requiere atención"
        : `${num(i.nAsuntos)} asuntos requieren atención`,
  );
  return partes.join(" · ");
}


// ─── Cola priorizada de asuntos de dirección ─────────────────────────────────
export type Impacto = "alto" | "medio" | "bajo";
export type Confianza = "alta" | "media" | "limitada";

export const LABEL_IMPACTO: Record<Impacto, string> = { alto: "Alto", medio: "Medio", bajo: "Bajo" };
export const LABEL_CONFIANZA: Record<Confianza, string> = { alta: "Alta", media: "Media", limitada: "Limitada" };

export const MAX_ASUNTOS = 6;
/** Muestra mínima para atribuir un fenómeno a una persona concreta. */
export const MUESTRA_MINIMA_TECNICO = 10;
export const UMBRAL_BACKLOG_30 = 0.25;
export const UMBRAL_SHARE_REPUESTO = 0.15;
export const UMBRAL_CAIDA_SLA_PP = 0.02;
export const UMBRAL_SUBIDA_BAJAS_PP = 0.03;
export const UMBRAL_REFERENCIA_20 = 0.8;

export type Asunto = {
  /** Identificador del FENÓMENO: dos señales del mismo fenómeno = un solo asunto. */
  fenomeno: string;
  titulo: string;
  hecho: string;
  hipotesis: string;
  accion: string;
  impacto: Impacto;
  confianza: Confianza;
  /** true si el fenómeno empeora respecto al período comparable. */
  deterioro: boolean;
  /** Nº de OTs (o personas) afectadas: criterio de priorización. */
  volumen: number;
  /** Ruta de drill-down al módulo origen (los filtros globales se conservan). */
  destino: string;
  destinoLabel: string;
};

export function clasificarImpacto(volumen: number, universo: number): Impacto {
  if (universo <= 0) return "bajo";
  const share = volumen / universo;
  if (share >= 0.05) return "alto";
  if (share >= 0.01) return "medio";
  return "bajo";
}

export function clasificarConfianza(muestra: number, hayComparable: boolean): Confianza {
  if (muestra < MUESTRA_MINIMA_TECNICO) return "limitada";
  if (!hayComparable) return "media";
  return muestra >= 30 ? "alta" : "media";
}

const ORDEN_IMPACTO: Record<Impacto, number> = { alto: 0, medio: 1, bajo: 2 };
const ORDEN_CONFIANZA: Record<Confianza, number> = { alta: 0, media: 1, limitada: 2 };

/**
 * Reglas de priorización TRANSPARENTES (sin score opaco), en este orden:
 * 1. Impacto (materialidad sobre el volumen del período)
 * 2. Deterioro respecto al período comparable
 * 3. Volumen afectado
 * 4. Confianza del dato
 * Riesgo contractual y exposición económica quedan declarados como criterios
 * futuros: hoy no hay datos para evaluarlos.
 */
export const REGLAS_PRIORIZACION: readonly string[] = [
  "Impacto: proporción del volumen del período afectada por el fenómeno.",
  "Deterioro: el fenómeno empeora respecto al período comparable.",
  "Volumen afectado: número de OTs o personas implicadas.",
  "Confianza del dato: tamaño de muestra y existencia de período comparable.",
  "Criterios futuros (sin datos hoy): riesgo contractual y exposición económica.",
];

export function ordenarAsuntos(asuntos: Asunto[]): Asunto[] {
  return [...asuntos].sort(
    (a, b) =>
      ORDEN_IMPACTO[a.impacto] - ORDEN_IMPACTO[b.impacto] ||
      Number(b.deterioro) - Number(a.deterioro) ||
      b.volumen - a.volumen ||
      ORDEN_CONFIANZA[a.confianza] - ORDEN_CONFIANZA[b.confianza] ||
      a.fenomeno.localeCompare(b.fenomeno),
  );
}

/** Un fenómeno = un asunto: gana el de mayor prioridad y fusiona los hechos. */
export function dedupAsuntos(asuntos: Asunto[]): Asunto[] {
  const orden = ordenarAsuntos(asuntos);
  const out = new Map<string, Asunto>();
  for (const a of orden) {
    const prev = out.get(a.fenomeno);
    if (!prev) {
      out.set(a.fenomeno, a);
      continue;
    }
    if (!prev.hecho.includes(a.hecho)) {
      out.set(a.fenomeno, { ...prev, hecho: `${prev.hecho} ${a.hecho}` });
    }
  }
  return ordenarAsuntos([...out.values()]);
}

export type EtapaResumen = {
  categoria: CategoriaEtapa;
  n: number;
  n30: number;
  edadMedia: number | null;
};

export type AsuntosInput = {
  /** Universo del período: OTs entrantes + backlog inicial (denominador de impacto). */
  universo: number;
  hayComparable: boolean;
  balance: Balance;
  abiertas: number;
  abiertas30: number;
  referencia20: number | null;
  referencia20Prev: number | null;
  ratioBajas: number | null;
  ratioBajasPrev: number | null;
  etapas: EtapaResumen[];
  caidas: Array<{ tecnico: string; n_now: number; n_prev: number }>;
  calidadTec: Array<{
    tecnico: string; n: number;
    pct_bajas: number; pct_bajas_esp: number;
    pct_nff: number; pct_nff_esp: number;
  }>;
  provincias: Array<{ provincia: string; abiertas_30: number }>;
  conclusiones: Conclusion[];
  /**
   * F4B · Cifra AUTORITATIVA de OTs en espera de repuesto, tal cual la devuelve
   * `ops_supply.pte_piezas_actual`. Cuando está presente manda sobre la etapa
   * derivada de `etapas`: Panorama y Repuestos NO pueden dar cifras distintas.
   * `asOf` es la fecha efectiva contra la que está medida la antigüedad.
   */
  /**
   * F4B · Única fuente del asunto `espera_repuesto`: `ops_supply.pte_piezas_actual`.
   * Sin este bloque el asunto no se publica.
   */
  supplyPte?: {
    n: number;
    n30: number;
    edad_media: number | null;
    n_prev?: number | null;
    asOf?: string | null;
    topClientes?: ReadonlyArray<{ cliente: string; n: number }>;
    /** Clientes del top con regla contractual que excluye demora por repuesto. */
    exposicionRegistry?: readonly string[];
  } | null;

};

/** Fuente declarada de la cifra de espera de repuesto mostrada en el asunto. */
export type FuenteEsperaRepuesto = "ops_supply" | "etapa_derivada";


/**
 * Fusiona alertas automáticas, conclusiones operativas y hallazgos en UNA cola
 * priorizada de máximo 6 asuntos. Cada HECHO se construye con las mismas cifras
 * que devuelven las RPCs: nunca se recalcula ni se redondea de forma distinta.
 */
export function construirAsuntos(i: AsuntosInput): Asunto[] {
  const cand: Asunto[] = [];
  const univ = Math.max(1, i.universo);

  // 1. Referencia operativa ≤20d por debajo del rango o deteriorándose.
  if (i.referencia20 != null) {
    const cae =
      i.referencia20Prev != null && i.referencia20 < i.referencia20Prev - UMBRAL_CAIDA_SLA_PP;
    if (i.referencia20 < UMBRAL_REFERENCIA_20 || cae) {
      cand.push({
        fenomeno: "referencia_operativa_20d",
        titulo: "Resolución ≤20 días por debajo de la referencia operativa",
        hecho: `Resolución ≤20d en ${pct1(i.referencia20)}${
          i.referencia20Prev != null ? ` frente a ${pct1(i.referencia20Prev)} en el período comparado` : ""
        }.`,
        hipotesis:
          "Puede responder a mix de trabajo más complejo, dependencia de repuestos o capacidad insuficiente en el período.",
        accion: "Revisar el flujo por etapa y el envejecimiento antes de atribuir el retraso a equipos concretos.",
        impacto: clasificarImpacto(i.balance.reparadas + i.balance.bajas, univ),
        confianza: clasificarConfianza(i.balance.reparadas + i.balance.bajas, i.hayComparable),
        deterioro: cae,
        volumen: i.balance.reparadas + i.balance.bajas,
        destino: "/operaciones/sla",
        destinoLabel: "Ver SLA y envejecimiento",
      });
    }
  }

  // 2. Backlog envejecido por encima del umbral.
  if (i.abiertas > 0 && i.abiertas30 / i.abiertas > UMBRAL_BACKLOG_30) {
    cand.push({
      fenomeno: "backlog_envejecido",
      titulo: "Más del 25% del backlog abierto supera 30 días",
      hecho: `${num(i.abiertas30)} de ${num(i.abiertas)} OTs abiertas (${pct1(i.abiertas30 / i.abiertas)}) superan los 30 días.`,
      hipotesis: "Acumulación sostenida en etapas con dependencia externa o falta de priorización del tramo antiguo.",
      accion: "Desbloquear primero el tramo 31-45 días antes de que migre a envejecimiento crítico.",
      impacto: clasificarImpacto(i.abiertas30, univ),
      confianza: clasificarConfianza(i.abiertas30, i.hayComparable),
      deterioro: true,
      volumen: i.abiertas30,
      destino: "/operaciones/sla",
      destinoLabel: "Ver envejecimiento",
    });
  }

  // 3. Concentración en espera de repuesto (conector Service ↔ Supply).
  //    F4B: ÚNICA FUENTE DE VERDAD = ops_supply.pte_piezas_actual. Si Supply no
  //    llega, el asunto no se publica: no se calcula en paralelo desde etapas.
  const rep = i.supplyPte;
  const fuenteRep: FuenteEsperaRepuesto = "ops_supply";
  if (rep && i.abiertas > 0 && rep.n / i.abiertas >= UMBRAL_SHARE_REPUESTO) {
    const fecha = rep.asOf ? ` a ${fmtFechaEs(rep.asOf)}` : "";
    const tendencia =
      i.hayComparable && rep.n_prev != null
        ? ` Tendencia frente al período comparable: ${num(rep.n_prev)} → ${num(rep.n)} OTs.`
        : " Sin período comparable: no se declara tendencia.";
    const top = (rep.topClientes ?? []).slice(0, 3);
    const topTxt = top.length
      ? ` Concentración por cliente contractual: ${top.map((t) => `${t.cliente} (${num(t.n)})`).join(", ")}.`
      : "";
    const exposicion = (rep.exposicionRegistry ?? []).slice(0, 2);
    const expoTxt = exposicion.length
      ? ` Potencial exposición contractual asociada: ${exposicion.join(", ")} (regla en borrador).`
      : "";
    cand.push({
      fenomeno: "espera_repuesto",
      titulo: "Volumen relevante de OTs en espera de repuesto",
      hecho: `${num(rep.n)} OTs abiertas (${pct1(rep.n / i.abiertas)}) están en "${LABEL_CATEGORIA.esperando_repuesto}"${fecha}; ${num(rep.n30)} superan 30 días${
        rep.edad_media != null
          ? ` y la antigüedad media as-of es de ${rep.edad_media.toFixed(1).replace(".", ",")} días (proxy: antigüedad de OT, no tiempo esperando pieza)`
          : ""
      }. Fuente: ops_supply.pte_piezas_actual.${tendencia}${topTxt}${expoTxt}`,
      hipotesis:
        "Concentración observada en la etapa de espera de repuesto. Sin trazabilidad de la solicitud no se puede afirmar que el suministro sea la causa del retraso: es un potencial efecto por confirmar.",
      accion: "Revisar en Repuestos el desglose por cliente contractual y antigüedad antes de decidir sobre capacidad o proveedor.",
      impacto: clasificarImpacto(rep.n, univ),
      confianza: clasificarConfianza(rep.n, i.hayComparable),
      deterioro: rep.n_prev != null && rep.n > rep.n_prev,
      volumen: rep.n,
      destino: "/operaciones/repuestos#esperando-pieza",
      destinoLabel: "Ver repuestos y stock",
    });
  }



  // 4. Ratio de bajas creciendo (salida que no repara).
  if (i.ratioBajas != null && i.ratioBajasPrev != null && i.ratioBajas > i.ratioBajasPrev + UMBRAL_SUBIDA_BAJAS_PP) {
    cand.push({
      fenomeno: "ratio_bajas",
      titulo: "El peso de las bajas sobre la salida crece",
      hecho: `Ratio de bajas ${pct1(i.ratioBajasPrev)} → ${pct1(i.ratioBajas)} (${num(i.balance.bajas)} bajas en el período).`,
      hipotesis: "Puede deberse a mix de producto más antiguo o a criterios de irreparabilidad distintos por equipo.",
      accion: "Contrastar contra el benchmark de familia y cliente antes de interpretarlo como calidad de reparación.",
      impacto: clasificarImpacto(i.balance.bajas, univ),
      confianza: clasificarConfianza(i.balance.bajas, i.hayComparable),
      deterioro: true,
      volumen: i.balance.bajas,
      destino: "/operaciones/delegaciones",
      destinoLabel: "Ver delegaciones",
    });
  }

  // 5. Técnicos: calidad fuera de benchmark y caída de cierres son el MISMO
  //    fenómeno cuando afectan a la misma persona (se deduplican por clave).
  for (const c of i.calidadTec.slice(0, 3)) {
    cand.push({
      fenomeno: `tecnico:${c.tecnico}`,
      titulo: `${c.tecnico}: calidad fuera del rango esperado de su mix`,
      hecho: `Bajas ${pct1(c.pct_bajas)} (esperado ${pct1(c.pct_bajas_esp)}) y NFF ${pct1(c.pct_nff)} (esperado ${pct1(c.pct_nff_esp)}) sobre ${num(c.n)} cierres.`,
      hipotesis: "Puede reflejar mix de producto más severo, criterio distinto de baja o un problema real de diagnóstico.",
      accion: "Revisar su mix familia×cliente y las causas externas antes de cualquier decisión sobre la persona.",
      impacto: clasificarImpacto(c.n, univ),
      confianza: clasificarConfianza(c.n, i.hayComparable),
      deterioro: false,
      volumen: c.n,
      destino: "/operaciones/tecnicos",
      destinoLabel: "Ver scorecard de técnicos",
    });
  }
  for (const c of i.caidas.slice(0, 3)) {
    const caida = c.n_prev > 0 ? 1 - c.n_now / c.n_prev : null;
    cand.push({
      fenomeno: `tecnico:${c.tecnico}`,
      titulo: `${c.tecnico}: caída relevante de cierres`,
      hecho: `Cierres ${num(c.n_prev)} → ${num(c.n_now)}${caida != null ? ` (${pct1(caida)} menos)` : ""}.`,
      hipotesis: "Puede deberse a ausencias, cambio de territorio o reasignación de carga, no necesariamente a rendimiento.",
      accion: "Verificar carga asignada, ausencias y territorio antes de cualquier conclusión sobre la persona.",
      impacto: clasificarImpacto(c.n_prev, univ),
      confianza: clasificarConfianza(c.n_prev, i.hayComparable),
      deterioro: true,
      volumen: c.n_prev,
      destino: "/operaciones/tecnicos",
      destinoLabel: "Ver scorecard de técnicos",
    });
  }

  // 6. Provincia que concentra envejecimiento.
  const prov = [...i.provincias].sort((a, b) => b.abiertas_30 - a.abiertas_30)[0];
  if (prov && prov.abiertas_30 > 0) {
    cand.push({
      fenomeno: `provincia:${prov.provincia}`,
      titulo: `${prov.provincia} concentra backlog envejecido`,
      hecho: `${num(prov.abiertas_30)} OTs abiertas de más de 30 días en ${prov.provincia}.`,
      hipotesis: "Posible desajuste entre cobertura disponible y demanda en la provincia.",
      accion: "Contrastar con la dispersión geográfica y la cobertura de red antes de reforzar capacidad.",
      impacto: clasificarImpacto(prov.abiertas_30, univ),
      confianza: clasificarConfianza(prov.abiertas_30, i.hayComparable),
      deterioro: false,
      volumen: prov.abiertas_30,
      destino: "/operaciones/dispersion",
      destinoLabel: "Ver dispersión territorial",
    });
  }

  // 7. Conclusiones operativas del motor existente que no correspondan a un
  //    fenómeno ya cubierto: entran como asuntos de menor prioridad.
  for (const c of i.conclusiones) {
    cand.push({
      fenomeno: `conclusion:${c.ambito}`,
      titulo: c.ambito,
      hecho: c.texto,
      hipotesis:
        c.tipo === "hipotesis"
          ? "Lectura no confirmada: requiere contraste con carga, territorio y causas externas."
          : "Sin hipótesis adicional: es un hecho descriptivo del período.",
      accion: "Abrir el módulo correspondiente para validar el detalle antes de decidir.",
      impacto: "bajo",
      confianza: c.tipo === "hecho" ? "media" : "limitada",
      deterioro: false,
      volumen: 0,
      destino: "/operaciones/delegaciones",
      destinoLabel: "Ver detalle",
    });
  }

  return dedupAsuntos(cand).slice(0, MAX_ASUNTOS);
}

// ─── Etapas actuales (adaptador desde el payload de ops_panorama) ────────────
export type EtapaSqlPanorama = { estado: string; n: number; edad_media: number | null; n30: number };

export function agruparEtapasPanorama(rows: EtapaSqlPanorama[]): EtapaResumen[] {
  const map = new Map<CategoriaEtapa, EtapaResumen & { _peso: number }>();
  for (const r of rows) {
    const cat = categoriaDeEstado(r.estado);
    const cur = map.get(cat) ?? { categoria: cat, n: 0, n30: 0, edadMedia: null, _peso: 0 };
    cur.n += r.n;
    cur.n30 += r.n30;
    if (r.edad_media != null) cur._peso += r.edad_media * r.n;
    map.set(cat, cur);
  }
  return [...map.values()]
    .map((c) => ({ categoria: c.categoria, n: c.n, n30: c.n30, edadMedia: c.n > 0 && c._peso > 0 ? c._peso / c.n : null }))
    .sort((a, b) => b.n - a.n);
}
