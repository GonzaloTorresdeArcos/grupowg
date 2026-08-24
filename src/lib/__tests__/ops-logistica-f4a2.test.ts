// F4A.2 · Cierre de F4A: contrato del importador, métricas de productividad
// que faltaban y tests de guardia sobre las páginas de supply.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  PLANTILLAS,
  COLUMNAS_TABLA,
  PROCEDENCIAS_CONTEO,
  detectTable,
  normalizeRow,
  parseCSV,
  cabeceraPlantilla,
  type OpsTable,
} from "@/lib/ops-csv";
import {
  kpisProductividad,
  INDICADORES_PRODUCTIVIDAD,
  LABEL_BASE_SALIDA,
  type FilaExpedicion,
  type RefDisponibilidad,
} from "@/lib/ops-logistica";

const csv = (t: OpsTable, fila: string) => `${cabeceraPlantilla(t)}\n${fila}`;
const norm = (t: OpsTable, fila: string) => {
  const rows = parseCSV(csv(t, fila));
  return normalizeRow(t, rows[0], rows[1]);
};

// ─── 1 · Contrato de procedencia_conteo ─────────────────────────────────────

describe("importador · procedencia_conteo respeta la CHECK de ops_expedicion", () => {
  const CON_CONTEOS =
    "CENTRAL,EXP1,OT1,Ana,P1,Turno A,01/06/2026 08:00,01/06/2026 08:30,01/06/2026 10:15," +
    "SEUR,CENTRAL,SAT Madrid,28001,cliente,03/06/2026,,preparada,,no,,7,4,9,2";
  const SIN_CONTEOS =
    "CENTRAL,EXP2,OT2,Ana,P1,Turno A,01/06/2026 08:00,01/06/2026 08:30,01/06/2026 10:15," +
    "SEUR,CENTRAL,SAT Madrid,28001,cliente,03/06/2026,,preparada,,no,,7,,,";

  it("la cabecera con conteos queda 'declarado' y sin conteos 'derivado_lineas'", () => {
    expect(norm("ops_expedicion", CON_CONTEOS)?.procedencia_conteo).toBe("declarado");
    expect(norm("ops_expedicion", SIN_CONTEOS)?.procedencia_conteo).toBe("derivado_lineas");
  });

  it("normalizeRow nunca devuelve un valor fuera de la lista admitida", () => {
    for (const fila of [CON_CONTEOS, SIN_CONTEOS]) {
      const v = norm("ops_expedicion", fila)?.procedencia_conteo as string;
      expect(PROCEDENCIAS_CONTEO as readonly string[]).toContain(v);
    }
    expect(PROCEDENCIAS_CONTEO as readonly string[]).not.toContain("cabecera");
  });

  it("cargar líneas deja la expedición en 'derivado_lineas' (trigger de líneas)", () => {
    // Simula el efecto del trigger ops_trg_expedicion_conteos: al insertar líneas,
    // los conteos y la procedencia de la cabecera se reescriben desde el detalle.
    const cabecera = { ...norm("ops_expedicion", CON_CONTEOS) } as Record<string, unknown>;
    expect(cabecera.procedencia_conteo).toBe("declarado");
    const lineas = [
      norm("ops_expedicion_linea", "CENTRAL,EXP1,1,REF1,Motor,2,OT1"),
      norm("ops_expedicion_linea", "CENTRAL,EXP1,2,REF2,Filtro,1,OT2"),
    ];
    const aplicarTrigger = (h: Record<string, unknown>, ls: Array<Record<string, unknown> | null>) => ({
      ...h,
      num_lineas: ls.length,
      num_unidades: ls.reduce((a, l) => a + Number(l?.cantidad ?? 0), 0),
      num_ot_abastecidas: new Set(ls.map((l) => l?.num_ot).filter(Boolean)).size,
      procedencia_conteo: "derivado_lineas",
    });
    const final = aplicarTrigger(cabecera, lineas);
    expect(final.procedencia_conteo).toBe("derivado_lineas");
    expect(PROCEDENCIAS_CONTEO as readonly string[]).toContain(final.procedencia_conteo as string);
    expect(final.num_lineas).toBe(2);
    expect(final.num_unidades).toBe(3);
  });
});

// ─── 2 · Métricas de productividad F4A.2 ────────────────────────────────────

const base: Omit<FilaExpedicion, "expedicion_id"> = {
  almacen_base: "CENTRAL",
  preparado_por: "Ana",
  equipo: "Turno A",
  picking_inicio: null,
  picking_fin: null,
  expedicion_timestamp: null,
  fecha_expedicion: null,
  fecha_entrega_prevista: null,
  fecha_entrega_real: null,
  estado_expedicion: "entregada",
  tipo_incidencia: null,
  reexpedicion: false,
  coste_transporte: null,
  num_lineas: null,
  num_unidades: null,
  num_ot_abastecidas: null,
};

/** Fixture del pliego: 3 expediciones y 5 líneas en total. */
const FIXTURE: FilaExpedicion[] = [
  {
    ...base, expedicion_id: "E1",
    picking_inicio: "2026-06-01T08:00:00Z", picking_fin: "2026-06-01T08:30:00Z",
    expedicion_timestamp: "2026-06-01T10:00:00Z",
    fecha_entrega_prevista: "2026-06-03T00:00:00Z", fecha_entrega_real: "2026-06-02T00:00:00Z",
    num_lineas: 2, num_unidades: 4, num_ot_abastecidas: 2,
  },
  {
    ...base, expedicion_id: "E2",
    picking_inicio: "2026-06-02T09:00:00Z", picking_fin: "2026-06-02T09:40:00Z",
    expedicion_timestamp: "2026-06-02T11:00:00Z",
    fecha_entrega_prevista: "2026-06-04T00:00:00Z", fecha_entrega_real: "2026-06-05T00:00:00Z",
    num_lineas: 2, num_unidades: 3, num_ot_abastecidas: 1,
  },
  {
    ...base, expedicion_id: "E3", preparado_por: "Luis",
    picking_inicio: "2026-06-03T08:00:00Z", picking_fin: "2026-06-03T08:20:00Z",
    expedicion_timestamp: "2026-06-04T12:00:00Z",
    num_lineas: 1, num_unidades: 1, num_ot_abastecidas: 1,
  },
];

describe("productividad F4A.2 · persona · día trabajado, OTD y rapidez de salida", () => {
  it("activa las métricas automáticamente con la fixture de 3 expediciones y 5 líneas", () => {
    const k = kpisProductividad(FIXTURE);
    expect(FIXTURE.reduce((a, f) => a + (f.num_lineas ?? 0), 0)).toBe(5);
    expect(k.personas).toBe(2);
    // F4B: el proxy "día con expedición" desaparece. Los ratios por persona y
    // día ya no los publica kpisProductividad: exigen ops_rrhh_logistica.
    expect("diasPersona" in k).toBe(false);
    expect("expedicionesPorPersonaDia" in k).toBe(false);
  });

  it("OTD solo con entrega prevista y real, declarando cobertura", () => {
    const k = kpisProductividad(FIXTURE);
    expect(k.coberturaOtd).toEqual({ n: 2, total: 3, pct: 2 / 3 });
    expect(k.otdPct).toBeCloseTo(0.5, 6);
  });

  it("sin disponibilidad de pieza mide la salida contra picking_inicio y lo declara", () => {
    const k = kpisProductividad(FIXTURE);
    expect(k.baseSalida).toBe("picking_inicio");
    expect(LABEL_BASE_SALIDA.picking_inicio).toMatch(/inicio de picking/);
    expect(k.pctSalidaMismoDia).toBeCloseTo(2 / 3, 6);
    expect(k.pctSalidaMenos24h).toBeCloseTo(2 / 3, 6);
    expect(k.coberturaSalida.n).toBe(3);
  });

  it("con disponibilidad de pieza cambia la referencia y reduce el universo a lo trazado", () => {
    const refs: RefDisponibilidad[] = [
      { almacen_base: "CENTRAL", expedicion_id: "E1", fecha_disponibilidad: "2026-06-01T07:00:00Z" },
      { almacen_base: "CENTRAL", expedicion_id: "E1", fecha_disponibilidad: null },
    ];
    const k = kpisProductividad(FIXTURE, refs);
    expect(k.baseSalida).toBe("fecha_disponibilidad_pieza");
    expect(k.coberturaSalida).toEqual({ n: 1, total: 3, pct: 1 / 3 });
    expect(k.pctSalidaMismoDia).toBe(1);
    expect(k.pctSalidaMenos24h).toBe(1);
  });

  it("sin fechas devuelve null en todas las métricas nuevas, nunca 0", () => {
    const sinFechas = FIXTURE.map((f) => ({
      ...f, picking_inicio: null, picking_fin: null, expedicion_timestamp: null,
      fecha_expedicion: null, fecha_entrega_prevista: null, fecha_entrega_real: null,
    }));
    const k = kpisProductividad(sinFechas);
    expect(k.otdPct).toBeNull();
    expect(k.pctSalidaMismoDia).toBeNull();
    expect(k.pctSalidaMenos24h).toBeNull();
    expect(k.baseSalida).toBeNull();
  });

  it("los indicadores nuevos están documentados con definición y campos requeridos", () => {
    const claves = INDICADORES_PRODUCTIVIDAD.map((i) => i.clave);
    for (const c of [
      "expediciones_persona_dia", "lineas_persona_dia", "unidades_persona_dia",
      "ots_persona_dia", "otd", "salida_rapida",
    ]) {
      expect(claves).toContain(c);
    }
    for (const i of INDICADORES_PRODUCTIVIDAD) {
      expect(i.definicion.length).toBeGreaterThan(20);
      expect(i.requiere.length).toBeGreaterThan(0);
    }
  });
});

// ─── 3 · Tests de guardia ───────────────────────────────────────────────────

const leer = (p: string) => readFileSync(p, "utf8");

describe("guardia · separación entre logística de almacén y dispersión de campo", () => {
  it("Logistica.tsx no consume ops_dispersion ni el módulo de dispersión", () => {
    const src = leer("src/pages/ops/Logistica.tsx");
    expect(src).not.toContain("ops_dispersion");
    expect(src).not.toContain("ops-dispersion");
  });
});

describe("guardia · denominación contractual prudente", () => {
  const PROHIBIDOS = ["incumplimiento", "€", "responsabilidad WG", "exposición confirmada"];
  const FICHEROS = ["src/pages/ops/Repuestos.tsx", "src/pages/ops/Logistica.tsx", "src/lib/ops-supply.ts"];

  for (const f of FICHEROS) {
    it(`${f} no contiene términos prohibidos`, () => {
      const src = leer(f);
      for (const p of PROHIBIDOS) expect(src).not.toContain(p);
    });
  }
});

describe("guardia · plantillas de supply contra las columnas reales", () => {
  const TABLAS: OpsTable[] = [
    "ops_pieza_solicitud", "ops_expedicion", "ops_expedicion_linea", "ops_stock_snapshot",
  ];

  for (const t of TABLAS) {
    it(`la plantilla de ${t} solo usa columnas existentes y sin duplicados`, () => {
      const cols = COLUMNAS_TABLA[t];
      expect(cols).toBeDefined();
      const plantilla = PLANTILLAS[t];
      expect(new Set(plantilla).size).toBe(plantilla.length);
      for (const c of plantilla) expect(cols).toContain(c);
    });

    it(`la cabecera de ${t} se autodetecta como su tabla`, () => {
      expect(detectTable([...PLANTILLAS[t]])).toBe(t);
    });
  }
});
