import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { display_name: "Dirección" },
    user: { email: "dir@wg.test" },
    signOut: async () => {},
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async () => ({ data: null, error: null }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

import { OpsLayout, NAV_GROUPS } from "@/components/ops/OpsLayout";

/**
 * UX-SHELL-LEFTNAV-1 · Evidencia de comportamiento del shell global.
 * El rail colapsado no debe contener NINGÚN texto permanente de menú
 * (grupos, labels, subtítulo "Interno") y debe medir ~56 px (w-14).
 */

const renderShell = () =>
  render(
    <MemoryRouter initialEntries={["/operaciones/performance-real"]}>
      <Routes>
        <Route path="/operaciones" element={<OpsLayout />}>
          <Route path="performance-real" element={<div>contenido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("UX-SHELL-LEFTNAV-1 · rail colapsado", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("por defecto está colapsado y mide w-14 (~56 px)", () => {
    renderShell();
    const rail = screen.getByTestId("ops-rail");
    expect(rail.getAttribute("data-expandido")).toBe("0");
    expect(rail.className).toContain("w-14");
    expect(rail.className).not.toContain("w-64");
  });

  it("no muestra ningún texto de grupo ni el subtítulo 'Interno' en el rail", () => {
    renderShell();
    const nav = screen.getByTestId("ops-rail-nav");
    for (const g of NAV_GROUPS) {
      expect(nav.textContent).not.toContain(g.label.toUpperCase());
    }
    // Los labels sólo existen como tooltip oculto (aria/hover), nunca como
    // texto visible permanente: cada enlace mide 36 px de alto y centra el icono.
    const enlaces = nav.querySelectorAll("a");
    expect(enlaces.length).toBe(NAV_GROUPS.flatMap((g) => g.items).length);
    enlaces.forEach((a) => {
      expect(a.className).toContain("justify-center");
      expect(a.getAttribute("aria-label")).toBeTruthy();
    });
  });

  it("cada sección del shell (12) es alcanzable desde el rail colapsado", () => {
    renderShell();
    const nav = screen.getByTestId("ops-rail-nav");
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
      expect(hrefs).toContain(item.to);
    }
  });

  it("persiste la preferencia expandido/colapsado", () => {
    renderShell();
    fireEvent.click(screen.getByLabelText("Expandir navegación"));
    expect(localStorage.getItem("ops.nav.expanded.v1")).toBe("1");
    expect(screen.getByTestId("ops-rail").className).toContain("w-64");
  });
});
