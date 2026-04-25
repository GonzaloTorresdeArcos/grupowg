import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ServiceOSDiagram } from "./ServiceOSDiagram";
import heroPhoto from "@/assets/hero-technician.jpg";

export const HeroOS = () => (
  <section className="relative min-h-[100svh] flex items-end overflow-hidden bg-ink text-bone pt-32 pb-16">
    {/* Background grid */}
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal)/0.15),transparent_60%)]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" />

    <div className="container-wide relative z-10 grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
      {/* LEFT — texto */}
      <div className="lg:col-span-7">
        <div className="badge-os animate-fade-in mb-8">WG Service OS · v2026</div>
        <h1 className="heading-display text-bone text-[clamp(2.5rem,7.2vw,6.5rem)] animate-fade-up">
          Donde otros terminan,
          <br />
          <span className="text-teal italic font-normal">nosotros empezamos</span>.
        </h1>

        <p className="mt-8 font-display text-2xl md:text-[1.75rem] text-bone/90 max-w-2xl text-balance leading-snug">
          Convertimos el servicio postventa en un sistema que funciona.{" "}
          <span className="text-teal-soft">Bajo control.</span>
        </p>

        <p className="mt-6 max-w-xl text-base md:text-lg text-bone/60 leading-relaxed">
          Integramos operación, experiencia de cliente y conocimiento técnico para ejecutar,
          controlar y optimizar el servicio de principio a fin.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/contacto" className="btn-teal">
            Solicitar información
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/modelo" className="btn-on-dark">
            Ver el modelo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Microdata strip */}
        <div className="mt-14 grid grid-cols-3 max-w-md gap-6 text-bone/55">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80">Operación</p>
            <p className="text-bone font-display text-2xl mt-1">+150K</p>
            <p className="text-[11px]">incidencias / año</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80">Red</p>
            <p className="text-bone font-display text-2xl mt-1">+400</p>
            <p className="text-[11px]">SATs activos</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80">Trayectoria</p>
            <p className="text-bone font-display text-2xl mt-1">50</p>
            <p className="text-[11px]">años de oficio</p>
          </div>
        </div>
      </div>

      {/* RIGHT — composición mixta: foto + overlay diagrama */}
      <div className="lg:col-span-5 relative">
        <div className="relative rounded-3xl overflow-hidden aspect-[4/5] border border-foreground/10 bg-ink-elevated">
          <img
            src={heroPhoto}
            alt="Técnico de servicio postventa diagnosticando un electrodoméstico"
            width={1024}
            height={1280}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute inset-x-0 top-0 p-6">
            <div className="badge-os">live · sistema operativo activo</div>
          </div>
          {/* Overlay diagrama animado */}
          <div className="absolute inset-x-4 bottom-4">
            <ServiceOSDiagram compact />
          </div>
        </div>
      </div>
    </div>
  </section>
);
