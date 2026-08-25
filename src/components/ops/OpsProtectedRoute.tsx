import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsManagement } from "@/hooks/useIsManagement";
import { useOpsSession } from "@/lib/ops-session";

/**
 * Guardia de /operaciones.
 *
 * Reglas (session loss hardening):
 *  - `auth loading` → esqueleto del shell, NUNCA se monta el árbol que dispara RPC.
 *  - sin sesión (o sesión perdida en vuelo) → login, conservando la ruta de vuelta.
 *  - con sesión pero sin rol management → estado de seguridad previsto, sin RPC.
 *
 * No es el control de seguridad real (eso es RLS + guardia `is_management` en
 * las funciones SECURITY DEFINER): impide que la UI consulte sin identidad y
 * muestre ceros procedentes de un rol anónimo.
 */
const Esqueleto = () => (
  <div className="min-h-screen flex items-center justify-center bg-[hsl(0_0%_99%)]">
    <Loader2 className="h-6 w-6 animate-spin text-ink/50" />
  </div>
);

export const OpsProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading: authLoading } = useAuth();
  const { hasSession, perdida, hubo } = useOpsSession();
  const { isManagement, loading: roleLoading } = useIsManagement();
  const location = useLocation();

  // Sesión caducada/perdida (B) frente a acceso directo sin autenticar (A).
  const caducada = perdida || (!!hubo && (!hasSession || !session));
  const next = encodeURIComponent(location.pathname + location.search);
  const destinoLogin = caducada
    ? `/portal/login?reason=session_expired&next=${next}`
    : `/portal/login?next=${next}`;

  if (authLoading) return <Esqueleto />;

  // Sesión ausente o perdida en vuelo (401 / identidad anónima): al login.
  if (!user || !session || !hasSession || perdida) {
    return <Navigate to={destinoLogin} state={{ from: location.pathname }} replace />;
  }


  if (roleLoading) return <Esqueleto />;

  if (!isManagement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(0_0%_99%)] px-6">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
            Acceso restringido a Dirección
          </p>
          <h1 className="font-display text-2xl tracking-tight text-ink mb-2">
            No dispones de permiso para esta sección
          </h1>
          <p className="text-sm text-ink/60">
            /operaciones es un cuadro de mando interno reservado al equipo directivo.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
