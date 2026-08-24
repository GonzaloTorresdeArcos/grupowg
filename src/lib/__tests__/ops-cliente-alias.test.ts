import { describe, it, expect } from "vitest";
import {
  patronAplica,
  resolverClienteContractual,
  resumenAliases,
  type ClienteAlias,
  type ReglaPatron,
} from "@/lib/ops-cliente-alias";

const ALIASES: ClienteAlias[] = [
  { cliente_wg_real: "METRO MARKETS GMBH", cliente_contractual: "METRO / MAKRO", origen: "manual" },
  { cliente_wg_real: "MAKRO", cliente_contractual: "METRO / MAKRO", origen: "manual" },
  {
    cliente_wg_real: "CARREFOUR BRANDT",
    cliente_contractual: "CARREFOUR",
    origen: "manual",
    vigencia_hasta: "2025-12-31",
  },
];

const PATRONES: ReglaPatron[] = [
  { cliente: "CARREFOUR", cliente_wg_patron: "CARREFOUR%", programa: "SAT" },
  { cliente: "VESTEL", cliente_wg_patron: "VESTEL%" },
];

describe("resolución cliente ERP → cliente contractual", () => {
  it("el alias explícito tiene prioridad sobre el patrón", () => {
    const r = resolverClienteContractual("CARREFOUR BRANDT", ALIASES, PATRONES, new Date("2025-06-01"));
    expect(r.cliente_contractual).toBe("CARREFOUR");
    expect(r.metodo).toBe("alias_explicito");
    expect(r.provisional).toBe(false);
  });

  it("un alias fuera de vigencia no resuelve: cae al patrón y queda marcado como provisional", () => {
    const r = resolverClienteContractual("CARREFOUR BRANDT", ALIASES, PATRONES, new Date("2026-06-01"));
    expect(r.metodo).toBe("patron_fallback");
    expect(r.provisional).toBe(true);
  });

  it("sin alias ni patrón → sin_resolver, nunca se adivina un cliente", () => {
    const r = resolverClienteContractual("FERRETERIA LOCAL SL", ALIASES, PATRONES);
    expect(r.cliente_contractual).toBeNull();
    expect(r.metodo).toBe("sin_resolver");
  });

  it("el patrón ILIKE respeta % y es insensible a mayúsculas", () => {
    expect(patronAplica("vestel holland b.v.", "VESTEL%")).toBe(true);
    expect(patronAplica("XVESTEL", "VESTEL%")).toBe(false);
  });
});

describe("resumen auditable por cliente contractual", () => {
  it("separa valores resueltos por alias de los resueltos por patrón y acumula lo no resuelto", () => {
    const r = resumenAliases(
      [
        { cliente_wg: "MAKRO", ots: 100 },
        { cliente_wg: "METRO MARKETS GMBH", ots: 50 },
        { cliente_wg: "VESTEL HOLLAND B.V.", ots: 30 },
        { cliente_wg: "DESCONOCIDO SL", ots: 7 },
      ],
      ALIASES,
      PATRONES,
    );
    const metro = r.porCliente.find((c) => c.cliente_contractual === "METRO / MAKRO");
    expect(metro).toMatchObject({ valoresPorAlias: 2, valoresPorPatron: 0, ots: 150 });
    expect(r.porCliente.find((c) => c.cliente_contractual === "VESTEL")).toMatchObject({ valoresPorPatron: 1 });
    expect(r.valoresSinResolver).toBe(1);
    expect(r.otsSinResolver).toBe(7);
  });
});
