import { Reveal } from "@/components/site/Reveal";
import { Cpu, Package2, Truck, Sparkles } from "lucide-react";

const layers = [
  { icon: Cpu, code: "INT/01", t: "Technical Intelligence", d: "Conocimiento real de producto, fallo y reparación. Criterio que escala." },
  { icon: Package2, code: "INT/02", t: "Product Intelligence", d: "Patrones por marca, familia y modelo. Detección temprana de incidencias sistémicas." },
  { icon: Truck, code: "INT/03", t: "Supply Intelligence", d: "Stock óptimo, OEM, compatibilidad. La pieza correcta en el momento correcto." },
  { icon: Sparkles, code: "INT/04", t: "Automation", d: "Decisiones repetibles automatizadas. El humano en lo que aporta valor." },
];

export const IntelligenceBlock = () => (
  <section className="py-28 md:py-36 bg-ink text-bone relative overflow-hidden border-y border-foreground/5">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--teal)/0.1),transparent_60%)]" />
    <div className="container-tight relative">
      <Reveal>
        <p className="eyebrow-mono mb-4 text-teal">10 · Capas de inteligencia</p>
        <h2 className="heading-display text-bone text-4xl md:text-6xl max-w-4xl text-balance">
          Inteligencia que hace el sistema{" "}
          <span className="text-teal italic">diferencial</span>.
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-bone/10 border border-bone/10 rounded-2xl overflow-hidden">
        {layers.map((l, i) => {
          const Icon = l.icon;
          return (
            <Reveal key={l.t} delay={i * 80}>
              <div className="bg-ink p-8 h-full hover:bg-bone/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-[10px] text-bone/40">{l.code}</span>
                </div>
                <h3 className="heading-tight text-bone text-xl">{l.t}</h3>
                <p className="mt-3 text-bone/60 text-sm leading-relaxed">{l.d}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={500}>
        <div className="mt-16 max-w-3xl">
          <p className="font-display text-2xl md:text-3xl text-bone/85 text-balance leading-snug">
            No solo ejecutamos.{" "}
            <span className="text-teal">Entendemos, optimizamos y mejoramos</span> el sistema.
          </p>
        </div>
      </Reveal>
    </div>
  </section>
);
