/**
 * SESSION LOSS UX.
 *
 * Dos situaciones distintas y visibles para el usuario:
 *  A. acceso directo sin autenticar  → /portal/login?next=…            («Inicia sesión para acceder a Operaciones.»)
 *  B. sesión existente que se pierde → /portal/login?reason=session_expired&next=…
 *
 * Además: la ruta de vuelta se conserva íntegra (pathname + search), el login
 * no permite open-redirect, y con la sesión perdida no se envía ninguna RPC ni
 * queda dato antiguo visible.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcMock = vi.fn();
const signInMock = vi.fn(async () => ({ error: null }));
let authState: { user: unknown; session: unknown; loading: boolean } = {
  user: null,
  session: null,
  loading: false,
};
let authCallback: ((evento: string, sess: unknown) => void) | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    }),
    auth: {
      signInWithPassword: (...args: unknown[]) => signInMock(...(args as [])),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (cb: (evento: string, sess: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

vi.mock("@/hooks/useAuth", async () => {
  const real = await vi.importActual<typeof import("@/hooks/useAuth")>("@/hooks/useAuth");
  return { ...real, useAuth: () => authState };
});

vi.mock("@/hooks/useIsManagement", () => ({
  useIsManagement: () => ({ isManagement: true, loading: false }),
}));

import { OpsProtectedRoute } from "@/components/ops/OpsProtectedRoute";
import PortalLogin from "@/pages/portal/Login";
import { AuthProvider } from "@/hooks/useAuth";
import { OPS_QUERY_ROOT } from "@/lib/ops-query";
import {
  _resetSesionOps,
  marcarSesionPerdida,
  publicarSesionOps,
  sesionOpsPerdida,
  huboSesionOps,
} from "@/lib/ops-session";

const RUTA = "/operaciones/repuestos?tab=stock";
const NEXT = encodeURIComponent("/operaciones/repuestos?tab=stock");

const Espia = () => {
  const loc = useLocation();
  return <div data-testid="url">{loc.pathname + loc.search}</div>;
};

const renderApp = (ruta = RUTA, qc = new QueryClient()) =>
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[ruta]}>
        <Espia />
        <Routes>
          <Route
            path="/operaciones/*"
            element={
              <OpsProtectedRoute>
                <div>CONTENIDO OPERACIONES 12345</div>
              </OpsProtectedRoute>
            }
          />
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal" element={<div>PORTAL HOME</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  _resetSesionOps();
  rpcMock.mockReset();
  signInMock.mockClear();
  authState = { user: null, session: null, loading: false };
});

describe("SESSION LOSS UX · A vs B", () => {
  it("(a) acceso directo sin login lleva al login con next y sin reason", async () => {
    renderApp();
    expect(screen.getByTestId("url").textContent).toBe(`/portal/login?next=${NEXT}`);
    expect(screen.getByTestId("url").textContent).not.toContain("reason=");
    expect(await screen.findByText("Inicia sesión para acceder a Operaciones.")).toBeInTheDocument();
    expect(screen.queryByText(/Tu sesión ha caducado/)).toBeNull();
  });

  it("(b) sesión perdida lleva al login con reason=session_expired y mensaje de caducidad", async () => {
    publicarSesionOps("jwt");
    marcarSesionPerdida();
    expect(sesionOpsPerdida()).toBe(true);
    expect(huboSesionOps()).toBe(true);

    renderApp();
    expect(screen.getByTestId("url").textContent).toBe(
      `/portal/login?reason=session_expired&next=${NEXT}`,
    );
    expect(
      await screen.findByText("Tu sesión ha caducado. Vuelve a iniciar sesión para continuar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("(b bis) publicarSesionOps(null) tras haber tenido token también marca caducidad", () => {
    publicarSesionOps("jwt");
    publicarSesionOps(null);
    expect(sesionOpsPerdida()).toBe(true);
  });

  it("publicar una sesión válida limpia el estado de sesión perdida", () => {
    publicarSesionOps("jwt");
    marcarSesionPerdida();
    publicarSesionOps("jwt-nuevo");
    expect(sesionOpsPerdida()).toBe(false);
  });

  it("(c) next conserva pathname y query codificados", () => {
    renderApp("/operaciones/repuestos?tab=stock&marca=BEKO");
    expect(screen.getByTestId("url").textContent).toBe(
      `/portal/login?next=${encodeURIComponent("/operaciones/repuestos?tab=stock&marca=BEKO")}`,
    );
  });
});

describe("SESSION LOSS UX · vuelta tras login", () => {
  const renderLogin = (search: string) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/portal/login${search}`]}>
          <Espia />
          <Routes>
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<div>PORTAL HOME</div>} />
            <Route path="/operaciones/*" element={<div>DESTINO OPERACIONES</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it("(d) login correcto navega a la ruta de next", async () => {
    const { container } = renderLogin(`?next=${NEXT}`);
    const form = container.querySelector("form") as HTMLFormElement;
    (form.querySelector("#signin-email") as HTMLInputElement).value = "a@b.com";
    (form.querySelector("#signin-password") as HTMLInputElement).value = "123456";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.getByText("DESTINO OPERACIONES")).toBeInTheDocument());
    expect(screen.getByTestId("url").textContent).toBe("/operaciones/repuestos?tab=stock");
  });

  it("(d bis) next absoluto no se sigue: vuelve a /portal", async () => {
    const { container } = renderLogin(`?next=${encodeURIComponent("https://evil.example.com")}`);
    const form = container.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.getByText("PORTAL HOME")).toBeInTheDocument());
  });
});

describe("SESSION LOSS UX · nada de datos antiguos", () => {
  it("(e) con la sesión perdida no se llama a supabase.rpc ni se montan los children", () => {
    publicarSesionOps("jwt");
    marcarSesionPerdida();
    renderApp();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/CONTENIDO OPERACIONES/)).toBeNull();
  });

  it("(f) la pérdida de sesión purga la caché ['ops'] antes de mostrar nada", async () => {
    const qc = new QueryClient();
    qc.setQueryData([OPS_QUERY_ROOT, "ops_kpis", {}], { total: 987654 });
    sessionStorage.setItem("ops:mgmt:u1", "1");

    publicarSesionOps("jwt");
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <div />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(authCallback).toBeTruthy());
    authCallback?.("SIGNED_OUT", null);

    await waitFor(() =>
      expect(qc.getQueryCache().findAll({ queryKey: [OPS_QUERY_ROOT] })).toHaveLength(0),
    );
    expect(sessionStorage.getItem("ops:mgmt:u1")).toBeNull();
    expect(sesionOpsPerdida()).toBe(true);

    authState = { user: null, session: null, loading: false };
    const vista = renderApp();
    expect(vista.container.textContent).not.toContain("987654");
    expect(vista.container.textContent).not.toContain("Sin datos");
  });
});
