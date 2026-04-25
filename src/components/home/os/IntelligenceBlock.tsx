import { Reveal } from "@/components/site/Reveal";
import { Cpu, Package2, Truck, Sparkles, Receipt } from "lucide-react";

const layers = [
  {
    icon: Cpu,
    code: "INT/01",
    t: "Technical Intelligence",
    d: "Diagnóstico asistido, validación técnica de intervenciones, reducción de errores y mejora del First Time Fix. Soporte experto en casos complejos.",
    closing: "Sustituimos estructura por inteligencia.",
  },
  {
    icon: Package2,
    code: "INT/02",
    t: "Product Intelligence",
    d: "Detección de fallos recurrentes, análisis por SKU y componente, identificación de averías endémicas e impacto en coste, TAT y calidad.",
    closing: "Convertimos el servicio en información de negocio.",
  },
  {
    icon: Receipt,
    code: "INT/03",
    t: "RMA & Recovery",
    d: "Gestión de RMA y recuperación de coste: control de umbrales de fallo por pieza o modelo, activación de procesos de abono con fabricante y trazabilidad completa.",
    closing: "El fallo deja de ser solo un coste. Es oportunidad de recuperación.",
  },
  {
    icon: Truck,
    code: "INT/04",
    t: "Supply Intelligence",
    d: "Planificación de repuestos basada en históricos, niveles óptimos de stock, optimización de pedidos a fabricantes y alineación entre demanda real y aprovisionamiento.",
    closing: "El repuesto deja de ser un cuello de botella.",
  },
  {
    icon: Sparkles,
    code: "INT/05",
    t: "Automation & Decision",
    d: "Decisiones automatizadas en base a datos, workflows inteligentes, orquestación end-to-end y closed-loop execution. Reglas y aprendizaje continuo.",
    closing: "No automatizamos tareas. Automatizamos resultados.",
  },
];

export const IntelligenceBlock = () => (
  <section className="py-28 md:py-36 bg-ink text-bone relative overflow-hidden border-y border-foreground/5">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--teal)/0.1),transparent_60%)]" />
    <div className="container-tight relative">
      <Reveal>
        <p className="eyebrow-mono mb-4 text-teal">10 · Capas de inteligencia</p>
        <h2 className="heading-display text-bone text-4xl md:text-6xl max-w-4xl text-balance">
          Lo que hace el sistema{" "}
          <span className="text-teal italic">diferencial</span>.
        </h2>
        <p className="mt-6 max-w-2xl text-bone/65 text-lg leading-relaxed">
          Sobre el Core y los módulos, WG Service OS incorpora capas de inteligencia que mejoran el
          rendimiento del servicio de forma continua.
        </p>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-px bg-bone/10 border border-bone/10 rounded-2xl overflow-hidden">
        {layers.map((l, i) => {
          const Icon = l.icon;
          return (
            <Reveal key={l.t} delay={i * 70}>
              <div className="bg-ink p-7 h-full flex flex-col hover:bg-bone/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-7">
                  <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-[10px] text-bone/40">{l.code}</span>
                </div>
                <h3 className="heading-tight text-bone text-lg">{l.t}</h3>
                <p className="mt-3 text-bone/60 text-sm leading-relaxed flex-1">{l.d}</p>
                <p className="mt-5 pt-4 border-t border-bone/10 text-teal text-xs italic leading-snug">
                  {l.closing}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={500}>
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl">
          <div className="md:col-span-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80 mb-2">
              Cierre de bloque
            </p>
          </div>
          <p className="md:col-span-2 font-display text-2xl md:text-3xl text-bone/90 text-balance leading-snug">
            Cada interacción genera información. Cada decisión mejora el sistema.{" "}
            <span className="text-teal">Cada mejora impacta en coste, calidad y tiempo.</span>
          </p>
        </div>
      </Reveal>
    </div>
  </section>
);
