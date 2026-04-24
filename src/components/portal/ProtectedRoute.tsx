import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <Loader2 className="h-6 w-6 animate-spin text-ink/50" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
