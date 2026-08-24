import { useMemo } from "react";
import { useDataQuality } from "@/hooks/useDataQuality";
import {
  DOMINIO_OPERATIVO,
  asOf as asOfDe,
  avisoObsolescencia,
  frescuraDominio,
  frescuraTodos,
  type CargaDominio,
  type DominioCarga,
  type FrescuraDominio,
} from "@/lib/ops-as-of";

/**
 * F4B · Reloj operativo de la sección. Toda página lee la fecha efectiva del
 * dato desde aquí; nunca `new Date()` como referencia de negocio.
 */
export function useDataFreshness(dominio: DominioCarga = DOMINIO_OPERATIVO): {
  loading: boolean;
  cargas: CargaDominio[];
  /** Fecha efectiva del dominio consultado (ISO) o null. */
  asOf: string | null;
  frescura: FrescuraDominio;
  aviso: string | null;
  /** Frescura de todos los dominios registrados, peor primero. */
  todos: FrescuraDominio[];
} {
  const { medidas, loading } = useDataQuality();
  const cargas = useMemo<CargaDominio[]>(() => medidas?.cargas ?? [], [medidas]);
  return useMemo(() => {
    const frescura = frescuraDominio(cargas, dominio);
    return {
      loading,
      cargas,
      asOf: asOfDe(cargas, dominio),
      frescura,
      aviso: avisoObsolescencia(frescura),
      todos: frescuraTodos(cargas),
    };
  }, [cargas, dominio, loading]);
}

export default useDataFreshness;
