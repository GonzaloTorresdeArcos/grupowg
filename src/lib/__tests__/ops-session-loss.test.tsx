/**
 * SESSION LOSS ≠ ZERO DATA.
 *
 * Incidente de producción: al perderse la sesión, supabase-js seguía enviando
 * las RPC con la sola clave publishable (rol efectivo `anon`). Las SECURITY
 * DEFINER respondían «permission denied for function» y las invoker devolvían
 * vacío por RLS; la UI lo pintaba como ceros.
 *
 * Estas pruebas fijan las tres invariantes del gate:
 *  (a) sin access_token en memoria NO se envía ninguna RPC;
 *  (b) «permission denied for function» / 401 marca la sesión como perdida,
 *      no se reintenta y la caché de ops deja de considerarse válida;
 *  (c) las páginas no derivan estado vacío de datos sin query resuelta.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const rpcMock = vi.fn();
const childRpcHookMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "usuario-sin-management" },
    session: { access_token: "jwt-authenticated" },
    loading: false,
  }),
}));

vi.mock("@/hooks/useIsManagement", () => ({
  useIsManagement: () => ({ isManagement: false, loading: false }),
}));

vi.mock("@/lib/ops-session", async () => {
  const real = await vi.importActual<typeof import("@/lib/ops-session")>("@/lib/ops-session");
  return { ...real, useOpsSession: () => ({ hasSession: true, perdida: false }) };
});

vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<Record<string, unknown>>("react-router-dom");
  return { ...real, useLocation: () => ({ pathname: "/operaciones", search: "", hash: "", state: null, key: "test" }) };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

import { opsRpc } from "@/lib/ops-query";
import {
  SessionPerdida,
  esSessionPerdida,
  hayTokenOps,
  marcarSesionPerdida,
  publicarSesionOps,
  sesionOpsPerdida,
  _resetSesionOps,
} from "@/lib/ops-session";

beforeEach(() => {
  rpcMock.mockReset();
  childRpcHookMock.mockReset();
  _resetSesionOps();
});

describe("OpsProtectedRoute · authenticated sin management", () => {
  it("muestra acceso restringido y no monta el árbol que activaría RPC", async () => {
    const { OpsProtectedRoute } = await import("@/components/ops/OpsProtectedRoute");
    const PaginaOps = () => {
      childRpcHookMock();
      return <div>contenido operativo</div>;
    };
    render(<OpsProtectedRoute><PaginaOps /></OpsProtectedRoute>);
    expect(screen.getByText("Acceso restringido a Dirección")).toBeInTheDocument();
    expect(screen.queryByText("contenido operativo")).not.toBeInTheDocument();
    expect(childRpcHookMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("(a) opsRpc nunca envía sin JWT de usuario", () => {
  it("sin sesión lanza SessionPerdida y no toca la red", async () => {
    await expect(opsRpc("ops_kpis", { p_from: "2026-06-01" })).rejects.toBeInstanceOf(SessionPerdida);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("con sesión publicada sí envía la petición", async () => {
    publicarSesionOps("jwt-de-usuario");
    rpcMock.mockResolvedValue({ data: { creadas: 5606 }, error: null });
    const r = await opsRpc<{ creadas: number }>("ops_kpis", { p_from: "2026-06-01" });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(r.creadas).toBe(5606);
  });

  it("tras SIGNED_OUT (token null) vuelve a bloquear", async () => {
    publicarSesionOps("jwt");
    publicarSesionOps(null);
    expect(hayTokenOps()).toBe(false);
    await expect(opsRpc("ops_panorama_resumen")).rejects.toBeInstanceOf(SessionPerdida);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("(b) identidad perdida en vuelo", () => {
  it("«permission denied for function» marca sesión perdida y no devuelve vacío", async () => {
    publicarSesionOps("jwt");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied for function ops_panorama_resumen", code: "42501" },
    });
    await expect(opsRpc("ops_panorama_resumen")).rejects.toBeTruthy();
    expect(sesionOpsPerdida()).toBe(true);
    // La siguiente llamada ni siquiera sale a la red.
    rpcMock.mockClear();
    await expect(opsRpc("ops_panorama_resumen")).rejects.toBeInstanceOf(SessionPerdida);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("clasifica correctamente los errores de identidad", () => {
    expect(esSessionPerdida({ status: 401 })).toBe(true);
    expect(esSessionPerdida({ code: "42501" })).toBe(true);
    expect(esSessionPerdida({ message: "permission denied for function ops_supply_resumen" })).toBe(true);
    expect(esSessionPerdida({ message: "JWT expired" })).toBe(true);
    // Un fallo funcional NO es pérdida de sesión: debe reintentarse y mostrarse.
    expect(esSessionPerdida({ message: "canceling statement due to statement timeout" })).toBe(false);
    expect(esSessionPerdida(null)).toBe(false);
  });

  it("marcarSesionPerdida corta cualquier RPC posterior", async () => {
    publicarSesionOps("jwt");
    marcarSesionPerdida();
    await expect(opsRpc("ops_kpis")).rejects.toBeInstanceOf(SessionPerdida);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("(c) las páginas de /operaciones no derivan vacíos sin query resuelta", () => {
  const dir = "src/pages/ops";
  const ficheros = readdirSync(resolve(process.cwd(), dir))
    .filter((f) => /\.tsx$/.test(f) && !f.includes(".test."))
    .map((f) => ({ ruta: `${dir}/${f}`, src: readFileSync(resolve(process.cwd(), dir, f), "utf8") }));

  it("hay páginas analizadas", () => {
    expect(ficheros.length).toBeGreaterThan(8);
  });

  for (const { ruta, src } of ficheros) {
    it(`${ruta} distingue error/carga de «sin datos»`, () => {
      // Ninguna página puede tratar un fallo como conjunto vacío.
      expect(/isError\s*\?\s*\[\]/.test(src), ruta).toBe(false);
      expect(/error\s*\?\s*\[\]/.test(src), ruta).toBe(false);
      // Si la página consume RPC, debe tener rama de error explícita.
      if (/useOpsRpcs?\(/.test(src)) {
        expect(/OpsErrorBlock|isError|fallos/.test(src), ruta).toBe(true);
      }
    });
  }

  const paginasCriticas = [
    "Dashboard.tsx", "Delegaciones.tsx", "SLA.tsx", "Tecnicos.tsx",
    "Sats.tsx", "Costes.tsx", "Hub.tsx", "Dispersion.tsx",
    "Repuestos.tsx", "Logistica.tsx", "CalidadDatos.tsx",
  ];

  for (const nombre of paginasCriticas) {
    it(`${nombre}: un fallo no se transforma en cero, null o colección vacía`, () => {
      const ruta = resolve(process.cwd(), dir, nombre);
      const src = readFileSync(ruta, "utf8");
      expect(/(?:isError|error)\s*\?\s*(?:\[\]|null|0)/.test(src), ruta).toBe(false);
      expect(/(?:q|query)\.data\s*\?\?\s*(?:\[\]|null)/.test(src) && !/OpsErrorBlock|fallos|isError/.test(src), ruta).toBe(false);
      expect(/OpsErrorBlock|fallos|isError/.test(src), ruta).toBe(true);
    });
  }
});

describe.each([
  ["Dashboard", "ops_panorama_resumen"],
  ["Delegaciones", "ops_delegaciones"],
  ["SLA", "ops_sla_resumen"],
  ["Tecnicos", "ops_tecnicos_scorecard"],
  ["Sats", "ops_sats_ranking"],
  ["Costes", "ops_costes"],
  ["Hub", "ops_delegacion_ficha"],
  ["Dispersion", "ops_dispersion_resumen"],
  ["Repuestos", "ops_supply_resumen"],
  ["Logistica", "ops_logistica"],
  ["CalidadDatos", "ops_data_quality"],
])("%s · pérdida de identidad", (_pagina, rpc) => {
  it("42501 marca sesión perdida y nunca entrega un payload cero/vacío", async () => {
    publicarSesionOps("jwt-management");
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "42501", message: `permission denied for function ${rpc}` },
    });

    let resultado: unknown = "sin resolver";
    await expect(opsRpc(rpc).then((data) => { resultado = data; })).rejects.toMatchObject({ code: "42501" });
    expect(resultado).toBe("sin resolver");
    expect(sesionOpsPerdida()).toBe(true);
  });
});
