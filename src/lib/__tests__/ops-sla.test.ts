import { describe, it, expect } from "vitest";
import {
  bucketDeEdad,
  categoriaDeEstado,
  ETAPAS_EXTERNAS_TECNICO,
  agregarEtapas,
  mesesCrecimientoConsecutivo,
  tendenciaSerie,
  resumenBacklogTecnico,
  tendenciaCliente,
  detectarAlertasSla,
  validarCalidadDatosSla,
  compararSlaDashboard,
  generarHallazgosSla,
  DELTA_SLA_DETERIORO,
  TOLERANCIA_SLA_DASHBOARD,
  type EtapaSql,
} from "../ops-sla";

// ─── Buckets ──────────────────────────────────────────────────────────────────
describe("bucketDeEdad", () => {
  it("asigna los límites correctos en cada tramo", () => {
    expect(bucketDeEdad(0)).toBe("0-5");
    expect(bucketDeEdad(5)).toBe("0-5");
    expect(bucketDeEdad(6)).toBe("6-10");
    expect(bucketDeEdad(10)).toBe("6-10");
    expect(bucketDeEdad(11)).toBe("11-20");
    expect(bucketDeEdad(20)).toBe("11-20");
    expect(bucketDeEdad(21)).toBe("21-30");
    expect(bucketDeEdad(30)).toBe("21-30");
    expect(bucketDeEdad(31)).toBe("31-45");
    expect(bucketDeEdad(45)).toBe("31-45");
    expect(bucketDeEdad(46)).toBe("46-60");
    expect(bucketDeEdad(60)).toBe("46-60");
    expect(bucketDeEdad(61)).toBe(">60");
    expect(bucketDeEdad(400)).toBe(">60");
  });
  it("clampea antigüedades negativas al primer bucket (se reportan en calidad)", () => {
    expect(bucketDeEdad(-3)).toBe("0-5");
  });
});

// ─── Mapeo de etapas ──────────────────────────────────────────────────────────
describe("categoriaDeEstado", () => {
  it("mapea los literales conocidos", () => {
    expect(categoriaDeEstado("PTE. REPARAR")).toBe("pendiente_reparacion");
    expect(categoriaDeEstado("AVISADO A SAT")).toBe("en_red_sat");
    expect(categoriaDeEstado("PTE. ASIGNAR SAT")).toBe("en_red_sat");
    expect(categoriaDeEstado("PTE. PIEZAS")).toBe("esperando_repuesto");
    expect(categoriaDeEstado("PENDIENTE DATOS")).toBe("esperando_cliente_datos");
    expect(categoriaDeEstado("PRESUPUESTO TRAMITADO")).toBe("esperando_aprobacion");
    expect(categoriaDeEstado("SOLICITUD BAJA")).toBe("baja_en_tramite");
    expect(categoriaDeEstado("TRAMITANDO BAJA")).toBe("baja_en_tramite");
    expect(categoriaDeEstado("CONFIRMADO AVISO")).toBe("confirmado_pendiente");
  });
  it("normaliza espacios y minúsculas", () => {
    expect(categoriaDeEstado("  pte. piezas ")).toBe("esperando_repuesto");
    expect(categoriaDeEstado("avisado a sat")).toBe("en_red_sat");
  });
  it("devuelve otros para desconocidos, nulos o sin estado", () => {
    expect(categoriaDeEstado(null)).toBe("otros");
    expect(categoriaDeEstado("")).toBe("otros");
    expect(categoriaDeEstado("   ")).toBe("otros");
    expect(categoriaDeEstado("(sin estado)")).toBe("otros");
    expect(categoriaDeEstado("ESTADO RARO")).toBe("otros");
  });
});

describe("ETAPAS_EXTERNAS_TECNICO", () => {
  it("contiene las etapas ajenas al técnico y no las propias", () => {
    expect(ETAPAS_EXTERNAS_TECNICO.has("esperando_repuesto")).toBe(true);
    expect(ETAPAS_EXTERNAS_TECNICO.has("en_red_sat")).toBe(true);
    expect(ETAPAS_EXTERNAS_TECNICO.has("esperando_cliente_datos")).toBe(true);
    expect(ETAPAS_EXTERNAS_TECNICO.has("esperando_aprobacion")).toBe(true);
    expect(ETAPAS_EXTERNAS_TECNICO.has("pendiente_reparacion")).toBe(false);
    expect(ETAPAS_EXTERNAS_TECNICO.has("baja_en_tramite")).toBe(false);
  });
});

// ─── Agregación de etapas ─────────────────────────────────────────────────────
describe("agregarEtapas", () => {
  it("agrupa literales en categorías con media ponderada y orden por volumen", () => {
    const rows: EtapaSql[] = [
      { estado: "AVISADO A SAT", n: 100, edad_media: 30, n30: 40, n60: 5 },
      { estado: "PTE. ASIGNAR SAT", n: 100, edad_media: 10, n30: 10, n60: 0 },
      { estado: "PTE. PIEZAS", n: 50, edad_media: 60, n30: 45, n60: 20 },
    ];
    const res = agregarEtapas(rows);
    const sat = res.find((r) => r.categoria === "en_red_sat")!;
    expect(sat.n).toBe(200);
    expect(sat.n30).toBe(50);
    expect(sat.n60).toBe(5);
    expect(sat.edadMedia).toBeCloseTo(20);
    expect(sat.estados.map((e) => e.literal).sort()).toEqual(["AVISADO A SAT", "PTE. ASIGNAR SAT"]);
    expect(res[0].categoria).toBe("en_red_sat"); // ordenado por n desc
  });
  it("media nula cuando todas las edades son nulas", () => {
    const res = agregarEtapas([{ estado: "PTE. PIEZAS", n: 3, edad_media: null, n30: 0, n60: 0 }]);
    expect(res[0].edadMedia).toBeNull();
  });
});

// ─── Series y tendencias ──────────────────────────────────────────────────────
describe("mesesCrecimientoConsecutivo", () => {
  it("cuenta el tramo final de crecimientos", () => {
    expect(mesesCrecimientoConsecutivo([10, 11, 12, 13])).toBe(3);
    expect(mesesCrecimientoConsecutivo([10, 12, 11, 12])).toBe(1);
    expect(mesesCrecimientoConsecutivo([10, 10, 9])).toBe(0);
  });
  it("se detiene en nulos", () => {
    expect(mesesCrecimientoConsecutivo([5, 6, null, 8])).toBe(0);
    expect(mesesCrecimientoConsecutivo([5, 6, 7, null])).toBe(0);
  });
});

describe("tendenciaSerie", () => {
  it("detecta crecimiento, mejora, estabilidad y ausencia de datos", () => {
    expect(tendenciaSerie([10, 11, 12])).toBe("creciendo");
    expect(tendenciaSerie([12, 11, 10])).toBe("mejorando");
    expect(tendenciaSerie([10, 12, 11])).toBe("estable");
    expect(tendenciaSerie([10])).toBe("sin_datos");
    expect(tendenciaSerie([null, null])).toBe("sin_datos");
  });
});

// ─── Vista técnicos ───────────────────────────────────────────────────────────
describe("resumenBacklogTecnico", () => {
  it("detecta mayoría de envejecidas en etapas ajenas y emite la nota literal", () => {
    const r = resumenBacklogTecnico("TEC1", [
      { tecnico: "TEC1", estado: "PTE. PIEZAS", n: 10, n30: 6 },
      { tecnico: "TEC1", estado: "PTE. REPARAR", n: 8, n30: 2 },
      { tecnico: "OTRO", estado: "PTE. PIEZAS", n: 99, n30: 99 },
    ]);
    expect(r.n30).toBe(8);
    expect(r.n30Externas).toBe(6);
    expect(r.pctExternas).toBeCloseTo(0.75);
    expect(r.mayoriaExterna).toBe(true);
    expect(r.nota).toBe("El retraso se concentra en etapas ajenas al técnico.");
  });
  it("sin envejecidas no hay nota ni ratio", () => {
    const r = resumenBacklogTecnico("TEC1", [{ tecnico: "TEC1", estado: "PTE. REPARAR", n: 3, n30: 0 }]);
    expect(r.n30).toBe(0);
    expect(r.pctExternas).toBeNull();
    expect(r.mayoriaExterna).toBe(false);
    expect(r.nota).toBeNull();
  });
});

// ─── Tendencia de cliente ─────────────────────────────────────────────────────
describe("tendenciaCliente", () => {
  const base = { cerradas: 100, cerradas_prev: 100, pct_sla20: 0.7, sla_prev: 0.7 };
  it("marca deteriorando/mejorando por Δ SLA superior a 2pp", () => {
    expect(tendenciaCliente({ ...base, pct_sla20: 0.6 })).toBe("deteriorando");
    expect(tendenciaCliente({ ...base, pct_sla20: 0.8 })).toBe("mejorando");
    expect(tendenciaCliente({ ...base, pct_sla20: 0.7 - DELTA_SLA_DETERIORO / 2 })).toBe("estable");
  });
  it("exige muestra suficiente en al menos un período", () => {
    expect(tendenciaCliente({ cerradas: 5, cerradas_prev: 5, pct_sla20: 0.3, sla_prev: 0.9 })).toBe("muestra_insuficiente");
    expect(tendenciaCliente({ cerradas: 5, cerradas_prev: 100, pct_sla20: 0.3, sla_prev: 0.9 })).toBe("deteriorando");
  });
  it("sin SLA disponible en ambos períodos es estable", () => {
    expect(tendenciaCliente({ ...base, pct_sla20: null })).toBe("estable");
  });
});

// ─── Alertas ──────────────────────────────────────────────────────────────────
describe("detectarAlertasSla", () => {
  const base = {
    abiertas: 100, n30: 10, evoDeleg: [] as { delegacion: string; serieEdad: Array<number | null> }[],
    slaAct: 0.7, slaPrev: 0.7, creadasAct: 100, creadasPrev: 100,
    evoTec: [] as { tecnico: string; serie: Array<number | null> }[], pctRepuestoEn30: 0.1,
  };
  it("🔴 cuando >25% de abiertas supera 30d", () => {
    const a = detectarAlertasSla({ ...base, n30: 30 });
    const al = a.find((x) => x.clave === "backlog_30");
    expect(al).toBeTruthy();
    expect(al!.nivel).toBe("critico");
    expect(al!.evidencia).toContain("30 de 100");
  });
  it("no dispara backlog_30 en el umbral exacto", () => {
    expect(detectarAlertasSla({ ...base, n30: 25 }).some((x) => x.clave === "backlog_30")).toBe(false);
  });
  it("🔴 delegación real con antigüedad media creciendo 3 meses consecutivos", () => {
    const a = detectarAlertasSla({ ...base, evoDeleg: [{ delegacion: "Valencia", serieEdad: [20, 21, 22, 23] }] });
    const al = a.find((x) => x.clave === "deleg_edad_creciente");
    expect(al).toBeTruthy();
    expect(al!.nivel).toBe("critico");
    expect(al!.titulo).toContain("Valencia");
  });
  it("ignora entidades que no son delegaciones reales (equipos por gama)", () => {
    const a = detectarAlertasSla({ ...base, evoDeleg: [{ delegacion: "Gama PAE", serieEdad: [20, 21, 22, 23] }] });
    expect(a.some((x) => x.clave === "deleg_edad_creciente")).toBe(false);
  });
  it("🟡 SLA deteriorándose con menor carga entrante", () => {
    const a = detectarAlertasSla({ ...base, slaAct: 0.6, slaPrev: 0.7, creadasAct: 80, creadasPrev: 100 });
    expect(a.some((x) => x.clave === "sla_deterioro_menor_carga")).toBe(true);
  });
  it("no dispara deterioro si la carga entrante sube o el SLA aguanta", () => {
    expect(detectarAlertasSla({ ...base, slaAct: 0.6, slaPrev: 0.7, creadasAct: 120, creadasPrev: 100 }).some((x) => x.clave === "sla_deterioro_menor_carga")).toBe(false);
    expect(detectarAlertasSla({ ...base, slaAct: 0.69, slaPrev: 0.7, creadasAct: 80, creadasPrev: 100 }).some((x) => x.clave === "sla_deterioro_menor_carga")).toBe(false);
  });
  it("🟡 backlog de técnico creciendo (con volumen mínimo)", () => {
    const a = detectarAlertasSla({ ...base, evoTec: [{ tecnico: "TEC1", serie: [3, 4, 5, 6] }] });
    expect(a.some((x) => x.clave === "tecnico_backlog_creciente")).toBe(true);
    // volumen insuficiente no alerta
    expect(detectarAlertasSla({ ...base, evoTec: [{ tecnico: "TEC2", serie: [0, 1, 2, 3] }] }).some((x) => x.clave === "tecnico_backlog_creciente")).toBe(false);
  });
  it("🟡 proporción de repuesto alta entre +30d, con nota de tendencia no computable", () => {
    const al = detectarAlertasSla({ ...base, pctRepuestoEn30: 0.35 }).find((x) => x.clave === "repuesto_share_30");
    expect(al).toBeTruthy();
    expect(al!.nivel).toBe("atencion");
    expect(al!.evidencia).toContain("tendencia no es computable");
  });
});

// ─── Calidad de datos ─────────────────────────────────────────────────────────
describe("validarCalidadDatosSla", () => {
  const limpio = { sin_estado: 0, edad_negativa: 0, cierre_prev_apertura: 0, propios_sin_delegacion: 0, propios_sin_tecnico: 0, red_sat_sin_delegacion: 0, duplicados_abiertas: 0 };
  it("sin problemas → sin avisos", () => {
    expect(validarCalidadDatosSla(limpio)).toHaveLength(0);
  });
  it("detecta antigüedad negativa y cierre previo a apertura", () => {
    const avisos = validarCalidadDatosSla({ ...limpio, edad_negativa: 2, cierre_prev_apertura: 11 });
    expect(avisos.some((a) => a.tipo === "antiguedad_negativa" && a.severidad === "error")).toBe(true);
    expect(avisos.some((a) => a.tipo === "cierre_previo_apertura")).toBe(true);
  });
  it("red SAT sin delegación es informativo, no error", () => {
    const avisos = validarCalidadDatosSla({ ...limpio, red_sat_sin_delegacion: 1500 });
    expect(avisos).toHaveLength(1);
    expect(avisos[0].severidad).toBe("info");
    expect(avisos[0].mensaje).toContain("Red SAT externa");
  });
  it("propio sin delegación o sin técnico sí es error", () => {
    const avisos = validarCalidadDatosSla({ ...limpio, propios_sin_delegacion: 3, propios_sin_tecnico: 1 });
    expect(avisos.filter((a) => a.severidad === "error")).toHaveLength(2);
  });
});

// ─── Consistencia con el dashboard ────────────────────────────────────────────
describe("compararSlaDashboard", () => {
  it("dentro de la tolerancia no avisa", () => {
    expect(compararSlaDashboard(0.700, 0.700 + TOLERANCIA_SLA_DASHBOARD)).toBeNull();
    expect(compararSlaDashboard(0.700, 0.704)).toBeNull();
  });
  it("fuera de la tolerancia avisa; datos ausentes no avisan", () => {
    expect(compararSlaDashboard(0.70, 0.75)).not.toBeNull();
    expect(compararSlaDashboard(null, 0.75)).toBeNull();
    expect(compararSlaDashboard(0.70, null)).toBeNull();
  });
});

// ─── Hallazgos ────────────────────────────────────────────────────────────────
describe("generarHallazgosSla", () => {
  it("máximo 5 y el primero usa el formato de etapa actual", () => {
    const res = generarHallazgosSla({
      abiertas: 1000, n30: 300, n60: 50,
      delegaciones: [{ delegacion: "Las Palmas", n30: 60, etapaDominante: "PTE. PIEZAS" }],
      categorias: agregarEtapas([
        { estado: "PTE. PIEZAS", n: 200, edad_media: 63, n30: 186, n60: 40 },
        { estado: "AVISADO A SAT", n: 500, edad_media: 36, n30: 80, n60: 10 },
      ]),
      marcaTop30: { marca: "BOSCH", n30: 90 },
      clienteTop30: { cliente: "MEDIA MARKT", n30: 25, diasMasAntigua: 180 },
      tecnicosCreciendo: [{ tecnico: "JUAN PEREZ", ultimoValor: 12 }],
    });
    expect(res.length).toBeLessThanOrEqual(5);
    expect(res[0].hecho).toContain("actualmente en");
    expect(res[0].hecho).toContain("Esperando repuesto");
    expect(res[0].hipotesis).toContain("BOSCH");
    expect(res.some((h) => h.hecho.includes("Las Palmas concentra"))).toBe(true);
    expect(res.some((h) => h.hecho.includes("MEDIA MARKT"))).toBe(true);
    for (const h of res) {
      expect(h.hecho.length).toBeGreaterThan(0);
      expect(h.accion.length).toBeGreaterThan(0);
      expect(h.hipotesis.length).toBeGreaterThan(0);
    }
  });
  it("sin envejecidas no genera hallazgos de concentración", () => {
    const res = generarHallazgosSla({
      abiertas: 100, n30: 0, n60: 0,
      delegaciones: [], categorias: [], marcaTop30: null, clienteTop30: null, tecnicosCreciendo: [],
    });
    expect(res).toHaveLength(0);
  });
});
