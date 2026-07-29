import { describe, it, expect } from "vitest";
import {
  lecturaCoste,
  lecturaCostePorCerrada,
  estadoProductividad,
  contribucionParcial,
  componentesCoste,
  validarCalidadDatosCostes,
  generarHallazgosCostes,
  medianaLocal,
  ordenProductividad,
} from "../ops-costes";

describe("lecturaCoste", () => {
  it("marca requiere_interpretacion cuando el coste baja pero también baja la producción", () => {
    const r = lecturaCoste({
      costeAct: 90, costePrev: 100,
      cerradasAct: 80, cerradasPrev: 100,
      bajasAct: 10, bajasPrev: 12,
      ingresoCoberturaAct: 0.5, ingresoCoberturaPrev: 0.5,
    });
    expect(r.lectura).toBe("requiere_interpretacion");
  });
  it("marca favorable cuando el coste baja sin caída de producción ni calidad", () => {
    const r = lecturaCoste({
      costeAct: 90, costePrev: 100,
      cerradasAct: 100, cerradasPrev: 100,
      bajasAct: 10, bajasPrev: 10,
      ingresoCoberturaAct: 0.5, ingresoCoberturaPrev: 0.5,
    });
    expect(r.lectura).toBe("favorable");
  });
  it("marca desfavorable cuando sube coste sin subir producción", () => {
    const r = lecturaCoste({
      costeAct: 120, costePrev: 100,
      cerradasAct: 100, cerradasPrev: 100,
      bajasAct: 10, bajasPrev: 10,
      ingresoCoberturaAct: 0.5, ingresoCoberturaPrev: 0.5,
    });
    expect(r.lectura).toBe("desfavorable");
  });
  it("es neutro sin período previo", () => {
    const r = lecturaCoste({
      costeAct: 100, costePrev: null,
      cerradasAct: 100, cerradasPrev: null,
      bajasAct: 10, bajasPrev: null,
      ingresoCoberturaAct: null, ingresoCoberturaPrev: null,
    });
    expect(r.lectura).toBe("neutro");
  });
});

describe("lecturaCostePorCerrada", () => {
  it("favorable si baja >2%", () => {
    expect(lecturaCostePorCerrada(90, 100).lectura).toBe("favorable");
  });
  it("desfavorable si sube >2%", () => {
    expect(lecturaCostePorCerrada(110, 100).lectura).toBe("desfavorable");
  });
  it("neutro dentro de ±2%", () => {
    expect(lecturaCostePorCerrada(101, 100).lectura).toBe("neutro");
  });
});

describe("estadoProductividad", () => {
  const base = {
    entidad: "X",
    cerradas: 100,
    pctBajas: 0.10,
    pctSla20: 0.70,
    eurCierre: 100,
    eurCierreMediana: 100,
    ratioBajasMediana: 0.10,
    umbralMin: 20,
  };
  it("informacion_insuficiente por debajo del umbral", () => {
    expect(estadoProductividad({ ...base, cerradas: 5 }).nivel).toBe("informacion_insuficiente");
  });
  it("equilibrado en línea con mediana", () => {
    expect(estadoProductividad(base).nivel).toBe("equilibrado_eficiente");
  });
  it("productivo_costoso si €/cierre > 1,25× mediana pero calidad y SLA en línea", () => {
    expect(estadoProductividad({ ...base, eurCierre: 200 }).nivel).toBe("productivo_costoso");
  });
  it("coste_bajo_riesgo_calidad si €/cierre bajo pero bajas altas", () => {
    expect(estadoProductividad({ ...base, eurCierre: 50, pctBajas: 0.20 }).nivel).toBe("coste_bajo_riesgo_calidad");
  });
  it("critico si calidad crítica y coste alto", () => {
    expect(estadoProductividad({ ...base, eurCierre: 200, pctBajas: 0.25 }).nivel).toBe("critico");
  });
  it("atencion si SLA bajo aislado", () => {
    expect(estadoProductividad({ ...base, pctSla20: 0.30 }).nivel).toBe("atencion");
  });
});

describe("contribucionParcial", () => {
  it("null cuando no hay ingreso registrado", () => {
    const r = contribucionParcial({ ingresoCli: null, costesDirectos: 100, cerradasConIngreso: 0, cerradasTotales: 100 });
    expect(r.valor).toBeNull();
  });
  it("calcula ingreso - coste con completitud", () => {
    const r = contribucionParcial({ ingresoCli: 150, costesDirectos: 100, cerradasConIngreso: 40, cerradasTotales: 100 });
    expect(r.valor).toBe(50);
    expect(r.completitud).toBeCloseTo(0.4);
  });
});

describe("componentesCoste", () => {
  it("marca no disponibles los conceptos ausentes (repuestos, logística, retrabajo, otros)", () => {
    const c = componentesCoste({ nomina: 1000, sat: null, desplazamiento: 200, cerradasTotales: 100, cerradasConCosteSat: 0, cerradasConDesplazamiento: 40 });
    expect(c.find((x) => x.clave === "repuestos")!.tipo).toBe("no_disponible");
    expect(c.find((x) => x.clave === "nomina")!.tipo).toBe("real_registrado");
    expect(c.find((x) => x.clave === "desplazamiento")!.cobertura).toBeCloseTo(0.4);
  });
});

describe("validarCalidadDatosCostes", () => {
  it("detecta cierres=0 con coste>0", () => {
    const a = validarCalidadDatosCostes({ cerradasTotales: 0, cerradasConIngreso: 0, cerradasConCosteSat: 0, cerradasConDesplazamiento: 0, coste: 500, cierres: 0, costePrev: null, ciclesPrev: null });
    expect(a.some((x) => x.tipo === "cierres_0_coste_positivo")).toBe(true);
  });
  it("detecta cobertura de ingreso baja", () => {
    const a = validarCalidadDatosCostes({ cerradasTotales: 100, cerradasConIngreso: 10, cerradasConCosteSat: 0, cerradasConDesplazamiento: 0, coste: 500, cierres: 100, costePrev: null, ciclesPrev: null });
    expect(a.some((x) => x.tipo === "cobertura_ingreso_baja")).toBe(true);
  });
});

describe("generarHallazgosCostes", () => {
  it("genera hallazgo HECHO/HIPÓTESIS/ACCIÓN para casos críticos", () => {
    const fila = {
      entidad: "Delegación X",
      cerradas: 200, pctBajas: 0.30, pctSla20: 0.40,
      eurCierre: 200, eurCierreMediana: 100, ratioBajasMediana: 0.10,
      umbralMin: 20,
    };
    const cls = estadoProductividad(fila);
    const h = generarHallazgosCostes([{ ...fila, clasificacion: cls }]);
    expect(h.length).toBeGreaterThan(0);
    expect(h[0].hecho).toContain("Delegación X");
    expect(h[0].hipotesis.length).toBeGreaterThan(10);
    expect(h[0].accion.length).toBeGreaterThan(10);
  });
});

describe("medianaLocal y orden", () => {
  it("mediana simple", () => {
    expect(medianaLocal([100, 200, 300])).toBe(200);
    expect(medianaLocal([])).toBe(0);
  });
  it("orden prioriza críticos primero", () => {
    expect(ordenProductividad.critico).toBeLessThan(ordenProductividad.equilibrado_eficiente);
    expect(ordenProductividad.coste_bajo_riesgo_calidad).toBeLessThan(ordenProductividad.productivo_costoso);
  });
});
