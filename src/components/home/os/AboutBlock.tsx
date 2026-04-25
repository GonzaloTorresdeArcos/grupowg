import { Reveal } from "@/components/site/Reveal";

export const AboutBlock = () => (
  <section className="py-24 md:py-32 bg-background">
    <div className="container-tight">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow-mono mb-4">13 · Sobre nosotros</p>
        </Reveal>

        <Reveal className="lg:col-span-8" delay={100}>
          <h2 className="heading-display text-foreground text-3xl md:text-5xl text-balance leading-[1.08]">
            No somos solo operadores.
            <br />
            No somos consultores tradicionales.
            <br />
            <span className="text-teal italic">
              Somos la combinación de ejecución, control y conocimiento técnico.
            </span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-2xl">
            Operamos cuando hace falta. Controlamos cuando es crítico. Y aportamos criterio en todo
            momento.
          </p>
          <div className="mt-10 grid sm:grid-cols-3 gap-6 border-t border-foreground/10 pt-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-2">
                Ejecución
              </p>
              <p className="text-foreground/80 text-sm leading-relaxed">
                50 años entrando en operaciones reales.
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-2">
                Control
              </p>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Datos, sistema, trazabilidad extremo a extremo.
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-2">
                Criterio
              </p>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Conocimiento técnico real, no playbooks genéricos.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
