import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="bg-ink text-bone/80">
    <div className="container-tight py-20">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5 space-y-6">
          <Logo className="h-10 brightness-0 invert opacity-90" />
          <p className="font-display text-3xl text-bone leading-tight max-w-md text-balance">
            50 años resolviendo lo que otros dejan atrás.
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-bone/40 mb-4">Compañías</p>
          <ul className="space-y-2 text-sm">
            <li>Serseguro</li>
            <li>Hiperservice</li>
            <li>Asure Componentes</li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-bone/40 mb-4">Grupo</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/grupo" className="hover:text-bone">Grupo WG</Link></li>
            <li><Link to="/que-hacemos" className="hover:text-bone">Qué hacemos</Link></li>
            <li><Link to="/soluciones" className="hover:text-bone">Soluciones</Link></li>
            <li><Link to="/marcas" className="hover:text-bone">Marcas</Link></li>
            <li><Link to="/50-aniversario" className="hover:text-bone">50 aniversario</Link></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="text-xs uppercase tracking-[0.2em] text-bone/40 mb-4">Red profesional</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/wg-network" className="hover:text-bone">WG Professional Network</Link></li>
            <li><Link to="/wg-network/inscripcion" className="hover:text-bone">Únete a la red</Link></li>
            <li><Link to="/contacto" className="hover:text-bone">Contacto</Link></li>
          </ul>
        </div>
      </div>
      <div className="hairline bg-bone/10 my-12" />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-bone/50">
        <p>© {new Date().getFullYear()} Grupo Warranty Global · Todos los derechos reservados</p>
        <div className="flex gap-6">
          <Link to="/legal/privacidad" className="hover:text-bone">Política de privacidad</Link>
          <Link to="/legal/aviso-legal" className="hover:text-bone">Aviso legal</Link>
        </div>
      </div>
    </div>
  </footer>
);
