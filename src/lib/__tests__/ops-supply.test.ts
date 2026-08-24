import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  calcularLeadTime,
  compararConSinPieza,
  readinessCadena,
  pctTrazabilidad,
  normalizarSupply,
  exposicionContractualPieza,
  lineaEjecutivaRepuestos,
  lineaEjecutivaLogistica,
  cifraEsperaRepuesto,
  hallazgosImpactoPieza,
  MUESTRA_MINIMA,
  ETAPAS_CADENA,
  indicadoresStock,
  fillRate,
  intervalosCadena,
  type BloqueCadena,
  type SupplyPayload,
} from "@/lib/ops-supply";
import { kpisProductividad, productividadPor, lineaProductividad } from "@/lib/ops-logistica";
import { FIXTURES_REGISTRY } from "@/lib/ops-contractual-fixtures";
import type { ClienteAlias } from "@/lib/ops-cliente-alias";
import { detectTable, normalizeRow, conflictKey, PLANTILLAS, parseCSV } from "@/lib/ops-csv";


// ─── Helpers ────────────────────────────────────────────────────────────────

const cadenaVacia: BloqueCadena = {
  solicitudes: 0,
  expediciones: 0,
  stock_filas: 0,
  etapas: {},
  expediciones_estado: {},
  ots_con_pieza_periodo: 2003,
  ots_con_pieza_trazadas: 0,
  lead_times: {},
};

const payloadVacio = (): SupplyPayload =>
  normalizarSupply({
    pieza_demanda: { ots: 5606, con_pieza: 2003, pct: 2003 / 5606, por: {} },
    pte_piezas_actual: { n: 412, edad_media: 37.4, buckets: {}, por: {} },
    conversion: {},
    contractual_exposicion_pieza: [],
    cadena: cadenaVacia,
  });

// ─── Lead times ─────────────────────────────────────────────────────────────

describe("calcularLeadTime", () => {
  it("solo cuenta pares con AMBAS fechas; una fecha ausente no cuenta como 0", () => {
    const lt = calcularLeadTime([
      { desde: "2026-06-01", hasta: "2026-06-05" }, // 4
      { desde: "2026-06-01", hasta: null }, // excluido
      { desde: null, hasta: "2026-06-09" }, // excluido
      { desde: "2026-06-01", hasta: "2026-06-03" }, // 2
    ]);
    expect(lt.n).toBe(2);
    expect(lt.medio).toBe(3);
    expect(lt.mediana).toBe(3);
  });

  it("sin ningún par completo devuelve null, nunca 0", () => {
    const lt = calcularLeadTime([{ desde: "2026-06-01", hasta: null }, { desde: null, hasta: null }]);
    expect(lt).toEqual({ n: 0, medio: null, mediana: null });
  });

  it("ignora fechas no parseables", () => {
    expect(calcularLeadTime([{ desde: "no-fecha", hasta: "2026-06-05" }]).n).toBe(0);
  });
});

// ─── Readiness de la cadena ─────────────────────────────────────────────────

describe("readinessCadena", () => {
  const r = readinessCadena(cadenaVacia);

  it("con las tablas vacías las etapas intermedias quedan Pendiente", () => {
    const intermedias = r.filter((e) => e.etapa !== "necesidad" && e.etapa !== "cierre");
    expect(intermedias).toHaveLength(ETAPAS_CADENA.length - 2);
    expect(intermedias.every((e) => e.estado === "pendiente")).toBe(true);
  });

  it("los extremos se sostienen sobre ops_fact_ot y están Disponibles", () => {
    expect(r.find((e) => e.etapa === "necesidad")?.estado).toBe("disponible");
    expect(r.find((e) => e.etapa === "cierre")?.estado).toBe("disponible");
  });

  it("sin datos no emite ninguna cifra de flujo (ni 0) ni lead time", () => {
    for (const e of r.filter((x) => x.estado === "pendiente")) {
      expect(e.leadTime).toBeNull();
      expect(e.medida).not.toMatch(/\d+ filas/);
      expect(e.medida).toMatch(/Sin fuente/);
    }
  });

  it("con filas pero trazabilidad baja el estado es Parcial", () => {
    const r2 = readinessCadena({ ...cadenaVacia, solicitudes: 120, ots_con_pieza_trazadas: 100 });
    expect(r2.find((e) => e.etapa === "solicitud")?.estado).toBe("parcial");
  });

  it("con cobertura ≥80% el estado es Disponible", () => {
    const r3 = readinessCadena({
      ...cadenaVacia, solicitudes: 2000, expediciones: 1900, ots_con_pieza_trazadas: 1800,
    });
    expect(r3.find((e) => e.etapa === "solicitud")?.estado).toBe("disponible");
    expect(r3.find((e) => e.etapa === "expedicion")?.estado).toBe("disponible");
  });

  it("pctTrazabilidad es null mientras no hay solicitudes", () => {
    expect(pctTrazabilidad(cadenaVacia)).toBeNull();
  });
});

// ─── Comparación con / sin pieza ────────────────────────────────────────────

describe("compararConSinPieza", () => {
  const grupo = (n: number, dias: number) => ({
    n, dias_medio: dias, dias_mediana: dias, pct_20d: 0.5, pct_bajas: 0.2, pct_nff: 0.05,
  });

  it("respeta la muestra mínima por grupo", () => {
    const c = compararConSinPieza({ con_pieza: grupo(MUESTRA_MINIMA - 1, 29), sin_pieza: grupo(500, 11) });
    expect(c.suficiente).toBe(false);
    expect(c.deltaDias).toBeNull();
    expect(c.motivo).toContain("Muestra insuficiente");
  });

  it("con muestra suficiente calcula las diferencias", () => {
    const c = compararConSinPieza({ con_pieza: grupo(400, 29), sin_pieza: grupo(900, 11) });
    expect(c.suficiente).toBe(true);
    expect(c.deltaDias).toBe(18);
  });

  it("sin muestra el hallazgo no concluye nada", () => {
    const h = hallazgosImpactoPieza(compararConSinPieza({}));
    expect(h).toHaveLength(1);
    expect(h[0].confianza).toBe("baja");
  });
});

// ─── Línea ejecutiva ────────────────────────────────────────────────────────

describe("líneas ejecutivas", () => {
  it("repuestos declara la cadena pendiente cuando no hay fuente", () => {
    const linea = lineaEjecutivaRepuestos(payloadVacio(), "Junio 2026", false);
    expect(linea).toContain("Junio 2026");
    expect(linea).toContain("trazabilidad pendiente de fuente");
  });

  it("logística sin expediciones no publica ninguna cifra de transporte", () => {
    const l = lineaEjecutivaLogistica(0, 0, "Junio 2026");
    expect(l).toContain("sin expediciones registradas");
    expect(l).not.toMatch(/\b0 expediciones registradas en el período\b/);
  });

  it("logística con datos reporta el volumen real", () => {
    expect(lineaEjecutivaLogistica(1200, 340, "Junio 2026")).toContain("340 expediciones");
  });
});

// ─── Exposición contractual ─────────────────────────────────────────────────

describe("exposicionContractualPieza", () => {
  const aliases: ClienteAlias[] = [
    { cliente_wg_real: "ALCAMPO", cliente_contractual: "ALCAMPO / AUCHAN", origen: "manual" },
  ];

  it("clasifica Alcampo con exclusión declarada y un cliente sin regla", () => {
    const filas = [
      { cliente_wg: "ALCAMPO", n: 84, n30: 40 },
      { cliente_wg: "CLIENTE INEXISTENTE SL", n: 12, n30: 3 },
    ];
    const out = exposicionContractualPieza(filas, aliases, FIXTURES_REGISTRY);
    const alcampo = out.find((f) => f.clienteContractual === "ALCAMPO / AUCHAN");
    expect(alcampo?.estado).toBe("exposicion_identificada");
    expect(alcampo?.clavesDeclaradas.length).toBeGreaterThan(0);

    const sinRegla = out.find((f) => f.clienteContractual === null);
    expect(sinRegla?.estado).toBe("cliente_sin_regla");
    expect(sinRegla?.confianza).toBe("baja");
  });

  it("no emite importes ni porcentajes de cumplimiento", () => {
    const out = exposicionContractualPieza([{ cliente_wg: "ALCAMPO", n: 84, n30: 40 }], aliases, FIXTURES_REGISTRY);
    const claves = Object.keys(out[0]);
    expect(claves).not.toContain("euros");
    expect(claves).not.toContain("pct_cumplimiento");
  });
});

// ─── Consistencia con el Panorama ───────────────────────────────────────────

describe("consistencia espera_repuesto ↔ ops_supply", () => {
  it("el asunto del Panorama usa la misma cifra que pte_piezas_actual", () => {
    const p = payloadVacio();
    expect(cifraEsperaRepuesto(p)).toBe(p.pte_piezas_actual.n);
  });
});

// ─── Importador ─────────────────────────────────────────────────────────────

describe("importador de las plantillas de supply", () => {
  const csv = (
    t: "ops_pieza_solicitud" | "ops_expedicion" | "ops_expedicion_linea" | "ops_stock_snapshot",
    fila: string,
  ) => `${PLANTILLAS[t].join(",")}\n${fila}`;

  // almacen_base,expedicion_id,num_ot,preparado_por,persona_id,equipo,picking_inicio,picking_fin,
  // expedicion_timestamp,transportista,origen,destino,destino_cp,destino_tipo,
  // fecha_entrega_prevista,fecha_entrega_real,estado_expedicion,tipo_incidencia,reexpedicion,
  // expedicion_origen_id,coste_transporte,num_lineas,num_unidades,num_ot_abastecidas
  const FILA_EXP =
    "CENTRAL,EXP1,OT1,Ana,P1,Turno A,01/06/2026 08:00,01/06/2026 08:30,01/06/2026 10:15," +
    "SEUR,CENTRAL,SAT Madrid,28001,cliente,03/06/2026,,preparada,,no,,7,4,9,2";

  it("auto-detecta ops_pieza_solicitud", () => {
    const rows = parseCSV(csv("ops_pieza_solicitud", "OT1,REF1,Motor,1,Proveedor,,01/06/2026,,,,,,solicitada,12,wg"));
    expect(detectTable(rows[0])).toBe("ops_pieza_solicitud");
  });

  it("auto-detecta expediciones, líneas y stock", () => {
    expect(detectTable(parseCSV(csv("ops_expedicion", FILA_EXP))[0])).toBe("ops_expedicion");
    expect(detectTable(parseCSV(csv("ops_expedicion_linea", "CENTRAL,EXP1,1,REF1,Motor,2,OT1"))[0]))
      .toBe("ops_expedicion_linea");
    expect(detectTable(parseCSV(csv("ops_stock_snapshot", "01/06/2026,CENTRAL,REF1,Motor,4,1,3,0,22"))[0]))
      .toBe("ops_stock_snapshot");
  });

  it("rechaza una cabecera que no corresponde a ninguna plantilla", () => {
    expect(detectTable(["columna_a", "columna_b", "columna_c"])).toBeNull();
  });

  it("la clave natural hace el upsert idempotente: dos cargas iguales no duplican", () => {
    const rows = parseCSV(csv("ops_pieza_solicitud", "OT1,REF1,Motor,1,Proveedor,,01/06/2026,,,,,,solicitada,12,wg"));
    const a = normalizeRow("ops_pieza_solicitud", rows[0], rows[1]);
    const b = normalizeRow("ops_pieza_solicitud", rows[0], rows[1]);
    const key = conflictKey("ops_pieza_solicitud").split(",");
    expect(key.map((c) => a?.[c])).toEqual(key.map((c) => b?.[c]));
    expect(a?.num_ot).toBe("OT1");
  });

  it("la expedición conserva la HORA del picking y usa la clave natural almacén+expedición", () => {
    const rows = parseCSV(csv("ops_expedicion", FILA_EXP));
    const rec = normalizeRow("ops_expedicion", rows[0], rows[1]);
    expect(rec?.almacen_base).toBe("CENTRAL");
    expect(rec?.expedicion_id).toBe("EXP1");
    expect(rec?.picking_inicio).toBe("2026-06-01T08:00:00");
    expect(rec?.picking_fin).toBe("2026-06-01T08:30:00");
    expect(rec?.estado_expedicion).toBe("preparada");
    expect(rec?.coste_transporte).toBe(7);
    expect(rec?.procedencia_conteo).toBe("cabecera");
    expect(conflictKey("ops_expedicion")).toBe("almacen_base,expedicion_id");
  });

  it("el stock deriva el disponible cuando no viene declarado y no lo inventa si falta reservado", () => {
    const conReservado = normalizeRow(
      "ops_stock_snapshot",
      parseCSV(csv("ops_stock_snapshot", "01/06/2026,CENTRAL,REF1,Motor,4,1,,,22"))[0],
      parseCSV(csv("ops_stock_snapshot", "01/06/2026,CENTRAL,REF1,Motor,4,1,,,22"))[1],
    );
    expect(conReservado?.stock_fisico).toBe(4);
    expect(conReservado?.stock_disponible).toBe(3);

    const rows = parseCSV(csv("ops_stock_snapshot", "01/06/2026,CENTRAL,REF2,Motor,4,,,,22"));
    const sinReservado = normalizeRow("ops_stock_snapshot", rows[0], rows[1]);
    expect(sinReservado?.stock_disponible).toBeNull();
  });
});

// ─── F4A.1 · Productividad de almacén ───────────────────────────────────────

describe("productividad de almacén (ops-logistica)", () => {
  const base = {
    almacen_base: "CENTRAL", equipo: "Turno A", preparado_por: "Ana",
    expedicion_timestamp: null, fecha_entrega_prevista: null, fecha_entrega_real: null,
    estado_expedicion: "entregada", tipo_incidencia: null, reexpedicion: false,
    coste_transporte: null, num_unidades: null, num_ot_abastecidas: null,
  };
  const filas = Array.from({ length: 25 }, (_, i) => ({
    ...base,
    expedicion_id: `E${i}`,
    picking_inicio: "2026-06-01T08:00:00Z",
    picking_fin: "2026-06-01T08:30:00Z",
    num_lineas: 5,
  }));

  it("mide minutos de picking solo con inicio y fin", () => {
    const k = kpisProductividad([...filas, { ...base, expedicion_id: "X", picking_inicio: null, picking_fin: null, num_lineas: 3 }]);
    expect(k.expediciones).toBe(26);
    expect(k.coberturaPicking.n).toBe(25);
    expect(k.minutosPickingMediana).toBe(30);
    expect(k.lineasHora).toBeCloseTo(10, 5);
  });

  it("no publica productividad por debajo de la muestra mínima", () => {
    const pocas = filas.slice(0, 5);
    const [f] = productividadPor(pocas, "almacen");
    expect(f.comparable).toBe(false);
    expect(f.lineasHora).toBeNull();
    expect(f.motivo).toMatch(/por debajo de 20/);
  });

  it("no calcula ratio si la cobertura de tiempos baja del 80 %", () => {
    const mixtas = [
      ...filas.slice(0, 10),
      ...Array.from({ length: 15 }, (_, i) => ({ ...base, expedicion_id: `S${i}`, picking_inicio: null, picking_fin: null, num_lineas: 5 })),
    ];
    const [f] = productividadPor(mixtas, "almacen");
    expect(f.comparable).toBe(false);
    expect(f.motivo).toMatch(/80 %/);
  });

  it("sin expediciones no inventa cifras", () => {
    const k = kpisProductividad([]);
    expect(k.minutosPickingMediana).toBeNull();
    expect(k.lineasHora).toBeNull();
    expect(lineaProductividad(k, "junio 2026")).toMatch(/no es calculable/);
  });
});

// ─── F4A.1 · Stock, fill rate e intervalos de la cadena ─────────────────────

describe("stock y fill rate", () => {
  it("cuenta stock-out por disponible y no estima el fill rate sin líneas", () => {
    const s = indicadoresStock([
      { referencia: "A", stock_fisico: 5, stock_disponible: null, reservado: 5, en_transito: null },
      { referencia: "B", stock_fisico: 5, stock_disponible: 2, reservado: 3, en_transito: 1 },
    ]);
    expect(s.referencias).toBe(2);
    expect(s.stockOut).toBe(1);
    expect(s.pctStockOut).toBe(0.5);
    expect(fillRate(0, 0).valor).toBeNull();
    expect(fillRate(10, 8).valor).toBe(0.8);
  });

  it("sin foto de stock no publica cifras", () => {
    const s = indicadoresStock([]);
    expect(s.pctStockOut).toBeNull();
    expect(s.medida).toMatch(/vacía/);
  });
});


// ─── Ausencia de contenido de demostración ──────────────────────────────────

describe("sin datos simulados en las páginas de supply", () => {
  for (const f of ["src/pages/ops/Repuestos.tsx", "src/pages/ops/Logistica.tsx"]) {
    it(`${f} no contiene textos DEMO / ejemplo / simulado`, () => {
      const txt = readFileSync(f, "utf8");
      expect(txt).not.toMatch(/\bDEMO\b/i);
      expect(txt).not.toMatch(/datos simulados|de ejemplo|mock/i);
    });
  }
});

// ─── F4A.1 · Intervalos consecutivos de la cadena ───────────────────────────

describe("cadena E2E como intervalos con readiness propio", () => {
  it("un intervalo con un extremo sin fuente no publica cifra", () => {
    const ivs = intervalosCadena(cadenaVacia);
    expect(ivs.length).toBeGreaterThan(0);
    expect(ivs.every((i) => i.leadTime === null)).toBe(true);
    expect(ivs.every((i) => i.estado === "pendiente")).toBe(true);
    expect(ivs[0].medida).toMatch(/no es calculable/);
  });
});
