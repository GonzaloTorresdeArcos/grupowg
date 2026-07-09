import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import logo50 from "@/assets/logo-50-dark.png";

export const FinalCTA = () => (
  <section className="relative py-32 md:py-44 bg-gradient-to-br from-ink via-ink-soft to-ink text-bone overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal)/0.18),transparent_60%)]" />

    <div className="container-tight relative z-10">
      <Reveal>
        <img src={logo50} alt="50 años Grupo Warranty Global · desde 1976" width={160} height={160} loading="lazy" className="h-24 md:h-28 w-auto mb-10" />
        <h2 className="heading-display text-bone text-4xl md:text-7xl max-w-5xl text-balance">
          Cuando algo deja de funcionar,{" "}
          <span className="italic text-teal font-normal">empezamos nosotros.</span>
        </h2>
        <p className="mt-10 text-bone/70 text-lg max-w-2xl">
          Si eres fabricante, distribuidor, ecommerce, aseguradora, SAT, instalador o colaborador
          técnico, hablemos.
        </p>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/contacto" className="inline-flex items-center justify-center gap-2 rounded-full bg-bone px-6 py-3.5 text-sm font-medium text-ink transition-all hover:gap-3">
            Contactar
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/wg-network/inscripcion" className="btn-teal">
            Unirme a WG Professional Network
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/contacto?info=comercial" className="btn-on-dark">
            Solicitar información comercial
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);
