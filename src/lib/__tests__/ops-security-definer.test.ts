/**
 * Guardia obligatoria en funciones SECURITY DEFINER de /operaciones.
 *
 * El patrón de rendimiento (wrapper SECURITY DEFINER que evita reevaluar RLS
 * fila a fila) solo es aceptable si el wrapper impone él mismo la
 * autorización. Este test lee las migraciones y verifica que toda función
 * `public.ops_*` declarada SECURITY DEFINER contiene la guardia
 * `is_management`. El comportamiento en base de datos se prueba con
 * supabase/tests/security_definer_guard.sql.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

type Fn = { nombre: string; cuerpo: string; fichero: string };

const extraerFunciones = (sql: string, fichero: string): Fn[] => {
  const out: Fn[] = [];
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.(ops_[a-z0-9_]+)\s*\(/gi;
  const hits = [...sql.matchAll(re)];
  hits.forEach((m, i) => {
    const ini = m.index ?? 0;
    const fin = i + 1 < hits.length ? (hits[i + 1].index ?? sql.length) : sql.length;
    out.push({ nombre: m[1], cuerpo: sql.slice(ini, fin), fichero });
  });
  return out;
};

const funciones = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .flatMap((f) => extraerFunciones(readFileSync(join(DIR, f), "utf8"), f));

describe("SECURITY DEFINER · guardia is_management", () => {
  it("las migraciones definen funciones ops_*", () => {
    expect(funciones.length).toBeGreaterThan(5);
  });

  it("toda función ops_* SECURITY DEFINER contiene la guardia is_management", () => {
    const sinGuardia = funciones
      .filter((f) => /SECURITY\s+DEFINER/i.test(f.cuerpo))
      .filter((f) => !/is_management\s*\(/i.test(f.cuerpo))
      .map((f) => `${f.nombre} (${f.fichero})`);
    expect(sinGuardia, `SECURITY DEFINER sin guardia: ${sinGuardia.join(", ")}`).toEqual([]);
  });

  it("las guardias abortan con 'no autorizado'", () => {
    const guardadas = funciones.filter((f) => /SECURITY\s+DEFINER/i.test(f.cuerpo) && /is_management/i.test(f.cuerpo));
    expect(guardadas.length).toBeGreaterThan(0);
    for (const f of guardadas) {
      expect(f.cuerpo, `${f.nombre} debe abortar con 'no autorizado'`).toMatch(/no autorizado/i);
    }
  });

  it("existe el script SQL de prueba autorizado / no autorizado", () => {
    const sql = readFileSync("supabase/tests/security_definer_guard.sql", "utf8");
    expect(sql).toMatch(/SET LOCAL ROLE authenticated/);
    expect(sql).toMatch(/request\.jwt\.claims/);
    expect(sql).toMatch(/ROLLBACK/);
  });
});
