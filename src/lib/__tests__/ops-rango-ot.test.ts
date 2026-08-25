/**
 * UAT-1 · Punto 7 — etiqueta de rango de datos en Calidad de datos.
 *
 * El rango OT debe distinguir la fecha de la última OT creada
 * (max(fecha_creacion)) de la fecha efectiva del dato (ops_as_of('ot')), y no
 * mostrar el literal antiguo "min → max" sin las tres partes.
 */
import { describe, it, expect } from "vitest";
import { etiquetaRangoOt, type MedidasDataQuality } from "@/lib/ops-data-quality";
import type { CargaDominio } from "@/lib/ops-as-of";

const base = (over: Partial<MedidasDataQuality> = {}): MedidasDataQuality => ({
  generado_en: "2026-08-25T09:00:00Z",
  fact_ot: {
    filas: 125752,
    min_fecha_creacion: "2025-01-02",
    max_fecha_creacion: "2026-07-21",
    ultima_importacion: "2026-07-26T18:32:37Z",
    ultima_actualizacion: "2026-07-27T17:17:22Z",
  },
  campos_fact_ot: {},
  campos_ausentes_fact_ot: [],
  rrhh: { filas: 0, meses: 0, ultimo_mes: null },
  coste_mensual: { filas: 0, meses: 0, ultimo_mes: null },
  geo: { filas_cp_geo: 0, ots_domicilio: 0, ots_domicilio_geocodificables: 0, pct_geocodificable: null },
  tablas: {},
  registry_reglas: 0,
  ...over,
});

const cargaOt = (asOf: string): CargaDominio => ({
  dominio: "ot",
  fuente: "ops_fact_ot",
  last_successful_load: null,
  data_as_of_date: asOf,
  filas: 125752,
  origen: "csv",
  notas: null,
});

describe("etiquetaRangoOt · UAT-1 punto 7", () => {
  it("produce el texto exacto con las tres partes y el rango inferior (desde)", () => {
    const txt = etiquetaRangoOt(base({ as_of_ot: "2026-07-25" }));
    expect(txt).toBe(
      "Desde 02-ene-2025 · OT creadas hasta 21-jul-2026 · eventos operativos hasta 25-jul-2026 · fecha efectiva de datos: 25-jul-2026.",
    );
  });

  it("contiene las tres partes requeridas", () => {
    const txt = etiquetaRangoOt(base({ as_of_ot: "2026-07-25" }));
    expect(txt).toContain("OT creadas hasta 21-jul-2026");
    expect(txt).toContain("eventos operativos hasta 25-jul-2026");
    expect(txt).toContain("fecha efectiva de datos: 25-jul-2026.");
  });

  it("no muestra el literal antiguo «min → max» sin las tres partes", () => {
    const txt = etiquetaRangoOt(base({ as_of_ot: "2026-07-25" }));
    expect(txt).not.toMatch(/2025-01-02\s*→\s*2026-07-21/);
  });

  it("resuelve la fecha efectiva desde cargas cuando as_of_ot no viene", () => {
    const txt = etiquetaRangoOt(base({ cargas: [cargaOt("2026-07-25")] }));
    expect(txt).toContain("eventos operativos hasta 25-jul-2026");
    expect(txt).toContain("fecha efectiva de datos: 25-jul-2026.");
  });

  it("mantiene el extremo inferior (desde) formateado es-ES", () => {
    const txt = etiquetaRangoOt(base({ as_of_ot: "2026-07-25" }));
    expect(txt).toContain("Desde 02-ene-2025");
  });
});
