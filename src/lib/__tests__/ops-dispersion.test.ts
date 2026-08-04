import { describe, it, expect } from "vitest";
import {
  normalizaCp,
  esCpValido,
  casaCpProvincia,
  mediana,
  pctCompleto,
  clasificarTerritorio,
  clasificarTecnico,
  clasificarSat,
  top1BacklogShare,
  detectarPuntosUnicosFallo,
  observacionTerritorio,
  validarCalidadDisp,
  generarHallazgos,
  PESO_NIVEL,
  UMBRALES_DISPERSION,
  type DispProvincia,
  type DispTecnico,
  type DispSat,
  type DispKpis,
  type DispCalidad,
} from "../ops-dispersion";

// ---------------------------------------------------------------- CP
describe("normalizaCp", () => {
  it("normaliza CPs con espacios y rellena a 5 dígitos", () => {
    expect(normalizaCp("28001 ")).toBe("28001");
    expect(normalizaCp("8013")).toBe("08013");
    // regla: se eliminan los no-dígitos tal cual (28.801 → 28801)
    expect(normalizaCp("28.801")).toBe("28801");
  });
  it("rechaza formatos no normalizables", () => {
    expect(normalizaCp("123")).toBeNull();
    expect(normalizaCp("123456")).toBeNull();
    expect(normalizaCp("")).toBeNull();
    expect(normalizaCp(null)).toBeNull();
    expect(normalizaCp("abcde")).toBeNull();
  });
  it("esCpValido refleja normalizaCp", () => {
    expect(esCpValido("46001")).toBe(true);
    expect(esCpValido("12")).toBe(false);
  });
});

describe("casaCpProvincia", () => {
  it("valida el prefijo de 2 dígitos contra la provincia", () => {
    expect(casaCpProvincia("28001", "MADRID")).toBe(true);
    expect(casaCpProvincia("08001", "MADRID")).toBe(false);
    expect(casaCpProvincia("46002", "Valencia")).toBe(true);
  });
  it("devuelve null cuando no se puede determinar", () => {
    expect(casaCpProvincia("28001", "PROVINCIA_INVENTADA")).toBeNull();
    expect(casaCpProvincia("123", "MADRID")).toBeNull();
    expect(casaCpProvincia(null, "MADRID")).toBeNull();
    expect(casaCpProvincia("28001", null)).toBeNull();
  });
});

// ---------------------------------------------------------------- estadística
describe("mediana / pctCompleto", () => {
  it("mediana con impar, par y vacío", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });
  it("pctCompleto protege división por cero", () => {
    expect(pctCompleto(50, 100)).toBe(0.5);
    expect(pctCompleto(1, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------- territorio
const baseTerr = {
  cerradas: 100,
  cuotaTop1: null as number | null,
  cuotaTop3: null as number | null,
  abiertas: 10,
  abiertas30: 2,
  pctFueraCapital: null as number | null,
  top1BacklogShare: null as number | null,
};

describe("clasificarTerritorio", () => {
  it("información insuficiente por debajo de la muestra mínima", () => {
    const r = clasificarTerritorio({ ...baseTerr, cerradas: UMBRALES_DISPERSION.MUESTRA_MIN - 1 });
    expect(r.nivel).toBe("informacion_insuficiente");
    expect(r.regla).toContain("Muestra insuficiente");
  });
  it("riesgo crítico por envejecimiento grave", () => {
    const r = clasificarTerritorio({ ...baseTerr, abiertas: 100, abiertas30: 35 });
    expect(r.nivel).toBe("riesgo_critico_cobertura");
    expect(r.regla).toContain("Envejecimiento");
  });
  it("riesgo crítico por punto único de fallo activo", () => {
    const r = clasificarTerritorio({ ...baseTerr, cuotaTop1: 0.7, top1BacklogShare: 0.6 });
    expect(r.nivel).toBe("riesgo_critico_cobertura");
    expect(r.regla).toContain("Punto único de fallo");
  });
  it("alta por dependencia del recurso principal", () => {
    const r = clasificarTerritorio({ ...baseTerr, cuotaTop1: 0.65, top1BacklogShare: 0.2 });
    expect(r.nivel).toBe("alta");
  });
  it("alta por concentración top-3", () => {
    const r = clasificarTerritorio({ ...baseTerr, cuotaTop1: 0.3, cuotaTop3: 0.92 });
    expect(r.nivel).toBe("alta");
  });
  it("alta por actividad fuera de capital", () => {
    const r = clasificarTerritorio({ ...baseTerr, pctFueraCapital: 0.7 });
    expect(r.nivel).toBe("alta");
  });
  it("moderada por dependencia o dispersión intermedia", () => {
    expect(clasificarTerritorio({ ...baseTerr, cuotaTop1: 0.45 }).nivel).toBe("moderada");
    expect(clasificarTerritorio({ ...baseTerr, pctFueraCapital: 0.55 }).nivel).toBe("moderada");
  });
  it("baja cuando ningún umbral se supera", () => {
    expect(clasificarTerritorio(baseTerr).nivel).toBe("baja");
  });
});

// ---------------------------------------------------------------- técnico / SAT
describe("clasificarTecnico", () => {
  it("insuficiente sin muestra o sin mediana comparable", () => {
    expect(clasificarTecnico({ cerradas: 5, municipios: 40, medianaMunicipiosDeleg: 10 }).nivel).toBe("informacion_insuficiente");
    expect(clasificarTecnico({ cerradas: 100, municipios: 40, medianaMunicipiosDeleg: null }).nivel).toBe("informacion_insuficiente");
  });
  it("alta a 2× la mediana con mínimo de municipios", () => {
    const r = clasificarTecnico({ cerradas: 100, municipios: 30, medianaMunicipiosDeleg: 12 });
    expect(r.nivel).toBe("alta");
    expect(r.regla).toContain("2.5×");
  });
  it("moderada a 1.5× la mediana", () => {
    expect(clasificarTecnico({ cerradas: 100, municipios: 18, medianaMunicipiosDeleg: 12 }).nivel).toBe("moderada");
  });
  it("baja en línea con la delegación", () => {
    expect(clasificarTecnico({ cerradas: 100, municipios: 12, medianaMunicipiosDeleg: 12 }).nivel).toBe("baja");
  });
  it("no dispara 'alta' con pocos municipios aunque el factor sea grande", () => {
    expect(clasificarTecnico({ cerradas: 100, municipios: 8, medianaMunicipiosDeleg: 3 }).nivel).toBe("baja");
  });
});

describe("clasificarSat", () => {
  it("alta con alcance ≥ 2× la mediana de la red", () => {
    expect(clasificarSat({ cerradas: 50, provincias: 8 }, 3).nivel).toBe("alta");
  });
  it("insuficiente con poca muestra", () => {
    expect(clasificarSat({ cerradas: 5, provincias: 20 }, 3).nivel).toBe("informacion_insuficiente");
  });
  it("baja dentro del alcance habitual", () => {
    expect(clasificarSat({ cerradas: 50, provincias: 3 }, 3).nivel).toBe("baja");
  });
});

// ---------------------------------------------------------------- dependencia
const prov = (over: Partial<DispProvincia>): DispProvincia => ({
  provincia: "MADRID",
  cerradas: 100,
  abiertas: 10,
  abiertas30: 2,
  sla20: 0.8,
  pct_bajas: 0.1,
  municipios: 20,
  cps: 40,
  recursos: 5,
  ots_por_recurso: 20,
  pct_fuera_capital: 0.4,
  km_mediana: 12,
  salidas_km: 60,
  top1: "SAT X",
  top1_n: 70,
  cuota_top1: 0.7,
  cuota_top3: 0.9,
  top1_n30: 5,
  n30_asignado: 8,
  ...over,
});

describe("detectarPuntosUnicosFallo", () => {
  it("detecta dependencia alta con muestra suficiente y calcula share de backlog", () => {
    const r = detectarPuntosUnicosFallo([prov({})]);
    expect(r).toHaveLength(1);
    expect(r[0]!.recurso).toBe("SAT X");
    expect(r[0]!.backlogShare).toBeCloseTo(5 / 8);
    expect(r[0]!.regla).toContain("ACTIVO");
  });
  it("protección de muestra: alta concentración con demanda muy baja NO es problema", () => {
    const r = detectarPuntosUnicosFallo([prov({ cerradas: UMBRALES_DISPERSION.MUESTRA_MIN_DEPENDENCIA - 1 })]);
    expect(r).toHaveLength(0);
  });
  it("ignora cuotas por debajo del umbral y recursos sin nombre", () => {
    expect(detectarPuntosUnicosFallo([prov({ cuota_top1: 0.5 })])).toHaveLength(0);
    expect(detectarPuntosUnicosFallo([prov({ top1: null })])).toHaveLength(0);
  });
  it("top1BacklogShare devuelve null sin backlog asignado", () => {
    expect(top1BacklogShare(prov({ top1_n30: null, n30_asignado: 0 }))).toBeNull();
  });
});

describe("observacionTerritorio", () => {
  it("prioriza el punto único de fallo activo", () => {
    expect(observacionTerritorio(prov({}))).toContain("Dependencia de SAT X");
  });
  it("señala envejecimiento grave cuando no hay dependencia", () => {
    expect(observacionTerritorio(prov({ cuota_top1: 0.2, abiertas: 100, abiertas30: 40 }))).toContain("Envejecimiento grave");
  });
  it("devuelve null para territorios equilibrados", () => {
    expect(observacionTerritorio(prov({ cuota_top1: 0.2, pct_fuera_capital: 0.3 }))).toBeNull();
  });
});

// ---------------------------------------------------------------- calidad
const cal = (over: Partial<DispCalidad>): DispCalidad => ({
  total: 1000,
  sin_provincia: 0,
  sin_municipio: 0,
  cp_invalido: 0,
  cp_no_geocodificado: 0,
  cp_no_casa: 0,
  propio_sin_tecnico: 0,
  sat_sin_nombre: 0,
  sin_geo_propio: 0,
  sin_geo_sat: 0,
  ...over,
});

describe("validarCalidadDisp", () => {
  it("sin avisos cuando el dato está completo", () => {
    expect(validarCalidadDisp(cal({}))).toHaveLength(0);
  });
  it("la red SAT sin geografía es INFO esperada, no error", () => {
    const a = validarCalidadDisp(cal({ sin_geo_sat: 50, sin_provincia: 60 }));
    const info = a.find((x) => x.mensaje.includes("red SAT externa"));
    expect(info?.severidad).toBe("info");
  });
  it("CP que no casa con la provincia es excepción operativa (info), no error", () => {
    const a = validarCalidadDisp(cal({ cp_no_casa: 12 }));
    expect(a[0]!.severidad).toBe("info");
    expect(a[0]!.mensaje).toContain("excepción operativa");
  });
  it("propio sin técnico y sin geografía son avisos", () => {
    const a = validarCalidadDisp(cal({ propio_sin_tecnico: 3, sin_geo_propio: 7 }));
    expect(a.find((x) => x.mensaje.includes('tipo "Técnico propio"'))?.severidad).toBe("aviso");
    expect(a.find((x) => x.mensaje.includes("plantilla propia sin provincia"))?.severidad).toBe("aviso");
  });
});

// ---------------------------------------------------------------- hallazgos
const kpisBase: DispKpis = {
  cerradas: 1000, abiertas: 100, abiertas30: 30,
  con_provincia: 950, con_municipio: 940, cp_valido: 990, geocodificadas: 800,
  capital_si: 300, capital_no: 650,
  provincias_servidas: 30, municipios_servidos: 800, cps_servidos: 1500,
  salidas_km: 500, km_mediana: 14, km_media: 18,
  km_reales_total: 9000, km_reales_tecnicos: 30,
};

const tec = (over: Partial<DispTecnico>): DispTecnico => ({
  tecnico: "TEC1", delegacion: "Central", cerradas: 100, abiertas: 5, abiertas30: 1,
  sla20: 0.8, pct_bajas: 0.1, municipios: 34, cps: 50, provincias: 2,
  pct_fuera_capital: 0.5, km_mediana: 20, salidas_km: 60, km_reales: 300, km_reales_meses: 3,
  ...over,
});

const sat = (over: Partial<DispSat>): DispSat => ({
  sat: "SAT AMPLIO", cerradas: 60, abiertas: 4, abiertas30: 1,
  sla20: 0.75, pct_bajas: 0.12, provincias: 9, municipios: 30, cps: 45,
  pct_fuera_capital: 0.6,
  ...over,
});

describe("generarHallazgos", () => {
  it("genera como máximo 5 hallazgos con confianza declarada", () => {
    const hs = generarHallazgos({
      kpis: kpisBase,
      provincias: [prov({})],
      tecnicos: [tec({})],
      sats: [sat({}), sat({ sat: "B", provincias: 3 }), sat({ sat: "C", provincias: 3 })],
      medianasMunicipiosDeleg: new Map([["Central", 12]]),
    });
    expect(hs.length).toBeLessThanOrEqual(5);
    expect(hs.length).toBeGreaterThan(0);
    for (const h of hs) {
      expect(h.hecho.length).toBeGreaterThan(0);
      expect(["real", "aproximado"]).toContain(h.confianza);
    }
  });
  it("el punto único de fallo es el primer hallazgo cuando existe", () => {
    const hs = generarHallazgos({
      kpis: kpisBase,
      provincias: [prov({})],
      tecnicos: [],
      sats: [],
      medianasMunicipiosDeleg: new Map(),
    });
    expect(hs[0]!.hecho).toContain("MADRID");
    expect(hs[0]!.confianza).toBe("real");
  });
  it("sin datos suficientes devuelve lista vacía", () => {
    const hs = generarHallazgos({
      kpis: { ...kpisBase, cerradas: 0, capital_si: 0, capital_no: 0 },
      provincias: [],
      tecnicos: [],
      sats: [],
      medianasMunicipiosDeleg: new Map(),
    });
    expect(hs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- orden atención
describe("PESO_NIVEL", () => {
  it("ordena riesgo crítico primero y baja al final", () => {
    expect(PESO_NIVEL.riesgo_critico_cobertura).toBeLessThan(PESO_NIVEL.alta);
    expect(PESO_NIVEL.alta).toBeLessThan(PESO_NIVEL.moderada);
    expect(PESO_NIVEL.informacion_insuficiente).toBeLessThan(PESO_NIVEL.baja);
  });
});
