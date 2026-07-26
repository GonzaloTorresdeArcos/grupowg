import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OpsFilters = {
  from: string; // YYYY-MM-DD
  to: string;
  delegacion: string | null;
  cliente: string | null;
  gama: string | null;
  familia: string | null;
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
  provincias: string[];
  sats: string[];
  tecnicos: string[];
  canales: string[];
};

const STORAGE_KEY = "ops.filters.v1";

const defaultFilters = (): OpsFilters => {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    from: iso(from), to: iso(to),
    delegacion: null, cliente: null, gama: null, familia: null,
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

export const OpsFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFiltersState] = useState<OpsFilters>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultFilters(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultFilters();
  });
  const [options, setOptions] = useState<OpsFilterOptions>({
    delegaciones: [], clientes: [], gamas: [], familias: [],
    provincias: [], sats: [], tecnicos: [], canales: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("ops_filter_options" as never);
      if (cancelled) return;
      if (error) {
        console.error("[ops_filter_options] error", error);
        setLoadingOptions(false);
        return;
      }
      // PostgREST puede envolver el jsonb en un array de una fila; normalizamos.
      const raw = Array.isArray(data) ? (data[0] as unknown) : (data as unknown);
      const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const toArr = (v: unknown): string[] =>
        Array.isArray(v)
          ? (v.filter((x) => x != null && x !== "").map((x) => String(x)) as string[])
          : [];
      setOptions({
        delegaciones: toArr(src.delegaciones),
        clientes: toArr(src.clientes),
        gamas: toArr(src.gamas),
        familias: toArr(src.familias),
        provincias: toArr(src.provincias),
        sats: toArr(src.sats),
        tecnicos: toArr(src.tecnicos),
        canales: toArr(src.canales),
      });
      setLoadingOptions(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const setFilters = (partial: Partial<OpsFilters>) =>
    setFiltersState((f) => ({ ...f, ...partial }));
  const reset = () => setFiltersState(defaultFilters());

  const rpcParams = useMemo(() => ({
    p_from: filters.from, p_to: filters.to,
    p_delegacion: filters.delegacion, p_cliente: filters.cliente,
    p_gama: filters.gama, p_familia: filters.familia,
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
