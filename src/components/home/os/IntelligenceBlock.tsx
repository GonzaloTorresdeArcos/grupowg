import { Reveal } from "@/components/site/Reveal";
import { Cpu, Package2, Truck, Sparkles, Receipt } from "lucide-react";

const layers = [
  {
    icon: Cpu,
    code: "INT/01",
    t: "Technical Intelligence",
    bullets: [
      "Diagnóstico asistido",
      "Validación técnica de intervenciones",
      "Reducción de errores de diagnóstico",
      "Mejora del First Time Fix",
      "Soporte experto en casos complejos",
    ],
    closing: "Sustituimos estructura por inteligencia. Sabemos cuándo algo está mal y cómo corregirlo.",
  },
  {
    icon: Package2,
    code: "INT/02",
    t: "Product Intelligence",
    bullets: [
      "Detección de fallos recurrentes",
      "Análisis por SKU y componente",
      "Identificación de averías endémicas",
      "Impacto en coste, TAT y calidad",
      "Generación de informes técnicos",
    ],
    closing: "Convertimos el servicio en información de negocio.",
  },
  {
    icon: Receipt,
    code: "INT/03",
    t: "RMA & Recovery",
    bullets: [
      "Componentes con fallo sistemático",
      "Control de umbrales de fallo (% por pieza o modelo)",
      "Activación de procesos de abono con fabricante",
      "Trazabilidad de incidencias asociadas",
    ],
    closing: "El fallo deja de ser solo un coste. Es oportunidad de recuperación y mejora.",
  },
  {
    icon: Truck,
    code: "INT/04",
    t: "Supply Intelligence",
    bullets: [
      "Planificación de repuestos basada en históricos",
      "Niveles óptimos de stock",
      "Optimización de pedidos a fabricantes",
      "Cobertura inicial de repuestos (% suministro)",
      "Alineación demanda real ↔ aprovisionamiento",
    ],
    closing: "El repuesto deja de ser un cuello de botella. Es palanca de eficiencia.",
  },
  {
    icon: Sparkles,
    code: "INT/05",
    t: "Automation & Decision",
    bullets: [
      "Decisiones automatizadas en base a datos",
      "Workflows inteligentes",
      "Orquestación end-to-end",
      "Reglas y aprendizaje continuo",
      "Closed-loop execution",
    ],
    closing: "No automatizamos tareas aisladas. Automatizamos resultados.",
  },
];

export const IntelligenceBlock = () => (
  <section className="py-28 md:py-36 bg-ink text-bone relative overflow-hidden border-y border-foreground/5">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--teal)/0.1),transparent_60%)]" />
    <div className="container-tight relative">
      <Reveal>
        <p className="eyebrow-mono mb-4 text-teal">02 · Capas de inteligencia</p>
        <h2 className="heading-display text-bone text-4xl md:text-6xl max-w-4xl text-balance leading-[1.05]">
          Lo que hace el sistema{" "}
          <span className="text-teal italic">diferencial</span>.
        </h2>
        <p className="mt-6 max-w-2xl text-bone/65 text-lg leading-relaxed">
          Sobre el Core y los módulos, WG Service OS incorpora capas de inteligencia que mejoran el
          rendimiento del servicio de forma continua.
        </p>
        <p className="mt-4 font-display text-bone/85 text-xl md:text-2xl italic max-w-2xl">
          No solo ejecutamos: entendemos, optimizamos y mejoramos el sistema.
        </p>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-bone/10 border border-bone/10 rounded-2xl overflow-hidden">
        {layers.map((l, i) => {
          const Icon = l.icon;
          return (
            <Reveal key={l.t} delay={i * 70}>
              <article className="bg-ink p-7 md:p-8 h-full flex flex-col hover:bg-bone/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-7">
                  <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-[10px] text-bone/40">{l.code}</span>
                </div>
                <h3 className="heading-tight text-bone text-xl">{l.t}</h3>
                <ul className="mt-5 space-y-2 flex-1">
                  {l.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-2.5 text-sm text-bone/70 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 pt-5 border-t border-bone/10 text-teal text-[13px] italic leading-snug">
                  {l.closing}
                </p>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={500}>
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl">
          <div className="md:col-span-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80 mb-2">
              Cierre
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
