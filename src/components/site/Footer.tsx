import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/hooks/useCookieConsent";

interface FooterProps {
  dark?: boolean;
}

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
          <div className="md:col-span-2">
            <p className={cn("text-xs uppercase tracking-[0.2em] mb-4", labelMuted)}>Sistema</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/modelo" className={textHover}>Modelo</Link></li>
              <li><Link to="/soluciones" className={textHover}>Soluciones</Link></li>
              <li><Link to="/plataforma" className={textHover}>Plataforma</Link></li>
              <li><Link to="/experiencia" className={textHover}>Experiencia</Link></li>
              <li><Link to="/industrias" className={textHover}>Industrias</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className={cn("text-xs uppercase tracking-[0.2em] mb-4", labelMuted)}>Compañía</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/grupo" className={textHover}>Grupo WG</Link></li>
              <li><Link to="/marcas" className={textHover}>Marcas</Link></li>
              <li><Link to="/50-aniversario" className={textHover}>50 aniversario</Link></li>
              <li><Link to="/contacto" className={textHover}>Contacto</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-3">
            <p className={cn("text-xs uppercase tracking-[0.2em] mb-4", labelMuted)}>Red profesional</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/wg-network" className={textHover}>WG Professional Network</Link></li>
              <li><Link to="/wg-network/inscripcion" className={textHover}>Únete a la red</Link></li>
              <li><Link to="/portal/login" className={textHover}>Acceso colaboradores</Link></li>
            </ul>
          </div>
        </div>
        <div className="hairline bg-bone/10 my-12" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-bone/45">
          <p>© {new Date().getFullYear()} Grupo Warranty Global · Todos los derechos reservados</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/legal/privacidad" className={textHover}>Política de privacidad</Link>
            <Link to="/legal/aviso-legal" className={textHover}>Aviso legal</Link>
            <Link to="/legal/cookies" className={textHover}>Política de cookies</Link>
            <Link to="/legal/accesibilidad" className={textHover}>Accesibilidad</Link>
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
