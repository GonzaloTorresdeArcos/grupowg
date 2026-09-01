import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: rpcMock } }));
vi.mock("@/hooks/useDataQuality", () => ({
  useDataQuality: () => ({
    loading: false,
    medidas: { cargas: [{ dominio: "ot", fuente: "erp", last_successful_load: "2026-07-25", data_as_of_date: "2026-07-25", filas: 1, origen: "erp", notas: null }] },
  }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpsFiltersProvider } from "../ops-filters";
import { OpsScopeBar } from "@/components/ops/OpsScopeBar";
import { perfilFiltros } from "../ops-filter-scope";

const ARBOL = [
  {
    programa_id: "p-1",
    programa_nombre: "Clima instalación",
    cliente_nombre: "CARREFOUR",
    vertical_nombre: "Climate",
    vertical_codigo: "CLIMATE",
    cliente_id: "c-1",
    n_ots: 100,
  },
];

const renderScope = (perfil: "programa" | "ninguno" = "programa") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <OpsFiltersProvider>
        <OpsScopeBar perfil={perfil} titulo="Performance Real" />
      </OpsFiltersProvider>
    </QueryClientProvider>,
  );

describe("PRV-UAT-FS1 · matriz ruta → filtros soportados", () => {
  it("Performance Real solo soporta el selector de programa", () => {
    expect(perfilFiltros("/operaciones/performance-real")).toBe("programa");
  });
  it("Contratos & Programas no consume ningún filtro", () => {
    expect(perfilFiltros("/operaciones/contratos")).toBe("ninguno");
  });
  it("F0–F4 conservan la barra operativa estándar", () => {
    for (const r of [
      "/operaciones", "/operaciones/hub", "/operaciones/delegaciones", "/operaciones/sats",
      "/operaciones/sla", "/operaciones/costes", "/operaciones/dispersion",
      "/operaciones/logistica", "/operaciones/repuestos", "/operaciones/tecnicos",
    ]) {
      expect(perfilFiltros(r)).toBe("operativa");
    }
  });
});

describe("PRV-UAT-FS1 · unsupported filter ≠ visible filter", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    localStorage.clear();
    rpcMock.mockImplementation((fn: string) =>
      Promise.resolve({ data: fn === "ctr_portfolio_arbol" ? ARBOL : {}, error: null }),
    );
  });

  it("no muestra Cliente operativo, Período ni Comparar con", async () => {
    renderScope();
    await screen.findByTestId("ops-scope-bar");
    expect(screen.queryByLabelText("Modo de comparación")).toBeNull();
    expect(screen.queryByText("Cliente")).toBeNull();
    expect(screen.queryByText("Período")).toBeNull();
    expect(screen.queryByRole("button", { name: /Más filtros/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Limpiar/ })).toBeNull();
  });

  it("un Cliente global persistido no aparece como contexto de Performance Real", async () => {
    localStorage.setItem(
      "ops.filters.v4",
      JSON.stringify({ cliente: "ASSURANT GENERAL INSURANCE LIMITED" }),
    );
    renderScope();
    await screen.findByTestId("ops-scope-bar");
    expect(screen.queryByText(/ASSURANT/)).toBeNull();
  });

  it("sin programa declara el snapshot con el as-of gobernado", async () => {
    renderScope();
    await waitFor(() =>
      expect(screen.getByTestId("ops-scope-bar").textContent).toMatch(/Snapshot operativo a/),
    );
  });

  it("con programa muestra Vertical › Cliente › Programa y permite cambiarlo", async () => {
    localStorage.setItem("ops.filters.v4", JSON.stringify({ programa: "p-1" }));
    renderScope();
    await waitFor(() =>
      expect(screen.getByText("Climate › CARREFOUR › Clima instalación")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Cambiar programa" })).toBeInTheDocument();
  });
});
