import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const STORAGE_KEY = "ops.filters.v2";

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
  rpcParams: Record<string, string | null>;
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
      if (raw) return { ...defaultFilters(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultFilters();
  });
  const [options, setOptions] = useState<OpsFilterOptions>(EMPTY_OPTIONS);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const reqIdRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Recarga en cascada: cada cambio de filtro pide nuevas opciones compatibles.
  useEffect(() => {
    const myReq = ++reqIdRef.current;
    const handle = setTimeout(async () => {
      const { data, error } = await supabase.rpc("ops_filter_options" as never, {
        p_delegacion: filters.delegacion,
        p_cliente: filters.cliente,
        p_gama: filters.gama,
        p_familia: filters.familia,
        p_marca: filters.marca,
        p_provincia: filters.provincia,
        p_sat: filters.sat,
        p_tecnico: filters.tecnico,
        p_canal: filters.canal,
      } as never);
      if (myReq !== reqIdRef.current) return;
      if (error) {
        console.error("[ops_filter_options] error", error);
        setLoadingOptions(false);
        return;
      }
      const raw: unknown = Array.isArray(data) ? (data as unknown[])[0] : data;
      const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const toArr = (v: unknown): string[] =>
        Array.isArray(v)
          ? (v.filter((x) => x != null && x !== "").map((x) => String(x)) as string[])
          : [];
      const next: OpsFilterOptions = {
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
      setOptions(next);
      setLoadingOptions(false);

      // Auto-limpieza: si un valor seleccionado ya no está entre las opciones válidas, lo quitamos.
      const patch: Partial<OpsFilters> = {};
      const check = (key: keyof OpsFilters, list: string[]) => {
        const v = filters[key];
        if (typeof v === "string" && v && !list.includes(v)) {
          (patch as Record<string, null>)[key as string] = null;
        }
      };
      check("delegacion", next.delegaciones);
      check("cliente", next.clientes);
      check("gama", next.gamas);
      check("familia", next.familias);
      check("marca", next.marcas);
      check("provincia", next.provincias);
      check("sat", next.sats);
      check("tecnico", next.tecnicos);
      check("canal", next.canales);
      if (Object.keys(patch).length > 0) {
        setFiltersState((f) => ({ ...f, ...patch }));
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [
    filters.delegacion, filters.cliente, filters.gama, filters.familia, filters.marca,
    filters.provincia, filters.sat, filters.tecnico, filters.canal,
  ]);

  const setFilters = (partial: Partial<OpsFilters>) =>
    setFiltersState((f) => ({ ...f, ...partial }));
  const reset = () => setFiltersState(defaultFilters());

  const rpcParams = useMemo(() => ({
    p_from: filters.from, p_to: filters.to,
    p_delegacion: filters.delegacion, p_cliente: filters.cliente,
    p_gama: filters.gama, p_familia: filters.familia, p_marca: filters.marca,
    p_provincia: filters.provincia, p_sat: filters.sat,
    p_tecnico: filters.tecnico, p_canal: filters.canal,
  }), [filters]);

  return (
    <OpsFiltersContext.Provider value={{ filters, setFilters, reset, options, loadingOptions, rpcParams }}>
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
