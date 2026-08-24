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

/**
 * F4A.1 · De dónde sale el `programa` con el que se asigna una regla a una OT.
 * - `explicit_ot`: la OT trae el campo `programa` del ERP (hoy no existe).
 * - `derived_alias`: el alias del cliente resuelve a UN único programa vigente,
 *   por lo que toda OT de ese cliente pertenece necesariamente a ese programa.
 * - `unresolved`: ni una cosa ni otra. Bloquea la asignación de la regla.
 */
export type ProcedenciaPrograma = "explicit_ot" | "derived_alias" | "unresolved";

export const LABEL_PROCEDENCIA_PROGRAMA: Record<ProcedenciaPrograma, string> = {
  explicit_ot: "Declarado en la OT",
  derived_alias: "Derivado del alias (programa único)",
  unresolved: "Sin resolver",
};

export type ResolucionCliente = {
  cliente_contractual: string | null;
  programa?: string | null;
  metodo: MetodoResolucion;
  /** true cuando la resolución debe auditarse antes de usarse como contractual. */
  provisional: boolean;
  /** Procedencia del programa asociado a esta resolución. */
  procedencia_programa: ProcedenciaPrograma;
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
      procedencia_programa: alias.programa ? "derived_alias" : "unresolved",
    };
  }

  const porPatron = reglasPatron.find((r) => r.cliente_wg_patron && patronAplica(clienteWgReal, r.cliente_wg_patron));
  if (porPatron) {
    return {
      cliente_contractual: porPatron.cliente,
      programa: porPatron.programa ?? null,
      metodo: "patron_fallback",
      provisional: true,
      // El patrón es provisional: no basta para dar el programa por derivado.
      procedencia_programa: "unresolved",
    };
  }

  return {
    cliente_contractual: null,
    programa: null,
    metodo: "sin_resolver",
    provisional: false,
    procedencia_programa: "unresolved",
  };
};

// ─── F4A.1 · Derivación del programa por alias ───────────────────────────────

export type DerivacionPrograma = {
  cliente_contractual: string;
  programa: string | null;
  procedencia: ProcedenciaPrograma;
  /** Programas distintos encontrados. Si son >1, no se puede derivar. */
  programas: string[];
  motivo: string;
};

/**
 * El bloqueo por dimensión `programa` SOLO desaparece si el cliente contractual
 * resuelve a UN ÚNICO programa vigente: alias y Registry deben coincidir.
 * Con dos o más programas la OT no se puede asignar sin el campo en el ERP.
 */
export const derivarProgramaPorAlias = (
  clienteContractual: string,
  aliases: readonly ClienteAlias[],
  reglasPatron: readonly ReglaPatron[] = [],
  referencia: Date = new Date(),
): DerivacionPrograma => {
  const deAlias = aliases
    .filter((a) => a.cliente_contractual === clienteContractual && vigente(a, referencia))
    .map((a) => a.programa)
    .filter((p): p is string => !!p);
  const deRegistry = reglasPatron
    .filter((r) => r.cliente === clienteContractual)
    .map((r) => r.programa)
    .filter((p): p is string => !!p);

  const programas = [...new Set([...deAlias, ...deRegistry])].sort();

  if (deAlias.length === 0) {
    return {
      cliente_contractual: clienteContractual,
      programa: null,
      procedencia: "unresolved",
      programas,
      motivo: `Ningún alias de «${clienteContractual}» declara programa: la OT no se puede asignar a un programa concreto.`,
    };
  }
  if (programas.length !== 1) {
    return {
      cliente_contractual: clienteContractual,
      programa: null,
      procedencia: "unresolved",
      programas,
      motivo: `«${clienteContractual}» tiene ${programas.length} programas (${programas.join(", ")}): sin el campo en la OT no se puede elegir.`,
    };
  }
  return {
    cliente_contractual: clienteContractual,
    programa: programas[0],
    procedencia: "derived_alias",
    programas,
    motivo: `Programa único «${programas[0]}»: toda OT de «${clienteContractual}» pertenece a él.`,
  };
};

/** Índice cliente contractual → derivación, para no recalcular por regla. */
export const derivacionesPrograma = (
  aliases: readonly ClienteAlias[],
  reglasPatron: readonly ReglaPatron[],
  referencia: Date = new Date(),
): Map<string, DerivacionPrograma> => {
  const clientes = new Set<string>([
    ...aliases.map((a) => a.cliente_contractual),
    ...reglasPatron.map((r) => r.cliente),
  ]);
  const out = new Map<string, DerivacionPrograma>();
  for (const c of clientes) out.set(c, derivarProgramaPorAlias(c, aliases, reglasPatron, referencia));
  return out;
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
