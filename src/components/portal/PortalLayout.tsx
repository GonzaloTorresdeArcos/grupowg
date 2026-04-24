import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  LayoutDashboard, Calendar, FileText, Receipt, Settings,
  LogOut, Menu, X, ChevronRight, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

const collaboratorNav = [
  { to: "/portal", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/portal/calendario", label: "Calendario", icon: Calendar },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
  { to: "/portal/facturacion", label: "Facturación", icon: Receipt },
  { to: "/portal/perfil", label: "Perfil", icon: Settings },
];

const adminNav = [
  { to: "/portal/incidencias", label: "Incidencias", icon: Inbox },
];

export const PortalLayout = () => {
  const { profile, user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/portal/login");
  };

  const initials = (profile?.display_name || profile?.email || "WG")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-bone flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-border">
          <p className="eyebrow mb-1">WG Network</p>
          <p className="font-display text-xl text-ink leading-tight">Portal SAT</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {collaboratorNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={(item as { end?: boolean }).end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-ink text-bone font-medium"
                    : "text-ink/70 hover:text-ink hover:bg-muted",
                )
              }
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Operaciones
              </p>
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-ink text-bone font-medium"
                        : "text-ink/70 hover:text-ink hover:bg-muted",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/40 mb-2">
            <div className="h-9 w-9 rounded-full bg-ink text-bone flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate font-medium">
                {profile?.company_name || profile?.display_name || "Colaborador"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-border h-14 px-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">WG Network</p>
          <p className="font-display text-base text-ink leading-none">Portal SAT</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm pt-14"
          onClick={() => setOpen(false)}
        >
          <nav
            className="bg-card border-b border-border px-3 py-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {[...collaboratorNav, ...(isAdmin ? adminNav : [])].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={(item as { end?: boolean }).end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm",
                    isActive ? "bg-ink text-bone font-medium" : "text-ink/80 hover:bg-muted",
                  )
                }
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:px-0 px-0 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
