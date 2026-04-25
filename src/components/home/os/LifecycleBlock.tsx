import { Reveal } from "@/components/site/Reveal";
import { ArrowRight, Target, Activity, Gauge, Link2 } from "lucide-react";

const stages = [
  { code: "01", t: "Entrada de demanda", d: "Captura unificada por todos los canales." },
  { code: "02", t: "Diagnóstico y decisión", d: "Validación técnica, no triage administrativo." },
  { code: "03", t: "Asignación de red", d: "Al recurso correcto: capacidad, marca, geografía." },
  { code: "04", t: "Ejecución del servicio", d: "Operación coordinada en tiempo real." },
  { code: "05", t: "Gestión de repuestos", d: "Stock inteligente, OEM, compatibilidad validada." },
  { code: "06", t: "Coordinación logística", d: "Entrega, recogida, devolución sincronizadas." },
  { code: "07", t: "Soporte e inteligencia", d: "Conocimiento técnico aplicado a cada caso." },
  { code: "08", t: "Cierre y validación", d: "Resolución verificada con el cliente final." },
  { code: "09", t: "Control y analítica", d: "Trazabilidad y métricas extremo a extremo." },
];

const layerKpis = [
  { icon: Target, t: "Ownership claro", d: "Un responsable definido por capa del servicio." },
  { icon: Gauge, t: "KPIs de negocio", d: "Métricas alineadas a coste, calidad y tiempo." },
  { icon: Activity, t: "Control real", d: "Detección temprana de desviaciones y mejora continua." },
  { icon: Link2, t: "Operación → resultado", d: "Conexión directa entre ejecución y outcome." },
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
        <p className="mt-6 text-muted-foreground max-w-2xl text-lg leading-relaxed">
          Desde el primer contacto hasta el cierre, cada fase del servicio está diseñada,
          conectada y medida. No son procesos independientes: es un sistema que funciona de
          forma integrada.
        </p>
      </Reveal>

      {/* Flow — 9 etapas */}
      <Reveal delay={150}>
        <div className="mt-16 -mx-6 md:mx-0">
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3 overflow-x-auto md:overflow-visible px-6 md:px-0 pb-4 snap-x snap-mandatory">
            {stages.map((s, i) => (
              <div
                key={s.code}
                className="snap-start min-w-[240px] md:min-w-0 relative group"
              >
                <div className="card-os h-full p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[11px] text-teal">{s.code}</span>
                    {i < stages.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-foreground/20 hidden xl:block" />
                    )}
                  </div>
                  <p className="heading-tight text-foreground text-base lg:text-lg">{s.t}</p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.d}</p>

                  <div className="absolute top-1/2 -right-1.5 h-1.5 w-1.5 rounded-full bg-teal hidden xl:block opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Cómo funciona */}
      <Reveal delay={250}>
        <div className="mt-24 border-t border-foreground/10 pt-16">
          <p className="eyebrow-mono mb-4">08 · Cómo funciona</p>
          <h3 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance">
            Cada capa del servicio,{" "}
            <span className="text-teal italic">bajo control</span>.
          </h3>

          {/* Dos columnas: estructura y consecuencia */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <Reveal>
              <div className="card-os h-full p-8">
                <p className="eyebrow-mono mb-5 text-foreground/60">Cada capa tiene</p>
                <ul className="space-y-3">
                  {[
                    "Un responsable claro.",
                    "Unos KPIs definidos.",
                    "Un impacto directo en coste, calidad y tiempo.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-foreground/85">
                      <span className="text-teal mt-1.5 leading-none">·</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="card-os h-full p-8">
                <p className="eyebrow-mono mb-5 text-foreground/60">Esto permite</p>
                <ul className="space-y-3">
                  {[
                    "Tomar decisiones con criterio.",
                    "Detectar desviaciones rápidamente.",
                    "Mejorar el rendimiento de forma continua.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-foreground/85">
                      <span className="text-teal mt-1.5 leading-none">·</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* Síntesis: 4 pilares como prueba del diseño sistémico */}
          <div className="mt-20">
            <Reveal>
              <h4 className="heading-display text-foreground text-2xl md:text-4xl max-w-3xl text-balance">
                Diseñado para funcionar como un sistema,{" "}
                <span className="text-teal italic">no como áreas aisladas</span>.
              </h4>
            </Reveal>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {layerKpis.map((k, i) => {
                const Icon = k.icon;
                return (
                  <Reveal key={k.t} delay={i * 80}>
                    <div className="card-os h-full p-6">
                      <Icon className="h-5 w-5 text-teal mb-4" />
                      <p className="heading-tight text-foreground text-lg">{k.t}</p>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{k.d}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>

    </div>
  </section>
);
