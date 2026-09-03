/**
 * SLA-E1.3 · guardias de la presentación contractual temporal.
 *
 * (1) El export SIEMPRE lleva los 5 elementos obligatorios (decisión Management 4).
 * (2) Lo oficial y lo no oficial nunca comparten clasificación ni se agregan.
 * (3) La nota 80/20 es literal gobernado, no editable ni reformulable.
 * (4) NOT_EVALUABLE nunca entra en el denominador.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  NOTA_PROFESSIONAL_8020, FORMULA_DENOMINADOR, MARCA_SHADOW, MARCA_ESCENARIO,
  cabeceraExportObligatoria, csvDrilldown, esOficial, marcaDe, motivosOrdenados,
  traducirMotivoNoEvaluable, etiquetaTerritorio, ETIQUETA_CLASIFICACION,
  type SlaKpi, type SlaOtFila,
} from "@/lib/ops-sla-contractual";

const KPI = (over: Partial<SlaKpi> = {}): SlaKpi => ({
  regla_version_id: "r1",
  kpi: "R_SLA_MAK_01",
  kpi_nombre: "Primer contacto",
  claim_estado: "VALIDATED",
  as_of: "2026-07-25",
  escenario_baja: "A",
  clasificacion: "CONTRACTUAL_TEMPORAL_RESULT_READY",
  es_professional_8020: true,
  universos_y_resultado: {
    poblacion_programa_resuelta: 4431, poblacion_anulado_aviso: 0,
    poblacion_fuera_de_alcance: 0, poblacion_excluida_baja: 0,
    poblacion_servicio: 4431, candidate_kpi: 3622, excluded_from_candidate: 809,
    evaluable: 3366, not_evaluable_within_candidate: 256,
    met: 1023, missed: 2343, temporal_adherence_pct: 30.39,
    completitud_start: null, completitud_end: null,
    motivos_no_evaluable: { end_missing: 200, territorio_no_resuelto: 56 },
    territorios: null, rango_start: null,
  },
  ...over,
});

describe("SLA-E1.3 · export obligatorio", () => {
  it("la cabecera lleva as-of, clasificación, denominador, nota 80/20 y sin marca si es oficial", () => {
    const h = cabeceraExportObligatoria(KPI()).join("\n");
    expect(h).toContain("As-of del dato;2026-07-25");
    expect(h).toContain("CONTRACTUAL_TEMPORAL_RESULT_READY");
    expect(h).toContain(`${FORMULA_DENOMINADOR} = 1023 + 2343 = 3366`);
    expect(h).toContain("Nota 80/20;");
    expect(h).toContain(NOTA_PROFESSIONAL_8020);
    expect(h).not.toContain("Marca;");
  });

  it("SHADOW y MANAGEMENT SCENARIO marcan el export", () => {
    const s = cabeceraExportObligatoria(
      KPI({ clasificacion: "SHADOW_RESULT_ONLY", es_professional_8020: false }),
    ).join("\n");
    expect(s).toContain(`Marca;"${MARCA_SHADOW}"`.replace(/"/g, "").slice(0, 6));
    expect(s).toContain(MARCA_SHADOW);
    expect(s).not.toContain("Nota 80/20");
    const e = cabeceraExportObligatoria(
      KPI({ clasificacion: "MANAGEMENT_SCENARIO_ONLY", es_professional_8020: false }),
    ).join("\n");
    expect(e).toContain(MARCA_ESCENARIO);
  });

  it("el CSV del drill-down antepone la cabecera obligatoria a las filas", () => {
    const filas: SlaOtFila[] = [{
      num_ot: "A1", poblacion: "candidate", start_date: "2026-01-02",
      deadline_date: "2026-01-05", end_date: null, temporal_result: "NOT_EVALUABLE",
      reason_not_evaluable: "end_missing", territorio_ot: "ES",
    }];
    const csv = csvDrilldown(KPI(), filas);
    const [i1, i2] = [csv.indexOf("As-of del dato"), csv.indexOf("num_ot;poblacion")];
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(csv).toContain("Filas exportadas;1");
    expect(csv).toContain("No evaluable");
    expect(csv).toContain("El hito de fin no está registrado en el ERP");
  });
});

describe("SLA-E1.3 · separación oficial / no oficial", () => {
  it("solo CONTRACTUAL_TEMPORAL_RESULT_READY es oficial", () => {
    expect(esOficial("CONTRACTUAL_TEMPORAL_RESULT_READY")).toBe(true);
    for (const c of ["SHADOW_RESULT_ONLY", "MANAGEMENT_SCENARIO_ONLY", "NOT_READY"] as const) {
      expect(esOficial(c)).toBe(false);
      expect(ETIQUETA_CLASIFICACION[c]).toBeTruthy();
    }
    expect(marcaDe("CONTRACTUAL_TEMPORAL_RESULT_READY")).toBeNull();
  });

  it("el componente no agrega ni promedia entre zonas", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/ops/SlaContractual.tsx"), "utf8");
    expect(src).not.toMatch(/reduce\(/);
    expect(src).not.toMatch(/promedio|media global/i);
    // La nota 80/20 se importa literal: no se reescribe en el componente.
    expect(src).toContain("NOTA_PROFESSIONAL_8020");
    expect(src).not.toContain("mecanismo contractual de imputabilidad 80/20. Los resultados");
  });

  it("la nota 80/20 menciona el desfase como posibilidad, nunca como explicación", () => {
    expect(NOTA_PROFESSIONAL_8020).toContain("pueden existir desfases");
    expect(NOTA_PROFESSIONAL_8020).not.toMatch(/se explica por|debido a|a causa de/i);
  });
});

describe("SLA-E1.3 · no evaluables y motivos", () => {
  it("el denominador excluye los no evaluables", () => {
    const k = KPI();
    const u = k.universos_y_resultado!;
    expect(u.met + u.missed).toBe(u.evaluable);
    expect(u.evaluable + u.not_evaluable_within_candidate).toBe(u.candidate_kpi);
  });

  it("los motivos se traducen y se ordenan por recuento", () => {
    const m = motivosOrdenados(KPI().universos_y_resultado?.motivos_no_evaluable);
    expect(m[0].code).toBe("end_missing");
    expect(m[0].texto).toContain("hito de fin");
    expect(traducirMotivoNoEvaluable("territorio_no_resuelto")).toContain("territorio");
    // Un código desconocido se muestra tal cual: nunca se inventa una explicación.
    expect(traducirMotivoNoEvaluable("codigo_nuevo")).toBe("codigo_nuevo");
    expect(traducirMotivoNoEvaluable(null)).toBe("Sin motivo declarado");
  });

  it("los territorios se nombran, incluido el no resuelto", () => {
    expect(etiquetaTerritorio("ES")).toBe("España");
    expect(etiquetaTerritorio("PT")).toBe("Portugal");
    expect(etiquetaTerritorio("UNRESOLVED")).toBe("Territorio no resuelto");
  });
});
