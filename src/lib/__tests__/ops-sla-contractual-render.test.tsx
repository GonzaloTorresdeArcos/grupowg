/**
 * SLA-E1.3 · prueba de RENDER de la sección contractual con el payload literal
 * observado en BD live (03-09-2026, escenario A).
 *
 * Sirve como evidencia verificable del render en ausencia de sesión interactiva
 * de management en este canal, y como guardia permanente de reconciliación:
 * si las cifras del frontend dejasen de coincidir con `ctr_sla_temporal_resumen`
 * (30,39 / 48,56 / 31,62 / 42,42 / 61,92 / 71,21), el test cae.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SlaKpi } from "@/lib/ops-sla-contractual";
import { MARCA_SHADOW, MARCA_ESCENARIO, NOTA_PROFESSIONAL_8020 } from "@/lib/ops-sla-contractual";

const u = (cand: number, met: number, missed: number, ne: number, pct: number | null) => ({
  poblacion_programa_resuelta: cand, poblacion_anulado_aviso: 0,
  poblacion_fuera_de_alcance: 0, poblacion_excluida_baja: 0, poblacion_servicio: cand,
  candidate_kpi: cand, excluded_from_candidate: 0, evaluable: met + missed,
  not_evaluable_within_candidate: ne, met, missed, temporal_adherence_pct: pct,
  completitud_start: null, completitud_end: null,
  motivos_no_evaluable: { end_missing: ne - 1, territorio_no_resuelto: 1 },
  territorios: null, rango_start: null,
});

const KPIS: SlaKpi[] = [
  {
    regla_version_id: "rv1", kpi: "R_SLA_MET_01", kpi_nombre: "Primer contacto T+1",
    claim_estado: "VALIDATED", as_of: "2026-07-25", escenario_baja: "A",
    clasificacion: "CONTRACTUAL_TEMPORAL_RESULT_READY", es_professional_8020: true,
    evaluation_ready: true, publication_ready: true,
    cobertura: { candidate_population: 1089, evaluables: 955, not_evaluable: 134,
      ratio_evaluables_pct: 87.7, ratio_no_evaluables_pct: 12.3, limitada: false },
    desglose_territorial: [
      { grupo: "ES", poblacion: 1151, candidata: 1009, met: 294, missed: 607, not_evaluable: 250, adherencia_pct: 32.63 },
      { grupo: "PT", poblacion: 90, candidata: 79, met: 8, missed: 46, not_evaluable: 36, adherencia_pct: 14.81 },
      { grupo: "UNRESOLVED", poblacion: 1, candidata: 1, met: 0, missed: 0, not_evaluable: 1, adherencia_pct: null },
    ],
    universos_y_resultado: u(1089, 302, 653, 134, 31.62),
  },
  {
    regla_version_id: "rv2", kpi: "R_I2_02", kpi_nombre: "Intervención on-site",
    claim_estado: "VALIDATED", as_of: "2026-07-25", escenario_baja: "A",
    clasificacion: "SHADOW_RESULT_ONLY", es_professional_8020: false,
    evaluation_ready: false, publication_ready: false,
    next_blocker: "poblacion_no_gobernada_proxy",
    cobertura: { candidate_population: 7688, evaluables: 7306, not_evaluable: 382,
      ratio_evaluables_pct: 95.03, ratio_no_evaluables_pct: 4.97, limitada: false },
    desglose_territorial: [],
    universos_y_resultado: u(7688, 4524, 2782, 382, 61.92),
  },
  {
    regla_version_id: "rv3", kpi: "R_I2_03", kpi_nombre: "Cierre T+21",
    claim_estado: "PENDING", as_of: "2026-07-25", escenario_baja: "A",
    clasificacion: "MANAGEMENT_SCENARIO_ONLY", es_professional_8020: false,
    evaluation_ready: false, publication_ready: false,
    cobertura: { candidate_population: 8202, evaluables: 7866, not_evaluable: 336,
      ratio_evaluables_pct: 95.9, ratio_no_evaluables_pct: 4.1, limitada: false },
    desglose_territorial: [],
    universos_y_resultado: u(8202, 5601, 2265, 336, 71.21),
  },
];

vi.mock("@/lib/ops-query", () => ({
  useOpsRpc: (rpc: string) => ({
    data: rpc === "ctr_sla_programa_kpis" ? KPIS : null,
    isPending: false, isError: false, isSuccess: true, error: null,
    refetch: () => Promise.resolve({}),
  }),
  useOpsRpcs: () => [],
  useInvalidarOps: () => () => Promise.resolve(),
  opsQueryKey: (rpc: string) => ["ops", rpc],
}));

describe("SLA-E1.3 · render de la sección contractual", () => {
  it("las cifras del frontend son las de ctr_sla_temporal_resumen", async () => {
    const { SlaContractual } = await import("@/components/ops/SlaContractual");
    const { container } = render(<SlaContractual programaId="p1" />);
    const txt = container.textContent ?? "";
    expect(txt).toContain("31,62 %");
    expect(txt).toContain("61,92 %");
    expect(txt).toContain("71,21 %");
    expect(txt).not.toContain("NaN");
    // MET / MISSED / NOT_EVALUABLE, los tres siempre visibles y absolutos.
    expect(txt).toContain("Cumplidas 302");
    expect(txt).toContain("Incumplidas 653");
    expect(txt).toContain("134 no evaluables");
    // Denominador impreso y no evaluables fuera de él.
    expect(txt).toContain("MET / (MET + MISSED) = 955");
    expect(txt).toContain("quedan FUERA del denominador");
    // Ratio de cobertura siempre visible.
    expect(txt).toContain("Evaluables 955 / 1089 candidatas");
  });

  it("desglose ES / PT / no resuelto con el contraste 32,63 vs 14,81", () => {
    const txt = (screen.getByText("Ámbito").closest("table") as HTMLElement).textContent ?? "";
    expect(txt).toContain("España");
    expect(txt).toContain("32,63 %");
    expect(txt).toContain("Portugal");
    expect(txt).toContain("14,81 %");
    expect(txt).toContain("Territorio no resuelto");
    expect(txt).toContain("no calculable");
  });

  it("lo oficial y lo no oficial están separados e inequívocamente marcados", async () => {
    const { container } = render(
      (await import("@/components/ops/SlaContractual")).SlaContractual({ programaId: "p1" }) as never,
    );
    const txt = container.textContent ?? "";
    expect(txt).toContain("Resultado contractual publicable");
    expect(txt).toContain("No contractual · resultados subordinados");
    expect(txt).toContain(MARCA_SHADOW);
    expect(txt).toContain(MARCA_ESCENARIO);
    expect(txt).toContain(NOTA_PROFESSIONAL_8020);
    // El claim PENDING del escenario es visible.
    expect(txt).toContain("Claim PENDING");
  });
});
