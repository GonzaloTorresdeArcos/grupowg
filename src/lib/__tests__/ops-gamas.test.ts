import { describe, expect, it } from "vitest";
import { GAMA_LABELS, gamaDisplayMap, gamaLabel } from "@/lib/ops-gamas";

describe("diccionario de etiquetas de gama", () => {
  it("mapea Profesional a Industrial / Profesional", () => {
    expect(gamaLabel("Profesional")).toBe("Industrial / Profesional");
    expect(gamaLabel("Gama Profesional")).toBe("Industrial / Profesional");
    expect(GAMA_LABELS.Profesional).toBe("Industrial / Profesional");
  });

  it("mantiene el resto de gamas (acentuando Marron)", () => {
    expect(gamaLabel("Blanca")).toBe("Blanca");
    expect(gamaLabel("PAE")).toBe("PAE");
    expect(gamaLabel("Movilidad")).toBe("Movilidad");
    expect(gamaLabel("Clima")).toBe("Clima");
    expect(gamaLabel("Marron")).toBe("Marrón");
    expect(gamaLabel("Gama Marron")).toBe("Marrón");
  });

  it("degrada con seguridad ante valores vacíos o desconocidos", () => {
    expect(gamaLabel(null)).toBe("—");
    expect(gamaLabel(undefined)).toBe("—");
    expect(gamaLabel("   ")).toBe("—");
    expect(gamaLabel(null, "Sin gama")).toBe("Sin gama");
    expect(gamaLabel("Otra")).toBe("Otra");
  });

  it("construye el mapa de display para selectores", () => {
    expect(gamaDisplayMap(["Profesional", "Blanca"])).toEqual({
      Profesional: "Industrial / Profesional",
      Blanca: "Blanca",
    });
  });

  it("no altera el valor interno usado en BD", () => {
    const interno = "Profesional";
    gamaLabel(interno);
    expect(interno).toBe("Profesional");
  });
});
