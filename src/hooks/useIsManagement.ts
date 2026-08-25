import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Rendimiento: la comprobación de rol estaba en serie delante de la primera
 * RPC de /operaciones (getSession → user_roles → RPC crítica). El resultado se
 * cachea en sessionStorage por usuario para que, en recargas y navegaciones
 * dentro de la misma sesión, el shell y las RPC arranquen sin ese salto extra.
 *
 * No es un control de seguridad: la autorización real la imponen RLS y la
 * guardia `is_management` de las funciones SECURITY DEFINER en el servidor.
 * Aquí solo se decide qué se pinta. La caché se revalida siempre en segundo
 * plano y se corrige si el servidor discrepa.
 */
const clave = (uid: string) => `ops:mgmt:${uid}`;

const leerCache = (uid: string): boolean | null => {
  try {
    const v = sessionStorage.getItem(clave(uid));
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
};

const escribirCache = (uid: string, valor: boolean) => {
  try {
    sessionStorage.setItem(clave(uid), valor ? "1" : "0");
  } catch {
    /* almacenamiento no disponible: se revalida cada vez */
  }
};

export const useIsManagement = () => {
  const { user } = useAuth();
  const [isManagement, setIsManagement] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsManagement(false);
      setLoading(false);
      return;
    }
    const cacheado = leerCache(user.id);
    if (cacheado !== null) {
      setIsManagement(cacheado);
      setLoading(false);
    } else {
      setLoading(true);
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "management")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const real = !!data;
        escribirCache(user.id, real);
        setIsManagement(real);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return { isManagement, loading };
};
