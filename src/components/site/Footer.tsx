import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { footerNav, legalNav } from "@/config/navigation";

interface FooterProps {
  dark?: boolean;
}

// Span de columna en desktop (md+) por id de grupo, para mantener proporciones.
const GROUP_SPAN: Record<string, string> = {
  system: "md:col-span-2",
  company: "md:col-span-2",
  network: "md:col-span-3",
};

export const Footer = ({ dark = true }: FooterProps) => {
  const { openPreferences } = useCookieConsent();
  // En oscuro usamos los colores del tema oscuro (foreground = bone). En claro usamos paleta fija oscura.
  const bg = dark ? "bg-ink" : "bg-ink";
  const textBase = "text-bone/70";
  const textHover = "hover:text-bone";
  const labelMuted = "text-bone/40";

  return (
    <footer className={cn(bg, textBase, "relative overflow-hidden")}>
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />
      <div className="container-tight relative py-16 md:py-20">
        <div className="grid gap-10 md:gap-12 grid-cols-2 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5 space-y-6">
            <Logo className="h-10 brightness-0 invert opacity-90" />
            <p className="font-display text-3xl text-bone leading-tight max-w-md text-balance">
              El sistema operativo del servicio postventa.
            </p>
            <p className="text-sm text-bone/55 max-w-md leading-relaxed">
              Convertimos el servicio postventa en un sistema que funciona. Bajo control.
            </p>
          </div>

          {footerNav.map((group) => (
            <div
              key={group.id}
              className={cn(
                group.id === "network" ? "col-span-2" : "col-span-1",
                GROUP_SPAN[group.id] ?? "md:col-span-2",
              )}
            >
              <p className={cn("text-xs uppercase tracking-[0.2em] mb-4", labelMuted)}>
                {group.label}
              </p>
              <ul className="space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className={textHover}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline bg-bone/10 my-12" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-bone/45">
          <p>© {new Date().getFullYear()} Grupo Warranty Global · Todos los derechos reservados</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((l) => (
              <Link key={l.to} to={l.to} className={textHover}>
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openPreferences}
              className={cn(textHover, "underline-offset-2 hover:underline")}
            >
              Configurar cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
