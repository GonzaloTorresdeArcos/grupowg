import { describe, it, expect } from "vitest";
import {
  presetMes, presetTrimestre, presetYTD, preset12Meses, presetHistorico,
  resolverPreset, detectarPreset, estadoCobertura, sinPeriodoComparable,
  diaAnterior, diaSiguiente, hoyISO, rangoDia, fechaLarga,
  type Cobertura,
} from "@/lib/ops-periodo";
import { prevPeriod, shiftYearISO } from "@/lib/ops-performance";

const COB: Cobertura = { min: "2024-01-01", max: "2026-06-18" };
const SIN_COB: Cobertura = { min: null, max: null };

describe("presets de período", () => {
  it("mes natural", () => {
    expect(presetMes("2026-06-18")).toEqual({ from: "2026-06-01", to: "2026-06-30" });
    expect(presetMes("2024-02-05").to).toBe("2024-02-29"); // bisiesto
  });

  it("trimestre natural", () => {
    expect(presetTrimestre("2026-05-10")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
    expect(presetTrimestre("2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });

  it("YTD termina en el último día con datos, no hoy", () => {
    expect(presetYTD("2026-06-18", COB)).toEqual({ from: "2026-01-01", to: "2026-06-18" });
  });

  it("YTD sin cobertura cae al fin del mes de referencia", () => {
    expect(presetYTD("2026-06-18", SIN_COB)).toEqual({ from: "2026-01-01", to: "2026-06-30" });
  });

  it("12 meses completos incluyendo el mes de referencia", () => {
    expect(preset12Meses("2026-06-18")).toEqual({ from: "2025-07-01", to: "2026-06-30" });
  });

  it("histórico usa la cobertura real y es null sin datos", () => {
    expect(presetHistorico(COB)).toEqual({ from: "2024-01-01", to: "2026-06-18" });
    expect(presetHistorico(SIN_COB)).toBeNull();
  });

  it("resolverPreset y detectarPreset son coherentes", () => {
    const actual = { from: "2026-06-01", to: "2026-06-30" };
    (["mes", "trimestre", "ytd", "doce_meses", "historico"] as const).forEach((k) => {
      const r = resolverPreset(k, actual, COB);
      expect(detectarPreset(r, COB)).toBe(k);
    });
    expect(detectarPreset({ from: "2026-02-03", to: "2026-04-11" }, COB)).toBe("rango");
  });
});

describe("prevPeriod — modo anterior", () => {
  it("mes natural → mes natural anterior cruzando año", () => {
    expect(prevPeriod("2026-01-01", "2026-01-31")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("trimestre natural → trimestre anterior", () => {
    expect(prevPeriod("2026-01-01", "2026-03-31")).toEqual({ from: "2025-10-01", to: "2025-12-31" });
  });
  it("rango arbitrario → mismos días inmediatamente anteriores", () => {
    expect(prevPeriod("2026-03-10", "2026-03-19")).toEqual({ from: "2026-02-28", to: "2026-03-09" });
  });
});

describe("prevPeriod — modo interanual", () => {
  it("desplaza exactamente un año manteniendo duración", () => {
    expect(prevPeriod("2026-06-01", "2026-06-30", "interanual"))
      .toEqual({ from: "2025-06-01", to: "2025-06-30" });
  });
  it("clamp documentado del 29 de febrero", () => {
    expect(shiftYearISO("2024-02-29", -1)).toBe("2023-02-28");
    expect(prevPeriod("2024-02-01", "2024-02-29", "interanual"))
      .toEqual({ from: "2023-02-01", to: "2023-02-28" });
  });
  it("YTD homogéneo: mismo intervalo exacto del año anterior", () => {
    const ytd = presetYTD("2026-06-18", COB);
    expect(prevPeriod(ytd.from, ytd.to, "interanual"))
      .toEqual({ from: "2025-01-01", to: "2025-06-18" });
  });
});

describe("cobertura de datos", () => {
  it("clasifica dentro / parcial / fuera / desconocida", () => {
    expect(estadoCobertura({ from: "2025-01-01", to: "2025-03-31" }, COB)).toBe("dentro");
    expect(estadoCobertura({ from: "2023-06-01", to: "2024-06-30" }, COB)).toBe("parcial");
    expect(estadoCobertura({ from: "2019-01-01", to: "2019-12-31" }, COB)).toBe("fuera");
    expect(estadoCobertura({ from: "2025-01-01", to: "2025-03-31" }, SIN_COB)).toBe("desconocida");
  });

  it("sin período comparable cuando el interanual cae fuera de los datos", () => {
    const prev = prevPeriod("2024-03-01", "2024-03-31", "interanual");
    expect(prev).toEqual({ from: "2023-03-01", to: "2023-03-31" });
    expect(sinPeriodoComparable(prev, COB)).toBe(true);
    // El comparable existente sí tiene datos
    expect(sinPeriodoComparable(prevPeriod("2026-06-01", "2026-06-30", "interanual"), COB)).toBe(false);
  });

  it("fechaLarga formatea o devuelve guion", () => {
    expect(fechaLarga("2024-03-12")).toBe("12 de marzo de 2024");
    expect(fechaLarga(null)).toBe("—");
  });
});

describe("helpers de granularidad diaria (Route Planning)", () => {
  it("día anterior / siguiente cruzando mes y año", () => {
    expect(diaAnterior("2026-01-01")).toBe("2025-12-31");
    expect(diaSiguiente("2024-02-28")).toBe("2024-02-29");
    expect(diaSiguiente("2025-02-28")).toBe("2025-03-01");
  });
  it("hoyISO normaliza a UTC y rangoDia es un único día", () => {
    expect(hoyISO(new Date("2026-06-18T23:45:00Z"))).toBe("2026-06-18");
    expect(rangoDia("2026-06-18")).toEqual({ from: "2026-06-18", to: "2026-06-18" });
  });
});
