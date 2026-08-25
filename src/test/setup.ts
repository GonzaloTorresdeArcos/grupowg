import "@testing-library/jest-dom";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// Matchers de accesibilidad: expect(...).toHaveNoViolations()
expect.extend(axeMatchers);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill mínimo para componentes que usan IntersectionObserver (p.ej. <Reveal />)
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

/**
 * SESSION GATE de /operaciones: las RPC solo se emiten con un access_token en
 * memoria. Los tests de UI que simulan una sesión management válida publican
 * aquí un token ficticio; `ops-session-loss.test.tsx` lo restablece por sí
 * mismo para cubrir el escenario de sesión ausente.
 */
import { beforeEach } from "vitest";
import { publicarSesionOps } from "@/lib/ops-session";

beforeEach(() => {
  publicarSesionOps("test-access-token");
});
