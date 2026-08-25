import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  VENTANAS_PROPIAS,
  etiquetaVentana,
  ventanaPropia,
  SEMANTICA_KM,
  semanticaKm,
  KM_TECNICO_MES_DISPONIBLE,
  AVISO_KM,
  TRAZABILIDAD_F0,
  DECISION_RUTAS_LEGADO,
  LABEL_AMBITO,
} from "@/lib/ops-modelo";

// ─── Utilidades ─────────────────────────────────────────────────────────────

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Todo el código productivo (excluye tests y ficheros de fixtures). */
const FICHEROS_PRODUCTIVOS = walk("src")
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .filter((f) => !f.includes("__tests__") && !/\.test\.tsx?$/.test(f) && !f.startsWith("src/test"))
  .filter((f) => !f.endsWith("ops-contractual-fixtures.ts"));

const OPS_PRODUCTIVO = FICHEROS_PRODUCTIVOS.filter(
  (f) => f.startsWith("src/pages/ops") || f.startsWith("src/components/ops") || /\/ops-[\w-]+\.tsx?$/.test(f),
);

// ─── 1. Registry: única fuente de verdad ────────────────────────────────────

describe("Registry: ops_sla_registry es la única fuente runtime", () => {
  it("ninguna página o componente productivo importa las fixtures del registry", () => {
    const infractores = FICHEROS_PRODUCTIVOS.filter((f) =>
      /from\s+["'][^"']*ops-contractual-fixtures["']/.test(readFileSync(f, "utf8")),
    );
    expect(infractores).toEqual([]);
  });

  it("ningún fichero de /operaciones importa mocks o datos de demostración", () => {
    const infractores = OPS_PRODUCTIVO.filter((f) =>
      /from\s+["'][^"']*(mocks|fixtures|demo)[^"']*["']/i.test(readFileSync(f, "utf8")),
    );
    expect(infractores).toEqual([]);
  });

  it("ningún fichero de /operaciones declara literales DEMO / simulado / ejemplo", () => {
    // Una frase que NIEGA la existencia de datos de demostración es correcta:
    // sólo se persiguen las afirmaciones.
    const NEGACION = /(no hay|sin|nunca|prohibido|ni)\s[^.]*$/i;
    const infractores = OPS_PRODUCTIVO.filter((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .some((l) => {
          if (!/\bDEMO\b|datos simulados|datos de ejemplo|\bmock\b/i.test(l)) return false;
          const antes = l.slice(0, l.search(/\bDEMO\b|datos simulados|datos de ejemplo|\bmock\b/i));
          return !NEGACION.test(antes);
        }),
    );
    expect(infractores).toEqual([]);
  });
});

// ─── 2. Semántica única de km ───────────────────────────────────────────────

describe("Semántica de kilómetros coherente en todo /operaciones", () => {
  it("km por técnico y mes NO puede declararse dato real (columna a 0 en toda la carga)", () => {
    expect(KM_TECNICO_MES_DISPONIBLE).toBe(false);
    expect(semanticaKm("km_tecnico_mes").nivel).toBe("pendiente");
  });

  it("solo la distancia base→CP es publicable, y siempre como aproximación", () => {
    expect(semanticaKm("km_base_cp").nivel).toBe("aproximacion");
    expect(semanticaKm("km_ruta").nivel).toBe("pendiente");
    expect(SEMANTICA_KM.filter((s) => s.nivel === "real")).toHaveLength(0);
  });

  it("el aviso único deja claro que no hay km reales de desplazamiento", () => {
    expect(AVISO_KM).toMatch(/no está disponible/);
    expect(AVISO_KM).toMatch(/aprox/i);
  });

  it("ninguna página presenta los km de ops_coste_mensual como dato real disponible", () => {
    const NEGACION = /(no|nunca|sin|pendiente|ningún|ninguna)\s[^.]*$/i;
    for (const f of OPS_PRODUCTIVO) {
      const lineas = readFileSync(f, "utf8").split("\n");
      const afirma = lineas.filter((l) => {
        const m = l.match(/km\s+(reales?|recorridos?\s+reales)/i);
        if (!m) return false;
        return !NEGACION.test(l.slice(0, m.index ?? 0));
      });
      expect(afirma, f).toEqual([]);
    }
  });
});

// ─── 3. F2: catálogo único de ventanas propias ──────────────────────────────

describe("F2 · catálogo único de ventanas propias", () => {
  it("declara exactamente las seis excepciones aprobadas", () => {
    expect(VENTANAS_PROPIAS.map((v) => v.id).sort()).toEqual(
      [
        "costes_evolucion",
        "hub_evolucion",
        "panorama_backlog",
        "panorama_evolucion",
        "panorama_resolucion",
        "tecnicos_evolucion",
      ].sort(),
    );
    expect(VENTANAS_PROPIAS.every((v) => v.meses === 12 || v.meses === 18)).toBe(true);
    expect(VENTANAS_PROPIAS.every((v) => v.motivo.length > 20)).toBe(true);
  });

  it("la etiqueta es uniforme y siempre declara la independencia del período global", () => {
    for (const v of VENTANAS_PROPIAS) {
      const e = etiquetaVentana(v.id);
      expect(e).toContain(`últimos ${v.meses} meses`);
      expect(e).toContain("independiente del período global");
    }
  });

  it("una ventana desconocida falla en vez de inventarse un valor", () => {
    // @ts-expect-error id inexistente a propósito
    expect(() => ventanaPropia("no_existe")).toThrow();
  });

  it("las páginas con ventana propia usan el catálogo, no literales sueltos", () => {
    const paginas = [
      "src/pages/ops/Dashboard.tsx",
      "src/pages/ops/Costes.tsx",
      "src/pages/ops/Hub.tsx",
      "src/pages/ops/Tecnicos.tsx",
    ];
    for (const p of paginas) {
      const t = readFileSync(p, "utf8");
      expect(t, p).toContain("etiquetaVentana");
      expect(t, p).not.toMatch(/últimos 1[28] meses/);
    }
  });
});

// ─── 4. F0: trazabilidad de los 7 campos críticos ───────────────────────────

describe("F0 · inventario de trazabilidad", () => {
  it("cubre los 7 campos críticos con cadena completa fuente → tabla → RPC → frontend → KPI", () => {
    expect(TRAZABILIDAD_F0).toHaveLength(7);
    for (const c of TRAZABILIDAD_F0) {
      expect(c.campoFuente.length, c.id).toBeGreaterThan(3);
      expect(c.tabla, c.id).toMatch(/ops_/);
      expect(c.rpcs.length, c.id).toBeGreaterThan(0);
      expect(c.frontend.length, c.id).toBeGreaterThan(0);
      expect(c.kpis.length, c.id).toBeGreaterThan(0);
    }
  });

  it("el inventario es visible en Calidad de datos", () => {
    const t = readFileSync("src/pages/ops/CalidadDatos.tsx", "utf8");
    expect(t).toContain("TRAZABILIDAD_F0");
    expect(t).toContain("VENTANAS_PROPIAS");
    expect(t).toContain("SEMANTICA_KM");
  });

  it("la decisión F1-7 sobre rutas legadas queda documentada con sus condiciones", () => {
    expect(DECISION_RUTAS_LEGADO.estado).toMatch(/SUPERSEDED/);
    expect(DECISION_RUTAS_LEGADO.condiciones.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 5. F1: Producto vs Organización ────────────────────────────────────────

describe("F1 · desambiguación Producto vs Organización", () => {
  it("las etiquetas de ámbito están centralizadas", () => {
    expect(LABEL_AMBITO.producto).toBe("Producto");
    expect(LABEL_AMBITO.organizacion).toBe("Organización");
  });

  it("la comparativa de equipos distingue la unidad organizativa de la gama de producto", () => {
    const t = readFileSync("src/components/ops/EquiposComparativa.tsx", "utf8");
    expect(t).toContain("AmbitoChip");
    expect(t).toContain('ambito="organizacion"');
    expect(t).toContain('ambito="producto"');
  });

  it("las fichas de drill-down muestran el breadcrumb conceptual", () => {
    for (const p of ["src/pages/ops/Tecnicos.tsx", "src/pages/ops/Delegaciones.tsx", "src/pages/ops/Hub.tsx"]) {
      expect(readFileSync(p, "utf8"), p).toContain("BreadcrumbConceptual");
    }
  });
});

// ─── 6. E2E Supply permanente ───────────────────────────────────────────────

describe("E2E Supply · script permanente y sin residuos", () => {
  const sql = readFileSync("scripts/e2e-supply.sql", "utf8");

  it("cubre el escenario aprobado completo", () => {
    expect(sql).toContain("ops_pieza_solicitud");
    expect(sql).toContain("ops_expedicion");
    expect(sql).toContain("ops_expedicion_linea");
    expect(sql).toContain("ops_stock_snapshot");
    expect(sql).toMatch(/E2E-OT-1/);
    expect(sql).toMatch(/E2E-OT-2/);
    expect(sql).toMatch(/'incidencia'/);
    expect(sql).toMatch(/reexpedicion/);
    expect(sql).toMatch(/ON CONFLICT/); // segunda carga idempotente
  });

  it("nunca deja residuos: termina siempre lanzando la excepción que fuerza el ROLLBACK", () => {
    expect(sql).toMatch(/RAISE EXCEPTION 'E2E SUPPLY OK/);
    expect(sql).toMatch(/ROLLBACK/);
    expect(sql).not.toMatch(/\bCOMMIT\b/);
  });

  it("deja anotado que el acceptance real exige importador + sesión management + RLS", () => {
    expect(sql).toMatch(/IMPORTADOR/i);
    expect(sql).toMatch(/MANAGEMENT/i);
    expect(sql).toMatch(/RLS/);
  });
});

// ─── 7. Reloj: nada usa la fecha del sistema para medir antigüedad ──────────

describe("disciplina de reloj (as-of, no now())", () => {
  it("las páginas de /operaciones no usan Date.now() ni new Date() para medir antigüedad", () => {
    const permitidos = ["src/lib/ops-as-of.ts", "src/lib/ops-periodo.ts"];
    for (const f of OPS_PRODUCTIVO.filter((x) => !permitidos.includes(x))) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toMatch(/Date\.now\(\)\s*-/);
    }
  });
});
