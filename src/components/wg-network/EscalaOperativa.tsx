import { MapPin, Check, ShoppingCart, Factory, ShieldCheck, Bike, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const STATS = [
  { n: "75+", l: "Profesionales especializados" },
  { n: "350+", l: "SATs gestionados en Iberia" },
  { n: "100k+", l: "Intervenciones / año" },
  { n: "6.200+", l: "m² de instalaciones propias" },
  { n: "35+", l: "Años de experiencia sectorial" },
];

const COBERTURA = ["Madrid (HQ)", "Barcelona", "Valencia", "Islas Canarias"];

type Eco = { title: string; Icon: LucideIcon; accent: "sky" | "emerald" | "amber" | "violet"; brands: string[]; caps: string[] };

const ECOSISTEMAS: Eco[] = [
  {
    title: "Retail & Marketplaces", Icon: ShoppingCart, accent: "sky",
    brands: ["Carrefour", "Alcampo / Auchan", "Makro / Metro", "PcComponentes", "Neumese", "Electro Depot"],
    caps: ["Customer Care", "Instalación", "Reparación", "Parts & Logistics", "Replacement", "Refurbished"],
  },
  {
    title: "Fabricantes & OEMs", Icon: Factory, accent: "emerald",
    brands: ["Vestel", "Cecotec", "Thomson", "Sauber", "Evvo", "Melchioni"],
    caps: ["Customer Care", "Instalación", "Reparación", "Parts & Logistics", "Quality Intelligence", "Out-of-Warranty"],
  },
  {
    title: "Warranty & Insurance", Icon: ShieldCheck, accent: "amber",
    brands: ["Assurant", "Plus Ultra", "Seyna", "Companjon"],
    caps: ["Claims Management", "TPA & Claims Administration", "Coordinación multi-stakeholder", "Repair / Replacement Decisioning", "Programas de garantía y protección", "Service Governance & SLA Control"],
  },
  {
    title: "Mobility & New Categories", Icon: Bike, accent: "violet",
    brands: ["Navee", "Esprinet", "Denver", "MT Distribution"],
    caps: ["Patinetes", "Bicicletas eléctricas", "Battery management", "Reparación", "Parts & Logistics", "Quality Intelligence"],
  },
];

const ACCENT: Record<Eco["accent"], { bar: string; icon: string }> = {
  sky: { bar: "bg-sky-400", icon: "text-sky-500" },
  emerald: { bar: "bg-emerald-400", icon: "text-emerald-500" },
  amber: { bar: "bg-amber-400", icon: "text-amber-500" },
  violet: { bar: "bg-violet-400", icon: "text-violet-500" },
};

export const EscalaOperativa = () => (
  <section className="py-24 md:py-32 bg-card">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-12">
          <p className="eyebrow mb-4">Escala operativa y capacidad de ejecución</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            No empiezas de cero. Te unes a una operación probada.
          </h2>
        </div>
      </Reveal>

      {/* Stats */}
      <Reveal>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4 border-y border-border py-10">
          {STATS.map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <p className="font-display text-4xl md:text-5xl text-teal">{s.n}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{s.l}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Cobertura propia */}
      <Reveal>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-ink flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-teal" /> Cobertura propia:
          </span>
          {COBERTURA.map((c) => (
            <span key={c} className="rounded-full bg-ink text-background text-xs px-3 py-1">{c}</span>
          ))}
        </div>
      </Reveal>

      {/* Ecosistemas */}
      <Reveal>
        <p className="eyebrow mt-16 mb-6">Ecosistemas en los que operamos</p>
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {ECOSISTEMAS.map((e, i) => (
          <Reveal key={e.title} delay={i * 80}>
            <div className="rounded-2xl border border-border bg-background overflow-hidden h-full">
              <div className={`h-1 ${ACCENT[e.accent].bar}`} />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <e.Icon className={`h-5 w-5 ${ACCENT[e.accent].icon}`} strokeWidth={1.75} />
                  <h3 className="font-display text-xl text-ink">{e.title}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {e.brands.map((b) => (
                    <span key={b} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">{b}</span>
                  ))}
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {e.caps.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-teal shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
