import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/grupo", label: "Grupo WG" },
  { to: "/que-hacemos", label: "Qué hacemos" },
  { to: "/soluciones", label: "Soluciones" },
  { to: "/marcas", label: "Marcas" },
  { to: "/wg-network", label: "WG Professional Network" },
  { to: "/50-aniversario", label: "50 aniversario" },
  { to: "/contacto", label: "Contacto" },
];

const groupEntities = [
  { label: "Serseguro", desc: "Garantías y aseguradoras" },
  { label: "Hiperservice", desc: "Operación técnica y SAT" },
  { label: "Asure Componentes", desc: "Repuestos y componentes" },
];

const secondaryLinks = [
  { to: "/contacto", label: "Contacto" },
  { to: "/legal/privacidad", label: "Privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
];

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // Notify the rest of the layout (sticky CTA) about menu state
  useEffect(() => {
    document.documentElement.dataset.mobileMenu = open ? "open" : "closed";
    return () => {
      delete document.documentElement.dataset.mobileMenu;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500 ease-smooth",
        scrolled || open
          ? "bg-bone/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="container-tight flex items-center justify-between py-4">
        <Link to="/" aria-label="Inicio Grupo Warranty Global" className="relative z-10">
          <Logo className="h-9 md:h-10" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-[13px] font-medium text-ink/70 transition-colors hover:text-ink",
                  isActive && "text-ink"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link to="/wg-network/inscripcion" className="btn-primary">
            Únete a WG Network
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          className="lg:hidden p-2 -mr-2 text-ink relative z-10"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 top-[68px] bg-bone overflow-y-auto transition-all duration-300 ease-smooth",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div className="container-tight py-8 pb-32 flex flex-col gap-10">
          {/* Primary navigation */}
          <nav>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink/40 mb-4">
              Navegación
            </p>
            <div className="flex flex-col">
              {primaryNav.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center justify-between py-4 border-b border-border/60 transition-colors",
                      isActive ? "text-ink" : "text-ink/80 hover:text-ink"
                    )
                  }
                  style={{
                    transitionDelay: open ? `${i * 30}ms` : "0ms",
                  }}
                >
                  <span className="font-display text-2xl">{item.label}</span>
                  <ArrowUpRight className="h-5 w-5 text-ink/30 group-hover:text-ink transition-colors" />
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Group entities */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink/40 mb-4">
              Compañías del grupo
            </p>
            <div className="grid gap-2">
              {groupEntities.map((e) => (
                <div
                  key={e.label}
                  className="flex items-baseline justify-between border-b border-border/40 py-3"
                >
                  <span className="text-sm font-medium text-ink">{e.label}</span>
                  <span className="text-xs text-ink/50">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {secondaryLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs text-ink/60 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <Link
            to="/wg-network/inscripcion"
            className="btn-primary w-full justify-center text-base py-4"
          >
            Únete a WG Network
            <ArrowUpRight className="h-4 w-4" />
          </Link>

          <p className="text-xs text-ink/40 text-center">
            © {new Date().getFullYear()} Grupo Warranty Global
          </p>
        </div>
      </div>
    </header>
  );
};
