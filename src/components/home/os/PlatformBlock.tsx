import { Reveal } from "@/components/site/Reveal";
import { Cog, Eye, Globe, Layers3, Database, Workflow } from "lucide-react";

const modules = [
  {
    code: "MOD/01",
    icon: Cog,
    name: "WG Execute",
    sub: "Operación completa",
    bullets: [
      "Atención y diagnóstico",
      "Asignación de red",
      "Gestión de intervenciones",
      "Coordinación logística",
      "Gestión de repuestos",
    ],
    tagline: "Externalización con control",
  },
  {
    code: "MOD/02",
    icon: Eye,
    name: "WG Control Tower",
    sub: "Capa de control transversal",
    bullets: [
      "Consolidación de datos",
      "KPIs (coste, TAT, FTF)",
      "Comparativa de proveedores",
      "Alertas y desviaciones",
    ],
    tagline: "Una única visión para decidir",
  },
  {
    code: "MOD/03",
    icon: Globe,
    name: "WG Scale",
    sub: "Diseño y despliegue",
    bullets: [
      "Definición del service lifecycle",
      "Selección y homologación de red",
      "Diseño operativo y logístico",
      "Despliegue multi-país",
    ],
    tagline: "Diseñar el servicio y hacerlo funcionar a escala",
  },
];

const capabilities = [
  "Capturamos información desde el primer contacto",
  "Integramos canales de atención con la red técnica",
  "Sincronizamos la operación de principio a fin",
  "Automatizamos decisiones donde aporta valor",
];

export const PlatformBlock = () => (
  <section className="py-28 md:py-36 bg-background">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">01 · Cómo funciona</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
          Una arquitectura modular.{" "}
          <span className="text-teal italic">Un único sistema.</span>
        </h2>
        <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Integramos los sistemas existentes para capturar información, tomar decisiones y coordinar
          la ejecución en tiempo real. La tecnología no es un fin: convierte el servicio en un
          sistema ejecutable y controlable.
        </p>
      </Reveal>

      {/* Stack visual: Capacidades → Módulos → Core */}
      <Reveal delay={150}>
        <div className="mt-16 rounded-3xl border border-foreground/10 bg-ink-elevated overflow-hidden">
          {/* CAPACIDADES (top — L3) */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                Capacidades
              </p>
              <p className="font-mono text-[10px] text-foreground/40">L3 · Lo que hace posible</p>
            </div>
            <div className="md:col-span-9 grid sm:grid-cols-2 gap-3">
              {capabilities.map((c) => (
                <div
                  key={c}
                  className="rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground/85 hover:border-teal/40 hover:text-foreground transition-colors flex items-start gap-3"
                >
                  <span className="text-teal font-mono text-xs pt-0.5">→</span>
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* MÓDULOS (middle — L2) */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                Módulos
              </p>
              <p className="font-mono text-[10px] text-foreground/40">L2 · Cómo se activa</p>
            </div>
            <div className="md:col-span-9 grid sm:grid-cols-3 gap-4">
              {modules.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.code}
                    className="rounded-xl border border-foreground/10 bg-background p-5 hover:border-teal/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-teal" />
                      </div>
                      <span className="font-mono text-[10px] text-foreground/40">{m.code}</span>
                    </div>
                    <p className="heading-tight text-foreground text-lg">{m.name}</p>
                    <p className="mt-1 text-xs text-teal/90 font-medium">{m.sub}</p>
                    <ul className="mt-4 space-y-1.5">
                      {m.bullets.map((b) => (
                        <li key={b} className="text-xs text-foreground/70 leading-relaxed">
                          · {b}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 pt-3 border-t border-foreground/10 text-[11px] italic text-foreground/80">
                      {m.tagline}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CORE (base — L1) */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 bg-gradient-to-br from-teal/5 to-transparent">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                Core
              </p>
              <p className="font-mono text-[10px] text-foreground/40">L1 · El motor</p>
            </div>
            <div className="md:col-span-9">
              <h3 className="heading-tight text-foreground text-2xl md:text-3xl">
                WG Service OS Core orquesta el service lifecycle end-to-end
              </h3>
              <ul className="mt-5 space-y-2 text-foreground/80">
                <li className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-teal font-mono">→</span>
                  Conecta front, operación, red técnica, logística y control
                </li>
                <li className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-teal font-mono">→</span>
                  Asegura trazabilidad completa de cada intervención
                </li>
                <li className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-teal font-mono">→</span>
                  Integra los sistemas existentes del cliente sin sustituirlos
                </li>
              </ul>
              <p className="mt-6 font-display italic text-teal text-lg">
                La única fuente de verdad del servicio.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Cierre cómo funciona */}
      <Reveal delay={300}>
        <div className="mt-12 grid md:grid-cols-3 gap-6 text-center md:text-left">
          {[
            { icon: Database, t: "Una única base", d: "Toda la información del servicio en un mismo lugar." },
            { icon: Workflow, t: "Un único sistema", d: "Operación, control e inteligencia conectadas." },
            { icon: Layers3, t: "Control total", d: "Visibilidad y decisión en cada etapa del lifecycle." },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.t} className="flex md:flex-col items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-teal/10 border border-teal/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-teal" />
                </div>
                <div>
                  <p className="font-display text-foreground text-lg">{p.t}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  </section>
);
