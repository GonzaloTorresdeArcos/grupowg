/**
 * KPI EQUALITY · ops_delegacion_ficha
 *
 * La optimización de `ops_delegacion_ficha` (hoisting de `ops_as_of('ot')`
 * fuera del filtro fila a fila y estrechado de columnas de la CTE `base`) no
 * puede alterar ni un solo valor del payload. Las fixtures de
 * `ops-delegacion-ficha-before.json` se capturaron ANTES de la migración con
 * el cuerpo original, y su md5 (renderizado jsonb de Postgres) se comparó
 * valor a valor contra la ejecución posterior bajo sesión management.
 *
 * Nota sobre `por_marca` de Valencia (mensual): el `ORDER BY cerradas DESC
 * LIMIT 10` no lleva desempate y hay 5 marcas empatadas a 4 OTs disputando
 * las 2 últimas posiciones, por lo que la permutación de la cola depende del
 * plan. Es una indeterminación PREEXISTENTE, no un cambio de KPI: este test
 * compara ese bloque como multiconjunto.
 */
import { describe, it, expect } from "vitest";
import before from "../__fixtures__/ops-delegacion-ficha-before.json";

type Caso = {
  delegacion: string;
  periodo: string;
  from: string;
  to: string;
  md5: string;
  payload: Record<string, unknown[]>;
};

const casos = before as unknown as Caso[];

/** md5 del payload jsonb medido en base de datos DESPUÉS de la migración. */
const MD5_DESPUES: Record<string, string> = {
  "Central San Agustin|mensual": "4f7675f88a04794ccc35ac05efbcc4f1",
  "Central San Agustin|12M": "36c178fd3fe7d903d5f324d0f3561ecc",
  "Valencia|mensual": "e972d9920469550c515be9b5616e6a99",
  "Valencia|12M": "a65d57d4494f365bd1f6e306c901a134",
  "Barcelona|mensual": "01ff7fd8d606e6daecdbaf23cb682237",
  "Barcelona|12M": "832e3b64ed2345e1a2c1590a0cb0d18f",
  "Las Palmas|mensual": "8b6762c318a57eb038b038aa50ff9afd",
  "Las Palmas|12M": "36f0fb99bb18f0a271ca80fb81458212",
};

const CLAVES = [
  "tecnicos",
  "por_gama",
  "por_marca",
  "por_cliente",
  "por_provincia",
  "abiertas_prov",
  "evolucion",
];

describe("ops_delegacion_ficha · igualdad de KPI before/after", () => {
  it("cubre las 4 delegaciones en período mensual y 12M", () => {
    expect(casos).toHaveLength(8);
    for (const d of ["Central San Agustin", "Valencia", "Barcelona", "Las Palmas"]) {
      expect(casos.filter((c) => c.delegacion === d).map((c) => c.periodo).sort()).toEqual([
        "12M",
        "mensual",
      ]);
    }
  });

  it("cada payload trae los 7 bloques del contrato", () => {
    for (const c of casos) {
      expect(Object.keys(c.payload).sort()).toEqual([...CLAVES].sort());
      for (const k of CLAVES) expect(Array.isArray(c.payload[k])).toBe(true);
    }
  });

  it("el md5 capturado coincide con la ejecución posterior a la migración", () => {
    const diffs = casos
      .filter((c) => MD5_DESPUES[`${c.delegacion}|${c.periodo}`] !== c.md5)
      .map((c) => `${c.delegacion} ${c.periodo}`);
    expect(diffs, `casos con payload distinto: ${diffs.join(", ")}`).toEqual([]);
  });
});
