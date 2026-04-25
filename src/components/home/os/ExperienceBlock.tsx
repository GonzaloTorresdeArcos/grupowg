import { Reveal } from "@/components/site/Reveal";

export const ExperienceBlock = () => (
  <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
    <div className="container-tight grid lg:grid-cols-12 gap-12 items-center">
      <Reveal className="lg:col-span-7">
        <p className="eyebrow-mono mb-4">12 · Experiencia cliente</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance leading-[1.05]">
          La experiencia no es un canal.
          <br />
          <span className="text-teal italic">Es el resultado del sistema.</span>
        </h2>
      </Reveal>

      <Reveal className="lg:col-span-5" delay={150}>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Cuando el sistema funciona, la experiencia funciona. Sin scripts forzados, sin canales
          inconexos, sin promesas vacías. Solo respuestas claras y resoluciones reales.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            "Visibilidad real para tu cliente",
            "Una sola conversación, todos los canales",
            "Resolución en primera visita siempre que es posible",
          ].map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 text-foreground/85 border-t border-foreground/10 pt-4"
            >
              <span className="font-mono text-teal text-xs mt-1">→</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  </section>
);
