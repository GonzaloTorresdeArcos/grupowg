import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: rpcMock } }));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpsFiltersProvider, useOpsFilters } from "../ops-filters";
import { OpsFiltersBar } from "@/components/ops/OpsFiltersBar";
import {
  debeInvalidarPorAsOf,
  guardarAsOfSesion,
  leerAsOfSesion,
  useAsOfCacheGuard,
  SESSION_ASOF_KEY,
} from "../ops-cache";
import { useInvalidarOps } from "../ops-query";

// ─── A1 · comprobación de as-of ──────────────────────────────────────────────

describe("A1 · invalidación por cambio de as-of", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    sessionStorage.clear();
  });

  it("no invalida en la primera visita (sin valor cacheado)", () => {
    expect(debeInvalidarPorAsOf(null, "2026-07-31")).toBe(false);
    expect(debeInvalidarPorAsOf(undefined, "2026-07-31")).toBe(false);
  });

  it("no invalida si el snapshot es el mismo", () => {
    expect(debeInvalidarPorAsOf("2026-07-31", "2026-07-31")).toBe(false);
  });

  it("invalida cuando el snapshot cambia", () => {
    expect(debeInvalidarPorAsOf("2026-06-30", "2026-07-31")).toBe(true);
  });

  it("no invalida si no hay fecha remota (RPC caída): no se tira la caché a ciegas", () => {
    expect(debeInvalidarPorAsOf("2026-06-30", null)).toBe(false);
  });

  it("persiste el as-of en sessionStorage", () => {
    guardarAsOfSesion("2026-07-31");
    expect(leerAsOfSesion()).toBe("2026-07-31");
    expect(sessionStorage.getItem(SESSION_ASOF_KEY)).toBe("2026-07-31");
  });

  it("useAsOfCacheGuard invalida ['ops'] cuando la fecha efectiva cambió", async () => {
    sessionStorage.setItem(SESSION_ASOF_KEY, "2026-06-30");
    rpcMock.mockResolvedValue({ data: "2026-07-31", error: null });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const Probe = () => { useAsOfCacheGuard(); return null; };
    render(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>);
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["ops"] }));
    expect(leerAsOfSesion()).toBe("2026-07-31");
  });

  it("useAsOfCacheGuard no invalida cuando la fecha efectiva no cambió", async () => {
    sessionStorage.setItem(SESSION_ASOF_KEY, "2026-07-31");
    rpcMock.mockResolvedValue({ data: "2026-07-31", error: null });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const Probe = () => { useAsOfCacheGuard(); return null; };
    render(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(spy).not.toHaveBeenCalled();
  });

  it("useInvalidarOps invalida exactamente la raíz ['ops']", async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const Probe = () => {
      const inv = useInvalidarOps();
      return <button onClick={() => void inv()}>inv</button>;
    };
    render(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>);
    fireEvent.click(screen.getByText("inv"));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["ops"] });
  });
});

// ─── A3 · una sola publicación de rpcParams ──────────────────────────────────

const OPTS_BASE = {
  delegaciones: ["Central San Agustín", "Barcelona"],
  clientes: ["CLIENTE A"],
  gamas: ["Blanca"],
  familias: ["Frigorífico"],
  marcas: ["MARCA X"],
  provincias: ["MADRID"],
  sats: ["SAT 1"],
  tecnicos: ["TEC 1", "TEC 2"],
  canales: ["Taller", "Domicilio"],
};
// Al elegir Barcelona, TEC 1 deja de ser válido → la cascada invalida el técnico.
const OPTS_BCN = { ...OPTS_BASE, tecnicos: ["TEC 2"] };

describe("A3 · cascada de filtros: una sola publicación de rpcParams", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    localStorage.clear();
  });

  it("cambiar un filtro que invalida otro publica rpcParams una sola vez", async () => {
    let llamadas = 0;
    rpcMock.mockImplementation((fn: string, params: Record<string, unknown>) => {
      if (fn === "ops_cobertura_datos") {
        return Promise.resolve({ data: { min_fecha: "2024-01-01", max_fecha: "2026-07-31" }, error: null });
      }
      llamadas += 1;
      return Promise.resolve({
        data: params?.p_delegacion === "Barcelona" ? OPTS_BCN : OPTS_BASE,
        error: null,
      });
    });

    const publicaciones: Record<string, string | null>[] = [];
    const Probe = () => {
      const { rpcParams, setFilters } = useOpsFilters();
      const ultimo = publicaciones[publicaciones.length - 1];
      if (ultimo !== rpcParams) publicaciones.push(rpcParams);
      return (
        <button onClick={() => setFilters({ tecnico: "TEC 1" })} data-testid="set-tec">tec</button>
      );
    };

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <OpsFiltersProvider>
          <OpsFiltersBar />
          <Probe />
        </OpsFiltersProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByRole("option", { name: "Barcelona" })).toBeInTheDocument());
    // Selecciona un técnico que Barcelona invalidará.
    fireEvent.click(screen.getByTestId("set-tec"));
    await waitFor(() => expect(llamadas).toBeGreaterThanOrEqual(2));
    const base = publicaciones.length;

    // Acción del usuario: cambiar la delegación (invalida el técnico activo).
    const selDeleg = (screen.getByRole("option", { name: "Barcelona" }) as HTMLOptionElement)
      .closest("select") as HTMLSelectElement;
    fireEvent.change(selDeleg, { target: { value: "Barcelona" } });

    await waitFor(() => {
      const ultimo = publicaciones[publicaciones.length - 1];
      expect(ultimo.p_delegacion).toBe("Barcelona");
      expect(ultimo.p_tecnico).toBeNull();
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    // Una única publicación nueva: la combinación ya saneada.
    expect(publicaciones.length - base).toBe(1);
  });

  it("muestra «Actualizando…» mientras hay RPC de ops en vuelo, sin bloquear la barra", async () => {
    let resolver: ((v: unknown) => void) | null = null;
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "ops_cobertura_datos") {
        return Promise.resolve({ data: { min_fecha: "2024-01-01", max_fecha: "2026-07-31" }, error: null });
      }
      return new Promise((res) => { resolver = res as (v: unknown) => void; });
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <OpsFiltersProvider><OpsFiltersBar /></OpsFiltersProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ops-actualizando")).toBeInTheDocument());
    // La barra sigue operativa mientras carga.
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);

    await act(async () => {
      resolver?.({ data: OPTS_BASE, error: null });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => expect(screen.queryByTestId("ops-actualizando")).not.toBeInTheDocument());
  });
});
