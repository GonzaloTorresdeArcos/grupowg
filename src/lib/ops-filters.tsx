import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOpsRpc } from "@/lib/ops-query";
import { prevPeriod, type ModoComparacion } from "@/lib/ops-performance";
import {
  detectarPreset, resolverPreset, sinPeriodoComparable,
  type Cobertura, type PresetKey, type Rango,
} from "@/lib/ops-periodo";

export type OpsFilters = {
  from: string; // YYYY-MM-DD
  to: string;
  delegacion: string | null;
  cliente: string | null;
  gama: string | null;
  familia: string | null;
  marca: string | null;
  provincia: string | null;
  sat: string | null;
  tecnico: string | null;
  canal: string | null;
};

export type OpsFilterOptions = {
  delegaciones: string[];
  clientes: string[];
  gamas: string[];
  familias: string[];
  marcas: string[];
  provincias: string[];
  sats: string[];
  tecnicos: string[];
  canales: string[];
};

const STORAGE_KEY = "ops.filters.v3";
const MODO_KEY = "ops.modoComparacion.v1";
const CANAL_VALIDOS = new Set(["Taller", "Domicilio", "Unico"]);

const defaultFilters = (): OpsFilters => {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: iso(from), to: iso(to),
    delegacion: null, cliente: null, gama: null, familia: null, marca: null,
    provincia: null, sat: null, tecnico: null, canal: null,
  };
};

type Ctx = {
  filters: OpsFilters;
  setFilters: (f: Partial<OpsFilters>) => void;
  reset: () => void;
  options: OpsFilterOptions;
  loadingOptions: boolean;
  /** true si la última carga de opciones maestras falló (red/timeout/RPC). */
  optionsError: boolean;
  /** Reintenta la carga de opciones maestras. */
  reloadOptions: () => void;
  rpcParams: Record<string, string | null>;
  // ---- Contexto temporal V2 (Fase 2) ----
  /** Modo de comparación global efectivo (en YTD se fuerza 'interanual'). */
  modo: ModoComparacion;
  /** Modo elegido por el usuario (puede diferir del efectivo en YTD). */
  modoSeleccionado: ModoComparacion;
  setModo: (m: ModoComparacion) => void;
  /** Preset detectado a partir del rango activo. */
  preset: PresetKey;
  /** Aplica un preset del selector global sin tocar el resto de filtros. */
  aplicarPreset: (key: PresetKey, refISO?: string) => void;
  /** Rango de comparación calculado con el modo global. Único origen de verdad. */
  prevRange: Rango;
  /** true si el rango de comparación cae fuera de la cobertura de datos. */
  sinComparable: boolean;
  /** Cobertura real de datos cargados (min/max), cacheada en el provider. */
  cobertura: Cobertura;
};

const OpsFiltersContext = createContext<Ctx | null>(null);

const EMPTY_OPTIONS: OpsFilterOptions = {
  delegaciones: [], clientes: [], gamas: [], familias: [], marcas: [],
  provincias: [], sats: [], tecnicos: [], canales: [],
};


export const OpsFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFiltersState] = useState<OpsFilters>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...defaultFilters(), ...JSON.parse(raw) } as OpsFilters;
        // Sanitiza canal: solo permite los valores reales de la BD.
        if (parsed.canal && !CANAL_VALIDOS.has(parsed.canal)) parsed.canal = null;
        return parsed;
      }
    } catch { /* ignore */ }
    return defaultFilters();
  });
  const [modoSeleccionado, setModoState] = useState<ModoComparacion>(() => {
    try {
      const raw = localStorage.getItem(MODO_KEY);
      return raw === "interanual" ? "interanual" : "anterior";
    } catch { return "anterior"; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    try { localStorage.setItem(MODO_KEY, modoSeleccionado); } catch { /* ignore */ }
  }, [modoSeleccionado]);

  // Cobertura real de datos — cacheada (no depende de filtros ni de período).
  const coberturaQ = useOpsRpc<unknown>("ops_cobertura_datos");
  const cobertura = useMemo<Cobertura>(() => {
    const d = coberturaQ.data;
    const src = (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null;
    const val = (k: string) => {
      const v = src?.[k];
      return typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null;
    };
    return { min: val("min_fecha"), max: val("max_fecha") };
  }, [coberturaQ.data]);

  // Recarga en cascada: UNA sola consulta cacheada por combinación de filtros.
  const optionsQ = useOpsRpc<unknown>("ops_filter_options", {
    p_delegacion: filters.delegacion,
    p_cliente: filters.cliente,
    p_gama: filters.gama,
    p_familia: filters.familia,
    p_marca: filters.marca,
    p_provincia: filters.provincia,
    p_sat: filters.sat,
    p_tecnico: filters.tecnico,
    p_canal: filters.canal,
  }, { keepPrevious: true });
  const optionsError = !!optionsQ.error;
  const loadingOptions = optionsQ.isPending;
  const options = useMemo<OpsFilterOptions>(() => {
    const raw: unknown = Array.isArray(optionsQ.data) ? (optionsQ.data as unknown[])[0] : optionsQ.data;
    if (!raw || typeof raw !== "object") return EMPTY_OPTIONS;
    const src = raw as Record<string, unknown>;
    const toArr = (v: unknown): string[] =>
      Array.isArray(v) ? (v.filter((x) => x != null && x !== "").map((x) => String(x)) as string[]) : [];
    return {
      delegaciones: toArr(src.delegaciones),
      clientes: toArr(src.clientes),
      gamas: toArr(src.gamas),
      familias: toArr(src.familias),
      marcas: toArr(src.marcas),
      provincias: toArr(src.provincias),
      sats: toArr(src.sats),
      tecnicos: toArr(src.tecnicos),
      canales: toArr(src.canales),
    };
  }, [optionsQ.data]);

  /**
   * Saneado de la combinación activa contra las opciones vigentes: un valor que
   * ya no existe en la cascada equivale a "sin filtro". Es una función pura que
   * usan tanto la auto-limpieza (que persiste el cambio) como `rpcParams` (que
   * publica ya saneado, sin esperar al efecto).
   */
  const filtrosSaneados = useMemo(() => {
    if (optionsQ.isPending || optionsQ.error) return filters;
    const out = { ...filters };
    const check = (key: keyof OpsFilters, list: string[]) => {
      const v = filters[key];
      if (typeof v === "string" && v && list.length > 0 && !list.includes(v)) {
        (out as Record<string, unknown>)[key as string] = null;
      }
    };
    check("delegacion", options.delegaciones);
    check("cliente", options.clientes);
    check("gama", options.gamas);
    check("familia", options.familias);
    check("marca", options.marcas);
    check("provincia", options.provincias);
    check("sat", options.sats);
    check("tecnico", options.tecnicos);
    check("canal", options.canales);
    return out;
  }, [filters, options, optionsQ.isPending, optionsQ.error]);

  // Auto-limpieza: persiste el saneado en el estado (y en localStorage).
  useEffect(() => {
    if (filtrosSaneados !== filters) setFiltersState(filtrosSaneados);
  }, [filtrosSaneados, filters]);

  const setFilters = (partial: Partial<OpsFilters>) =>
    setFiltersState((f) => ({ ...f, ...partial }));
  const reset = () => setFiltersState(defaultFilters());
  const reloadOptions = () => { void optionsQ.refetch(); void coberturaQ.refetch(); };
  const setModo = useCallback((m: ModoComparacion) => setModoState(m), []);

  /**
   * A3 · UNA sola publicación de `rpcParams` por acción del usuario.
   *
   * Cambiar un filtro puede invalidar otro (p. ej. elegir delegación deja fuera
   * al técnico seleccionado). Si publicáramos en cuanto cambia el filtro, todas
   * las páginas lanzarían su tanda de RPC con la combinación intermedia y otra
   * vez tras la auto-limpieza. Por eso: (1) mientras `ops_filter_options` está
   * en vuelo se mantiene la última combinación publicada, y (2) al resolver, se
   * publica la combinación YA saneada — una sola vez.
   */
  const rpcParamsRef = useRef<Record<string, string | null> | null>(null);
  const rpcParams = useMemo(() => {
    const f = filtrosSaneados;
    const candidato = {
      p_from: f.from, p_to: f.to,
      p_delegacion: f.delegacion, p_cliente: f.cliente,
      p_gama: f.gama, p_familia: f.familia, p_marca: f.marca,
      p_provincia: f.provincia, p_sat: f.sat,
      p_tecnico: f.tecnico, p_canal: f.canal,
    };
    const previo = rpcParamsRef.current;
    if (!previo) { rpcParamsRef.current = candidato; return candidato; }
    // Cascada en vuelo: la UI no se bloquea, solo se evita disparar RPC con un
    // estado intermedio que va a cambiar en milisegundos.
    if (optionsQ.isFetching) return previo;
    const igual = Object.keys(candidato).every(
      (k) => (candidato as Record<string, string | null>)[k] === previo[k],
    );
    if (igual) return previo;
    rpcParamsRef.current = candidato;
    return candidato;
  }, [filtrosSaneados, optionsQ.isFetching]);



  const preset = useMemo(
    () => detectarPreset({ from: filters.from, to: filters.to }, cobertura),
    [filters.from, filters.to, cobertura],
  );

  // Regla estricta YTD: la comparación equivalente inmediata no tiene sentido
  // (año a medias contra tramo arbitrario), así que en YTD se fuerza interanual.
  const modo: ModoComparacion = preset === "ytd" ? "interanual" : modoSeleccionado;

  const prevRange = useMemo(
    () => prevPeriod(filters.from, filters.to, modo),
    [filters.from, filters.to, modo],
  );
  const sinComparable = useMemo(
    () => sinPeriodoComparable(prevRange, cobertura),
    [prevRange, cobertura],
  );

  // Cambiar de preset NUNCA toca los filtros activos: solo from/to.
  const aplicarPreset = useCallback((key: PresetKey, refISO?: string) => {
    setFiltersState((f) => {
      const r = resolverPreset(key, { from: f.from, to: f.to }, cobertura, refISO);
      return { ...f, from: r.from, to: r.to };
    });
  }, [cobertura]);

  return (
    <OpsFiltersContext.Provider value={{
      filters, setFilters, reset, options, loadingOptions, optionsError, reloadOptions, rpcParams,
      modo, modoSeleccionado, setModo, preset, aplicarPreset, prevRange, sinComparable, cobertura,
    }}>
      {children}
    </OpsFiltersContext.Provider>
  );
};


export const useOpsFilters = () => {
  const ctx = useContext(OpsFiltersContext);
  if (!ctx) throw new Error("useOpsFilters debe usarse dentro de OpsFiltersProvider");
  return ctx;
};

// Helpers de formato
export const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Number(n) * 100).toFixed(1)}%`;
export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-ES").format(Math.round(Number(n)));
export const fmtEur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
export const fmtDec = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : Number(n).toFixed(d);

export const tone = (v: number, good: number, bad: number, inverse = false) => {
  const g = inverse ? v <= good : v >= good;
  const b = inverse ? v >= bad : v <= bad;
  if (g) return "text-emerald-600";
  if (b) return "text-red-600";
  return "text-amber-600";
};
