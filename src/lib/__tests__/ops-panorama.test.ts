import { describe, it, expect } from "vitest";
import {
  agruparEtapasPanorama,
  balanceCalculado,
  clasificarConfianza,
  clasificarImpacto,
  construirAsuntos,
  cuadraBalance,
  dedupAsuntos,
  descuadreBalance,
  lecturaBalance,
  pctBajasSalida,
  situationLine,
  tonoVariacion,
  DESC_TARGET,
  ETIQUETA_REFERENCIA_OPERATIVA,
  LABEL_TARGET,
  MAX_ASUNTOS,
  REGLAS_PRIORIZACION,
  type Asunto,
  type AsuntosInput,
  type Balance,
} from "@/lib/ops-panorama";
import { DOMINIOS_DATOS, dominioDato } from "@/lib/ops-data-quality";

const bal = (p: Partial<Balance> = {}): Balance => ({
  backlogIni: 3589,
  entrantes: 5606,
  reparadas: 4178,
  bajas: 1059,
  backlogFin: 3958,
  sinFechaCreacion: 0,
  ...p,
});

describe("ecuación de balance", () => {
  it("cuadra ini + entrantes − reparadas − bajas = final", () => {
    const b = bal();
    expect(balanceCalculado(b)).toBe(3958);
    expect(b.backlogFin).toBe(balanceCalculado(b));
    expect(cuadraBalance(b)).toBe(true);
    expect(descuadreBalance(b)).toBe(0);
  });

  it("detecta descuadre cuando el origen tiene fechas incompletas", () => {
    const b = bal({ backlogFin: 3970, sinFechaCreacion: 12 });
    expect(cuadraBalance(b)).toBe(false);
    expect(descuadreBalance(b)).toBe(12);
    expect(lecturaBalance(b)).toContain("no tienen fecha de creación");
  });

  it("la lectura separa siempre reparaciones de bajas", () => {
    const txt = lecturaBalance(bal());
    expect(txt).toContain("4178 son reparaciones");
    expect(txt).toContain("1059 son bajas");
    expect(txt).toContain("no se repara");
    expect(pctBajasSalida(bal())).toBeCloseTo(1059 / 5237, 6);
  });

  it("declara acumulación cuando el backlog crece", () => {
    expect(lecturaBalance(bal({ backlogIni: 100, entrantes: 200, reparadas: 100, bajas: 20, backlogFin: 180 }))).toContain(
      "Acumulando demanda",
    );
  });

  it("pctBajasSalida es null sin salidas", () => {
    expect(pctBajasSalida(bal({ reparadas: 0, bajas: 0 }))).toBeNull();
  });
});

describe("taxonomía de targets", () => {
  it("expone los seis tipos con descripción", () => {
    expect(Object.keys(LABEL_TARGET)).toHaveLength(6);
    for (const k of Object.keys(LABEL_TARGET) as Array<keyof typeof LABEL_TARGET>) {
      expect(DESC_TARGET[k].length).toBeGreaterThan(20);
    }
  });

  it("≤20d se etiqueta como referencia operativa, nunca como SLA contractual", () => {
    expect(ETIQUETA_REFERENCIA_OPERATIVA).toContain("no contractual");
    expect(ETIQUETA_REFERENCIA_OPERATIVA.toLowerCase()).not.toContain("sla contractual");
    expect(DESC_TARGET.operational_reference).toContain("No es contractual");
  });

  it("una variación sin target aplicable es neutra, nunca mala", () => {
    expect(tonoVariacion("no_target", false)).toBe("neutro");
    expect(tonoVariacion("operational_reference", false)).toBe("desfavorable");
    expect(tonoVariacion("operational_reference", null)).toBe("neutro");
  });
});

describe("situation line", () => {
  const base = {
    periodoLabel: "Junio 2026",
    comparadaLabel: "junio 2025",
    totalOts: 12438,
    backlogFin: 1284,
    varBacklogPct: -0.062,
    referencia20: 0.784,
    nAsuntos: 3,
  };

  it("incluye período, volumen, backlog con variación, referencia y asuntos", () => {
    const s = situationLine(base);
    expect(s).toContain("Junio 2026");
    expect(s).toContain("12.438 OTs");
    expect(s).toContain("Backlog 1284 ↓6.2% vs junio 2025");
    expect(s).toContain("Referencia operativa ≤20d: 78.4%");
    expect(s).toContain("3 asuntos requieren atención");
  });

  it("omite la variación cuando no hay comparable", () => {
    const s = situationLine({ ...base, comparadaLabel: null, varBacklogPct: null });
    expect(s).toContain("Backlog 1284 ·");
    expect(s).not.toContain("vs");
  });

  it("no habla de cumplimiento contractual", () => {
    expect(situationLine(base).toLowerCase()).not.toContain("contractual ");
  });
});

describe("chips de impacto y confianza", () => {
  it("impacto por materialidad sobre el universo", () => {
    expect(clasificarImpacto(600, 10000)).toBe("alto");
    expect(clasificarImpacto(200, 10000)).toBe("medio");
    expect(clasificarImpacto(50, 10000)).toBe("bajo");
    expect(clasificarImpacto(10, 0)).toBe("bajo");
  });

  it("confianza por muestra y existencia de comparable", () => {
    expect(clasificarConfianza(5, true)).toBe("limitada");
    expect(clasificarConfianza(15, true)).toBe("media");
    expect(clasificarConfianza(40, true)).toBe("alta");
    expect(clasificarConfianza(40, false)).toBe("media");
  });
});

const asunto = (p: Partial<Asunto>): Asunto => ({
  fenomeno: "x",
  titulo: "t",
  hecho: "h",
  hipotesis: "hip",
  accion: "acc",
  impacto: "bajo",
  confianza: "media",
  deterioro: false,
  volumen: 0,
  destino: "/operaciones",
  destinoLabel: "Ver",
  ...p,
});

describe("cola de asuntos", () => {
  it("un fenómeno = un asunto (deduplica y fusiona hechos)", () => {
    const out = dedupAsuntos([
      asunto({ fenomeno: "tecnico:ANA", hecho: "A", impacto: "medio", volumen: 40 }),
      asunto({ fenomeno: "tecnico:ANA", hecho: "B", impacto: "bajo", volumen: 10 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].hecho).toBe("A B");
    expect(out[0].impacto).toBe("medio");
  });

  it("prioriza por impacto, deterioro, volumen y confianza", () => {
    const out = dedupAsuntos([
      asunto({ fenomeno: "c", impacto: "bajo", volumen: 900 }),
      asunto({ fenomeno: "a", impacto: "alto", volumen: 10, deterioro: false }),
      asunto({ fenomeno: "b", impacto: "alto", volumen: 5, deterioro: true }),
    ]);
    expect(out.map((a) => a.fenomeno)).toEqual(["b", "a", "c"]);
    expect(REGLAS_PRIORIZACION.length).toBeGreaterThanOrEqual(4);
  });

  const input: AsuntosInput = {
    universo: 9195,
    hayComparable: true,
    balance: bal(),
    abiertas: 3958,
    abiertas30: 1200,
    referencia20: 0.71,
    referencia20Prev: 0.79,
    ratioBajas: 0.25,
    ratioBajasPrev: 0.2,
    etapas: [
      { categoria: "esperando_repuesto", n: 900, n30: 400, edadMedia: 44 },
      { categoria: "pendiente_reparacion", n: 500, n30: 100, edadMedia: 12 },
    ],
    caidas: [{ tecnico: "ANA", n_now: 10, n_prev: 40 }],
    calidadTec: [{ tecnico: "ANA", n: 35, pct_bajas: 0.4, pct_bajas_esp: 0.15, pct_nff: 0.2, pct_nff_esp: 0.05 }],
    provincias: [{ provincia: "MADRID", abiertas_30: 300 }, { provincia: "SEVILLA", abiertas_30: 120 }],
    conclusiones: [{ tipo: "hecho", texto: "Los cierres bajan un 4%.", ambito: "Compañía" }],
    // F4B: el asunto de espera de repuesto solo existe con cifra de Supply.
    supplyPte: { n: 900, n30: 400, edad_media: 44, n_prev: 850, asOf: "2026-07-25" },
  };

  it("nunca devuelve más de 6 asuntos y fusiona técnico duplicado", () => {
    const out = construirAsuntos(input);
    expect(out.length).toBeLessThanOrEqual(MAX_ASUNTOS);
    const claves = out.map((a) => a.fenomeno);
    expect(new Set(claves).size).toBe(claves.length);
    expect(claves.filter((k) => k.startsWith("tecnico:ANA"))).toHaveLength(1);
  });

  it("los HECHOS reproducen las cifras del módulo origen", () => {
    const out = construirAsuntos(input);
    const backlog = out.find((a) => a.fenomeno === "backlog_envejecido");
    expect(backlog?.hecho).toContain("1200 de 3958");
    const rep = out.find((a) => a.fenomeno === "espera_repuesto");
    expect(rep?.hecho).toContain("900 OTs abiertas");
    const sla = out.find((a) => a.fenomeno === "referencia_operativa_20d");
    expect(sla?.hecho).toContain("71.0%");
    expect(sla?.hecho).toContain("79.0%");
  });

  it("los drill-downs apuntan a rutas reales de /operaciones", () => {
    for (const a of construirAsuntos(input)) {
      expect(a.destino.startsWith("/operaciones")).toBe(true);
    }
    expect(construirAsuntos(input).find((a) => a.fenomeno === "espera_repuesto")?.destino).toBe("/operaciones/repuestos#esperando-pieza");
  });

  it("sin comparable no marca deterioro por caída de referencia y baja la confianza", () => {
    const out = construirAsuntos({ ...input, hayComparable: false, referencia20Prev: null, ratioBajasPrev: null });
    const sla = out.find((a) => a.fenomeno === "referencia_operativa_20d");
    expect(sla?.deterioro).toBe(false);
    expect(sla?.confianza).not.toBe("alta");
    expect(out.find((a) => a.fenomeno === "ratio_bajas")).toBeUndefined();
  });

  it("no produce asuntos cuando todo está en rango", () => {
    const out = construirAsuntos({
      ...input,
      referencia20: 0.9,
      referencia20Prev: 0.89,
      abiertas30: 10,
      ratioBajas: 0.2,
      ratioBajasPrev: 0.2,
      etapas: [{ categoria: "pendiente_reparacion", n: 500, n30: 10, edadMedia: 8 }],
      caidas: [],
      calidadTec: [],
      provincias: [],
      conclusiones: [],
    });
    expect(out).toHaveLength(0);
  });
});

describe("etapas del panorama", () => {
  it("agrupa literales en categorías con media ponderada", () => {
    const out = agruparEtapasPanorama([
      { estado: "PTE. PIEZAS", n: 100, edad_media: 40, n30: 60 },
      { estado: "AVISADO A SAT", n: 50, edad_media: 20, n30: 10 },
      { estado: "PTE. ASIGNAR SAT", n: 50, edad_media: 30, n30: 10 },
    ]);
    const sat = out.find((e) => e.categoria === "en_red_sat");
    expect(sat?.n).toBe(100);
    expect(sat?.edadMedia).toBeCloseTo(25, 6);
    expect(out.find((e) => e.categoria === "esperando_repuesto")?.n30).toBe(60);
  });
});

describe("registro de dominios de dato", () => {
  it("declara los dominios de capacidad y contractuales como no disponibles", () => {
    for (const id of ["fte_disponibles", "produccion_fte_dia", "utilizacion", "reglas_contractuales"]) {
      expect(dominioDato(id)?.estado).toBe("pendiente");
    }
    expect(dominioDato("dias_trabajados")?.estado).toBe("parcial");
    expect(DOMINIOS_DATOS.every((d) => d.kpisBloqueados.length > 0)).toBe(true);
  });
});
