import { Reveal } from "@/components/site/Reveal";
import { GitBranch, BrainCircuit, Workflow } from "lucide-react";

const diff = [
  {
    icon: GitBranch,
    code: "01",
    t: "Control end-to-end",
    d: "Visión completa de cada incidencia: desde la entrada hasta el cierre, con datos en tiempo real y responsabilidad única.",
  },
  {
    icon: BrainCircuit,
    code: "02",
    t: "Conocimiento técnico",
    d: "Diagnóstico real, validación de causa, criterio de producto. Decisiones basadas en datos, no en suposiciones.",
  },
  {
    icon: Workflow,
    code: "03",
    t: "Ejecución integrada",
    d: "Operación, repuestos, logística y red de SATs orquestados como un único flujo. Sin fricción, sin handoffs ciegos.",
  },
];

export const DifferentialBlock = () => (
  <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">04 · Diferencial</p>
        <h2 className="heading-display text-foreground text-4xl md:text-5xl max-w-3xl text-balance">
          Control · conocimiento · ejecución.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Tres capas inseparables que sostienen cada operación.
        </p>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-3 gap-6">
        {diff.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.t} delay={i * 100}>
              <div className="card-os group h-full p-8 md:p-10 relative overflow-hidden">
                <div className="flex items-start justify-between mb-8">
                  <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-xs text-foreground/30">{c.code}</span>
                </div>
                <h3 className="heading-tight text-foreground text-2xl">{c.t}</h3>
                <p className="mt-4 text-muted-foreground leading-relaxed text-[15px]">{c.d}</p>
                <div className="absolute -bottom-px left-0 h-px w-0 bg-teal transition-all duration-700 group-hover:w-full" />
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);
