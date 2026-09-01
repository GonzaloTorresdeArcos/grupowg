/**
 * PERFORMANCE REAL · guardia de veracidad (PRV-A1).
 *
 * (1) Las CINCO verticales se renderizan siempre, y el bloque separado de OTs
 *     sin programa resuelto.
 * (2) Insurance: 0 resueltas a programa pero 7.834 OTs identificadas como
 *     Assurant. La UI NUNCA puede leerse como «Insurance no tiene OTs».
 * (3) Los dos universos de población están nombrados y separados.
 * (4) Readiness es categórico: etapas, sin porcentaje ni ponderación.
 * (5) Economía: importe no cero ≠ importe cero ≠ importe ausente.
 *
 * Los fixtures reproducen conteos observados en BD live (01-09-2026), no la
 * fotografía del Blueprint.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  traducirReason, pctSeguro, notaImporte, etapasAlcanzadas, esFueraDeAmbito,
  ETAPAS_READINESS, DEGRADACION, UNIVERSO,
  TEXTO_SIN_OBLIGACIONES, TEXTO_SIN_OBLIGACION_TEMPORAL,
} from "@/lib/ops-portfolio";

// Cifras literales de BD live (01-09-2026).
const RESUMEN = [
  { vertical_codigo: "01_RETAIL_AFTERSALES", vertical_nombre: "Retail after-sales", n_programas: 13, n_clientes: 11, n_ots: 61722, n_ots_cliente_identificado: 38772, n_instrumentos: 4, n_claims: 12, claims_validated: 3, claims_pending: 9, n_reglas: 8, n_aplicabilidad: 8, n_ots_importe_no_cero: 9838, n_ots_importe_cero: 51884, n_ots_importe_nulo: 0 },
  { vertical_codigo: "02_MOBILITY", vertical_nombre: "Mobility", n_programas: 3, n_clientes: 3, n_ots: 665, n_ots_cliente_identificado: 0, n_instrumentos: 0, n_claims: 2, claims_validated: 0, claims_pending: 2, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 252, n_ots_importe_cero: 413, n_ots_importe_nulo: 0 },
  { vertical_codigo: "03_CLIMATE", vertical_nombre: "Climate", n_programas: 4, n_clientes: 4, n_ots: 1656, n_ots_cliente_identificado: 0, n_instrumentos: 0, n_claims: 2, claims_validated: 0, claims_pending: 2, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 60, n_ots_importe_cero: 1596, n_ots_importe_nulo: 0 },
  { vertical_codigo: "04_PROFESSIONAL", vertical_nombre: "Professional", n_programas: 2, n_clientes: 1, n_ots: 5674, n_ots_cliente_identificado: 0, n_instrumentos: 0, n_claims: 2, claims_validated: 0, claims_pending: 2, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 276, n_ots_importe_cero: 5398, n_ots_importe_nulo: 0 },
  { vertical_codigo: "05_INSURANCE", vertical_nombre: "Insurance", n_programas: 2, n_clientes: 1, n_ots: 0, n_ots_cliente_identificado: 7834, n_instrumentos: 0, n_claims: 2, claims_validated: 0, claims_pending: 2, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 0, n_ots_importe_cero: 0, n_ots_importe_nulo: 0 },
  { vertical_codigo: "SIN_RESOLVER", vertical_nombre: "ambiguous", n_programas: 0, n_clientes: 0, n_ots: 47418, n_ots_cliente_identificado: 0, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 0, n_ots_importe_cero: 0, n_ots_importe_nulo: 0 },
  { vertical_codigo: "SIN_RESOLVER", vertical_nombre: "sin_cliente", n_programas: 0, n_clientes: 0, n_ots: 8617, n_ots_cliente_identificado: 0, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_no_cero: 0, n_ots_importe_cero: 0, n_ots_importe_nulo: 0 },
];

const NO_RESUELTAS = [
  { clase: "cliente_identificado_sin_programa", cliente_wg_origen: "ASSURANT EUROPE INSURANCE NV", cliente_nombre: "Assurant", vertical_codigo: "05_INSURANCE", vertical_nombre: "Insurance", n_programas_candidatos: 2, n_ots: 4130 },
  { clase: "cliente_identificado_sin_programa", cliente_wg_origen: "ASSURANT GENERAL INSURANCE LIMITED", cliente_nombre: "Assurant", vertical_codigo: "05_INSURANCE", vertical_nombre: "Insurance", n_programas_candidatos: 2, n_ots: 3704 },
  { clase: "identidad_no_establecida", cliente_wg_origen: null, cliente_nombre: null, vertical_codigo: null, vertical_nombre: null, n_programas_candidatos: 0, n_ots: 8617 },
];

const FICHA_VACIA = {
  programa: null,
  instrumentos: [],
  poblacion: { resuelta: 0, servicio: 0, excluidas_anulado_aviso: 0 },
  servicio: {
    ots: 0, cerradas: 0, abiertas: 0, dias_cierre_medio: null,
    pct_kpi_20d: null, pct_kpi_30d: null,
    completitud_primer_contacto: null, completitud_primera_visita: null,
    aging: { b_0_20: 0, b_21_30: 0, b_31_60: 0, b_61_90: 0, b_90_mas: 0, sin_fecha: 0 },
  },
  economia: {
    n_ots_importe_no_cero: 0, n_ots_importe_cero: 0, n_ots_importe_nulo: 0,
    fuente_cargada: true,
  },
  as_of_operativo: null,
};

const { estado } = vi.hoisted(() => ({ estado: { programa: null as string | null } }));

const respuesta = (rpc: string): unknown => {
  if (rpc === "ctr_portfolio_resumen") return RESUMEN;
  if (rpc === "ctr_portfolio_no_resueltas") return NO_RESUELTAS;
  if (rpc === "ctr_portfolio_arbol") return [];
  if (rpc === "ctr_programa_ficha") return FICHA_VACIA;
  if (rpc === "ctr_obligaciones_programa") return [];
  return null;
};

const query = (rpc: string) => ({
  data: respuesta(rpc),
  isPending: false, isError: false, isSuccess: true,
  fetchStatus: "idle" as const, error: null,
  refetch: () => Promise.resolve({}),
});

vi.mock("@/lib/ops-query", () => ({
  useOpsRpc: (rpc: string) => query(rpc),
  useOpsRpcs: (specs: { rpc: string }[]) => specs.map((s) => query(s.rpc)),
  useInvalidarOps: () => () => Promise.resolve(),
  opsQueryKey: (rpc: string) => ["ops", rpc],
}));

vi.mock("@/lib/ops-filters", async () => {
  const real = await vi.importActual<typeof import("@/lib/ops-filters")>("@/lib/ops-filters");
  return {
    ...real,
    useOpsFilters: () => ({
      filters: { from: "2026-01-01", to: "2026-07-25", programa: estado.programa },
      setFilters: (p: Record<string, unknown>) => { if ("programa" in p) estado.programa = p.programa as string | null; },
      options: {},
    }),
  };
});

vi.mock("@/components/ops/DataAsOf", () => ({ DataAsOf: () => null }));

describe("Performance Real · verticales", () => {
  it("renderiza SIEMPRE las cinco verticales y el bloque de no resueltas", async () => {
    estado.programa = null;
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    for (const n of ["Retail after-sales", "Mobility", "Climate", "Professional", "Insurance"]) {
      expect(screen.getByText(n), n).toBeInTheDocument();
    }
    expect(container.textContent).toContain("Cliente identificado · programa contractual no resoluble");
    expect(container.textContent).toContain("Identidad contractual no establecida");
    expect(container.textContent).toContain("47.418");
    // es-ES no agrupa los millares de 4 dígitos: 8617, no 8.617.
    expect(container.textContent).toContain("8617");
    expect(container.textContent).toContain("125.752");
    expect(container.textContent).not.toContain("NaN");
    // Economía siempre visible en las cinco tarjetas.
    const coste = container.textContent?.match(/NO ATRIBUIBLE A PROGRAMA/g) ?? [];
    expect(coste.length).toBeGreaterThanOrEqual(5);
  });

  it("P0 · Insurance no puede leerse como «no hay OTs»", async () => {
    estado.programa = null;
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    const txt = container.textContent ?? "";
    // 7.834 OTs identificadas y 0 resueltas a programa, ambas visibles.
    expect(txt).toContain("7.834 OTs identificadas · 0 resueltas a programa");
    expect(txt).toContain("programa aún no es resoluble");
    // El literal degradado nunca puede sugerir ausencia de población operativa.
    expect(DEGRADACION.SIN_POBLACION).toContain("A PROGRAMA");
    expect(txt).not.toMatch(/SIN POBLACIÓN OPERATIVA RESUELTA(?! A PROGRAMA)/);
    // Detalle live del inventario no resuelto, sin cifras hardcodeadas en la página.
    expect(txt).toContain("ASSURANT EUROPE INSURANCE NV");
    expect(txt).toContain("4.130");
    expect(txt).toContain("3.704");
  });

  it("cuadra la suma de verticales + no resueltas con la población total", () => {
    const total = RESUMEN.reduce((a, r) => a + r.n_ots, 0);
    expect(total).toBe(125752);
    // Las OTs con cliente identificado y programa no resoluble YA están dentro
    // del bloque ambiguous: no se suman dos veces.
    const identificadas = RESUMEN.reduce((a, r) => a + r.n_ots_cliente_identificado, 0);
    expect(identificadas).toBeLessThanOrEqual(47418);
  });
});

describe("Performance Real · ficha degradada (red-team de nulos)", () => {
  it("una ficha sin datos no rompe ni inventa KPIs", async () => {
    estado.programa = "00000000-0000-0000-0000-000000000000";
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).toContain(DEGRADACION.SIN_POBLACION);
    expect(container.textContent).toContain(TEXTO_SIN_OBLIGACIONES);
    expect(container.textContent).toContain("NO CALCULABLE");
    estado.programa = null;
  });

  it("nombra los DOS universos de población y no los confunde", async () => {
    estado.programa = "00000000-0000-0000-0000-000000000000";
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    const txt = container.textContent ?? "";
    expect(txt).toContain(UNIVERSO.RESUELTA);
    expect(txt).toContain(UNIVERSO.SERVICIO);
    expect(txt).toContain("ANULADO AVISO");
    estado.programa = null;
  });

  it("la economía distingue no cero, cero y ausente, y la fuente está cargada", async () => {
    estado.programa = "00000000-0000-0000-0000-000000000000";
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    const txt = container.textContent ?? "";
    expect(txt).toContain("importe no cero");
    expect(txt).toContain(DEGRADACION.FUENTE_NO_RECONCILIADA);
    expect(txt).not.toContain("OTs con importe informado");
    estado.programa = null;
  });
});

describe("Reglas de veracidad P0", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/ops/PerformanceReal.tsx"), "utf8");
  const bar = readFileSync(resolve(process.cwd(), "src/components/ops/ReadinessBar.tsx"), "utf8");

  it("la página no usa ResultCard (no hay evaluación fiable todavía)", () => {
    expect(src).not.toContain("ResultCard");
  });

  it("ReadinessBar no usa semáforo ni porcentaje", () => {
    expect(/emerald|red-5|amber/.test(bar)).toBe(false);
    expect(bar).not.toContain("progresoReadiness");
    expect(bar).not.toMatch(/%/);
  });

  it("≤20d/≤30d llevan la marca de referencia interna y no viven en CONTRATO", () => {
    expect(src).toContain("MARCA_REFERENCIA_INTERNA");
    const iContrato = src.indexOf("{/* CONTRATO */}");
    const i20 = src.indexOf("≤20 días");
    expect(i20).toBeGreaterThan(-1);
    expect(i20).toBeLessThan(iContrato);
  });

  it("los hitos se etiquetan como completitud del dato, no como cumplimiento", () => {
    expect(src).toContain("Completitud del dato · primer contacto");
    expect(src).not.toMatch(/cumplimiento de primer contacto/i);
  });

  it("no hay aserciones contractuales ni cifras de negocio hardcodeadas", () => {
    expect(/Makro|Metro Markets|Alcampo|Carrefour|PC Componentes|Assurant/i.test(src)).toBe(false);
    expect(/7\.?834|47\.?418|61\.?722/.test(src)).toBe(false);
  });

  it("prohibido «No existe obligación de plazo»", () => {
    expect(src).not.toContain("No existe obligación de plazo");
    expect(TEXTO_SIN_OBLIGACION_TEMPORAL).toBe(
      "Sin obligación temporal representada actualmente en el sistema.",
    );
  });
});

describe("Traducción de reason_code", () => {
  it("traduce los códigos exigidos y conserva el técnico", () => {
    expect(traducirReason("claim_pending")).toBe(
      "La obligación aún no ha sido validada contra el documento",
    );
    expect(traducirReason("calendario_no_cargado")).toBe(
      "No está definido qué calendario laboral aplica a este plazo",
    );
    expect(traducirReason("dimension_requerida_sin_predicado_familia")).toBe(
      "La regla exige distinguir un universo de producto que el sistema no puede determinar",
    );
    expect(traducirReason("requisitos_no_revisados")).toBe("Requisitos de la regla sin revisar");
    expect(traducirReason("claim_pending+calendario_no_cargado")).toContain(" · ");
    expect(traducirReason(null)).toBe("Sin motivo declarado");
  });
});

describe("Readiness categórico · sin pseudo-score", () => {
  it("no existe ninguna función de progreso cuantitativo", async () => {
    const mod = await import("@/lib/ops-portfolio");
    expect("progresoReadiness" in mod).toBe(false);
  });

  it("las etapas son un prefijo contiguo del ciclo real", () => {
    expect(ETAPAS_READINESS).toEqual([
      "DESCUBIERTA", "REPRESENTADA", "VALIDADA", "APLICABLE", "EVALUABLE", "EVALUADA",
    ]);
    expect(etapasAlcanzadas({ claimEstado: "PENDING", tieneRegla: false, readinessEstado: null }))
      .toEqual(["DESCUBIERTA"]);
    expect(etapasAlcanzadas({ claimEstado: "PENDING", tieneRegla: true, readinessEstado: "INSUFFICIENT_EVIDENCE" }))
      .toEqual(["DESCUBIERTA", "REPRESENTADA"]);
    expect(etapasAlcanzadas({ claimEstado: "VALIDATED", tieneRegla: true, readinessEstado: "APPLICABLE" }))
      .toEqual(["DESCUBIERTA", "REPRESENTADA", "VALIDADA", "APLICABLE"]);
  });

  it("APLICABLE nunca implica EVALUADA ni cumplimiento", () => {
    const e = etapasAlcanzadas({ claimEstado: "VALIDATED", tieneRegla: true, readinessEstado: "APPLICABLE" });
    expect(e).not.toContain("EVALUABLE");
    expect(e).not.toContain("EVALUADA");
  });

  it("fuera de ámbito no se representa como progreso", () => {
    expect(esFueraDeAmbito("NOT_APPLICABLE")).toBe(true);
    expect(esFueraDeAmbito("OUT_OF_VIGENCY")).toBe(true);
    expect(esFueraDeAmbito("APPLICABLE")).toBe(false);
  });

  it("porcentajes seguros ante denominador cero", () => {
    expect(pctSeguro(0, 0)).toBeNull();
    expect(notaImporte(null)).toContain("—");
  });
});
