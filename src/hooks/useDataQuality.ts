import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DOMINIOS_DATOS,
  derivarDominios,
  type DominioDato,
  type MedidasDataQuality,
} from "@/lib/ops-data-quality";

/**
 * Carga (una sola vez por sesión) las medidas reales de calidad de dato desde la
 * RPC `ops_data_quality` y deriva el estado de cada dominio. Mientras no hay
 * medida se devuelve el fallback estático, que nunca declara nada disponible.
 */
let cache: Promise<MedidasDataQuality | null> | null = null;

const cargar = (): Promise<MedidasDataQuality | null> => {
  if (!cache) {
    cache = (async () => {
      try {
        const { data, error } = await supabase.rpc("ops_data_quality" as never);
        return error ? null : ((data ?? null) as MedidasDataQuality | null);
      } catch {
        return null;
      }
    })();
  }
  return cache;
};

export type UseDataQuality = {
  loading: boolean;
  medidas: MedidasDataQuality | null;
  dominios: readonly DominioDato[];
  dominio: (id: string) => DominioDato | undefined;
};

export const useDataQuality = (): UseDataQuality => {
  const [medidas, setMedidas] = useState<MedidasDataQuality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    cargar().then((m) => {
      if (!vivo) return;
      setMedidas(m);
      setLoading(false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const dominios = medidas ? derivarDominios(medidas) : DOMINIOS_DATOS;
  return { loading, medidas, dominios, dominio: (id) => dominios.find((d) => d.id === id) };
};
