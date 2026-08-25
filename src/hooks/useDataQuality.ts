import { useOpsRpc } from "@/lib/ops-query";
import {
  DOMINIOS_DATOS,
  derivarDominios,
  type DominioDato,
  type MedidasDataQuality,
} from "@/lib/ops-data-quality";

/**
 * Medidas reales de calidad de dato (`ops_data_quality`).
 *
 * A2 · Antes este hook mantenía una promesa a nivel de módulo como caché
 * artesanal: no se podía invalidar, no se reintentaba y convivía mal con el
 * resto de la sección. Ahora usa la misma capa de caché que todas las RPC de
 * /operaciones (`useOpsRpc`), de modo que:
 *  - `DataAsOf` y `DominioChip` comparten UNA sola llamada (deduplicada);
 *  - la invalidación explícita `['ops']` del importador la refresca también.
 *
 * Mientras no hay medida se devuelve el fallback estático, que nunca declara
 * nada disponible.
 */

export type UseDataQuality = {
  loading: boolean;
  medidas: MedidasDataQuality | null;
  dominios: readonly DominioDato[];
  dominio: (id: string) => DominioDato | undefined;
};

export const useDataQuality = (): UseDataQuality => {
  const q = useOpsRpc<MedidasDataQuality | null>("ops_data_quality");
  const medidas = (q.error ? null : (q.data ?? null)) as MedidasDataQuality | null;
  const dominios = medidas ? derivarDominios(medidas) : DOMINIOS_DATOS;
  return { loading: q.isPending, medidas, dominios, dominio: (id) => dominios.find((d) => d.id === id) };
};
