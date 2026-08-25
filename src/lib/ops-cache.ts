import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidarOps } from "@/lib/ops-query";

/**
 * A1 · INVALIDACIÓN EXPLÍCITA DE LA CACHÉ DE ANÁLISIS.
 *
 * El dato de /operaciones es un snapshot mensual, no un flujo en vivo: por eso
 * la caché de react-query no se refresca por foco de ventana ni por tiempo,
 * sino SOLO cuando el snapshot cambia. Hay exactamente dos disparadores:
 *
 *  1. El importador, tras una carga con éxito registrada en `ops_carga_log`.
 *  2. El layout de /operaciones, que al montar compara `ops_as_of('ot')` con el
 *     valor guardado en `sessionStorage`; si difiere, invalida `['ops']`.
 *
 * Sin (2), una pestaña abierta desde antes de la carga seguiría mostrando la
 * foto anterior durante toda la sesión.
 */

export const SESSION_ASOF_KEY = "ops.asof.ot.v1";

/**
 * Invalida solo cuando había un valor previo y el nuevo es distinto.
 * Primera visita (sin valor cacheado) → no invalida: no hay nada que refrescar.
 */
export const debeInvalidarPorAsOf = (
  cacheado: string | null | undefined,
  actual: string | null | undefined,
): boolean => !!actual && !!cacheado && cacheado !== actual;

export const leerAsOfSesion = (): string | null => {
  try {
    return sessionStorage.getItem(SESSION_ASOF_KEY);
  } catch {
    return null;
  }
};

export const guardarAsOfSesion = (v: string | null | undefined): void => {
  try {
    if (v) sessionStorage.setItem(SESSION_ASOF_KEY, v);
  } catch {
    /* almacenamiento no disponible: la comprobación degrada a no-op */
  }
};

/** Lee la fecha efectiva del dominio operativo sin pasar por la caché de ops. */
export async function leerAsOfRemoto(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("ops_as_of" as never, { p_dominio: "ot" } as never);
    if (error) return null;
    const v = Array.isArray(data) ? (data as unknown[])[0] : (data as unknown);
    return v ? String(v).slice(0, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Comprobación al montar el layout: si el snapshot cambió respecto al de esta
 * sesión, tira la caché de análisis entera.
 */
export function useAsOfCacheGuard(): void {
  const invalidar = useInvalidarOps();
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    let vivo = true;
    void leerAsOfRemoto().then((actual) => {
      if (!vivo || !actual) return;
      if (debeInvalidarPorAsOf(leerAsOfSesion(), actual)) void invalidar();
      guardarAsOfSesion(actual);
    });
    return () => {
      vivo = false;
    };
  }, [invalidar]);
}
