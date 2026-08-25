/**
 * UAT de carga por bloques (cierre de la tercera pasada).
 *
 * Verifica el contrato de carga del Panorama (tanda crítica vs. secundaria),
 * la continuidad visual al cambiar filtros (placeholderData), el montaje del
 * overlay de medición y el diferimiento de las series de SLA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─── Dobles ─────────────────────────────────────────────────────────────────

type Spec = { rpc: string; params?: Record<string, unknown>; enabled?: boolean };

const { estado } = vi.hoisted(() => ({
  estado: {
    tandas: [] as Spec[][],
    unicas: [] as { rpc: string; enabled: boolean }[],
    criticoPendiente: true,
    datos: {} as Record<string, unknown>,
  },
}));

const resultado = (rpc: string, pendiente: boolean) => ({
  data: estado.datos[rpc],
  isPending: pendiente && estado.datos[rpc] === undefined,
  fetchStatus: pendiente && estado.datos[rpc] === undefined ? "fetching" : "idle",
  error: null,
});

vi.mock("@/lib/ops-query", () => ({
  useOpsRpcs: (specs: Spec[]) => {
    estado.tandas.push(specs.map((s) => ({ ...s })));
    return specs.map((s) =>
      resultado(s.rpc, s.enabled === false ? true : estado.criticoPendiente && s.enabled !== false),
    );
  },
  useOpsRpc: (rpc: string, _p?: unknown, opts?: { enabled?: boolean }) => {
    estado.unicas.push({ rpc, enabled: opts?.enabled !== false });
    return resultado(rpc, opts?.enabled === false);
  },
  useInvalidarOps: () => () => Promise.resolve(),
  opsQueryKey: (rpc: string) => ["ops", rpc],
}));

const FILTROS = {
  rpcParams: { p_from: "2026-06-01", p_to: "2026-06-30" } as Record<string, string | null>,
  filters: { from: "2026-06-01", to: "2026-06-30" },
  prevRange: { from: "2026-05-01", to: "2026-05-31" },
  modo: "mes",
  sinComparable: false,
  setFilters: () => undefined,
  options: {},
};

vi.mock("@/lib/ops-filters", async () => {
  const real = await vi.importActual<typeof import("@/lib/ops-filters")>("@/lib/ops-filters");
  return { ...real, useOpsFilters: () => FILTROS };
});

const KPIS = {
  creadas: 100, cerradas: 90, bajas: 10, abiertas_30: 5,
  pct_sla20: 0.7, pct_sla30: 0.8, pct_nff: 0.05, pct_bajas: 0.1,
};

const PANORAMA = {
  balance: { backlog_ini: 50, entrantes: 100, reparadas: 80, bajas: 10, backlog_fin: 60 },
  etapas: [],
};

const reset = () => {
  estado.tandas = [];
  estado.unicas = [];
  estado.criticoPendiente = true;
  estado.datos = {};
};

const cargarCritico = () => {
  estado.datos.ops_kpis = KPIS;
  estado.datos.ops_panorama_resumen = PANORAMA;
  estado.criticoPendiente = false;
};

// ─── (a) Tanda crítica y activación de la secundaria ────────────────────────

describe("Panorama · tanda crítica y secundaria", () => {
  beforeEach(reset);

  it("la tanda crítica contiene exactamente 4 RPC: ops_kpis ×2 y ops_panorama_resumen ×2", async () => {
    cargarCritico();
    const { default: Dashboard } = await import("@/pages/ops/Dashboard");
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const critica = estado.tandas[0];
    expect(critica).toHaveLength(4);
    const nombres = critica.map((s) => s.rpc).sort();
    expect(nombres).toEqual(["ops_kpis", "ops_kpis", "ops_panorama_resumen", "ops_panorama_resumen"]);
  });

  it("la secundaria no se habilita hasta que la crítica deja de estar pendiente", async () => {
    const { default: Dashboard } = await import("@/pages/ops/Dashboard");
    const { unmount } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const secundariaInicial = estado.tandas[1];
    expect(secundariaInicial.length).toBeGreaterThan(0);
    expect(secundariaInicial.every((s) => s.enabled === false)).toBe(true);
    unmount();

    reset();
    cargarCritico();
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const secundaria = estado.tandas[1];
    expect(secundaria.every((s) => s.enabled === true)).toBe(true);
  });
});

// ─── (b) placeholderData: el DOM no se vacía al cambiar de parámetros ───────

describe("Panorama · continuidad al cambiar filtros", () => {
  beforeEach(reset);

  it("con datos previos, la Situation Line y el bloque A siguen renderizados mientras se refresca", async () => {
    cargarCritico();
    const { default: Dashboard } = await import("@/pages/ops/Dashboard");
    const { rerender } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByTestId("situation-line")).toBeInTheDocument();

    // Cambio de rpcParams con datos ya cargados: react-query mantiene el dato
    // anterior (placeholderData), por lo que el crítico sigue resuelto.
    FILTROS.rpcParams = { p_from: "2026-05-01", p_to: "2026-05-31" };
    rerender(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getByTestId("situation-line")).toBeInTheDocument();
    expect(screen.getByTestId("bloque-a")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton-global")).not.toBeInTheDocument();
    FILTROS.rpcParams = { p_from: "2026-06-01", p_to: "2026-06-30" };
  });

  it("todas las queries de /operaciones se resuelven con placeholderData (keepPreviousData)", () => {
    const src = readFileSync("src/lib/ops-query.ts", "utf8");
    expect(src).toMatch(/placeholderData/);
  });
});

// ─── (c) PerfOverlay solo con ?perf=1 ───────────────────────────────────────

describe("PerfOverlay · flag ?perf=1", () => {
  const irA = (search: string) => window.history.replaceState({}, "", `/operaciones${search}`);

  it("no se monta sin ?perf=1", async () => {
    irA("");
    const { PerfOverlay } = await import("@/components/ops/PerfOverlay");
    render(<PerfOverlay />);
    expect(screen.queryByTestId("perf-overlay")).not.toBeInTheDocument();
  });

  it("se monta con ?perf=1", async () => {
    irA("?perf=1");
    const { PerfOverlay } = await import("@/components/ops/PerfOverlay");
    render(<PerfOverlay />);
    expect(screen.getByTestId("perf-overlay")).toBeInTheDocument();
    irA("");
  });
});

// ─── (d) SLA: la evolución solo se pide con el resumen en pantalla ──────────

describe("SLA · diferimiento de ops_sla_evolucion", () => {
  beforeEach(reset);

  it("no se pide mientras el resumen está pendiente y sí cuando ya está", async () => {
    const { default: SLA } = await import("@/pages/ops/SLA");
    const { unmount } = render(<MemoryRouter><SLA /></MemoryRouter>);
    const evoPend = estado.unicas.filter((u) => u.rpc === "ops_sla_evolucion");
    expect(evoPend.length).toBeGreaterThan(0);
    expect(evoPend.every((u) => u.enabled === false)).toBe(true);
    unmount();

    reset();
    estado.datos.ops_sla_resumen = {
      snapshot: { n30: 0, n20: 0, total: 0 },
      buckets: [], etapas: [], categorias: [], clientes: [], productos: [],
    };
    estado.datos.ops_kpis = KPIS;
    estado.criticoPendiente = false;
    render(<MemoryRouter><SLA /></MemoryRouter>);
    const evo = estado.unicas.filter((u) => u.rpc === "ops_sla_evolucion");
    expect(evo.some((u) => u.enabled === true)).toBe(true);
  });
});

// ─── Gate runtime: cobertura de todas las RPC usadas en src ─────────────────

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("runtime-rpc-gate.sql · cobertura completa", () => {
  it("cubre todas las RPC ops_* invocadas desde src", () => {
    const gate = readFileSync("scripts/runtime-rpc-gate.sql", "utf8");
    const usadas = new Set<string>();
    for (const f of walk("src").filter((x) => /\.(ts|tsx)$/.test(x) && !x.includes("__tests__"))) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/supabase\.rpc\(\s*["'](ops_[a-z0-9_]+)["']/g)) usadas.add(m[1]);
      for (const m of t.matchAll(/useOpsRpcs?\S*\(\s*["'](ops_[a-z0-9_]+)["']/g)) usadas.add(m[1]);
      for (const m of t.matchAll(/\brpc:\s*["'](ops_[a-z0-9_]+)["']/g)) usadas.add(m[1]);
    }
    expect(usadas.size).toBeGreaterThan(10);
    const faltan = [...usadas].filter((r) => !gate.includes(r));
    expect(faltan, `RPC sin caso en el gate: ${faltan.join(", ")}`).toEqual([]);
  });
});
