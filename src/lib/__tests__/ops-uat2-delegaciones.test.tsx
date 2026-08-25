/**
 * UAT ROUND 2 — Delegaciones: spinner infinito.
 *
 * Causa raíz documentada: (C) la RPC `ops_delegaciones` tardaba 6.862 ms bajo
 * rol `authenticated` (RLS reevaluada + CTE `base` con SELECT * materializada),
 * rozando el statement_timeout de 8 s con dos llamadas simultáneas; y (B) la
 * página trataba cualquier error como carga (`loading || !now`), de modo que un
 * fallo dejaba el spinner para siempre.
 *
 * Aquí se cubre el lado frontend: parámetros enviados, estado de error visible
 * con botón Reintentar y registro `opsRpcErrors`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Spec = { rpc: string; params?: Record<string, unknown>; enabled?: boolean };

const { estado } = vi.hoisted(() => ({
  estado: { tandas: [] as Spec[][], fallar: false, refetches: 0 },
}));

const resultado = (rpc: string) =>
  estado.fallar
    ? {
        data: undefined,
        isPending: false,
        isError: true,
        fetchStatus: "idle",
        error: { message: `no autorizado (${rpc})` },
        refetch: () => { estado.refetches += 1; return Promise.resolve({}); },
      }
    : {
        data: { kpis: [], evo: [], tecnicos: [] },
        isPending: false,
        isError: false,
        fetchStatus: "idle",
        error: null,
        refetch: () => Promise.resolve({}),
      };

vi.mock("@/lib/ops-query", () => ({
  useOpsRpcs: (specs: Spec[]) => {
    estado.tandas.push(specs.map((s) => ({ ...s })));
    return specs.map((s) => resultado(s.rpc));
  },
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

// La cabecera de frescura no es objeto de esta prueba.
vi.mock("@/components/ops/DataAsOf", () => ({ DataAsOf: () => null }));


const leer = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

beforeEach(() => { estado.tandas = []; estado.fallar = false; estado.refetches = 0; });

// ─── (a) Parámetros enviados ────────────────────────────────────────────────

describe("UAT-2 · Delegaciones envía los 11 filtros con null (nunca undefined)", () => {
  it("las dos llamadas a ops_delegaciones llevan las 11 claves", async () => {
    const { default: Delegaciones } = await import("@/pages/ops/Delegaciones");
    render(<Delegaciones />);
    const llamadas = estado.tandas[0].filter((s) => s.rpc === "ops_delegaciones");
    expect(llamadas).toHaveLength(2);
    const claves = [
      "p_from", "p_to", "p_cliente", "p_gama", "p_familia", "p_marca",
      "p_provincia", "p_sat", "p_tecnico", "p_canal", "p_delegacion",
    ];
    for (const l of llamadas) {
      for (const k of claves) {
        expect(Object.keys(l.params ?? {}), k).toContain(k);
        expect((l.params ?? {})[k], k).not.toBeUndefined();
      }
    }
    // El período previo se sustituye, el resto de filtros se conserva.
    expect(llamadas[1].params?.p_from).toBe("2026-03-01");
    expect(llamadas[1].params?.p_to).toBe("2026-05-31");
  });
});

// ─── (b) Estado de error, nunca spinner permanente ──────────────────────────

describe("UAT-2 · una RPC en error muestra estado de error con Reintentar", () => {
  it("renderiza el bloque de error, nombra la RPC y permite reintentar", async () => {
    estado.fallar = true;
    const { default: Delegaciones } = await import("@/pages/ops/Delegaciones");
    const { container } = render(<Delegaciones />);
    expect(screen.getByText(/No se ha podido cargar Delegaciones/i)).toBeTruthy();
    expect(container.textContent).toContain("ops_delegaciones");
    const boton = screen.getByRole("button", { name: /Reintentar/i });
    boton.click();
    expect(estado.refetches).toBeGreaterThan(0);
    // No queda ningún spinner en pantalla.
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("el guardia de render ya no es `loading || !now`", () => {
    const src = leer("src/pages/ops/Delegaciones.tsx");
    expect(src).not.toContain("if (loading || !now)");
    expect(src).toContain("fallos.length > 0");
  });
});

// ─── (c) Registro de errores de RPC ─────────────────────────────────────────

describe("UAT-2 · registro opsRpcErrors", () => {
  it("guarda el fallo con RPC y parámetros, y descarta cancelaciones", async () => {
    const real = await vi.importActual<typeof import("@/lib/ops-query")>("@/lib/ops-query");
    real.limpiarOpsRpcErrors();
    real.registrarErrorRpc("ops_delegaciones", { p_from: "2026-06-01" }, { message: "canceling statement due to statement timeout" });
    real.registrarErrorRpc("ops_equipos", {}, { message: "AbortError: signal is aborted" });
    const errores = real.opsRpcErrors();
    expect(errores).toHaveLength(1);
    expect(errores[0].rpc).toBe("ops_delegaciones");
    expect(errores[0].mensaje).toMatch(/statement timeout/);
    real.limpiarOpsRpcErrors();
    expect(real.opsRpcErrors()).toHaveLength(0);
  });
});

// ─── (d) Patrón SECURITY DEFINER aplicado a ops_delegaciones ────────────────

describe("UAT-2 · ops_delegaciones usa el patrón _impl + guardia", () => {
  it("la migración crea el wrapper con is_management y emite NOTIFY pgrst", () => {
    const dir = "supabase/migrations";
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const ficheros = readdirSync(resolve(process.cwd(), dir)).filter((f) => f.endsWith(".sql"));
    const conWrapper = ficheros
      .map((f) => leer(`${dir}/${f}`))
      .filter((sql) => sql.includes("ops_delegaciones_impl"));
    expect(conWrapper.length).toBeGreaterThan(0);
    const sql = conWrapper[conWrapper.length - 1];
    expect(sql).toContain("public.is_management(auth.uid())");
    expect(sql).toContain("no autorizado");
    expect(sql).toMatch(/NOTIFY pgrst, 'reload schema'/);
  });
});
