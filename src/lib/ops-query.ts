import { useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Capa única de acceso a las RPC de /operaciones.
 *
 * Motivación (hardening pre-UAT): antes cada página resolvía sus RPC con
 * `useEffect` + `useState`, sin deduplicación ni caché. Eso provocaba que
 * `ops_kpis`, `ops_equipos`, `ops_tecnicos_scorecard` o `ops_supply` se
 * ejecutaran varias veces con exactamente los mismos parámetros al navegar
 * entre módulos, y que un cambio de filtro relanzara tandas completas.
 *
 * Aquí no hay ningún cambio de semántica: mismos nombres de RPC, mismos
 * parámetros, mismos payloads. Solo caché por (rpc, params) y cancelación.
 *
 * El dato de /operaciones es un snapshot (ops_as_of), no un flujo en vivo:
 * por eso `staleTime` es de sesión y la invalidación es EXPLÍCITA (importador
 * o cambio de as-of), nunca por foco de ventana.
 */

export const OPS_QUERY_ROOT = "ops" as const;

/** 30 min: cubre una sesión de análisis sin releer el mismo snapshot. */
export const OPS_STALE_TIME = 30 * 60 * 1000;
export const OPS_GC_TIME = 60 * 60 * 1000;

export type OpsRpcParams = Record<string, unknown> | undefined;

/**
 * Clave estable: las claves del objeto se ordenan y se descartan los
 * `undefined`, de modo que `{a:1,b:null}` y `{b:null,a:1,c:undefined}`
 * comparten entrada de caché (misma llamada real a PostgREST).
 */
export const normalizarParams = (params: OpsRpcParams): Record<string, unknown> => {
  if (!params) return {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(params).sort()) {
    const v = (params as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
};

export const opsQueryKey = (rpc: string, params?: OpsRpcParams) =>
  [OPS_QUERY_ROOT, rpc, normalizarParams(params)] as const;

/** Ejecución cruda de la RPC. `signal` permite descartar tandas obsoletas. */
export async function opsRpc<T>(rpc: string, params?: OpsRpcParams, signal?: AbortSignal): Promise<T> {
  const q = supabase.rpc(rpc as never, (normalizarParams(params) as never));
  const { data, error } = await (signal ? (q as unknown as { abortSignal: (s: AbortSignal) => Promise<{ data: unknown; error: unknown }> }).abortSignal(signal) : q);
  if (error) throw error;
  return (data ?? null) as T;
}

const baseOptions = {
  staleTime: OPS_STALE_TIME,
  gcTime: OPS_GC_TIME,
  retry: 1,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
};

/** Una RPC. `enabled:false` para drill-downs bajo demanda. */
export function useOpsRpc<T>(rpc: string, params?: OpsRpcParams, opts?: { enabled?: boolean }): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: opsQueryKey(rpc, params),
    queryFn: ({ signal }) => opsRpc<T>(rpc, params, signal),
    enabled: opts?.enabled ?? true,
    ...baseOptions,
  });
}

export type OpsRpcSpec = { rpc: string; params?: OpsRpcParams; enabled?: boolean };

/** Varias RPC en paralelo, deduplicadas entre sí y con el resto de páginas. */
export function useOpsRpcs<T = unknown>(specs: readonly OpsRpcSpec[]): UseQueryResult<T>[] {
  return useQueries({
    queries: specs.map((s) => ({
      queryKey: opsQueryKey(s.rpc, s.params),
      queryFn: ({ signal }: { signal: AbortSignal }) => opsRpc<T>(s.rpc, s.params, signal),
      enabled: s.enabled ?? true,
      ...baseOptions,
    })),
  }) as UseQueryResult<T>[];
}

/**
 * Invalidación explícita de TODA la caché de análisis. La llama el importador
 * al cerrar una carga con éxito y el layout cuando detecta que la fecha
 * efectiva del dato (`ops_as_of('ot')`) ha cambiado respecto a la cacheada.
 */
export function useInvalidarOps() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries({ queryKey: [OPS_QUERY_ROOT] }), [qc]);
}
