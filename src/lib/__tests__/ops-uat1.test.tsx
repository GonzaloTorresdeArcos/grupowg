/**
 * UAT ROUND 1 — tests de regresión de los puntos 1, 2, 3 y 6.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SatRow, satEvaluable, medianaEvaluable, UMBRAL_MUESTRA_SAT, type SatRowData } from "@/pages/ops/Sats";
import { copyBacklogAnterior, restarDias } from "@/lib/ops-sla";
import { AVISO_KM, AVISO_KM_CORTO } from "@/lib/ops-modelo";

const leer = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const sat = (p: Partial<SatRowData> & { sat: string; cerradas: number }): SatRowData => ({
  abiertas: 3, pct_sla20: 0.5, pct_bajas: 0.2, pct_nff: 0.1, dias_medio: 12, coste_medio: 80, ...p,
});
const MEDIANS = { sla20: 0.5, bajas: 0.2, nff: 0.1, dias: 12, coste: 80 };

// ─── Punto 1 · coherencia de filtros entre Panorama y Delegaciones ───────────

describe("UAT-1 · Delegaciones aplica los mismos filtros globales que el Panorama", () => {
  const src = leer("src/pages/ops/Delegaciones.tsx");

  it("envía los 11 filtros globales a ops_delegaciones, no solo período/cliente/gama/familia", () => {
    for (const p of [
      "p_from", "p_to", "p_cliente", "p_gama", "p_familia",
      "p_marca", "p_provincia", "p_sat", "p_tecnico", "p_canal", "p_delegacion",
    ]) {
      expect(src, p).toContain(`${p}: rpcParams.${p}`);
    }
  });
});

// ─── Punto 2 · protección de muestra en SATs ─────────────────────────────────

describe("UAT-2 · SATs sin muestra evaluable no publican métricas", () => {
  it("el umbral es 30 cierres", () => {
    expect(UMBRAL_MUESTRA_SAT).toBe(30);
    expect(satEvaluable(12)).toBe(false);
    expect(satEvaluable(45)).toBe(true);
  });

  it("fila con n=12 → ninguna celda numérica de mediana/% y etiqueta explícita", () => {
    render(
      <table><tbody><SatRow r={sat({ sat: "SAT PEQUEÑO", cerradas: 12 })} medians={MEDIANS} /></tbody></table>,
    );
    const fila = screen.getByTestId("sat-SAT PEQUEÑO");
    expect(fila.dataset.evaluable).toBe("false");
    expect(fila.textContent).toContain("Sin muestra evaluable (n=12)");
    expect(fila.textContent).not.toMatch(/\d+[,.]\d\s?%/);
    expect(fila.textContent).not.toContain("0,0");
  });

  it("fila con n=45 → métricas visibles", () => {
    render(
      <table><tbody><SatRow r={sat({ sat: "SAT GRANDE", cerradas: 45 })} medians={MEDIANS} /></tbody></table>,
    );
    const fila = screen.getByTestId("sat-SAT GRANDE");
    expect(fila.dataset.evaluable).toBe("true");
    expect(fila.textContent).not.toContain("Sin muestra evaluable");
    expect(fila.textContent).toMatch(/%/);
  });

  it("la mediana del grupo ignora las filas no evaluables y es null si no hay ninguna", () => {
    const rows = [sat({ sat: "A", cerradas: 12, pct_sla20: 0 }), sat({ sat: "B", cerradas: 12, pct_sla20: 0 })];
    expect(medianaEvaluable(rows, (r) => r.pct_sla20)).toBeNull();
    expect(medianaEvaluable([...rows, sat({ sat: "C", cerradas: 60, pct_sla20: 0.8 })], (r) => r.pct_sla20)).toBe(0.8);
  });

  it("la página declara la ausencia de mediana en vez de mostrar 0", () => {
    expect(leer("src/pages/ops/Sats.tsx")).toContain("no se publica mediana del grupo");
  });
});

// ─── Punto 3 · backlog anterior reconstruido a la fecha efectiva ─────────────

describe("UAT-3 · el backlog anterior se reconstruye contra la fecha efectiva del dato", () => {
  it("con as-of 25-jul y ventana de 31 días reconstruye al 24-jun", () => {
    expect(restarDias("2026-07-25", 31)).toBe("2026-06-24");
    const c = copyBacklogAnterior("2026-07-25", 31);
    expect(c).toContain("24-jun-2026");
    expect(c).toContain("fecha efectiva de datos");
    expect(c.toLowerCase()).not.toContain("hoy");
  });

  it("sin carga de OT no inventa fecha", () => {
    expect(copyBacklogAnterior(null, 31).toLowerCase()).toContain("pendiente de primera carga");
  });

  it("la página SLA ya no habla de «fecha de hoy»", () => {
    const src = leer("src/pages/ops/SLA.tsx");
    expect(src).toContain("copyBacklogAnterior(asOfOt, L)");
    expect(src).not.toContain("reconstruye a fecha de hoy");
  });
});

// ─── Punto 6 · aviso de km reducido a una línea ──────────────────────────────

describe("UAT-6 · Dispersión declara los km en una sola línea", () => {
  it("la cabecera usa el aviso corto", () => {
    expect(AVISO_KM_CORTO).toBe("Distancia aproximada base→CP; km reales por intervención no disponibles.");
    expect(leer("src/pages/ops/Dispersion.tsx")).toContain("{AVISO_KM_CORTO}");
  });

  it("el texto largo solo aparece dentro del panel de definiciones", () => {
    const src = leer("src/pages/ops/Dispersion.tsx");
    const idx = src.indexOf("{AVISO_KM}");
    expect(idx).toBeGreaterThan(0);
    // El panel <details> de definiciones abre antes de la única aparición larga.
    expect(src.lastIndexOf("<details", idx)).toBeGreaterThan(src.indexOf("{AVISO_KM_CORTO}"));
    expect(src.split("{AVISO_KM}").length - 1).toBe(1);
    // No se pierde ninguna limitación: el texto completo sigue publicado.
    expect(AVISO_KM).toContain("ops_coste_mensual");
  });
});
