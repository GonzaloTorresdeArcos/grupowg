import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export const ClosingBlock = () => (
  <section className="py-32 md:py-44 bg-ink text-bone relative overflow-hidden border-t border-foreground/5">
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--teal)/0.18),transparent_60%)]" />
    <div className="container-tight relative text-center">
      <Reveal>
        <p className="eyebrow-mono mb-8 text-teal">14 · Cierre</p>
        <h2 className="heading-display text-bone text-4xl md:text-6xl lg:text-7xl max-w-4xl mx-auto text-balance leading-[1.05]">
          El problema no es quién presta el servicio.
          <br />
          <span className="text-teal italic">Es que el sistema funcione.</span>
        </h2>
        <p className="mt-10 font-display text-2xl text-bone/85">
          Nosotros nos aseguramos de ello.
        </p>
      </Reveal>
      <Reveal delay={200}>
        <div className="mt-12 flex flex-wrap gap-3 justify-center">
          <Link to="/contacto" className="btn-teal">
            Solicitar información
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/modelo" className="btn-on-dark">
            Ver el modelo
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);
