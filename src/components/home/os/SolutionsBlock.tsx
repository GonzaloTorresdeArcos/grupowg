import { Reveal } from "@/components/site/Reveal";
import { ArrowUpRight, Cog, Eye, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  {
    icon: Cog,
    code: "WG/01",
    t: "WG Execute",
    sub: "Lo hacemos por ti",
    d: "Gestionamos el servicio postventa de principio a fin. Nos encargamos de toda la operación para que el servicio funcione con calidad, rapidez y control.",
    bullets: [
      "Atención y diagnóstico",
      "Asignación de red técnica",
      "Gestión de intervenciones",
      "Coordinación logística y repuestos",
    ],
    tagline: "Externalizas el servicio. Nosotros lo operamos.",
  },
  {
    icon: Eye,
    code: "WG/02",
    t: "WG Control Tower",
    sub: "Lo controlamos contigo",
    d: "Controlamos y mejoramos el servicio cuando intervienen varios proveedores. Integramos toda la información en una visión única para tomar decisiones.",
    bullets: [
      "Dashboards claros y control de costes",
      "Comparativa real entre proveedores",
      "Detección de problemas y mejoras",
      "KPIs alineados a negocio",
    ],
    tagline: "Una única visión para todo el servicio.",
    featured: true,
  },
  {
    icon: Globe,
    code: "WG/03",
    t: "WG Scale",
    sub: "Te acompañamos en tu expansión",
    d: "Diseñamos el servicio y lo ayudamos a crecer de forma ordenada, también internacionalmente. Mismo estándar en todos los mercados.",
    bullets: [
      "Definición del modelo, SLA y KPIs",
      "Selección y homologación de red",
      "Repuestos, logística y stock óptimo",
      "Despliegue multi-país con control central",
    ],
    tagline: "De diseñar el servicio a hacerlo funcionar a escala.",
  },
];

export const SolutionsBlock = () => (
  <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">08 · Soluciones</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
          Tres formas de{" "}
          <span className="text-teal italic">activar el sistema</span>.
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-3 gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.t} delay={i * 100}>
              <div
                className={`group h-full rounded-2xl border ${
                  c.featured
                    ? "border-teal/40 bg-gradient-to-br from-teal/5 to-transparent"
                    : "border-foreground/10 bg-card"
                } p-8 md:p-10 transition-all duration-300 hover:border-teal/40 relative overflow-hidden`}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-xs text-foreground/30">{c.code}</span>
                </div>
                <h3 className="heading-tight text-foreground text-2xl md:text-3xl">{c.t}</h3>
                <p className="mt-2 text-teal text-sm font-medium">{c.sub}</p>
                <p className="mt-5 text-muted-foreground leading-relaxed text-[15px]">{c.d}</p>
                <ul className="mt-8 space-y-2 border-t border-foreground/10 pt-6">
                  {c.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 text-sm text-foreground/85 before:content-['→'] before:text-teal before:font-mono"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 pt-6 border-t border-foreground/10 text-foreground italic text-[15px] leading-snug">
                  {c.tagline}
                </p>
                <Link
                  to="/soluciones"
                  className="mt-6 inline-flex items-center gap-2 text-sm text-teal font-medium hover:gap-3 transition-all"
                >
                  Ver detalle <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);
