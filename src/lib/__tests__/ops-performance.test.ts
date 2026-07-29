import { describe, it, expect } from "vitest";
import {
  variacion,
  ratioBajas,
  prevPeriod,
  isNaturalMonth,
  estadoDelegacion,
  estadoTecnico,
  mediana,
  indicadorProvisionalIncentivo,
  percentil,
  estadoProduccion,
  estadoCalidad,
  estadoSLA,
  estadoGlobalTecnico,
  elegibilidadIncentivo,
  generarHallazgosTecnicos,
  validarCalidadDatosTecnicos,
  prioridadAtencion,
} from "../ops-performance";


describe("variacion", () => {
  it("calcula abs y pct correctamente", () => {
    expect(variacion(120, 100)).toEqual({ abs: 20, pct: 0.2 });
  });
  it("devuelve pct=null si previo=0 (evita división por cero)", () => {
    expect(variacion(10, 0)).toEqual({ abs: 10, pct: null });
  });
  it("devuelve todo null si actual o previo son null", () => {
    expect(variacion(null, 10)).toEqual({ abs: null, pct: null });
    expect(variacion(10, null)).toEqual({ abs: null, pct: null });
  });
  it("acepta variación negativa", () => {
    expect(variacion(80, 100)).toEqual({ abs: -20, pct: -0.2 });
  });
});

describe("ratioBajas", () => {
  it("devuelve bajas/cerradas", () => {
    expect(ratioBajas(20, 100)).toBe(0.2);
  });
  it("devuelve null si cerradas=0", () => {
    expect(ratioBajas(5, 0)).toBeNull();
  });
  it("devuelve null si cerradas es null", () => {
    expect(ratioBajas(5, null)).toBeNull();
  });
  it("trata bajas null como 0", () => {
    expect(ratioBajas(null, 100)).toBe(0);
  });
});

describe("prevPeriod", () => {
  it("mes natural → mes natural anterior", () => {
    expect(prevPeriod("2026-06-01", "2026-06-30")).toEqual({ from: "2026-05-01", to: "2026-05-31" });
  });
  it("mes natural en enero → diciembre año anterior", () => {
    expect(prevPeriod("2026-01-01", "2026-01-31")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("rango arbitrario → mismos días inmediatamente anteriores", () => {
    // 10 días: 10→19 de abril → prev 31 mar → 9 abr
    expect(prevPeriod("2026-04-10", "2026-04-19")).toEqual({ from: "2026-03-31", to: "2026-04-09" });
  });
  it("febrero bisiesto detectado como mes natural", () => {
    expect(isNaturalMonth("2024-02-01", "2024-02-29")).toBe(true);
    expect(prevPeriod("2024-02-01", "2024-02-29")).toEqual({ from: "2024-01-01", to: "2024-01-31" });
  });
});

describe("estadoDelegacion", () => {
  const media = 0.2; // media compañía 20%

  it("🔴 crítico cuando cae producción, empeora ratio y supera 1,5× media", () => {
    const res = estadoDelegacion(
      { delegacion: "X", cerradas: 80, pct_bajas: 0.4 },
      { delegacion: "X", cerradas: 100, pct_bajas: 0.3 },
      media,
    );
    expect(res.estado).toBe("critico");
    expect(res.razones.length).toBeGreaterThan(0);
  });
  it("🟡 atención por caída >15% aunque el ratio sea sano", () => {
    const res = estadoDelegacion(
      { delegacion: "X", cerradas: 80, pct_bajas: 0.18 },
      { delegacion: "X", cerradas: 100, pct_bajas: 0.18 },
      media,
    );
    expect(res.estado).toBe("atencion");
  });
  it("🟡 atención por ratio > 1,25× media", () => {
    const res = estadoDelegacion(
      { delegacion: "X", cerradas: 100, pct_bajas: 0.3 },
      { delegacion: "X", cerradas: 100, pct_bajas: 0.28 },
      media,
    );
    expect(res.estado).toBe("atencion");
  });
  it("🟢 ok en régimen normal", () => {
    const res = estadoDelegacion(
      { delegacion: "X", cerradas: 105, pct_bajas: 0.18 },
      { delegacion: "X", cerradas: 100, pct_bajas: 0.19 },
      media,
    );
    expect(res.estado).toBe("ok");
  });
  it("sin previo → no puede cumplir la regla crítica", () => {
    const res = estadoDelegacion(
      { delegacion: "X", cerradas: 100, pct_bajas: 0.4 },
      null,
      media,
    );
    expect(res.estado).not.toBe("critico");
  });
});

describe("estadoTecnico", () => {
  it("sin_contexto si cerradas < 10", () => {
    const res = estadoTecnico(
      { tecnico: "A", delegacion: "D", cerradas: 5, pct_bajas: 0.5, pct_bajas_esp: 0.2 },
      null,
    );
    expect(res.estado).toBe("sin_contexto");
  });
  it("🔴 crítico: bajas > 1,5× esperado y cae producción > 15%", () => {
    const res = estadoTecnico(
      { tecnico: "A", delegacion: "D", cerradas: 40, pct_bajas: 0.4, pct_bajas_esp: 0.2 },
      { tecnico: "A", delegacion: "D", cerradas: 50, pct_bajas: 0.35, pct_bajas_esp: 0.2 },
    );
    expect(res.estado).toBe("critico");
  });
  it("🟡 atención: bajas > 1,25× esperado sin caída de producción", () => {
    const res = estadoTecnico(
      { tecnico: "A", delegacion: "D", cerradas: 50, pct_bajas: 0.28, pct_bajas_esp: 0.2 },
      { tecnico: "A", delegacion: "D", cerradas: 50, pct_bajas: 0.27, pct_bajas_esp: 0.2 },
    );
    expect(res.estado).toBe("atencion");
  });
  it("🟡 atención: volumen a costa de calidad", () => {
    const res = estadoTecnico(
      { tecnico: "A", delegacion: "D", cerradas: 80, pct_bajas: 0.24, pct_bajas_esp: 0.2 },
      { tecnico: "A", delegacion: "D", cerradas: 60, pct_bajas: 0.2, pct_bajas_esp: 0.2 },
    );
    expect(res.estado).toBe("atencion");
  });
  it("🟢 ok cuando todo está en rango", () => {
    const res = estadoTecnico(
      { tecnico: "A", delegacion: "D", cerradas: 55, pct_bajas: 0.19, pct_bajas_esp: 0.2 },
      { tecnico: "A", delegacion: "D", cerradas: 50, pct_bajas: 0.2, pct_bajas_esp: 0.2 },
    );
    expect(res.estado).toBe("ok");
  });
});

describe("mediana + indicadorProvisionalIncentivo", () => {
  it("mediana con longitud impar", () => {
    expect(mediana([1, 3, 5])).toBe(3);
  });
  it("mediana con longitud par", () => {
    expect(mediana([1, 3, 5, 7])).toBe(4);
  });
  it("reconocimiento_potencial solo si estado ok y cerradas >= mediana", () => {
    const ok = { estado: "ok" as const, razones: [] };
    expect(indicadorProvisionalIncentivo(ok, 60, 50)).toBe("reconocimiento_potencial");
    expect(indicadorProvisionalIncentivo(ok, 40, 50)).toBe("revision_estandar");
  });
  it("requiere_validacion si atención/crítico incluso con mucho volumen", () => {
    const at = { estado: "atencion" as const, razones: [] };
    expect(indicadorProvisionalIncentivo(at, 500, 50)).toBe("requiere_validacion");
  });
  it("informacion_insuficiente si sin_contexto", () => {
    const sc = { estado: "sin_contexto" as const, razones: [] };
    expect(indicadorProvisionalIncentivo(sc, 5, 50)).toBe("informacion_insuficiente");
  });
});

// =========================
// Modelo multidimensional
// =========================
describe("percentil", () => {
  it("p50 = mediana", () => {
    expect(percentil([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });
  it("interpola linealmente", () => {
    expect(percentil([10, 20], 0.5)).toBe(15);
  });
});

describe("estadoProduccion", () => {
  it("insuficiente si cerradas < umbral", () => {
    expect(estadoProduccion(5, 5, 20, 60, 10).nivel).toBe("insuficiente");
  });
  it("sobre_benchmark si cerradas ≥ p66", () => {
    expect(estadoProduccion(80, 70, 30, 70, 10).nivel).toBe("sobre_benchmark");
  });
  it("sobre_benchmark también si Δ ≥ +15% aunque esté bajo p66", () => {
    expect(estadoProduccion(50, 40, 30, 70, 10).nivel).toBe("sobre_benchmark");
  });
  it("bajo_benchmark requiere ≤ p33 Y caída ≥15%", () => {
    expect(estadoProduccion(20, 30, 25, 70, 10).nivel).toBe("bajo_benchmark");
    expect(estadoProduccion(20, 22, 25, 70, 10).nivel).toBe("en_linea");
  });
  it("en_linea por defecto", () => {
    expect(estadoProduccion(45, 45, 30, 70, 10).nivel).toBe("en_linea");
  });
});

describe("estadoCalidad", () => {
  it("insuficiente sin muestra", () => {
    expect(estadoCalidad(0.3, 0.2, 0.2, 5, 10).nivel).toBe("insuficiente");
  });
  it("insuficiente sin benchmark", () => {
    expect(estadoCalidad(0.3, null, null, 50, 10).nivel).toBe("insuficiente");
  });
  it("critico si ≥+10pp Y ≥1,5× esperado", () => {
    expect(estadoCalidad(0.35, 0.2, 0.2, 50, 10).nivel).toBe("critico");
  });
  it("atencion si ≥+5pp", () => {
    expect(estadoCalidad(0.27, 0.2, 0.2, 50, 10).nivel).toBe("atencion");
  });
  it("mejor_que_benchmark si ≤−5pp", () => {
    expect(estadoCalidad(0.14, 0.2, 0.2, 50, 10).nivel).toBe("mejor_que_benchmark");
  });
  it("en_linea en el resto", () => {
    expect(estadoCalidad(0.21, 0.2, 0.2, 50, 10).nivel).toBe("en_linea");
  });
});

describe("estadoSLA", () => {
  it("no_disponible sin cifra o sin muestra", () => {
    expect(estadoSLA(null, 50, 10).nivel).toBe("no_disponible");
    expect(estadoSLA(0.9, 5, 10).nivel).toBe("no_disponible");
  });
  it("segmenta 80/60/40", () => {
    expect(estadoSLA(0.85, 50, 10).nivel).toBe("sobre_objetivo");
    expect(estadoSLA(0.7, 50, 10).nivel).toBe("en_linea");
    expect(estadoSLA(0.5, 50, 10).nivel).toBe("atencion");
    expect(estadoSLA(0.3, 50, 10).nivel).toBe("critico");
  });
});

describe("estadoGlobalTecnico", () => {
  const base = {
    cerradas: 50, cerradasPrev: 45,
    pctBajas: 0.2, mediaDelegacion: 0.2, pctBajasEsp: 0.2,
    pctSla20: 0.75, abiertas30: 0,
    p33Grupo: 30, p66Grupo: 70, medianaGrupo: 40, umbralMinimo: 10,
  };

  it("informacion_insuficiente si producción insuficiente", () => {
    const r = estadoGlobalTecnico({ ...base, cerradas: 3 });
    expect(r.nivel).toBe("informacion_insuficiente");
  });
  it("requiere_validacion si hay problemas de datos", () => {
    const r = estadoGlobalTecnico({ ...base, problemasDatos: ["duplicado"] });
    expect(r.nivel).toBe("requiere_validacion");
  });
  it("atencion_requerida por calidad crítica", () => {
    const r = estadoGlobalTecnico({ ...base, pctBajas: 0.35 });
    expect(r.nivel).toBe("atencion_requerida");
  });
  it("atencion_requerida por SLA en atención", () => {
    const r = estadoGlobalTecnico({ ...base, pctSla20: 0.45 });
    expect(r.nivel).toBe("atencion_requerida");
  });
  it("atencion_requerida por backlog +30 ≥ 5", () => {
    const r = estadoGlobalTecnico({ ...base, abiertas30: 8 });
    expect(r.nivel).toBe("atencion_requerida");
  });
  it("reconocimiento_potencial cumple los tres criterios", () => {
    const r = estadoGlobalTecnico({ ...base, cerradas: 80, pctSla20: 0.85, pctBajas: 0.12 });
    expect(r.nivel).toBe("reconocimiento_potencial");
  });
  it("rendimiento_equilibrado por defecto si nada crítico pero < mediana", () => {
    const r = estadoGlobalTecnico({ ...base, cerradas: 25, p33Grupo: 10, p66Grupo: 70, medianaGrupo: 40, umbralMinimo: 10 });
    expect(r.nivel).toBe("rendimiento_equilibrado");
  });
});

describe("elegibilidadIncentivo", () => {
  const mk = (nivel: any) => ({ nivel, produccion: {} as any, calidad: {} as any, sla: {} as any, reglaGlobal: "", observacion: "" });
  it("mapea correctamente los 5 niveles", () => {
    expect(elegibilidadIncentivo(mk("informacion_insuficiente"))).toBe("informacion_insuficiente");
    expect(elegibilidadIncentivo(mk("requiere_validacion"))).toBe("requiere_validacion");
    expect(elegibilidadIncentivo(mk("atencion_requerida"))).toBe("requiere_validacion");
    expect(elegibilidadIncentivo(mk("reconocimiento_potencial"))).toBe("reconocimiento_potencial");
    expect(elegibilidadIncentivo(mk("rendimiento_equilibrado"))).toBe("revision_estandar");
  });
});

describe("generarHallazgosTecnicos", () => {
  const mkEstado = (nivel: any = "rendimiento_equilibrado") => ({
    nivel, produccion: { nivel: "en_linea", regla: "" } as any,
    calidad: { nivel: "en_linea", regla: "" } as any, sla: { nivel: "en_linea", regla: "" } as any,
    reglaGlobal: "", observacion: "",
  });
  it("genera hallazgo por desviación de calidad", () => {
    const h = generarHallazgosTecnicos([{
      tecnico: "A", delegacion: "D", cerradas: 50, cerradasPrev: 50,
      pctBajas: 0.3, mediaDelegacion: 0.2, abiertas30: 0, pctSla20: 0.7, estado: mkEstado(),
    }]);
    expect(h.length).toBe(1);
    expect(h[0].tecnico).toBe("A");
  });
  it("genera hallazgo por caída de producción", () => {
    const h = generarHallazgosTecnicos([{
      tecnico: "A", delegacion: "D", cerradas: 30, cerradasPrev: 60,
      pctBajas: 0.2, mediaDelegacion: 0.2, abiertas30: 0, pctSla20: 0.7, estado: mkEstado(),
    }]);
    expect(h.length).toBe(1);
  });
  it("máximo 5 hallazgos", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      tecnico: `T${i}`, delegacion: "D", cerradas: 30, cerradasPrev: 60,
      pctBajas: 0.35 + i * 0.001, mediaDelegacion: 0.2, abiertas30: 20, pctSla20: 0.5, estado: mkEstado(),
    }));
    expect(generarHallazgosTecnicos(rows).length).toBeLessThanOrEqual(5);
  });
});

describe("validarCalidadDatosTecnicos", () => {
  it("detecta duplicados y multi-delegación", () => {
    const { porTecnico } = validarCalidadDatosTecnicos([
      { tecnico: "A", delegacion: "D1", cerradas: 10, cerradasPrev: 10, pctBajas: 0.1, pctBajasPrev: 0.1, pctSla20: 0.7 },
      { tecnico: "A", delegacion: "D2", cerradas: 5, cerradasPrev: 5, pctBajas: 0.1, pctBajasPrev: 0.1, pctSla20: 0.7 },
    ], new Set());
    const av = porTecnico.get("A") ?? [];
    expect(av.some((x) => x.tipo === "duplicado")).toBe(true);
    expect(av.some((x) => x.tipo === "multi_delegacion")).toBe(true);
  });
  it("detecta bajas > cerradas y sin período anterior", () => {
    const { porTecnico } = validarCalidadDatosTecnicos([
      { tecnico: "B", delegacion: "D", cerradas: 20, cerradasPrev: null, pctBajas: 1.5, pctBajasPrev: null, pctSla20: 0.7 },
    ], new Set());
    const av = porTecnico.get("B") ?? [];
    expect(av.some((x) => x.tipo === "bajas_mayor_cerradas")).toBe(true);
    expect(av.some((x) => x.tipo === "sin_periodo_anterior")).toBe(true);
  });
  it("detecta inconsistencia con alertas del dashboard", () => {
    const { porTecnico } = validarCalidadDatosTecnicos([
      { tecnico: "C", delegacion: "D", cerradas: 100, cerradasPrev: 100, pctBajas: 0.1, pctBajasPrev: 0.1, pctSla20: 0.7 },
    ], new Set(["C"]));
    expect(porTecnico.get("C")?.some((x) => x.tipo === "inconsistencia_alertas")).toBe(true);
  });
});

describe("prioridadAtencion", () => {
  const mk = (nivel: any, calidad: any = "en_linea", sla: any = "en_linea") => ({
    nivel, produccion: {} as any, calidad: { nivel: calidad, regla: "" } as any,
    sla: { nivel: sla, regla: "" } as any, reglaGlobal: "", observacion: "",
  });
  it("crítico va primero", () => {
    expect(prioridadAtencion(mk("atencion_requerida", "critico"), 0, 0, 0)).toBe(0);
  });
  it("desviación calidad ≥+5pp", () => {
    expect(prioridadAtencion(mk("rendimiento_equilibrado"), 0.06, null, 0)).toBe(1);
  });
  it("caída producción ≥15%", () => {
    expect(prioridadAtencion(mk("rendimiento_equilibrado"), 0, -0.2, 0)).toBe(2);
  });
  it("backlog +30", () => {
    expect(prioridadAtencion(mk("rendimiento_equilibrado"), 0, 0, 8)).toBe(3);
  });
  it("info insuficiente al final", () => {
    expect(prioridadAtencion(mk("informacion_insuficiente"), 0, 0, 0)).toBe(7);
  });
});
