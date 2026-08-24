import { describe, it, expect } from "vitest";
import { PLANTILLAS, detectTable, normalizeRow } from "@/lib/ops-csv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fechaAsOfDelLote, DOMINIO_POR_TABLA } from "@/lib/ops-csv";
import {
  desfaseEntre,
  etiquetaAsOf,
  frescuraDominio,
  avisoObsolescencia,
  normalizarCargas,
  type CargaDominio,
} from "@/lib/ops-as-of";
import {
  jerarquiaProductividad,
  aplanarJerarquia,
  estadoIndicador,
  INDICADORES_REQUIEREN_RRHH,
  NOTA_DIAS_EFECTIVOS,
  ratiosPorPersonaDiaRrhh,
  PENDIENTE_RRHH_LABEL,
  FUENTE_DESBLOQUEO_RRHH,
  type DiaRrhhLogistica,
  type FilaExpedicion,
} from "@/lib/ops-logistica";
import { construirAsuntos, situationLine } from "@/lib/ops-panorama";

// ─── Reloj del dato ──────────────────────────────────────────────────────────

const cargas = (p: Partial<Record<string, string | null>> = {}): CargaDominio[] =>
  normalizarCargas([
    { dominio: "ot", data_as_of_date: p.ot === undefined ? "2026-07-25" : p.ot, last_successful_load: "2026-07-26T10:00:00Z", filas: 125752 },
    { dominio: "expedicion", data_as_of_date: p.expedicion === undefined ? "2026-07-25" : p.expedicion, last_successful_load: "2026-07-26T10:00:00Z", filas: 4000 },
  ]);

describe("F4B · fecha efectiva del dato", () => {
  it("etiqueta la fecha operativa en formato español y nunca dice 'hoy'", () => {
    const t = etiquetaAsOf("2026-07-25");
    expect(t).toBe("Datos operativos a 25-jul-2026");
    expect(t.toLowerCase()).not.toContain("hoy");
  });

  it("declara obsolescencia cuando el dato va más de 7 días por detrás", () => {
    const f = frescuraDominio(cargas(), "ot", new Date("2026-08-24T00:00:00Z"));
    expect(f.estado).toBe("aceptable");
    expect(f.dias).toBe(30);
    expect(avisoObsolescencia(f)).toContain("no contra hoy");
  });

  it("dentro del umbral no genera aviso", () => {
    const f = frescuraDominio(cargas(), "ot", new Date("2026-07-29T00:00:00Z"));
    expect(f.estado).toBe("fresco");
    expect(avisoObsolescencia(f)).toBeNull();
  });

  it("por encima de 31 días el dominio queda desactualizado", () => {
    const f = frescuraDominio(cargas(), "ot", new Date("2026-10-01T00:00:00Z"));
    expect(f.estado).toBe("desactualizado");
    expect(avisoObsolescencia(f)).toContain("no contra hoy");
  });

  it("un desfase pequeño entre dominios no se marca; uno grande sí", () => {
    expect(desfaseEntre(cargas({ expedicion: "2026-07-23" }), "ot", "expedicion").relevante).toBe(false);
    const grande = desfaseEntre(cargas({ expedicion: "2026-06-01" }), "ot", "expedicion");
    expect(grande.relevante).toBe(true);
    expect(grande.texto).toContain("desfase");
    expect(desfaseEntre(cargas({ expedicion: null }), "ot", "expedicion").relevante).toBe(true);
  });
});

describe("F4B · fecha efectiva deducida del lote importado", () => {
  it("toma la máxima fecha observada y descarta fechas futuras del ERP", () => {
    const d = fechaAsOfDelLote(
      "ops_fact_ot",
      [
        { fecha_creacion: "2026-07-01", fecha_cierre: "2026-07-20" },
        { fecha_creacion: "2026-07-10", fecha_cierre: null },
        { fecha_creacion: "2029-01-01", fecha_cierre: "2029-01-05" },
      ],
      new Date("2026-07-26T00:00:00Z"),
    );
    expect(d).toBe("2026-07-20");
  });

  it("sin fechas utilizables no inventa fecha efectiva", () => {
    expect(fechaAsOfDelLote("ops_fact_ot", [{ num_ot: "1" }])).toBeNull();
    expect(fechaAsOfDelLote("ops_tecnicos", [{ tecnico: "X" }])).toBeNull();
  });

  it("cada tabla importable declara el dominio del reloj que alimenta", () => {
    expect(DOMINIO_POR_TABLA.ops_expedicion).toBe("expedicion");
    expect(DOMINIO_POR_TABLA.ops_stock_snapshot).toBe("stock");
    expect(Object.values(DOMINIO_POR_TABLA).every(Boolean)).toBe(true);
  });
});

// ─── Supply manda sobre la etapa derivada ────────────────────────────────────

const baseAsuntos = {
  universo: 10000,
  hayComparable: true,
  balance: { backlogIni: 4000, entrantes: 6000, reparadas: 5000, bajas: 500, backlogFin: 4500, sinFechaCreacion: 0 },
  abiertas: 4500,
  abiertas30: 900,
  referencia20: 0.7,
  referencia20Prev: 0.72,
  ratioBajas: 0.1,
  ratioBajasPrev: 0.1,
  etapas: [{ categoria: "esperando_repuesto" as const, n: 800, n30: 100, edadMedia: 40, label: "Esperando repuesto" }],
  caidas: [],
  calidadTec: [],
  provincias: [],
  conclusiones: [],
};

describe("F4B · una sola cifra de espera de repuesto", () => {
  const asunto = (i: Parameters<typeof construirAsuntos>[0]) =>
    construirAsuntos(i).find((a) => a.fenomeno === "espera_repuesto");

  it("cuando Supply informa, su cifra sustituye a la etapa derivada", () => {
    const a = asunto({
      ...baseAsuntos,
      supplyPte: { n: 1234, n30: 456, edad_media: 61.4, asOf: "2026-07-25" },
    });
    expect(a?.hecho).toContain("1234");
    expect(a?.hecho).toContain("456");
    expect(a?.hecho).toContain("25-jul-2026");
    expect(a?.hecho).toContain("ops_supply.pte_piezas_actual");
    expect(a?.volumen).toBe(1234);
  });

  it("sin Supply no se publica el asunto: no se calcula en paralelo", () => {
    expect(asunto(baseAsuntos)).toBeUndefined();
  });

  it("no atribuye causalidad al suministro", () => {
    const a = asunto({ ...baseAsuntos, supplyPte: { n: 1234, n30: 456, edad_media: 61.4, asOf: "2026-07-25" } });
    expect(a?.hipotesis.toLowerCase()).toContain("potencial efecto");
    expect(a?.hipotesis.toLowerCase()).not.toContain("cuello de botella");
  });
});

describe("F4B · situation line", () => {
  const i = {
    periodoLabel: "Jun-2026",
    comparadaLabel: "May-2026",
    totalOts: 9000,
    backlogFin: 4500,
    varBacklogPct: 0.05,
    referencia20: 0.7,
    nAsuntos: 3,
  };

  it("abre con la fecha efectiva del dato cuando se conoce", () => {
    expect(situationLine({ ...i, asOf: "2026-07-25" })).toMatch(/^Datos operativos a 25-jul-2026 · Jun-2026/);
  });

  it("sin fecha efectiva no inventa ninguna", () => {
    const s = situationLine(i);
    expect(s.startsWith("Jun-2026")).toBe(true);
    expect(s).not.toContain("Datos operativos");
  });
});

// ─── Productividad de almacén ────────────────────────────────────────────────

const exp = (p: Partial<FilaExpedicion> & Pick<FilaExpedicion, "expedicion_id">): FilaExpedicion => ({
  almacen_base: "SAN AGUSTIN",
  preparado_por: null,
  equipo: null,
  picking_inicio: null,
  picking_fin: null,
  expedicion_timestamp: "2026-06-10T10:00:00Z",
  fecha_entrega_prevista: null,
  fecha_entrega_real: null,
  estado_expedicion: "ENTREGADA",
  tipo_incidencia: null,
  reexpedicion: false,
  coste_transporte: null,
  num_lineas: 3,
  num_unidades: 5,
  num_ot_abastecidas: 1,
  ...p,
});

describe("F4B · jerarquía almacén → equipo → persona", () => {
  const filas = [
    exp({ expedicion_id: "1", equipo: "PICKING A", preparado_por: "ANA" }),
    exp({ expedicion_id: "2", equipo: "PICKING A", preparado_por: "LUIS" }),
    exp({ expedicion_id: "3", equipo: "PICKING B", preparado_por: "EVA" }),
    exp({ expedicion_id: "4", preparado_por: "SIN EQUIPO" }),
    exp({ expedicion_id: "5", almacen_base: "BARCELONA", equipo: "BCN", preparado_por: "JOAN" }),
  ];

  it("agrupa por almacén y nunca mezcla almacenes distintos", () => {
    const j = jerarquiaProductividad(filas);
    expect(j.map((n) => n.entidad).sort()).toEqual(["BARCELONA", "SAN AGUSTIN"]);
    const bcn = j.find((n) => n.entidad === "BARCELONA")!;
    expect(aplanarJerarquia([bcn]).every((n) => n.almacen_base === "BARCELONA")).toBe(true);
  });

  it("las personas cuelgan de su equipo y las que no lo tienen del almacén, sin inventar equipo", () => {
    const sa = jerarquiaProductividad(filas).find((n) => n.entidad === "SAN AGUSTIN")!;
    const equipoA = sa.hijos.find((h) => h.entidad === "PICKING A")!;
    expect(equipoA.nivel).toBe("equipo");
    expect(equipoA.hijos.map((p) => p.entidad).sort()).toEqual(["ANA", "LUIS"]);
    const suelta = sa.hijos.find((h) => h.entidad === "SIN EQUIPO")!;
    expect(suelta.nivel).toBe("persona");
    expect(suelta.padre).toBe("SAN AGUSTIN");
  });

  it("el total del almacén no se duplica al aplanar por niveles", () => {
    const sa = jerarquiaProductividad(filas).find((n) => n.entidad === "SAN AGUSTIN")!;
    expect(sa.expediciones).toBe(4);
    const personas = aplanarJerarquia([sa]).filter((n) => n.nivel === "persona");
    expect(personas.reduce((s, p) => s + p.expediciones, 0)).toBe(4);
  });
});

describe("F4B · los ratios por persona y día esperan a RRHH", () => {
  it("sin RRHH son diagnóstico interno, no medida de rendimiento", () => {
    for (const k of INDICADORES_REQUIEREN_RRHH) {
      expect(estadoIndicador(k, false)).toBe("pendiente_rrhh_logistica");
      expect(estadoIndicador(k, true)).toBe("publicable");
    }
    expect(estadoIndicador("lineas_hora", false)).toBe("publicable");
  });

  it("la nota explica que el denominador es provisional", () => {
    expect(NOTA_DIAS_EFECTIVOS).toContain("días reales de presencia");
    expect(NOTA_DIAS_EFECTIVOS).toContain("ops_rrhh");
  });
});

// ─── F4B.1 · El proxy no llega a pantalla; el cálculo real espera a RRHH ─────

describe("F4B.1 · ratios por persona y día trabajado", () => {
  const filasRrhh = [
    exp({ expedicion_id: "1", preparado_por: "ANA", expedicion_timestamp: "2026-06-02T09:00:00Z" }),
    exp({ expedicion_id: "2", preparado_por: "ANA", expedicion_timestamp: "2026-06-03T09:00:00Z" }),
    exp({ expedicion_id: "3", preparado_por: "ANA", expedicion_timestamp: "2026-06-04T09:00:00Z" }),
    exp({ expedicion_id: "4", preparado_por: "ANA", expedicion_timestamp: "2026-06-05T09:00:00Z" }),
    exp({ expedicion_id: "5", preparado_por: "SIN FICHA", expedicion_timestamp: "2026-06-05T09:00:00Z" }),
  ];
  // F4B: presencia diaria real (una fila por persona y día), no meses agregados.
  const rrhh: DiaRrhhLogistica[] = Array.from({ length: 20 }, (_, i) => ({
    persona_id: "ANA",
    almacen_base: "CENTRAL",
    fecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
    presente: true,
  }));

  it("sin RRHH disponible no devuelve ninguna cifra", () => {
    const r = ratiosPorPersonaDiaRrhh(filasRrhh, rrhh, false);
    expect(r.estado).toBe("pendiente_rrhh_logistica");
    expect(r.expedicionesPorPersonaDia).toBeNull();
    expect(r.lineasPorPersonaDia).toBeNull();
    expect(r.unidadesPorPersonaDia).toBeNull();
    expect(r.otsAbastecidasPorPersonaDia).toBeNull();
  });

  it("con RRHH divide por días efectivamente trabajados, no por días con expedición", () => {
    const r = ratiosPorPersonaDiaRrhh(filasRrhh, rrhh, true);
    expect(r.estado).toBe("medible");
    expect(r.diasTrabajados).toBe(20);
    expect(r.personas).toBe(1);
    expect(r.personasSinRrhh).toBe(1);        // SIN FICHA queda fuera, no se estima
    expect(r.expedicionesPorPersonaDia).toBeCloseTo(4 / 20, 6);
    expect(r.lineasPorPersonaDia).toBeCloseTo(12 / 20, 6);
    expect(r.unidadesPorPersonaDia).toBeCloseTo(20 / 20, 6);
    expect(r.otsAbastecidasPorPersonaDia).toBeCloseTo(4 / 20, 6);
    expect(r.cobertura.n).toBe(4);
  });

  it("RRHH sin días trabajados útiles no desbloquea nada", () => {
    const r = ratiosPorPersonaDiaRrhh(filasRrhh, [{ persona_id: "ANA", almacen_base: "CENTRAL", fecha: "2026-06-01", presente: false }], true);
    expect(r.estado).toBe("pendiente_rrhh_logistica");
  });

  it("la etiqueta de bloqueo dice qué falta y qué fuente lo desbloquea", () => {
    expect(PENDIENTE_RRHH_LABEL).toContain("Pendiente");
    expect(PENDIENTE_RRHH_LABEL).toContain("RRHH");
    expect(FUENTE_DESBLOQUEO_RRHH).toContain("ops_rrhh");
  });
});

describe("F4B.1 · guardia: la página no publica el proxy de días-persona", () => {
  const fuente = readFileSync(resolve(process.cwd(), "src/pages/ops/Logistica.tsx"), "utf8");

  it("Logistica.tsx no referencia los ratios proxy de kpisProductividad", () => {
    for (const ident of [
      "expedicionesPorPersonaDia",
      "lineasPorPersonaDia",
      "unidadesPorPersonaDia",
      "otsAbastecidasPorPersonaDia",
    ]) {
      const usos = fuente.split(ident).length - 1;
      // Solo puede aparecer dentro de la rama gated por RRHH (ratiosPersona.*)
      const gated = fuente.split(new RegExp(`r\\.${ident}`)).length - 1;
      expect(usos, ident).toBe(gated);
    }
  });

  it("no queda ninguna etiqueta de 'diagnóstico interno' en la página", () => {
    expect(fuente.toLowerCase()).not.toContain("diagnóstico interno");
    expect(fuente).toContain("PENDIENTE_RRHH_LABEL");
  });
});

// ─── F4B · cierre: Management Attention Supply y plantilla de presencia ──────

describe("F4B · Management Attention Supply", () => {
  const conSupply = {
    ...baseAsuntos,
    supplyPte: { n: 1234, n30: 456, edad_media: 61.4, n_prev: 1100, asOf: "2026-07-25" },
  };

  it("sin solicitudes cargadas declara que la cadena no es trazable", () => {
    const a = construirAsuntos({
      ...conSupply,
      supplyTrazabilidad: { otsConPieza: 3000, conSolicitud: null },
    }).find((x) => x.fenomeno === "supply_sin_trazabilidad");
    expect(a?.hecho).toContain("ops_pieza_solicitud");
    expect(a?.confianza).toBe("alta");
    expect(a?.destino).toBe("/operaciones/calidad-datos#frescura");
  });

  it("con trazabilidad suficiente el asunto desaparece", () => {
    const out = construirAsuntos({
      ...conSupply,
      supplyTrazabilidad: { otsConPieza: 3000, conSolicitud: 2900 },
    });
    expect(out.find((x) => x.fenomeno === "supply_sin_trazabilidad")).toBeUndefined();
  });

  it("la tendencia del asunto de repuesto usa la cifra previa de Supply", () => {
    const a = construirAsuntos(conSupply).find((x) => x.fenomeno === "espera_repuesto");
    expect(a?.hecho).toContain("1100");
    expect(a?.deterioro).toBe(true);
  });
});

describe("F4B · plantilla de presencia diaria de logística", () => {
  it("el importador detecta y normaliza una fila persona × día", () => {
    expect(PLANTILLAS.ops_rrhh_logistica).toEqual([
      "persona_id", "nombre", "equipo", "almacen_base", "fecha", "jornada_horas", "presente",
    ]);
    const header = [...PLANTILLAS.ops_rrhh_logistica];
    expect(detectTable(header)).toBe("ops_rrhh_logistica");
    const rec = normalizeRow("ops_rrhh_logistica", header, [
      "P1", "Ana", "PICKING A", "SAN AGUSTIN", "02/06/2026", "8", "si",
    ]);
    expect(rec?.persona_id).toBe("P1");
    expect(rec?.fecha).toBe("2026-06-02");
    expect(rec?.presente).toBe(true);
    expect(rec?.origen_dato).toBe("importador");
    expect(DOMINIO_POR_TABLA.ops_rrhh_logistica).toBe("rrhh_logistica");
    expect(fechaAsOfDelLote("ops_rrhh_logistica", [{ fecha: "2026-06-02" }], new Date("2026-07-01T00:00:00Z"))).toBe("2026-06-02");
  });

  it("sin persona o sin día la fila se descarta", () => {
    const header = [...PLANTILLAS.ops_rrhh_logistica];
    expect(normalizeRow("ops_rrhh_logistica", header, ["", "Ana", "", "SAN AGUSTIN", "02/06/2026", "8", "si"])).toBeNull();
    expect(normalizeRow("ops_rrhh_logistica", header, ["P1", "Ana", "", "SAN AGUSTIN", "", "8", "si"])).toBeNull();
  });
});
