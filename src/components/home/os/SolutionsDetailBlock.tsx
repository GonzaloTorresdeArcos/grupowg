import { Reveal } from "@/components/site/Reveal";
import {
  Cog, Eye, Globe,
  Headphones, Users2, Wrench, Truck, PackageSearch, ShieldCheck,
  Database, LineChart, GitCompare,
  Layers, Network, Boxes, MapPin,
  ArrowUpRight, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

type Module = {
  code: string;
  icon: typeof Cog;
  name: string;
  tagline: string;
  intro: string;
  pillars?: { title: string; items: string[]; icon: typeof Cog }[];
  bullets?: { icon: typeof Cog; text: string }[];
  outcomes?: { from: string; to: string };
  closing: string;
};

const modules: Module[] = [
  {
    code: "WG/01",
    icon: Cog,
    name: "WG Execute",
    tagline: "Lo hacemos por ti",
    intro:
      "Gestionamos el servicio postventa de principio a fin. Nos encargamos de toda la operación para asegurar que el servicio funcione con calidad, rapidez y control.",
    bullets: [
      { icon: Headphones, text: "Atención y diagnóstico" },
      { icon: Users2, text: "Asignación de red técnica" },
      { icon: Wrench, text: "Gestión de intervenciones" },
      { icon: Truck, text: "Coordinación logística" },
      { icon: PackageSearch, text: "Gestión de repuestos (cuando aplica)" },
      { icon: ShieldCheck, text: "Control completo del servicio" },
    ],
    closing: "Externalizas el servicio. Nosotros lo operamos.",
  },
  {
    code: "WG/02",
    icon: Eye,
    name: "WG Control Tower",
    tagline: "Lo controlamos contigo",
    intro:
      "Controlamos y mejoramos el servicio cuando intervienen varios proveedores. Integramos toda la información y damos una visión única para tomar decisiones.",
    pillars: [
      {
        title: "Qué hacemos",
        icon: Database,
        items: [
          "Integramos datos de operación propia y redes externas",
          "Dashboards claros y control de costes",
          "Comparativas reales entre proveedores",
        ],
      },
      {
        title: "Qué obtienes",
        icon: LineChart,
        items: [
          "Visión completa de todo el servicio",
          "Detección de problemas e ineficiencias",
          "Identificación de mejoras y palancas",
        ],
      },
    ],
    outcomes: {
      from: "Gestionar proveedores",
      to: "Gestionar el rendimiento del servicio",
    },
    closing: "Una única visión para todo el servicio.",
  },
  {
    code: "WG/03",
    icon: Globe,
    name: "WG Scale",
    tagline: "Te acompañamos en tu expansión",
    intro:
      "Diseñamos el servicio y lo ayudamos a crecer de forma ordenada, también internacionalmente. Mismo estándar, mismos KPIs, en todos los mercados.",
    pillars: [
      {
        title: "Definición del modelo",
        icon: Layers,
        items: [
          "Cómo funciona el servicio end-to-end",
          "SLA y KPIs por etapa",
          "Organización y control",
        ],
      },
      {
        title: "Red de servicio",
        icon: Network,
        items: [
          "Selección y homologación de técnicos",
          "Flujos: domicilio vs taller",
          "Estándares operativos comunes",
        ],
      },
      {
        title: "Repuestos y logística",
        icon: Boxes,
        items: [
          "Planificación de necesidades",
          "Stock basado en histórico",
          "Optimización de compras y logística",
        ],
      },
      {
        title: "Despliegue internacional",
        icon: MapPin,
        items: [
          "Implantación multi-país",
          "Mismos procesos y criterios",
          "Control central + adaptación local",
        ],
      },
    ],
    outcomes: {
      from: "Crecer sin estructura",
      to: "Escalar con control y consistencia",
    },
    closing: "De diseñar el servicio a hacerlo funcionar a escala.",
  },
];

const capabilities = [
  {
    code: "CAP/01",
    icon: Wrench,
    title: "Inteligencia técnica",
    lead: "Convertimos el conocimiento técnico en decisiones prácticas.",
    bullets: [
      "Recogemos y organizamos incidencias",
      "Apoyamos el diagnóstico",
      "Damos soporte en casos complejos",
      "Mejoramos la resolución a la primera",
    ],
    closing: "Sabemos cuándo algo está mal y cómo corregirlo.",
  },
  {
    code: "CAP/02",
    icon: LineChart,
    title: "Inteligencia de producto",
    lead: "Convertimos el servicio en información útil para producto y compras.",
    bullets: [
      "Detectamos fallos recurrentes",
      "Analizamos comportamiento por producto",
      "Medimos impacto en coste y calidad",
      "Generamos informes claros",
    ],
    closing: "Cada incidencia aporta información para mejorar el producto.",
  },
  {
    code: "CAP/03",
    icon: ShieldCheck,
    title: "Control y cumplimiento del servicio",
    lead: "Aseguramos que todo el sistema funciona y cumple.",
    bullets: [
      "Validamos la red técnica",
      "Controlamos la documentación",
      "Verificamos el cumplimiento de acuerdos",
      "Reducimos riesgos operativos",
    ],
    closing: "No solo ocurre el servicio. Funciona como debe.",
  },
];

export const SolutionsDetailBlock = () => (
  <>
    {/* Intro grid: 3 módulos overview */}
    <section className="py-24 md:py-32 bg-background border-y border-foreground/5">
      <div className="container-tight">
        <Reveal>
          
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            Tres formas de{" "}
            <span className="text-teal italic">activar el sistema</span> de servicio.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Tres módulos. Una misma plataforma. Eliges el grado de implicación según tu modelo operativo.
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10 rounded-2xl overflow-hidden">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.code} delay={i * 80}>
                <a
                  href={`#${m.code.toLowerCase().replace("/", "-")}`}
                  className="group block h-full bg-card p-8 md:p-10 transition-colors hover:bg-ink-elevated"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-mono text-xs text-foreground/40">{m.code}</span>
                    <ArrowRight className="h-4 w-4 text-foreground/30 transition-all group-hover:text-teal group-hover:translate-x-1" />
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-6">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <h3 className="heading-tight text-foreground text-2xl">{m.name}</h3>
                  <p className="mt-1 text-teal text-sm font-medium">{m.tagline}</p>
                  <p className="mt-5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {m.intro}
                  </p>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>

    {/* Detalle de cada módulo */}
    {modules.map((m, idx) => {
      const Icon = m.icon;
      const anchor = m.code.toLowerCase().replace("/", "-");
      return (
        <section
          key={m.code}
          id={anchor}
          className={`py-24 md:py-32 scroll-mt-24 ${
            idx % 2 === 0 ? "bg-ink-elevated" : "bg-background"
          } border-b border-foreground/5`}
        >
          <div className="container-tight">
            <Reveal>
              <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20">
                {/* Header column */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-teal">{m.code}</span>
                    <span className="h-px w-12 bg-teal/40" />
                  </div>
                  <div className="h-14 w-14 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-8">
                    <Icon className="h-6 w-6 text-teal" />
                  </div>
                  <h3 className="heading-display text-foreground text-3xl md:text-5xl text-balance leading-[1.05]">
                    {m.name}
                  </h3>
                  <p className="mt-3 text-teal text-lg font-medium italic">{m.tagline}</p>
                  <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                    {m.intro}
                  </p>

                  {m.outcomes && (
                    <div className="mt-10 rounded-xl border border-teal/20 bg-teal/5 p-6">
                      <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
                        El cambio
                      </p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm text-muted-foreground line-through">
                          {m.outcomes.from}
                        </span>
                        <ArrowRight className="h-4 w-4 text-teal flex-shrink-0" />
                        <span className="text-base font-medium text-foreground">
                          {m.outcomes.to}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content column */}
                <div className="space-y-8">
                  {m.bullets && (
                    <div className="grid sm:grid-cols-2 gap-px bg-foreground/10 border border-foreground/10 rounded-2xl overflow-hidden">
                      {m.bullets.map((b) => {
                        const BIcon = b.icon;
                        return (
                          <div key={b.text} className="bg-card p-5 flex items-start gap-4">
                            <div className="h-9 w-9 rounded-lg border border-teal/30 text-teal flex items-center justify-center flex-shrink-0">
                              <BIcon className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                            <p className="text-sm text-foreground/85 leading-relaxed pt-1">
                              {b.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {m.pillars && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {m.pillars.map((p) => {
                        const PIcon = p.icon;
                        return (
                          <div
                            key={p.title}
                            className="rounded-xl border border-foreground/10 bg-card p-6"
                          >
                            <div className="flex items-center gap-3 mb-5">
                              <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/30 text-teal flex items-center justify-center">
                                <PIcon className="h-4 w-4" strokeWidth={1.5} />
                              </div>
                              <h4 className="font-display text-base text-foreground">
                                {p.title}
                              </h4>
                            </div>
                            <ul className="space-y-2.5">
                              {p.items.map((it) => (
                                <li
                                  key={it}
                                  className="flex gap-2.5 text-sm text-foreground/80 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                                >
                                  {it}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-foreground/10 pt-6">
                    <p className="font-display italic text-foreground text-lg md:text-xl leading-snug">
                      "{m.closing}"
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      );
    })}

    {/* Capacidades del sistema */}
    <section className="py-24 md:py-32 bg-ink-elevated border-y border-foreground/5">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">05 · Capacidades del sistema</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            La inteligencia que{" "}
            <span className="text-teal italic">recorre</span> cada solución.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Tres capacidades transversales activas en Execute, Control Tower y Scale.
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.code} delay={i * 80}>
                <article className="group h-full rounded-2xl border border-foreground/10 bg-card p-8 md:p-10 transition-all hover:border-teal/40">
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-xs text-foreground/30">{c.code}</span>
                  </div>
                  <h3 className="font-display text-2xl text-foreground leading-snug">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-sm text-teal font-medium leading-relaxed">{c.lead}</p>
                  <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-6">
                    {c.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex gap-3 text-sm text-foreground/80 leading-relaxed before:content-['→'] before:text-teal before:font-mono"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 pt-6 border-t border-foreground/10 font-display italic text-foreground/90 text-[15px] leading-snug">
                    "{c.closing}"
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>

    {/* CTA final */}
    <section className="py-24 md:py-32 bg-background">
      <div className="container-tight">
        <Reveal>
          <div className="rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/10 via-card to-card p-10 md:p-16 text-center">
            <p className="eyebrow-mono mb-4 text-teal">¿Por dónde empezar?</p>
            <h3 className="heading-display text-foreground text-3xl md:text-5xl text-balance max-w-3xl mx-auto leading-[1.05]">
              Hablamos de tu operación y elegimos el{" "}
              <span className="text-teal italic">módulo</span> que encaja.
            </h3>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/contacto" className="btn-teal">
                Solicitar información
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/plataforma"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-teal transition-colors"
              >
                Ver la plataforma
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </>
);
