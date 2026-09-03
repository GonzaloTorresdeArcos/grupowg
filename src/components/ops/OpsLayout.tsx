import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Users, Building2, Timer, Upload, ArrowLeft, LogOut, Menu, X, ChevronRight,
  ChevronDown, Wrench, Euro, MapPin, Truck, Package, Database, Factory, Gauge, FileText,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { RouteBoundary } from "@/components/site/RouteBoundary";
import { OpsFiltersProvider } from "@/lib/ops-filters";
import { OpsFiltersBar } from "@/components/ops/OpsFiltersBar";
import { OpsScopeBar } from "@/components/ops/OpsScopeBar";
import { perfilFiltros } from "@/lib/ops-filter-scope";
import { useAsOfCacheGuard } from "@/lib/ops-cache";
import { PerfOverlay } from "@/components/ops/PerfOverlay";
import { registrarHito } from "@/lib/ops-perf";

type NavItem = { to: string; label: string; icon: typeof Users; end?: boolean };
type NavGroup = { key: string; label: string; icon: typeof Users; items: NavItem[] };

// Navegación V2 — 5 grupos organizativos.
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "panorama",
    label: "Panorama",
    icon: LayoutDashboard,
    items: [{ to: "/operaciones", label: "Panorama operativo", icon: LayoutDashboard, end: true }],
  },
  {
    key: "operacion",
    label: "Operación de servicio",
    icon: Factory,
    items: [
      { to: "/operaciones/hub", label: "HUB Central", icon: Factory },
      { to: "/operaciones/delegaciones", label: "Delegaciones", icon: Building2 },
      { to: "/operaciones/sats", label: "Red SAT externa", icon: Wrench },
    ],
  },
  {
    key: "supply",
    label: "Supply & Fulfilment",
    icon: Truck,
    items: [
      { to: "/operaciones/logistica", label: "Logística & Expediciones", icon: Truck },
      { to: "/operaciones/repuestos", label: "Repuestos & Stock", icon: Package },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    icon: Gauge,
    items: [
      { to: "/operaciones/performance-real", label: "Performance Real", icon: Gauge },
      { to: "/operaciones/sla", label: "SLA & Flujo", icon: Timer },
      { to: "/operaciones/dispersion", label: "Cobertura & Dispersión", icon: MapPin },
      { to: "/operaciones/costes", label: "Coste, Productividad & Capacidad", icon: Euro },
    ],
  },
  {
    key: "contractual",
    label: "Inteligencia contractual",
    icon: FileText,
    items: [
      { to: "/operaciones/contratos", label: "Contratos & Programas", icon: FileText },
    ],
  },
  {
    key: "data",
    label: "Data",
    icon: Database,
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

const RAIL_KEY = "ops.nav.expanded.v1";

export const OpsLayout = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // UX1 · Rail adaptativo: compacto por defecto, preferencia persistida.
  const [expandido, setExpandido] = useState<boolean>(() => {
    try { return localStorage.getItem(RAIL_KEY) === "1"; } catch { return false; }
  });
  const [abierto, setAbierto] = useState<Record<string, boolean>>({});
  const [perfilOpen, setPerfilOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);
  // A1 · Si el snapshot de datos cambió desde la última visita, la caché de
  // análisis de esta sesión se invalida al montar la sección.
  useAsOfCacheGuard();
  // PRV-UAT-FS1 · perfil de filtros por ruta (control visible = control efectivo).
  const perfil = perfilFiltros(pathname);
  const tituloScope = findCurrentItem(pathname)?.label ?? "WG Operaciones";
  // Hito UAT: el armazón de la sección ya está en pantalla.
  useEffect(() => { registrarHito("shell"); }, []);

  useEffect(() => {
    try { localStorage.setItem(RAIL_KEY, expandido ? "1" : "0"); } catch { /* ignore */ }
  }, [expandido]);

  useEffect(() => {
    if (!perfilOpen) return;
    const onDown = (e: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) setPerfilOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPerfilOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [perfilOpen]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/portal/login");
  };

  const initials = (profile?.display_name || profile?.email || "WG")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const current = useMemo(() => findCurrentItem(pathname), [pathname]);
  const currentGroup = useMemo(() => findCurrentGroup(pathname), [pathname]);

  // SOLO el grupo activo abierto por defecto; el usuario puede abrir otros.
  const isOpenGroup = (g: NavGroup) =>
    abierto[g.key] ?? (currentGroup?.key === g.key);
  const toggleGroup = (key: string) =>
    setAbierto((c) => ({ ...c, [key]: !(c[key] ?? (currentGroup?.key === key)) }));

  const renderGroups = (onNavigate?: () => void) => (
    <>
      {NAV_GROUPS.map((g) => {
        const open2 = isOpenGroup(g);
        const activo = currentGroup?.key === g.key;
        return (
          <div key={g.key} className="pb-1">
            <button
              type="button"
              onClick={() => toggleGroup(g.key)}
              aria-expanded={open2}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                activo ? "text-ink" : "text-ink/40 hover:text-ink/70",
              )}
            >
              <span>{g.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open2 && "-rotate-90")} />
            </button>
            {open2 && (
              <div className="space-y-0.5 mt-0.5">
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] tracking-tight transition-colors duration-200",
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

  // UX-SHELL-LEFTNAV-1 · Rail real: solo iconos de destino (12 secciones),
  // separadores hairline entre grupos, tooltip en hover/focus y estado activo
  // explícito. Ningún texto permanente.
  const renderRail = () => (
    <nav
      aria-label="Navegación principal"
      data-testid="ops-rail-nav"
      className="flex-1 px-1 py-2 space-y-0.5 overflow-y-auto overflow-x-visible"
    >
      {NAV_GROUPS.map((g, gi) => (
        <div key={g.key} className={cn(gi > 0 && "mt-1 pt-1 border-t border-black/[0.05]")}>
          {g.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "group relative w-full h-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-black/[0.06] text-ink after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-ink"
                    : "text-ink/40 hover:text-ink hover:bg-black/[0.035]",
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-bone opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );



  return (
    <div className="min-h-screen bg-[hsl(0_0%_99%)] flex font-sans antialiased">
      <aside
        data-testid="ops-rail"
        data-expandido={expandido ? "1" : "0"}
        className={cn(
          "hidden lg:flex flex-col border-r border-black/[0.06] bg-white sticky top-0 h-screen transition-[width] duration-200 shrink-0",
          expandido ? "w-64" : "w-[60px]",
        )}
      >
        <div className={cn("flex items-center gap-2 pb-2", expandido ? "px-4 pt-4" : "px-1.5 pt-3 justify-center")}>
          <Link to="/" aria-label="Grupo Warranty Global" className="min-w-0">
            <Logo className={expandido ? "h-9" : "h-6"} />
          </Link>
          {expandido && (
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13px] text-ink leading-tight tracking-tight truncate">WG Operaciones</p>
              <p className="text-[10px] text-ink/45 truncate">Interno</p>
            </div>
          )}
        </div>


        {expandido ? (
          <nav aria-label="Navegación principal" className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
            {renderGroups()}
          </nav>
        ) : renderRail()}

        <div className={cn("border-t border-black/[0.06] py-2 flex items-center", expandido ? "px-3 gap-2 justify-between" : "px-1.5 gap-1 flex-col")}>
          <div className="relative" ref={perfilRef}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={perfilOpen}
              aria-label="Perfil y sesión"
              onClick={() => setPerfilOpen((o) => !o)}
              className="h-9 w-9 rounded-full bg-ink text-bone flex items-center justify-center text-xs font-medium hover:opacity-90"
            >
              {initials}
            </button>
            {perfilOpen && (
              <div
                role="dialog"
                aria-label="Sesión"
                className="absolute bottom-11 left-0 z-50 w-60 rounded-xl border border-black/[0.08] bg-white shadow-xl p-3"
              >
                <p className="text-[13px] text-ink font-medium truncate">
                  {profile?.display_name || "Equipo directivo"}
                </p>
                <p className="text-[11px] text-ink/50 truncate mb-2">{user?.email}</p>
                <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-[13px]" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpandido((e) => !e)}
            aria-label={expandido ? "Contraer navegación" : "Expandir navegación"}
            title={expandido ? "Contraer navegación" : "Expandir navegación"}
            className="group relative h-9 w-9 rounded-lg flex items-center justify-center text-ink/45 hover:text-ink hover:bg-black/[0.04]"
          >
            {expandido ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            {!expandido && (
              <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-bone opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                Expandir navegación
              </span>
            )}
          </button>

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
        <header className="hidden lg:flex h-12 sticky top-0 z-20 items-center justify-between px-6 border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12.5px]">
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
              dejar en blanco toda la sección de operaciones.
              PRV-UAT-FS1 · el perfil de filtros depende de la ruta: solo se
              muestran los controles que sus RPC consumen de verdad. */}
          <RouteBoundary>
            {perfil === "operativa" ? (
              <OpsFiltersBar />
            ) : (
              <OpsScopeBar perfil={perfil} titulo={tituloScope} />
            )}
          </RouteBoundary>

          <div className={cn("portal-surface flex-1 w-full mx-auto px-4 md:px-8 py-5 md:py-6", expandido ? "max-w-6xl" : "max-w-[1600px]")}>
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
