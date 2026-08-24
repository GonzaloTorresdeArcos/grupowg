import { describe, it, expect } from "vitest";
import {
  CAMPOS_OBLIGATORIOS_REGLA,
  consecuenciaDeclarada,
  diasLaborables,
  evaluarRegla,
  evaluarReglaAgregada,
  evaluarMesesConsecutivos,
  evaluarRepeatRepair,
  horasLaborables,
  type CalendarioLaboral,
  type ReglaSla,
  type ResultadoRegla,
} from "@/lib/ops-contractual";
import { FIXTURES_REGISTRY } from "@/lib/ops-contractual-fixtures";

const CAL: CalendarioLaboral = { festivos: ["2026-01-06"], horaInicio: 9, horaFin: 18 };

const regla = (p: Partial<ReglaSla> = {}): ReglaSla => ({
  business_line: "Postventa",
  cliente: "X",
  cliente_wg_patron: null,
  programa: "P",
  sociedad_wg_ejecutora: null,
  gama_familia: null,
  tipologia_servicio: null,
  fase: "postventa",
  kpi: "Plazo",
  evento_inicio: "creacion_ot",
  evento_fin: "cierre",
  target: 5,
  hard_limit: null,
  unidad: "dias_naturales",
  calendario: "natural",
  regla_medicion: "por_ot",
  umbral_agregado: null,
  ventana_medicion: "por_ot",
  meses_consecutivos: null,
  ventana_garantia_dias: null,
  pausas_exclusiones: [],
  imputabilidad: "wg",
  bonus: null,
  penalizacion: null,
  tipo_consecuencia: "malus",
  exposicion_estado: "identificada",
  vigencia_desde: null,
  vigencia_hasta: null,
  fuente_contractual: null,
  tipo_target: "contractual_target",
  estado_regla: "borrador",
  notas: null,
  ...p,
});

describe("calendario laboral inyectable", () => {
  it("cuenta horas laborables saltando fin de semana y festivo", () => {
    // Lunes 5 ene 2026 10:00 → miércoles 7 ene 10:00, con el martes 6 festivo.
    const h = horasLaborables(new Date("2026-01-05T10:00:00Z"), new Date("2026-01-07T10:00:00Z"), CAL);
    expect(h).toBeCloseTo(8 + 1, 6); // 8h del lunes restantes + 1h del miércoles
  });

  it("cuenta días laborables excluyendo festivos declarados", () => {
    expect(diasLaborables(new Date("2026-01-05T09:00:00Z"), new Date("2026-01-09T09:00:00Z"), CAL)).toBe(3);
  });

  it("nunca hardcodea festivos: sin festivos el mismo tramo da un día más", () => {
    expect(diasLaborables(new Date("2026-01-05T09:00:00Z"), new Date("2026-01-09T09:00:00Z"), { festivos: [] })).toBe(4);
  });
});

describe("motor de evaluación: nunca fabrica cumplimiento", () => {
  it("target nulo → no evaluable, no cumple por defecto", () => {
    const r = evaluarRegla(regla({ target: null }), { eventos: { creacion_ot: "2026-01-01T00:00:00Z", cierre: "2026-01-02T00:00:00Z" } });
    expect(r.evaluable).toBe(false);
    expect(r.motivo_no_evaluable).toBe("sin_sla_cuantificado");
    expect(r.cumple_target).toBeUndefined();
  });

  it("falta el evento de inicio o de fin → no evaluable con motivo explícito", () => {
    expect(evaluarRegla(regla(), { eventos: { cierre: "2026-01-02T00:00:00Z" } }).motivo_no_evaluable).toBe("falta creacion_ot");
    expect(evaluarRegla(regla(), { eventos: { creacion_ot: "2026-01-02T00:00:00Z" } }).motivo_no_evaluable).toBe("falta cierre");
  });

  it("unidad laborable sin calendario → no evaluable", () => {
    const r = evaluarRegla(regla({ unidad: "horas_laborables", calendario: "laborable_es", target: 24 }), {
      eventos: { creacion_ot: "2026-01-05T10:00:00Z", cierre: "2026-01-06T10:00:00Z" },
    });
    expect(r.evaluable).toBe(false);
    expect(r.motivo_no_evaluable).toBe("sin_calendario_laboral");
  });

  it("evalúa horas laborables cuando se inyecta el calendario", () => {
    const r = evaluarRegla(
      regla({ unidad: "horas_laborables", calendario: "laborable_es", evento_fin: "primer_contacto", target: 8 }),
      { eventos: { creacion_ot: "2026-01-05T10:00:00Z", primer_contacto: "2026-01-05T15:00:00Z" } },
      CAL,
    );
    expect(r.evaluable).toBe(true);
    expect(r.transcurrido).toBeCloseTo(5, 6);
    expect(r.cumple_target).toBe(true);
  });

  it("aplica hard limit independientemente del objetivo", () => {
    const r = evaluarRegla(regla({ target: 10, hard_limit: 20 }), {
      eventos: { creacion_ot: "2026-01-01T00:00:00Z", cierre: "2026-01-26T00:00:00Z" },
    });
    expect(r.cumple_target).toBe(false);
    expect(r.supera_hard_limit).toBe(true);
  });

  it("solo descuenta las pausas que la regla declara", () => {
    const eventos = { eventos: { creacion_ot: "2026-01-01T00:00:00Z", cierre: "2026-01-07T00:00:00Z" }, pausas: { espera_repuesto: 48 } };
    expect(evaluarRegla(regla(), eventos).transcurrido).toBeCloseTo(6, 6);
    expect(evaluarRegla(regla({ pausas_exclusiones: ["espera_repuesto"] }), eventos).transcurrido).toBeCloseTo(4, 6);
  });

  it("la imputabilidad por determinar no se convierte en imputable a WG", () => {
    const r = evaluarRegla(regla({ imputabilidad: "por_determinar" }), {
      eventos: { creacion_ot: "2026-01-01T00:00:00Z", cierre: "2026-01-03T00:00:00Z" },
    });
    expect(r.imputable).toBe("por_determinar");
  });
});

describe("reglas agregadas", () => {
  const res = (ok: boolean, t: number): ResultadoRegla => ({ evaluable: true, unidad: "dias_naturales", transcurrido: t, cumple_target: ok });

  it("el denominador son solo las OTs evaluables", () => {
    const r = evaluarReglaAgregada(regla({ regla_medicion: "porcentaje_ots", umbral_agregado: 0.9 }), [
      res(true, 3), res(true, 4), res(false, 30),
      { evaluable: false, unidad: "dias_naturales", motivo_no_evaluable: "falta cierre" },
    ]);
    expect(r.denominador).toBe(3);
    expect(r.numerador).toBe(2);
    expect(r.cumple_umbral).toBe(false);
  });

  it("sin denominador evaluable no hay resultado", () => {
    expect(evaluarReglaAgregada(regla({ regla_medicion: "porcentaje_ots", umbral_agregado: 0.9 }), []).evaluable).toBe(false);
  });

  it("sin umbral agregado declarado no se declara cumplimiento", () => {
    const r = evaluarReglaAgregada(regla({ regla_medicion: "porcentaje_ots" }), [res(true, 2)]);
    expect(r.evaluable).toBe(false);
    expect(r.motivo_no_evaluable).toBe("sin_umbral_agregado");
  });

  it("la unidad porcentaje no se evalúa por OT", () => {
    expect(evaluarRegla(regla({ unidad: "porcentaje" }), { eventos: { creacion_ot: "2026-01-01T00:00:00Z", cierre: "2026-01-02T00:00:00Z" } }).motivo_no_evaluable)
      .toBe("regla_agregada_requiere_conjunto");
  });

  it("meses consecutivos: exige serie suficiente y detecta la racha", () => {
    const r3 = regla({ regla_medicion: "meses_consecutivos", meses_consecutivos: 3 });
    expect(evaluarMesesConsecutivos(r3, [true, true]).evaluable).toBe(false);
    expect(evaluarMesesConsecutivos(r3, [true, false, true, true, true]).incumple).toBe(true);
    expect(evaluarMesesConsecutivos(r3, [true, true, false, true, true]).incumple).toBe(false);
  });

  it("repeat repair dentro de la ventana de garantía", () => {
    const r = regla({ ventana_garantia_dias: 90 });
    expect(evaluarRepeatRepair(r, "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z").esRepeat).toBe(true);
    expect(evaluarRepeatRepair(r, "2026-01-01T00:00:00Z", "2026-06-01T00:00:00Z").esRepeat).toBe(false);
    expect(evaluarRepeatRepair(regla(), "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z").evaluable).toBe(false);
  });
});

describe("consecuencias declaradas", () => {
  it("nunca devuelve un importe económico", () => {
    for (const r of FIXTURES_REGISTRY) {
      expect(consecuenciaDeclarada(r).importe).toBeNull();
    }
  });

  it("solo es cuantificable si el contrato lo declara así", () => {
    expect(consecuenciaDeclarada(regla({ exposicion_estado: "cuantificable" })).cuantificable).toBe(true);
    expect(consecuenciaDeclarada(regla({ exposicion_estado: "pendiente_cuantificar" })).cuantificable).toBe(false);
  });
});

describe("fixtures del Registry", () => {
  it("cubre al menos nueve casuísticas distintas y todas nacen en borrador", () => {
    expect(FIXTURES_REGISTRY.length).toBeGreaterThanOrEqual(9);
    for (const r of FIXTURES_REGISTRY) expect(r.estado_regla).toBe("borrador");
  });

  it("todas las filas traen los campos obligatorios informados", () => {
    for (const r of FIXTURES_REGISTRY) {
      for (const c of CAMPOS_OBLIGATORIOS_REGLA) {
        expect(r[c], `${r.cliente} · ${String(c)}`).not.toBeUndefined();
        expect(r[c], `${r.cliente} · ${String(c)}`).not.toBeNull();
      }
    }
  });

  it("incluye las casuísticas críticas del negocio", () => {
    const f = FIXTURES_REGISTRY;
    expect(f.some((r) => r.target === null)).toBe(true);                       // sin SLA cuantificado
    expect(f.some((r) => r.unidad === "horas_laborables")).toBe(true);         // reloj laborable
    expect(f.some((r) => r.hard_limit != null)).toBe(true);                    // objetivo + límite duro
    expect(f.some((r) => r.pausas_exclusiones.length > 0)).toBe(true);         // exclusiones
    expect(f.some((r) => r.bonus && r.penalizacion)).toBe(true);               // bonus/malus
    expect(f.some((r) => r.meses_consecutivos != null)).toBe(true);            // reiteración mensual
    expect(f.some((r) => r.ventana_garantia_dias != null)).toBe(true);         // repeat repair
    expect(f.some((r) => r.fase === "preventa")).toBe(true);                   // instalación
    expect(f.some((r) => r.tipo_consecuencia === "coste_baja")).toBe(true);    // coste de la baja
    expect(f.some((r) => r.regla_medicion === "reporting")).toBe(true);        // obligación no medible por OT
  });
});
