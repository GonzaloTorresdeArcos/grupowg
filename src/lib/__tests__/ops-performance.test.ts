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
