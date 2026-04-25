import { Reveal } from "@/components/site/Reveal";
import { ArrowRight } from "lucide-react";

const stages = [
  { code: "01", t: "Entrada", d: "Captura unificada por todos los canales." },
  { code: "02", t: "Diagnóstico", d: "Validación técnica, no triage administrativo." },
  { code: "03", t: "Asignación", d: "Al recurso correcto: capacidad, marca, geografía." },
  { code: "04", t: "Ejecución", d: "Operación coordinada en tiempo real." },
  { code: "05", t: "Repuestos", d: "Stock inteligente, OEM, compatibilidad validada." },
  { code: "06", t: "Logística", d: "Entrega, recogida, devolución sincronizadas." },
  { code: "07", t: "Control", d: "Trazabilidad y métricas extremo a extremo." },
  { code: "08", t: "Cierre", d: "Resolución verificada, datos al sistema." },
];

export const LifecycleBlock = () => (
  <section className="py-28 md:py-36 bg-background relative overflow-hidden">
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20 pointer-events-none" />
    <div className="container-wide relative">
      <Reveal>
        <p className="eyebrow-mono mb-4">07 · Service Lifecycle</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-4xl text-balance">
          Un flujo único,{" "}
          <span className="text-teal italic">de principio a fin</span>.
        </h2>
        <p className="mt-6 text-muted-foreground max-w-xl">
          No son procesos independientes. Es un sistema conectado donde cada paso alimenta al
          siguiente.
        </p>
      </Reveal>

      {/* Flow horizontal — desktop scroll, mobile vertical */}
      <Reveal delay={150}>
        <div className="mt-16 -mx-6 md:mx-0">
          <div className="flex md:grid md:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto md:overflow-visible px-6 md:px-0 pb-4 snap-x snap-mandatory">
            {stages.map((s, i) => (
              <div
                key={s.code}
                className="snap-start min-w-[240px] md:min-w-0 relative group"
              >
                <div className="card-os h-full p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[11px] text-teal">{s.code}</span>
                    {i < stages.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-foreground/20 hidden md:block" />
                    )}
                  </div>
                  <p className="heading-tight text-foreground text-lg">{s.t}</p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.d}</p>

                  {/* Pulso flow */}
                  <div className="absolute top-1/2 -right-1.5 h-1.5 w-1.5 rounded-full bg-teal hidden md:block opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={300}>
        <p className="mt-12 max-w-2xl font-display text-xl md:text-2xl text-foreground/80 text-balance">
          No son procesos independientes.{" "}
          <span className="text-teal">Es un sistema conectado.</span>
        </p>
      </Reveal>
    </div>
  </section>
);
