import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/grupo", label: "Grupo WG" },
  { to: "/que-hacemos", label: "Qué hacemos" },
  { to: "/soluciones", label: "Soluciones" },
  { to: "/marcas", label: "Marcas" },
  { to: "/wg-network", label: "WG Professional Network" },
  { to: "/50-aniversario", label: "50 aniversario" },
  { to: "/contacto", label: "Contacto" },
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

  useEffect(() => setOpen(false), [location.pathname]);

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
        <Link to="/" aria-label="Inicio Grupo Warranty Global">
          <Logo className="h-9 md:h-10" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((item) => (
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
          className="lg:hidden p-2 -mr-2 text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-bone">
          <div className="container-tight py-6 flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="py-3 text-base font-medium text-ink border-b border-border/60"
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/wg-network/inscripcion" className="btn-primary mt-6 w-full">
              Únete a WG Network
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
