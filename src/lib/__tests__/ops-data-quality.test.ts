import { describe, it, expect } from "vitest";
import {
  AVISO_NO_CUMPLIMIENTO,
  DEFINICIONES_DOMINIO,
  DOMINIOS_DATOS,
  derivarDominios,
  dominioDato,
  frescura,
  readinessRegla,
  resumenReadiness,
  type MedidasDataQuality,
} from "@/lib/ops-data-quality";
import { FIXTURES_REGISTRY } from "@/lib/ops-contractual-fixtures";

const medidas = (p: Partial<MedidasDataQuality> = {}): MedidasDataQuality => ({
  generado_en: "2026-08-24T20:00:00Z",
  fact_ot: {
    filas: 125752,
    min_fecha_creacion: "2025-01-02",
    max_fecha_creacion: "2026-07-21",
    ultima_importacion: "2026-07-26T18:32:37Z",
    ultima_actualizacion: "2026-07-27T17:17:22Z",
  },
  campos_fact_ot: {
    num_ot: 1, cliente_wg: 0.9998, situacion: 1, estado: 1,
    fecha_creacion: 1, fecha_cierre: 0.964, fecha_primer_contacto: 0.8993, fecha_primera_visita: 0.9412,
    gama_real: 1, familia: 0.997, subfamilia: 0.997, marca: 1,
    tipo_recurso: 1, tecnico: 0.5208, sat: 0.9904, delegacion: 0.4774,
    canal: 0.9274, codigo_postal: 1,
    importe_mo: 0.9987, importe_desplazamiento: 1, fact_cli: 1, fact_sat: 1,
  },
  campos_ausentes_fact_ot: [
    "motivo_cierre", "motivo_baja", "imputabilidad", "ot_anterior",
    "programa", "business_line", "tipologia_servicio", "fase", "calendario_laboral",
  ],
  rrhh: { filas: 112, meses: 4, ultimo_mes: "2026-04-01" },
  coste_mensual: { filas: 470, meses: 18, ultimo_mes: "2026-06-01" },
  geo: { filas_cp_geo: 2438, ots_domicilio: 59495, ots_domicilio_geocodificables: 37368, pct_geocodificable: 0.6281 },
  tablas: {
    ops_visitas: false, ops_historial_estados: false, ops_repuestos: false,
    ops_reclamaciones: false, ops_csat: false, ops_sla_registry: true,
  },
  registry_reglas: 10,
  ...p,
});

const byId = (m: MedidasDataQuality) => new Map(derivarDominios(m).map((d) => [d.id, d]));

describe("dominios derivados de medidas reales", () => {
  it("no hay dominios escritos a mano: cada definición produce una medida", () => {
    const ds = derivarDominios(medidas());
    expect(ds).toHaveLength(DEFINICIONES_DOMINIO.length);
    for (const d of ds) {
      expect(d.medida && d.medida.length).toBeGreaterThan(10);
      expect(d.kpisBloqueados.length).toBeGreaterThan(0);
    }
  });

  it("declara disponible solo lo que alcanza la cobertura exigida", () => {
    const m = byId(medidas());
    expect(m.get("identificacion_ot")?.estado).toBe("disponible");
    expect(m.get("producto")?.estado).toBe("disponible");
    expect(m.get("economico")?.estado).toBe("disponible");
  });

  it("degrada a parcial lo que está informado a medias", () => {
    const m = byId(medidas());
    expect(m.get("fechas_ciclo")?.estado).toBe("parcial");     // primer contacto 89,9%
    expect(m.get("recurso")?.estado).toBe("parcial");          // técnico 52%
    expect(m.get("delegacion")?.estado).toBe("pendiente");     // 47,7%
    expect(m.get("canal")?.estado).toBe("parcial");            // 92,7% frente al 98% exigido
    expect(m.get("geografia")?.estado).toBe("parcial");        // 62,8% geocodificable
  });

  it("un campo inexistente en el origen nunca se declara disponible", () => {
    const m = byId(medidas());
    for (const id of ["motivo_cierre", "imputabilidad", "segmentacion_contractual", "calendario_laboral", "reincidencias"]) {
      expect(m.get(id)?.estado, id).toBe("pendiente");
      expect(m.get(id)?.cobertura).toBe(0);
    }
  });

  it("una tabla que no existe bloquea su dominio", () => {
    const m = byId(medidas());
    for (const id of ["ftf", "utilizacion", "csat", "reclamaciones", "historial_estados", "repuestos"]) {
      expect(m.get(id)?.estado, id).toBe("pendiente");
    }
  });

  it("el Registry existente con reglas en borrador es parcial, nunca disponible", () => {
    expect(byId(medidas()).get("reglas_contractuales")?.estado).toBe("parcial");
    expect(byId(medidas({ registry_reglas: 0 })).get("reglas_contractuales")?.estado).toBe("pendiente");
  });

  it("RRHH incompleto deja los derivados de capacidad en pendiente", () => {
    const m = byId(medidas());
    expect(m.get("dias_trabajados")?.estado).toBe("parcial");
    expect(m.get("fte_disponibles")?.estado).toBe("parcial");
    expect(m.get("produccion_fte_dia")?.estado).toBe("pendiente");
    const completo = byId(medidas({ rrhh: { filas: 5000, meses: 18, ultimo_mes: "2026-07-01" } }));
    expect(completo.get("produccion_fte_dia")?.estado).toBe("disponible");
  });

  it("el fallback estático no declara nada disponible", () => {
    expect(DOMINIOS_DATOS.some((d) => d.estado === "disponible")).toBe(false);
    expect(dominioDato("dias_trabajados")?.estado).toBe("parcial");
  });

  it("mide la frescura del dato sin inventar", () => {
    const f = frescura(medidas(), new Date("2026-08-24T20:00:00Z"));
    expect(f.dias).toBe(29);
    expect(f.estado).toBe("fresco");
    expect(frescura(medidas({ fact_ot: { ...medidas().fact_ot, ultima_importacion: null } })).estado).toBe("desconocido");
  });
});

describe("contractual data readiness", () => {
  it("ninguna regla del Registry es medible hoy", () => {
    const r = resumenReadiness(FIXTURES_REGISTRY, medidas());
    expect(r.total).toBe(FIXTURES_REGISTRY.length);
    expect(r.medibles).toBe(0);
    expect(r.puedeDeclararCumplimiento).toBe(false);
    expect(r.bloqueosTop.length).toBeGreaterThan(0);
  });

  it("explica exactamente qué falta en cada regla", () => {
    const sinSla = FIXTURES_REGISTRY.find((x) => x.target === null)!;
    const rd = readinessRegla(sinSla, medidas());
    expect(rd.medible).toBe(false);
    expect(rd.bloqueos.some((b) => b.tipo === "target")).toBe(true);
    expect(rd.bloqueos.some((b) => b.tipo === "dimension" && b.clave === "programa")).toBe(true);

    const laborable = FIXTURES_REGISTRY.find((x) => x.unidad === "horas_laborables")!;
    expect(readinessRegla(laborable, medidas()).bloqueos.some((b) => b.tipo === "calendario")).toBe(true);

    const conPausas = FIXTURES_REGISTRY.find((x) => x.pausas_exclusiones.length > 0)!;
    expect(readinessRegla(conPausas, medidas()).bloqueos.some((b) => b.clave === "pausas")).toBe(true);

    const repeat = FIXTURES_REGISTRY.find((x) => x.ventana_garantia_dias != null)!;
    expect(readinessRegla(repeat, medidas()).bloqueos.some((b) => b.clave === "ot_anterior")).toBe(true);
  });

  it("una regla en borrador nunca se considera medible aunque el dato exista", () => {
    const perfecto = medidas({
      campos_fact_ot: {
        ...medidas().campos_fact_ot,
        programa: 1, business_line: 1, tipologia_servicio: 1, fase: 1, fecha_primer_contacto: 1,
      },
      campos_ausentes_fact_ot: [],
    });
    const base = FIXTURES_REGISTRY.find((x) => x.kpi === "Preventa — ≤20 días")!;
    const r = { ...base, calendario: "natural" as const };
    expect(readinessRegla(r, perfecto).bloqueos.some((b) => b.tipo === "validacion")).toBe(true);
    expect(readinessRegla({ ...r, estado_regla: "validada" }, perfecto).medible).toBe(true);
  });

  it("el aviso deja claro que no se calcula cumplimiento contractual", () => {
    expect(AVISO_NO_CUMPLIMIENTO.toLowerCase()).toContain("no calcula");
    expect(AVISO_NO_CUMPLIMIENTO.toLowerCase()).toContain("cumplimiento contractual");
  });
});
