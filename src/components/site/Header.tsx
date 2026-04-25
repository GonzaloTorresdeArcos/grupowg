import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/grupo", label: "Grupo WG" },
  { to: "/modelo", label: "Modelo" },
  { to: "/soluciones", label: "Soluciones" },
  { to: "/plataforma", label: "Plataforma" },
  { to: "/experiencia", label: "Experiencia" },
  { to: "/industrias", label: "Industrias" },
  { to: "/wg-network", label: "WG Network" },
];

const secondaryLinks = [
  { to: "/contacto", label: "Contacto" },
  { to: "/legal/privacidad", label: "Privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
];

interface HeaderProps {
  dark?: boolean;
}

export const Header = ({ dark = true }: HeaderProps) => {
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

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  useEffect(() => {
    document.documentElement.dataset.mobileMenu = open ? "open" : "closed";
    return () => {
      delete document.documentElement.dataset.mobileMenu;
    };
  }, [open]);

  const headerBgClass = dark
    ? scrolled || open
      ? "bg-ink/85 backdrop-blur-xl border-b border-foreground/10"
      : "bg-transparent"
    : scrolled || open
      ? "bg-bone/90 backdrop-blur-xl border-b border-border"
      : "bg-transparent";

  const textBase = dark ? "text-bone/70 hover:text-bone" : "text-ink/70 hover:text-ink";
  const textActive = dark ? "text-bone" : "text-ink";
  const buttonClass = dark ? "btn-teal" : "btn-on-light";
  const burgerColor = dark ? "text-bone" : "text-ink";
  const drawerBg = dark ? "bg-ink" : "bg-bone";
  const drawerText = dark ? "text-bone" : "text-ink";
  const drawerSub = dark ? "text-bone/60" : "text-ink/60";

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500 ease-smooth",
        headerBgClass,
      )}
    >
      <div className="container-tight flex items-center justify-between py-4">
        <Link to="/" aria-label="Inicio Grupo Warranty Global" className="relative z-10">
          <Logo className={cn("h-9 md:h-10", dark && "brightness-0 invert")} />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-[13px] font-medium transition-colors",
                  textBase,
                  isActive && textActive,
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link to="/contacto" className={buttonClass}>
            Solicitar información
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          className={cn("lg:hidden p-2 -mr-2 relative z-10", burgerColor)}
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
          "lg:hidden fixed inset-0 top-[68px] overflow-y-auto transition-all duration-300 ease-smooth",
          drawerBg,
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div className="container-tight py-8 pb-32 flex flex-col gap-10">
          <nav>
            <p className={cn("text-[10px] uppercase tracking-[0.25em] mb-4", drawerSub)}>Navegación</p>
            <div className="flex flex-col">
              {primaryNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center justify-between py-4 border-b transition-colors",
                      dark ? "border-foreground/10" : "border-border/60",
                      isActive ? drawerText : cn(drawerText, "opacity-70 hover:opacity-100"),
                    )
                  }
                >
                  <span className="font-display text-2xl">{item.label}</span>
                  <ArrowUpRight className={cn("h-5 w-5", drawerSub, "group-hover:opacity-100")} />
                </NavLink>
              ))}
            </div>
          </nav>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {secondaryLinks.map((l) => (
              <Link key={l.to} to={l.to} className={cn("text-xs", drawerSub, "hover:opacity-100")}>
                {l.label}
              </Link>
            ))}
          </nav>

          <Link to="/contacto" className={cn(buttonClass, "w-full justify-center text-base py-4")}>
            Solicitar información
            <ArrowUpRight className="h-4 w-4" />
          </Link>

          <p className={cn("text-xs text-center", drawerSub)}>
            © {new Date().getFullYear()} Grupo Warranty Global
          </p>
        </div>
      </div>
    </header>
  );
};
