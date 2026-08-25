import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpsFiltersProvider } from "../ops-filters";
import { OpsFiltersBar } from "@/components/ops/OpsFiltersBar";

const renderBar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <OpsFiltersProvider>
        <OpsFiltersBar />
      </OpsFiltersProvider>
    </QueryClientProvider>
  );

const OK_PAYLOAD = {
  delegaciones: ["Central San Agustín", "Barcelona"],
  clientes: ["CLIENTE A"],
  gamas: ["Blanca"],
  familias: ["Frigorífico"],
  marcas: ["MARCA X"],
  provincias: ["MADRID"],
  sats: ["SAT 1"],
  tecnicos: ["TEC 1"],
  canales: ["Taller", "Domicilio"],
};

describe("OpsFiltersBar — carga de opciones maestras (blindaje d.familias.map)", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    localStorage.clear();
  });

  it("renderiza las opciones cuando la RPC responde bien", async () => {
    rpcMock.mockResolvedValue({ data: OK_PAYLOAD, error: null });
    renderBar();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Frigorífico" })).toBeInTheDocument()
    );
    expect(screen.getByRole("option", { name: "Central San Agustín" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Domicilio" })).toBeInTheDocument();
  });

  it("acepta payload envuelto en array (SETOF json)", async () => {
    rpcMock.mockResolvedValue({ data: [OK_PAYLOAD], error: null });
    renderBar();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Frigorífico" })).toBeInTheDocument()
    );
  });

  it("degrada a lista vacía si el payload viene malformado, sin romper la barra", async () => {
    rpcMock.mockResolvedValue({
      data: { familias: "Frigorífico", delegaciones: 42, canales: [1, null, "Taller"] },
      error: null,
    });
    renderBar();
    // La opción malformada (string suelto) nunca debe aparecer ni romper el render.
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Taller" })).toBeInTheDocument()
    );
    const selects = screen.getAllByRole("combobox").filter(
      (s) => s.getAttribute("aria-label") !== "Modo de comparación",
    );
    expect(selects.length).toBeGreaterThanOrEqual(9);
    for (const s of selects) expect(s).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Frigorífico" })).not.toBeInTheDocument();
    // Cada select conserva su opción neutra.
    expect(screen.getAllByRole("option", { name: "Todos" }).length).toBe(selects.length);
  });

  it("un payload null no rompe y deja los selects con su opción neutra", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    renderBar();
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const selects = screen.getAllByRole("combobox").filter(
      (s) => s.getAttribute("aria-label") !== "Modo de comparación",
    );
    expect(selects.length).toBeGreaterThanOrEqual(9);
    expect(screen.getAllByRole("option", { name: "Todos" }).length).toBe(selects.length);
  });

  it("error de RPC muestra aviso con aviso de alerta y permite reintentar", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "statement timeout" } });
    renderBar();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se han podido cargar las opciones de filtro");
    rpcMock.mockResolvedValue({ data: OK_PAYLOAD, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Frigorífico" })).toBeInTheDocument()
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(rpcMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("un rechazo a nivel de red no rompe la barra y muestra el aviso", async () => {
    rpcMock.mockRejectedValue(new Error("network down"));
    renderBar();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se han podido cargar las opciones de filtro");
    const selects = screen.getAllByRole("combobox").filter(
      (s) => s.getAttribute("aria-label") !== "Modo de comparación",
    );
    expect(selects.length).toBeGreaterThanOrEqual(9);
  });
});
