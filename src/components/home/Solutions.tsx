import { Reveal } from "@/components/site/Reveal";
import {
  Wrench, ShieldCheck, FileBadge, Network,
  PackageSearch, BarChart3, ArrowUpRight,
  Gauge, Target, LineChart, Layers,
} from "lucide-react";

const items = [
  { icon: Wrench, t: "Servicio postventa integral", d: "Gestión completa de incidencias, reparaciones, seguimiento y cierre." },
  { icon: ShieldCheck, t: "Garantía primaria", d: "Atención técnica para marcas propias, fabricantes y distribuidores." },
  { icon: FileBadge, t: "Garantía extendida", d: "Soluciones operativas para aseguradoras y programas de protección." },
  { icon: Network, t: "Red técnica nacional", d: "SATs, delegaciones, instaladores y colaboradores técnicos." },
  { icon: PackageSearch, t: "Repuestos y componentes", d: "Centralización, suministro y trazabilidad de piezas." },
  {
    icon: BarChart3,
    t: "Reporting y control operativo",
    d: "Modelo de medición end-to-end con ownership por área: KPIs financieros y operativos, SLAs, trazabilidad, ageing y cuadros de mando para cliente.",
  },
];

const consultingPillars = [
  {
    icon: Gauge,
    t: "Control E2E coste · calidad · TAT",
    d: "Cada etapa del flujo —Front, asignación, SAT, repuestos, logística, cierre— con KPI propio, owner definido y SLA medido.",
  },
  {
    icon: Target,
    t: "Ownership por KPI y por área",
    d: "Cost per Call, Cost per Repair, First Time Fix, Technical Returns, TAT, disponibilidad de stock. Cada indicador con responsable.",
  },
  {
    icon: LineChart,
    t: "Conexión operación ↔ negocio",
    d: "Cost per Product Sold y % Service Cost vs Sales: traducimos la operación postventa a impacto económico para el cliente.",
  },
  {
    icon: Layers,
    t: "Consultoría postventa aplicada",
    d: "Diagnóstico, modelo de gobierno, cuadros de mando y planes de mejora continua sobre datos reales del servicio.",
  },
];

export const Solutions = () => (
  <section className="py-24 md:py-32 bg-bone">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-16 md:mb-20">
          <p className="eyebrow mb-4">03 · Soluciones</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            Resolver no es una parte del proceso.{" "}
            <span className="text-teal italic font-normal">Es el proceso.</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3 border border-border rounded-3xl overflow-hidden">
        {items.map((it, i) => (
          <Reveal key={it.t} delay={i * 60}>
            <article className="group h-full bg-bone p-8 md:p-10 transition-colors duration-500 hover:bg-card">
              <div className="flex items-start justify-between mb-10">
                <div className="h-12 w-12 rounded-xl bg-ink text-bone flex items-center justify-center transition-transform duration-500 group-hover:rotate-3">
                  <it.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <ArrowUpRight className="h-5 w-5 text-ink/30 transition-all duration-500 group-hover:text-teal group-hover:-translate-y-1 group-hover:translate-x-1" />
              </div>
              <h3 className="font-display text-2xl text-ink leading-snug mb-3">{it.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.d}</p>
            </article>
          </Reveal>
        ))}
      </div>

      {/* Fortaleza consultiva: control end-to-end */}
      <Reveal>
        <div className="mt-20 md:mt-28 rounded-3xl bg-ink text-bone overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-px bg-bone/10">
            <div className="bg-ink p-10 md:p-14">
              <p className="eyebrow text-teal mb-5">Fortaleza · Consultoría postventa</p>
              <h3 className="heading-display text-3xl md:text-5xl text-bone text-balance leading-[1.05]">
                No solo operamos el servicio.{" "}
                <span className="text-teal italic font-normal">Lo medimos, lo gobernamos y lo mejoramos.</span>
              </h3>
              <p className="mt-6 text-base md:text-lg text-bone/70 max-w-xl leading-relaxed">
                Implantamos un modelo de medición end-to-end que conecta cada etapa operativa con su impacto económico.
                Cada KPI tiene owner. Cada SLA está alineado a coste, calidad o TAT. Cada decisión, basada en dato real.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                {["Cost per Repair", "First Time Fix %", "TAT E2E", "Technical Returns", "% Service Cost vs Sales"].map((k) => (
                  <span key={k} className="text-xs md:text-sm font-mono text-bone/80 border border-bone/20 rounded-full px-3 py-1.5">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-ink/95 p-10 md:p-14 grid sm:grid-cols-2 gap-px bg-bone/10 sm:gap-0">
              {consultingPillars.map((p, i) => (
                <div
                  key={p.t}
                  className={`bg-ink/95 p-2 sm:p-6 ${i < 2 ? "sm:border-b" : ""} ${i % 2 === 0 ? "sm:border-r" : ""} sm:border-bone/10`}
                >
                  <div className="h-10 w-10 rounded-lg border border-teal/40 text-teal flex items-center justify-center mb-4">
                    <p.icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-display text-lg text-bone leading-snug mb-2">{p.t}</h4>
                  <p className="text-sm text-bone/65 leading-relaxed">{p.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-bone/10 px-10 md:px-14 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-bone/60 italic font-display">
              "El rendimiento del servicio no depende de un área aislada, sino de la coordinación del sistema completo."
            </p>
            <p className="text-xs font-mono uppercase tracking-widest text-teal">
              Modelo Ownership E2E · Grupo WG
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
