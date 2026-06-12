import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.webp";

export const Hero = () => (
  <section className="relative min-h-[100svh] flex items-end overflow-hidden bg-background text-foreground">
    <img
      src={heroBg}
      alt=""
      width={1920}
      height={1080}
      className="absolute inset-0 h-full w-full object-cover opacity-35"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--teal)/0.18),transparent_60%)]" />

    {/* Top label */}
    <div className="absolute top-28 left-0 right-0">
      <div className="container-tight flex items-center justify-between">
        <p className="eyebrow text-teal-soft animate-fade-in">Grupo Warranty Global · 1976 — 2026</p>
        <p className="hidden md:block text-xs text-foreground/40 uppercase tracking-[0.2em] animate-fade-in">
          Postventa · Garantías · Red técnica
        </p>
      </div>
    </div>

    <div className="container-tight relative z-10 pb-20 pt-40 md:pb-28">
      <div className="max-w-5xl">
        <h1 className="heading-display text-foreground text-[clamp(2.75rem,9vw,8.5rem)] animate-fade-up">
          Donde otros terminan,
          <br />
          <span className="text-teal font-normal">nosotros empezamos</span>.
        </h1>

        <p className="mt-8 font-display text-2xl md:text-3xl text-foreground/90 max-w-3xl text-balance">
          50 años resolviendo lo que otros dejan atrás.
        </p>

        <div className="mt-10 grid md:grid-cols-12 gap-8 items-end">
          <p className="md:col-span-7 text-base md:text-lg text-foreground/65 leading-relaxed text-balance">
            Acompañamos a fabricantes, distribuidores, ecommerce, operadores de movilidad y
            compañías aseguradoras en la gestión integral de garantías, reparaciones, repuestos
            y servicio postventa.
          </p>
          <div className="md:col-span-5 flex flex-wrap gap-3 md:justify-end">
            <Link to="/" className="btn-on-dark">
              Conócenos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/soluciones" className="inline-flex items-center justify-center gap-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-ink transition-all duration-300 ease-smooth hover:bg-teal-soft hover:gap-3">
              Nuestras soluciones
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);
