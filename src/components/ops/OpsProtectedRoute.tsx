import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsManagement } from "@/hooks/useIsManagement";

export const OpsProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isManagement, loading: roleLoading } = useIsManagement();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(0_0%_99%)]">
        <Loader2 className="h-6 w-6 animate-spin text-ink/50" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  }

  if (!isManagement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(0_0%_99%)] px-6">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
            Acceso restringido
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
