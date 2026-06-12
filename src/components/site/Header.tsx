import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav } from "@/config/navigation";


interface HeaderProps {
  dark?: boolean;
}

export const Header = ({ dark = true }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation("header");

  // Traduce el label de un item de nav usando su `to` como clave.
  // Si no hay traducción, cae al label original (por compatibilidad).
  const navLabel = (item: { to: string; label: string }) =>
    t(`nav.${item.to}`, { defaultValue: item.label });

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
      <div className="container-tight flex items-center justify-between gap-4 py-3 md:py-4">
        <Link to="/" aria-label={t("logoAlt")} className="relative z-10 shrink-0">
          <Logo
            className={cn(
              "h-24 sm:h-28 md:h-32",
              // Logo blanco solo cuando el fondo del header es oscuro:
              // - tema dark (siempre, fondo ink o transparente sobre hero oscuro)
              // - en /wg-network root, el hero es oscuro → blanco mientras esté transparente
              //   (al hacer scroll el header se vuelve claro y vuelve a colores normales)
              dark
                ? "brightness-0 invert"
                : location.pathname === "/wg-network" && !scrolled && !open && "brightness-0 invert",
            )}
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-2 text-[12px] font-medium whitespace-nowrap transition-colors",
                  textBase,
                  isActive && textActive,
                )
              }
            >
              {navLabel(item)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <LanguageSwitcher variant={dark ? "header-dark" : "header-light"} />
          <Link to="/contacto" className={buttonClass}>
            {t("ctaContact")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          className={cn("lg:hidden p-2 -mr-2 relative z-10", burgerColor)}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("closeMenu") : t("openMenu")}
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
            <p className={cn("text-[10px] uppercase tracking-[0.25em] mb-4", drawerSub)}>
              {t("navigation")}
            </p>
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
                  <span className="font-display text-2xl">{navLabel(item)}</span>
                  <ArrowUpRight className={cn("h-5 w-5", drawerSub, "group-hover:opacity-100")} />
                </NavLink>
              ))}
            </div>
          </nav>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {secondaryNav.map((l) => (
              <Link key={l.to} to={l.to} className={cn("text-xs", drawerSub, "hover:opacity-100")}>
                {navLabel(l)}
              </Link>
            ))}
          </nav>

          <div className="flex justify-start">
            <LanguageSwitcher variant="drawer" />
          </div>

          <Link to="/contacto" className={cn(buttonClass, "w-full justify-center text-base py-4")}>
            {t("ctaContact")}
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
