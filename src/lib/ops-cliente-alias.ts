/**
 * ops-cliente-alias.ts — Capa EXPLÍCITA y AUDITABLE de resolución
 * cliente ERP (`ops_fact_ot.cliente_wg`) → cliente contractual del Registry.
 *
 * Espejo TS de `public.ops_cliente_contrato_alias`.
 *
 * PRINCIPIO: el nombre del cliente en el ERP no es el cliente del contrato.
 * La resolución se hace por alias declarado; el patrón ILIKE del Registry es
 * solo un fallback PROVISIONAL que queda marcado como tal para auditoría.
 * Nunca se adivina: si no hay alias ni patrón, el resultado es `sin_resolver`.
 */

export type OrigenAlias = "manual" | "patron_provisional";

export type ClienteAlias = {
  id?: string;
  cliente_wg_real: string;
  cliente_contractual: string;
  programa?: string | null;
  vigencia_desde?: string | null;
  vigencia_hasta?: string | null;
  origen: OrigenAlias;
  notas?: string | null;
};

/** Regla del Registry reducida a lo que necesita el fallback por patrón. */
export type ReglaPatron = {
  cliente: string;
  cliente_wg_patron: string | null;
  programa?: string | null;
};

export type MetodoResolucion = "alias_explicito" | "patron_fallback" | "sin_resolver";

export type ResolucionCliente = {
  cliente_contractual: string | null;
  programa?: string | null;
  metodo: MetodoResolucion;
  /** true cuando la resolución debe auditarse antes de usarse como contractual. */
  provisional: boolean;
};

const vigente = (a: ClienteAlias, ref: Date): boolean => {
  if (a.vigencia_desde && new Date(`${a.vigencia_desde}T00:00:00Z`) > ref) return false;
  if (a.vigencia_hasta && new Date(`${a.vigencia_hasta}T23:59:59Z`) < ref) return false;
  return true;
};

/** Traduce un patrón ILIKE de SQL (`%`, `_`) a expresión regular insensible. */
export const patronAplica = (valor: string, patron: string): boolean => {
  const escapado = patron.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escapado.replace(/%/g, ".*").replace(/_/g, ".")}$`, "i");
  return re.test(valor);
};

/**
 * Orden de resolución, sin excepciones:
 * 1. alias explícito vigente → `alias_explicito`
 * 2. patrón `cliente_wg_patron` del Registry → `patron_fallback` (provisional)
 * 3. nada → `sin_resolver`
 */
export const resolverClienteContractual = (
  clienteWgReal: string,
  aliases: readonly ClienteAlias[],
  reglasPatron: readonly ReglaPatron[] = [],
  referencia: Date = new Date(),
): ResolucionCliente => {
  const alias = aliases.find((a) => a.cliente_wg_real === clienteWgReal && vigente(a, referencia));
  if (alias) {
    return {
      cliente_contractual: alias.cliente_contractual,
      programa: alias.programa ?? null,
      metodo: "alias_explicito",
      provisional: alias.origen === "patron_provisional",
    };
  }

  const porPatron = reglasPatron.find((r) => r.cliente_wg_patron && patronAplica(clienteWgReal, r.cliente_wg_patron));
  if (porPatron) {
    return {
      cliente_contractual: porPatron.cliente,
      programa: porPatron.programa ?? null,
      metodo: "patron_fallback",
      provisional: true,
    };
  }

  return { cliente_contractual: null, programa: null, metodo: "sin_resolver", provisional: false };
};

// ─── Resumen por cliente contractual ─────────────────────────────────────────

export type ValorErp = { cliente_wg: string; ots: number };

export type ResumenCliente = {
  cliente_contractual: string;
  valoresPorAlias: number;
  valoresPorPatron: number;
  ots: number;
};

export type ResumenAliases = {
  porCliente: ResumenCliente[];
  /** Valores ERP que no resuelven a ningún cliente contractual. */
  valoresSinResolver: number;
  otsSinResolver: number;
};

export const resumenAliases = (
  valores: readonly ValorErp[],
  aliases: readonly ClienteAlias[],
  reglasPatron: readonly ReglaPatron[] = [],
): ResumenAliases => {
  const mapa = new Map<string, ResumenCliente>();
  let valoresSinResolver = 0;
  let otsSinResolver = 0;

  for (const v of valores) {
    const r = resolverClienteContractual(v.cliente_wg, aliases, reglasPatron);
    if (!r.cliente_contractual) {
      valoresSinResolver += 1;
      otsSinResolver += v.ots;
      continue;
    }
    const prev =
      mapa.get(r.cliente_contractual) ??
      { cliente_contractual: r.cliente_contractual, valoresPorAlias: 0, valoresPorPatron: 0, ots: 0 };
    if (r.metodo === "alias_explicito") prev.valoresPorAlias += 1;
    else prev.valoresPorPatron += 1;
    prev.ots += v.ots;
    mapa.set(r.cliente_contractual, prev);
  }

  return {
    porCliente: [...mapa.values()].sort((a, b) => b.ots - a.ots),
    valoresSinResolver,
    otsSinResolver,
  };
};
