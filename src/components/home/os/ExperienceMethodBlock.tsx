import { Reveal } from "@/components/site/Reveal";
import { Workflow, Gauge, Sparkles } from "lucide-react";

const blocks = [
  {
    icon: Workflow,
    code: "EXP/01",
    title: "Cómo la gestionamos",
    lead: "La experiencia no se gestiona de forma aislada. Se construye a lo largo de todo el servicio.",
    bullets: [
      "Desde el diagnóstico inicial",
      "Durante la ejecución",
      "En el cumplimiento de plazos",
      "En la calidad de la resolución",
    ],
    closing: "Cada punto del proceso impacta directamente en la percepción del cliente.",
  },
  {
    icon: Gauge,
    code: "EXP/02",
    title: "Cómo la medimos",
    lead: "Medimos la experiencia a través del rendimiento real del sistema.",
    bullets: [
      "Tiempo total de resolución (TAT)",
      "Resolución en primera intervención (FTF)",
      "Incidencias y reclamaciones",
      "Cumplimiento de compromisos",
    ],
    closing: "La experiencia no es una percepción subjetiva. Es una consecuencia medible.",
  },
  {
    icon: Sparkles,
    code: "EXP/03",
    title: "Qué conseguimos",
    lead: "Resultados tangibles que se sostienen en el tiempo y se notan en cada interacción.",
    bullets: [
      "Experiencia consistente, independientemente del proveedor",
      "Menor fricción para el cliente",
      "Reducción de contactos innecesarios",
      "Mayor confianza en el servicio",
    ],
    closing: "Una experiencia que no depende del azar. Depende del sistema.",
  },
];

export const ExperienceMethodBlock = () => (
  <section className="py-28 md:py-36 bg-background">
    <div className="container-tight">
      <Reveal>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
          Gestionada, medida{" "}
          <span className="text-teal italic">y comprobada</span>.
        </h2>
        <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          Tres capas conectadas que convierten la experiencia en algo construido, no improvisado.
        </p>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-3 gap-6">
        {blocks.map((b, i) => {
          const Icon = b.icon;
          return (
            <Reveal key={b.code} delay={i * 100}>
              <article className="h-full rounded-2xl border border-foreground/10 bg-card p-8 hover:border-teal/40 transition-colors flex flex-col">
                <div className="flex items-center justify-between mb-7">
                  <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-[10px] text-foreground/30">{b.code}</span>
                </div>
                <h3 className="font-display text-2xl text-foreground leading-snug">{b.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.lead}</p>
                <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-6 flex-1">
                  {b.bullets.map((x) => (
                    <li
                      key={x}
                      className="flex gap-3 text-sm text-foreground/85 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 pt-6 border-t border-foreground/10 font-display italic text-foreground/90 text-[15px] leading-snug">
                  "{b.closing}"
                </p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);
