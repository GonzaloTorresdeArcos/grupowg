import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, Building2, Timer, Upload, ArrowLeft, LogOut, Menu, X, ChevronRight,
  ChevronDown, Wrench, Euro, MapPin, Truck, Package, Database, Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { RouteBoundary } from "@/components/site/RouteBoundary";
import { OpsFiltersProvider } from "@/lib/ops-filters";
import { OpsFiltersBar } from "@/components/ops/OpsFiltersBar";
import { useAsOfCacheGuard } from "@/lib/ops-cache";
import { PerfOverlay } from "@/components/ops/PerfOverlay";

type NavItem = { to: string; label: string; icon: typeof Users; end?: boolean };
type NavGroup = { key: string; label: string; items: NavItem[] };

// Navegación V2 — 5 grupos organizativos.
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "panorama",
    label: "Panorama",
    items: [{ to: "/operaciones", label: "Panorama operativo", icon: LayoutDashboard, end: true }],
  },
  {
    key: "operacion",
    label: "Operación de servicio",
    items: [
      { to: "/operaciones/hub", label: "HUB Central", icon: Factory },
      { to: "/operaciones/delegaciones", label: "Delegaciones", icon: Building2 },
      { to: "/operaciones/sats", label: "Red SAT externa", icon: Wrench },
    ],
  },
  {
    key: "supply",
    label: "Supply & Fulfilment",
    items: [
      { to: "/operaciones/logistica", label: "Logística & Expediciones", icon: Truck },
      { to: "/operaciones/repuestos", label: "Repuestos & Stock", icon: Package },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    items: [
      { to: "/operaciones/sla", label: "SLA & Flujo", icon: Timer },
      { to: "/operaciones/dispersion", label: "Cobertura & Dispersión", icon: MapPin },
      { to: "/operaciones/costes", label: "Coste, Productividad & Capacidad", icon: Euro },
    ],
  },
  {
    key: "data",
    label: "Data",
    items: [
      { to: "/operaciones/calidad-datos", label: "Calidad de datos", icon: Database },
      { to: "/operaciones/importar", label: "Importación / Administración", icon: Upload },
    ],
  },
];

// Rutas accesibles por URL directa aunque no estén en el menú (se llega vía HUB).
const NAV_EXTRA: NavItem[] = [
  { to: "/operaciones/tecnicos", label: "Técnicos", icon: Users },
];

const ALL_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_EXTRA];

export const findCurrentItem = (pathname: string): NavItem | undefined =>
  ALL_ITEMS.find((i) => i.to !== "/operaciones" && pathname.startsWith(i.to))
  ?? (pathname === "/operaciones" ? NAV_GROUPS[0].items[0] : undefined);

export const findCurrentGroup = (pathname: string): NavGroup | undefined => {
  if (pathname === "/operaciones") return NAV_GROUPS[0];
  if (pathname.startsWith("/operaciones/tecnicos")) {
    return NAV_GROUPS.find((g) => g.key === "operacion");
  }
  return NAV_GROUPS.find((g) =>
    g.items.some((i) => i.to !== "/operaciones" && pathname.startsWith(i.to)),
  );
};

export const OpsLayout = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // A1 · Si el snapshot de datos cambió desde la última visita, la caché de
  // análisis de esta sesión se invalida al montar la sección.
  useAsOfCacheGuard();
  // Hito UAT: el armazón de la sección ya está en pantalla.
  useEffect(() => { registrarHito("shell"); }, []);


  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/portal/login");
  };

  const initials = (profile?.display_name || profile?.email || "WG")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const current = useMemo(() => findCurrentItem(pathname), [pathname]);
  const currentGroup = useMemo(() => findCurrentGroup(pathname), [pathname]);

  const isOpenGroup = (g: NavGroup) =>
    collapsed[g.key] === undefined ? true : !collapsed[g.key];
  const toggleGroup = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !(c[key] ?? false) }));

  const renderGroups = (onNavigate?: () => void) => (
    <>
      {NAV_GROUPS.map((g) => {
        const abierto = isOpenGroup(g);
        const activo = currentGroup?.key === g.key;
        return (
          <div key={g.key} className="pb-1">
            <button
              type="button"
              onClick={() => toggleGroup(g.key)}
              aria-expanded={abierto}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                activo ? "text-ink" : "text-ink/40 hover:text-ink/70",
              )}
            >
              <span>{g.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !abierto && "-rotate-90")} />
            </button>
            {abierto && (
              <div className="space-y-0.5 mt-0.5">
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] tracking-tight transition-colors duration-200",
                        isActive ? "bg-black/[0.04] text-ink font-medium" : "text-ink/60 hover:text-ink hover:bg-black/[0.03]",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );


  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)] flex font-sans antialiased">
      <aside className="hidden lg:flex w-64 flex-col border-r border-black/[0.06] bg-white sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-4">
          <Link to="/" className="block mb-1" aria-label="Grupo Warranty Global">
            <Logo className="h-14" />
          </Link>
          <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-ink/40 uppercase">Interno</p>
          <p className="font-display text-lg text-ink leading-tight tracking-tight">WG Operaciones</p>
          <p className="text-[11px] text-ink/50 mt-0.5">Inteligencia operativa</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {renderGroups()}
        </nav>


        <div className="p-3 border-t border-black/[0.06]">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-black/[0.03] mb-2">
            <div className="h-9 w-9 rounded-full bg-ink text-bone flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate font-medium">
                {profile?.display_name || "Equipo directivo"}
              </p>
              <p className="text-xs text-ink/50 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-black/[0.06] h-14 px-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 text-ink" aria-label="Volver a la web pública">
          <ArrowLeft className="h-4 w-4" />
          <Logo className="h-12" />
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 truncate">Interno</p>
          <p className="font-display text-sm text-ink leading-none truncate">WG Operaciones</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm pt-14" onClick={() => setOpen(false)}>
          <nav className="bg-white border-b border-black/[0.06] px-3 py-4 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {renderGroups(() => setOpen(false))}

            <div className="pt-2 mt-2 border-t border-black/[0.06]">
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        <header className="hidden lg:flex h-14 sticky top-0 z-20 items-center justify-between px-8 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
            <NavLink to="/operaciones" end className="text-ink/50 hover:text-ink transition-colors">
              WG Operaciones
            </NavLink>
            {currentGroup && currentGroup.key !== "panorama" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-ink/30" />
                <span className="text-ink/50">{currentGroup.label}</span>
              </>
            )}
            {current && current.to !== "/operaciones" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-ink/30" />
                <span className="text-ink font-medium tracking-tight">{current.label}</span>
              </>
            )}

          </nav>
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-[12px] text-ink/50 hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a la web</span>
          </Link>
        </header>

        <OpsFiltersProvider>
          {/* Boundary propio: un fallo en la barra de filtros nunca debe
              dejar en blanco toda la sección de operaciones. */}
          <RouteBoundary>
            <OpsFiltersBar />
          </RouteBoundary>
          <div className="portal-surface flex-1 max-w-6xl w-full mx-auto px-4 md:px-10 py-8 md:py-12">
            <RouteBoundary key={pathname}>
              <Outlet />
            </RouteBoundary>
          </div>
        </OpsFiltersProvider>
        <PerfOverlay />
      </main>
    </div>
  );
};
