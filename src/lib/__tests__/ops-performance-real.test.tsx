/**
 * PERFORMANCE REAL · guardia de veracidad.
 *
 * (1) Las CINCO verticales se renderizan siempre, incluidas Insurance (0 OTs)
 *     y Climate, y el bloque separado de OTs sin programa resuelto.
 * (2) Cuadre: la suma de verticales + no resueltas es la población total.
 * (3) Red-team de nulos: ficha vacía / sin claims / readiness bloqueado no
 *     produce NaN, ni «0%» engañoso, ni semáforo sobre readiness.
 * (4) Cero afirmaciones contractuales hardcodeadas en la página.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  traducirReason, progresoReadiness, pctSeguro, notaImporte,
  TEXTO_SIN_OBLIGACIONES, TEXTO_SIN_OBLIGACION_TEMPORAL,
} from "@/lib/ops-portfolio";

// Cifras literales de BD (2026-09-01).
const RESUMEN = [
  { vertical_codigo: "01_RETAIL_AFTERSALES", vertical_nombre: "Retail & Aftersales", n_programas: 9, n_clientes: 6, n_ots: 61722, n_instrumentos: 4, n_claims: 20, claims_validated: 3, claims_pending: 17, n_reglas: 8, n_aplicabilidad: 8, n_ots_importe_informado: 9000 },
  { vertical_codigo: "02_MOBILITY", vertical_nombre: "Mobility", n_programas: 3, n_clientes: 2, n_ots: 665, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 0 },
  { vertical_codigo: "03_CLIMATE", vertical_nombre: "Climate", n_programas: 2, n_clientes: 1, n_ots: 1656, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 100 },
  { vertical_codigo: "04_PROFESSIONAL", vertical_nombre: "Professional", n_programas: 5, n_clientes: 3, n_ots: 5674, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 0 },
  { vertical_codigo: "05_INSURANCE", vertical_nombre: "Insurance", n_programas: 5, n_clientes: 3, n_ots: 0, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 0 },
  { vertical_codigo: "SIN_RESOLVER", vertical_nombre: "ambiguous", n_programas: 0, n_clientes: 0, n_ots: 47418, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 0 },
  { vertical_codigo: "SIN_RESOLVER", vertical_nombre: "sin_cliente", n_programas: 0, n_clientes: 0, n_ots: 8617, n_instrumentos: 0, n_claims: 0, claims_validated: 0, claims_pending: 0, n_reglas: 0, n_aplicabilidad: 0, n_ots_importe_informado: 0 },
];

const FICHA_VACIA = {
  programa: null,
  instrumentos: [],
  servicio: {
    ots: 0, cerradas: 0, abiertas: 0, dias_cierre_medio: null,
    pct_kpi_20d: null, pct_kpi_30d: null,
    completitud_primer_contacto: null, completitud_primera_visita: null,
    aging: { b_0_20: 0, b_21_30: 0, b_31_60: 0, b_61_90: 0, b_90_mas: 0, sin_fecha: 0 },
  },
  economia: { n_ots_con_importe: 0, n_ots_importe_cero: 0 },
  as_of_operativo: null,
};

const { estado } = vi.hoisted(() => ({ estado: { programa: null as string | null } }));

const respuesta = (rpc: string): unknown => {
  if (rpc === "ctr_portfolio_resumen") return RESUMEN;
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
  it("renderiza SIEMPRE las cinco verticales, con Insurance a 0 y Clima presente", async () => {
    estado.programa = null;
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    for (const n of ["Retail & Aftersales", "Mobility", "Climate", "Professional", "Insurance"]) {
      expect(screen.getByText(n), n).toBeInTheDocument();
    }
    // Insurance: 0 OTs no se pinta como cifra engañosa sino como degradación.
    expect(container.textContent).toContain("SIN POBLACIÓN OPERATIVA RESUELTA");
    // Bloque separado de no resueltas, nunca repartido entre verticales.
    expect(container.textContent).toContain("Identidad contractual ambigua");
    expect(container.textContent).toContain("Sin cliente contractual identificado");
    expect(container.textContent).toContain("47.418");
    expect(container.textContent).toContain("8.617");
    // Cuadre total.
    expect(container.textContent).toContain("125.752");
    expect(container.textContent).not.toContain("NaN");
    // Economía siempre visible en las cinco tarjetas.
    const coste = container.textContent?.match(/NO ATRIBUIBLE A PROGRAMA/g) ?? [];
    expect(coste.length).toBeGreaterThanOrEqual(5);
  });

  it("cuadra la suma de verticales + no resueltas con la población total", () => {
    const total = RESUMEN.reduce((a, r) => a + r.n_ots, 0);
    expect(total).toBe(125752);
  });
});

describe("Performance Real · ficha degradada (red-team de nulos)", () => {
  it("una ficha sin datos no rompe ni inventa KPIs", async () => {
    estado.programa = "00000000-0000-0000-0000-000000000000";
    const { default: Page } = await import("@/pages/ops/PerformanceReal");
    const { container } = render(<Page />);
    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).toContain("SIN POBLACIÓN OPERATIVA RESUELTA");
    expect(container.textContent).toContain(TEXTO_SIN_OBLIGACIONES);
    expect(container.textContent).toContain("CAPACIDAD AÚN NO HABILITADA");
    expect(container.textContent).toContain("NO CALCULABLE");
    estado.programa = null;
  });
});

describe("Reglas de veracidad P0", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/ops/PerformanceReal.tsx"), "utf8");

  it("la página no usa ResultCard (no hay evaluación fiable todavía)", () => {
    expect(src).not.toContain("ResultCard");
  });

  it("ReadinessBar no usa semáforo", () => {
    const bar = readFileSync(resolve(process.cwd(), "src/components/ops/ReadinessBar.tsx"), "utf8");
    expect(/emerald|red-5|amber/.test(bar)).toBe(false);
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

  it("no hay aserciones contractuales hardcodeadas de clientes concretos", () => {
    expect(/Makro|Metro Markets|Alcampo|Carrefour|PC Componentes/i.test(src)).toBe(false);
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

  it("readiness sin evaluar nunca es 100%", () => {
    expect(progresoReadiness("APPLICABLE", "scope_evidenciado")).toBe(1);
    expect(progresoReadiness("INSUFFICIENT_EVIDENCE", "claim_pending+calendario_no_cargado")).toBeLessThan(1);
    expect(progresoReadiness(null, null)).toBe(0);
  });

  it("porcentajes seguros ante denominador cero", () => {
    expect(pctSeguro(0, 0)).toBeNull();
    expect(notaImporte(null)).toContain("—");
  });
});
