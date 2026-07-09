import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { RouteBoundary } from "@/components/site/RouteBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  LayoutDashboard, Calendar, FileText, Receipt, Settings,
  LogOut, Menu, X, ChevronRight, Inbox, Cpu, Package, Store, ShieldCheck, TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/site/Logo";

export const PortalLayout = () => {
  const { t } = useTranslation("portal");
  const { profile, user, signOut } = useAuth();
  const { isAdmin, isClient, isCollaborator } = useUserRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const operaNav = [
    { to: "/portal", label: t("nav.summary"), icon: LayoutDashboard, end: true },
    { to: "/portal/calendario", label: t("nav.calendar"), icon: Calendar },
    { to: "/portal/documentos", label: t("nav.documents"), icon: FileText },
    { to: "/portal/facturacion", label: t("nav.billing"), icon: Receipt },
  ];

  const negocioNav = [
    { to: "/portal/repuestos", label: t("nav.parts"), icon: Package },
    { to: "/portal/equipos", label: t("nav.equipment"), icon: Store },
    { to: "/portal/garantias", label: t("nav.warranties"), icon: ShieldCheck },
  ];

  const profileNav = [
    { to: "/portal/perfil", label: t("nav.profile"), icon: Settings },
  ];

  const clientNav = [
    { to: "/portal/service-os", label: "Service OS", icon: Cpu },
  ];

  const adminNav = [
    { to: "/portal/incidencias", label: t("nav.incidences"), icon: Inbox },
    { to: "/portal/leads", label: t("nav.leads"), icon: TrendingUp },
  ];

  // Si el usuario es sólo cliente (sin rol colaborador), no mostramos la navegación de colaborador.
  const showCollaboratorNav = isCollaborator;
  const showClientNav = isClient;
  // Fallback: si el usuario está autenticado pero aún no tiene ningún rol,
  // mostramos al menos Resumen y Perfil para que no vea una sidebar vacía.
  const showFallbackNav = !!user && !isCollaborator && !isClient && !isAdmin;
  const fallbackNav = [
    { to: "/portal", label: t("nav.summary"), icon: LayoutDashboard, end: true },
    { to: "/portal/perfil", label: t("nav.profile"), icon: Settings },
  ];

  // ---- Breadcrumbs -------------------------------------------------------
  const allNavItems = [...operaNav, ...negocioNav, ...profileNav, ...clientNav, ...adminNav];
  const currentItem =
    allNavItems.find((i) => i.to !== "/portal" && pathname.startsWith(i.to)) ??
    (pathname === "/portal" ? allNavItems.find((i) => i.to === "/portal") : undefined);
  const isDashboard = pathname === "/portal";


  const handleSignOut = async () => {
    await signOut();
    toast.success(t("login.toasts.signedOut"));
    navigate("/portal/login");
  };

  const initials = (profile?.display_name || profile?.email || "WG")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)] flex font-sans antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-black/[0.06] bg-white sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-4">
          <Link to="/" className="block mb-1" aria-label="Grupo Warranty Global">
            <Logo className="h-7" />
          </Link>
          <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-ink/40 uppercase">{t("nav.section")}</p>
          <p className="font-display text-lg text-ink leading-tight tracking-tight">{t("nav.title")}</p>
        </div>


        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {showCollaboratorNav && (
            <>
              <NavGroup label={t("nav.groupOpera")} items={operaNav} />
              <NavGroup label={t("nav.groupBusiness")} items={negocioNav} />
              <NavGroup label={t("nav.groupAccount")} items={profileNav} />
            </>
          )}

          {showClientNav && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                Clientes
              </p>
              {clientNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-black/[0.04] text-ink font-medium"
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

          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                {t("nav.ops")}
              </p>
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-black/[0.04] text-ink font-medium"
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

          {showFallbackNav && (
            <NavGroup label={t("nav.groupAccount")} items={fallbackNav} />
          )}
        </nav>



        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/40 mb-2">
            <div className="h-9 w-9 rounded-full bg-ink text-bone flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate font-medium">
                {profile?.company_name || profile?.display_name || t("nav.fallbackName")}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-border h-14 px-4 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors"
          aria-label="Volver a la web pública"
        >
          <ArrowLeft className="h-4 w-4" />
          <Logo className="h-6" />
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 truncate">{t("nav.section")}</p>
          <p className="font-display text-sm text-ink leading-none truncate">{t("nav.title")}</p>
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
            {[
              ...(showCollaboratorNav ? [...operaNav, ...negocioNav, ...profileNav] : []),
              ...(showClientNav ? clientNav : []),
              ...(isAdmin ? adminNav : []),
              ...(showFallbackNav ? fallbackNav : []),
            ].map((item) => (

              <NavLink
                key={item.to}
                to={item.to}
                end={(item as { end?: boolean }).end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm",
                    isActive ? "bg-black/[0.04] text-ink font-medium" : "text-ink/80 hover:bg-muted",
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
                {t("nav.signOut")}
              </Button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        {/* Sticky header — Apple-style con backdrop blur */}
        <header className="hidden lg:flex h-14 sticky top-0 z-20 items-center justify-between px-8 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
            <NavLink to="/portal" className="text-ink/50 hover:text-ink transition-colors">
              {t("nav.title")}
            </NavLink>
            {!isDashboard && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-ink/30" />
                <span className="text-ink font-medium tracking-tight">
                  {currentItem?.label ?? pathname.split("/").pop()}
                </span>
              </>
            )}
          </nav>
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-[12px] text-ink/50 hover:text-ink transition-colors"
            aria-label="Volver a la web pública de Grupo WG"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a la web</span>
          </Link>
        </header>

        <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-10 py-8 md:py-12">
          <RouteBoundary key={pathname}>
            <Outlet />
          </RouteBoundary>
        </div>
      </main>


    </div>
  );
};

type NavItem = { to: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>; end?: boolean };

const NavGroup = ({ label, items }: { label: string; items: NavItem[] }) => (
  <div className="pb-1">
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
      {label}
    </p>
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] tracking-tight transition-colors duration-200",
            isActive ? "bg-black/[0.04] text-ink font-medium" : "text-ink/60 hover:text-ink hover:bg-black/[0.03]",
          )
        }
      >

        <item.icon className="h-4 w-4" strokeWidth={1.75} />
        {item.label}
      </NavLink>
    ))}
  </div>
);
