import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Headphones,
  Wrench,
  Truck,
  Package,
  BarChart3,
  Network,
  Cpu,
  Receipt,
  Sparkles,
  CircleCheck,
  Activity,
  Database,
  Workflow,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { ServiceOSDiagram } from "@/components/home/os/ServiceOSDiagram";
import { LifecycleBlock } from "@/components/home/os/LifecycleBlock";
import { MetricsBlock } from "@/components/home/os/MetricsBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const integraciones = [
  { icon: Headphones, t: "Canales de atención", d: "Voz, email, WhatsApp, formularios y portales — unificados en un único punto de entrada." },
  { icon: Network, t: "Red técnica", d: "+400 SATs propios y partners certificados. Asignación con criterio técnico real." },
  { icon: Truck, t: "Logística", d: "Recogidas, entregas, talleres y movilidad coordinados como un único flujo." },
  { icon: Package, t: "Repuestos", d: "OEM, compatibilidad, stock y forecast alineados a la demanda real." },
  { icon: BarChart3, t: "Control y analítica", d: "TAT, FTF, coste por intervención y satisfacción medidos en tiempo real." },
  { icon: Database, t: "Sistemas de cliente", d: "Integración API-first con CRM, ERP, ticketing, garantías y BI existentes." },
];

const flujo = [
  { code: "01", icon: Activity, t: "Interacción", d: "Cada contacto se captura y estructura en el sistema, sea cual sea el canal." },
  { code: "02", icon: Cpu, t: "Decisión", d: "Diagnóstico asistido, validación técnica y reglas aplicadas con criterio." },
  { code: "03", icon: Workflow, t: "Ejecución", d: "Asignación, intervención, repuestos y logística orquestados sin handoffs ciegos." },
  { code: "04", icon: CircleCheck, t: "Control", d: "Cierre validado, KPIs medidos, aprendizaje incorporado al sistema." },
];

const capas = [
  { code: "INT/01", icon: Cpu, t: "Technical Intelligence", d: "Diagnóstico asistido y validación técnica. Mejora del First Time Fix." },
  { code: "INT/02", icon: Package, t: "Product Intelligence", d: "Detección de fallos recurrentes por SKU y componente. Datos para producto." },
  { code: "INT/03", icon: Receipt, t: "RMA & Recovery", d: "Activación de procesos de abono y recuperación de coste con fabricante." },
  { code: "INT/04", icon: Truck, t: "Supply Intelligence", d: "Stock óptimo basado en históricos. La pieza correcta en el momento correcto." },
  { code: "INT/05", icon: Sparkles, t: "Automation & Decision", d: "Workflows inteligentes y closed-loop execution. Resultados, no tareas." },
];

const ServiceOS = () => {
  useEffect(() => {
    document.title = "WG Service OS · El sistema operativo del servicio postventa";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "WG Service OS conecta atención, red técnica, logística, repuestos y control en una única plataforma. Ejecución, control y analítica end-to-end.",
    );
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Plataforma · WG Service OS"
        title={
          <>
            El sistema operativo del{" "}
            <span className="text-teal italic">servicio postventa</span>.
          </>
        }
        subtitle="Una única plataforma que integra operación, control e inteligencia. Ejecuta, mide y optimiza el servicio de principio a fin. Sin pérdida de información."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />

      {/* QUÉ ES */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-tight grid lg:grid-cols-12 gap-12 items-start">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow-mono mb-4">01 · Qué es</p>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl text-balance leading-[1.05]">
              Una capa que conecta{" "}
              <span className="text-teal italic">todo el servicio</span>.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              El servicio postventa no es una suma de partes. Es un sistema que debe funcionar de
              forma coordinada. WG Service OS integra operación, control e inteligencia en una
              única plataforma.
            </p>
            <ul className="mt-8 space-y-3 border-t border-foreground/10 pt-6">
              {["Una única base", "Un único sistema", "Control total"].map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-3 text-foreground font-display text-lg"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={150}>
            <ServiceOSDiagram />
          </Reveal>
        </div>
      </section>

      {/* QUÉ INTEGRA */}
      <section className="py-24 md:py-32 bg-ink-elevated border-y border-foreground/5">
        <div className="container-tight">
          <Reveal>
            <p className="eyebrow-mono mb-4">02 · Qué integra</p>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance">
              Todos los elementos del servicio,{" "}
              <span className="text-teal italic">en una sola plataforma</span>.
            </h2>
            <p className="mt-6 text-muted-foreground max-w-2xl text-lg leading-relaxed">
              Integramos los sistemas existentes para capturar información, tomar decisiones y
              coordinar la ejecución en tiempo real. La tecnología no es un fin: es lo que
              convierte el servicio en un sistema ejecutable y controlable.
            </p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10 rounded-2xl overflow-hidden">
            {integraciones.map((it, i) => {
              const Icon = it.icon;
              return (
                <Reveal key={it.t} delay={i * 70}>
                  <div className="bg-background p-7 h-full">
                    <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-6">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <h3 className="heading-tight text-foreground text-lg">{it.t}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CÓMO CONECTA EJECUCIÓN, CONTROL Y ANALÍTICA */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-tight">
          <Reveal>
            <p className="eyebrow-mono mb-4">03 · Cómo conecta</p>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance">
              Interacción → decisión → ejecución → control.
            </h2>
            <p className="mt-6 text-muted-foreground max-w-2xl text-lg leading-relaxed">
              El sistema convierte cada interacción en una decisión y cada decisión en ejecución.
              De principio a fin. Sin pérdida de información. Cada caso resuelto mejora el sistema.
            </p>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {flujo.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.t} delay={i * 100}>
                  <div className="card-os group h-full p-7 relative overflow-hidden">
                    <div className="flex items-start justify-between mb-7">
                      <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-teal" />
                      </div>
                      <span className="font-mono text-[11px] text-foreground/30">{f.code}</span>
                    </div>
                    <h3 className="heading-tight text-foreground text-xl">{f.t}</h3>
                    <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{f.d}</p>
                    <div className="absolute -bottom-px left-0 h-px w-0 bg-teal transition-all duration-700 group-hover:w-full" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* SERVICE LIFECYCLE — reutilizado */}
      <LifecycleBlock />

      {/* ARQUITECTURA: CORE + MÓDULOS */}
      <section className="py-24 md:py-32 bg-ink-elevated border-y border-foreground/5">
        <div className="container-tight">
          <Reveal>
            <p className="eyebrow-mono mb-4">05 · Arquitectura</p>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance">
              Core, módulos y capas de inteligencia.
            </h2>
          </Reveal>

          <div className="mt-14 rounded-3xl border border-foreground/10 bg-background overflow-hidden">
            {/* CORE */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  Core · L1
                </p>
              </div>
              <div className="md:col-span-9">
                <h3 className="heading-tight text-foreground text-2xl md:text-3xl">
                  WG Service OS Core
                </h3>
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  Orquesta el service lifecycle end-to-end. Conecta front, operación, red técnica,
                  logística y control. Asegura trazabilidad completa.{" "}
                  <span className="text-foreground">La única fuente de verdad del servicio.</span>
                </p>
              </div>
            </div>

            {/* MÓDULOS */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  Módulos · L2
                </p>
              </div>
              <div className="md:col-span-9 grid sm:grid-cols-3 gap-4">
                {[
                  { t: "WG Execute", d: "Operación completa." },
                  { t: "WG Control Tower", d: "Capa de control transversal." },
                  { t: "WG Scale", d: "Diseño y despliegue del modelo." },
                ].map((m) => (
                  <div
                    key={m.t}
                    className="rounded-xl border border-foreground/10 bg-ink-elevated p-5"
                  >
                    <p className="font-mono text-[10px] text-teal/80 uppercase tracking-[0.2em] mb-2">
                      Módulo
                    </p>
                    <p className="heading-tight text-foreground text-lg">{m.t}</p>
                    <p className="text-foreground/60 text-xs mt-1">{m.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CAPAS */}
            <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12">
              <div className="md:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                  Capas · L3
                </p>
              </div>
              <div className="md:col-span-9 grid sm:grid-cols-2 gap-3">
                {capas.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.t}
                      className="rounded-lg border border-foreground/10 px-4 py-3 flex items-start gap-3 hover:border-teal/40 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-teal mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground font-medium">{c.t}</p>
                        <p className="text-xs text-foreground/60 mt-0.5">{c.d}</p>
                      </div>
                      <span className="ml-auto font-mono text-[9px] text-foreground/30">
                        {c.code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANALÍTICA Y EXPERIENCIA */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-tight grid lg:grid-cols-12 gap-12">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow-mono mb-4">06 · Analítica</p>
            <h3 className="heading-display text-foreground text-3xl md:text-4xl text-balance leading-[1.1]">
              Cada interacción genera información.
            </h3>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              KPIs en vivo de coste, TAT, FTF y satisfacción. Comparativa real entre proveedores,
              alertas, desviaciones y dashboards diseñados para decidir, no para mirar.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Dashboard único, fuente de verdad",
                "KPIs alineados a negocio (coste, calidad, tiempo)",
                "Comparativa entre proveedores y SATs",
                "Auditoría continua y trazabilidad por intervención",
              ].map((b) => (
                <li key={b} className="flex gap-3 text-foreground/85 text-sm">
                  <span className="font-mono text-teal text-xs mt-1">→</span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={150}>
            <p className="eyebrow-mono mb-4">07 · Experiencia y gobierno</p>
            <h3 className="heading-display text-foreground text-3xl md:text-4xl text-balance leading-[1.1]">
              La experiencia es el resultado del sistema.
            </h3>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Coherencia en todo el journey, captura desde el primer contacto y medición basada en
              rendimiento real. Y por debajo, una capa de gobierno que asegura que el sistema no
              solo funciona: <span className="text-foreground">cumple</span>.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Homologación y validación de red técnica",
                "Control documental y cumplimiento contractual",
                "Gestión de riesgos operativos",
                "Una sola conversación, todos los canales",
              ].map((b) => (
                <li key={b} className="flex gap-3 text-foreground/85 text-sm">
                  <span className="font-mono text-teal text-xs mt-1">→</span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* MÉTRICAS — reutilizado */}
      <MetricsBlock />

      {/* CTA módulos */}
      <section className="py-20 md:py-28 bg-ink-elevated border-y border-foreground/5">
        <div className="container-tight text-center">
          <Reveal>
            <p className="eyebrow-mono mb-4">08 · Activar el sistema</p>
            <h3 className="heading-display text-foreground text-3xl md:text-5xl text-balance max-w-3xl mx-auto leading-[1.08]">
              Tres formas de poner el sistema a funcionar.
            </h3>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/soluciones" className="btn-teal">
                Ver soluciones
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/plataforma" className="btn-on-dark">
                Ver plataforma completa
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <ClosingBlock />
    </>
  );
};

export default ServiceOS;
