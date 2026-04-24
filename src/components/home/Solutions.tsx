import { Reveal } from "@/components/site/Reveal";
import {
  Wrench, ShieldCheck, FileBadge, Network,
  PackageSearch, BarChart3, ArrowUpRight,
} from "lucide-react";

const items = [
  { icon: Wrench, t: "Servicio postventa integral", d: "Gestión completa de incidencias, reparaciones, seguimiento y cierre." },
  { icon: ShieldCheck, t: "Garantía primaria", d: "Atención técnica para marcas propias, fabricantes y distribuidores." },
  { icon: FileBadge, t: "Garantía extendida", d: "Soluciones operativas para aseguradoras y programas de protección." },
  { icon: Network, t: "Red técnica nacional", d: "SATs, delegaciones, instaladores y colaboradores técnicos." },
  { icon: PackageSearch, t: "Repuestos y componentes", d: "Centralización, suministro y trazabilidad de piezas." },
  { icon: BarChart3, t: "Reporting y control operativo", d: "KPIs, SLAs, trazabilidad, ageing e información para cliente." },
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
    </div>
  </section>
);
