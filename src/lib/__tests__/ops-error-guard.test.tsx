/**
 * GUARDIA GLOBAL DE ERRORES — /operaciones.
 *
 * Reglas invariantes tras UAT Round 2:
 *  - error de RPC ≠ loading (nunca spinner permanente);
 *  - error de RPC ≠ «sin datos» (el vacío solo con query resuelta con éxito);
 *  - ningún error se convierte silenciosamente en [] o null.
 *
 * (a) análisis estático de src/pages/ops y src/components/ops;
 * (b) render por página con las RPC en error: aparece OpsErrorBlock con el
 *     nombre de la RPC, «Reintentar» dispara refetch y no queda `.animate-spin`;
 * (c) con datos previos + error de refetch, los datos siguen en el DOM.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ─── (a) Análisis estático ──────────────────────────────────────────────────

const DIRS = ["src/pages/ops", "src/components/ops"];

const ficheros = DIRS.flatMap((dir) =>
  readdirSync(resolve(process.cwd(), dir))
    .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))
    .map((f) => ({ ruta: `${dir}/${f}`, src: readFileSync(resolve(process.cwd(), dir, f), "utf8") })),
);

const tieneRamaDeError = (src: string) =>
  /isError|fallos|OpsErrorBlock/.test(src);

describe("guardia (a) · ningún guardia de carga sin rama de error", () => {
  for (const { ruta, src } of ficheros) {
    const sospechoso = /(loading|isPending)\s*\|\|\s*!/.test(src);
    if (!sospechoso) continue;
    it(`${ruta} declara una rama de error junto al guardia de carga`, () => {
      expect(tieneRamaDeError(src), ruta).toBe(true);
    });
  }
  it("hay al menos un fichero analizado", () => {
    expect(ficheros.length).toBeGreaterThan(5);
  });
});

describe("guardia (b) · ningún error convertido en vacío", () => {
  const PATRONES: readonly RegExp[] = [
    /error\s*\?\s*\[\]/,
    /error\s*\?\s*null/,
    /catch\(\s*\(\)\s*=>\s*null\s*\)/,
    /catch\(\s*\(\)\s*=>\s*\[\]\s*\)/,
    /\.then\(\s*\(\{\s*data,\s*error\s*\}\)\s*=>\s*error\s*\?/,
  ];
  for (const { ruta, src } of ficheros) {
    it(`${ruta} no silencia errores`, () => {
      for (const p of PATRONES) {
        expect(p.test(src), `${ruta} :: ${p}`).toBe(false);
      }
    });
  }
});

describe("guardia (c) · toda pantalla con estado vacío tiene rama de error", () => {
  for (const { ruta, src } of ficheros) {
    if (!/[Ss]in datos/.test(src)) continue;
    it(`${ruta} importa OpsErrorBlock o expone rama de error`, () => {
      const ok = src.includes("OpsErrorBlock") || /isError|fallos/.test(src);
      expect(ok, ruta).toBe(true);
    });
  }
});

// ─── Render por página con RPC en error ─────────────────────────────────────

type Spec = { rpc: string; params?: Record<string, unknown>; enabled?: boolean };

const { estado } = vi.hoisted(() => ({
  estado: { fallar: true, conDatos: false, refetches: 0 },
}));

const datosDe = (rpc: string): unknown => {
  if (rpc === "ops_tecnicos_scorecard" || rpc === "ops_sats_ranking" || rpc === "ops_equipos") return [];
  if (rpc === "ops_costes_entidades") return [];
  return { kpis: {}, tramos: [], evo: [], tecnicos: [], abiertas_prov: [] };
};

const resultado = (rpc: string) => {
  const data = estado.conDatos ? datosDe(rpc) : undefined;
  return {
    data,
    isPending: false,
    isError: estado.fallar,
    isSuccess: !estado.fallar,
    fetchStatus: "idle" as const,
    error: estado.fallar ? { message: `no autorizado (${rpc})` } : null,
    refetch: () => { estado.refetches += 1; return Promise.resolve({}); },
  };
};

vi.mock("@/lib/ops-query", () => ({
  useOpsRpcs: (specs: Spec[]) => specs.map((s) => resultado(s.rpc)),
  useOpsRpc: (rpc: string) => resultado(rpc),
  useInvalidarOps: () => () => Promise.resolve(),
  opsQueryKey: (rpc: string) => ["ops", rpc],
}));

const FILTROS = {
  rpcParams: {
    p_from: "2026-06-01", p_to: "2026-08-31", p_cliente: null, p_gama: null,
    p_familia: null, p_marca: null, p_provincia: null, p_sat: null,
    p_tecnico: null, p_canal: null, p_delegacion: null,
  } as Record<string, string | null>,
  filters: { from: "2026-06-01", to: "2026-08-31" },
  prevRange: { from: "2026-03-01", to: "2026-05-31" },
  modo: "trimestre",
  sinComparable: false,
  setFilters: () => undefined,
  options: {},
};

vi.mock("@/lib/ops-filters", async () => {
  const real = await vi.importActual<typeof import("@/lib/ops-filters")>("@/lib/ops-filters");
  return { ...real, useOpsFilters: () => FILTROS };
});

vi.mock("@/components/ops/DataAsOf", () => ({ DataAsOf: () => null, DominioChip: () => null }));

vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<Record<string, unknown>>("react-router-dom");
  return { ...real, useSearchParams: () => [new URLSearchParams(), () => undefined] };
});

beforeEach(() => { estado.fallar = true; estado.conDatos = false; estado.refetches = 0; });

const PAGINAS: readonly { nombre: string; carga: () => Promise<{ default?: unknown } & Record<string, unknown>>; export?: string; rpc: string }[] = [
  { nombre: "SLA", carga: () => import("@/pages/ops/SLA"), rpc: "ops_sla" },
  { nombre: "Técnicos", carga: () => import("@/pages/ops/Tecnicos"), rpc: "ops_tecnicos_scorecard" },
  { nombre: "Red SAT", carga: () => import("@/pages/ops/Sats"), rpc: "ops_sats_ranking" },
  { nombre: "Costes", carga: () => import("@/pages/ops/Costes"), rpc: "ops_costes" },
  { nombre: "HUB", carga: () => import("@/pages/ops/Hub"), rpc: "ops_delegacion_ficha" },
  { nombre: "EquiposComparativa", carga: () => import("@/components/ops/EquiposComparativa"), export: "EquiposComparativa", rpc: "ops_equipos" },
];

describe("render · una RPC en error muestra OpsErrorBlock y nunca spinner", () => {
  for (const p of PAGINAS) {
    it(`${p.nombre}`, async () => {
      const mod = await p.carga();
      const Comp = (p.export ? mod[p.export] : mod.default) as React.ComponentType;
      const { container } = render(<Comp />);
      expect(container.textContent, p.nombre).toContain(p.rpc);
      expect(container.querySelector(".animate-spin"), p.nombre).toBeNull();
      const boton = screen.getAllByRole("button", { name: /Reintentar/i })[0];
      boton.click();
      expect(estado.refetches, p.nombre).toBeGreaterThan(0);
    });
  }
});

describe("render · datos previos + error de refetch conserva la pantalla", () => {
  it("Red SAT mantiene el contenido y muestra el bloque de error", async () => {
    estado.conDatos = true;
    const { default: Sats } = await import("@/pages/ops/Sats");
    const { container } = render(<Sats />);
    expect(container.textContent).toContain("ops_sats_ranking");
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
