import { ShoppingCart, Factory, ShieldCheck, Bike, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const STATS = [
  { n: "100k+", l: "Intervenciones al año" },
  { n: "90+", l: "Marcas" },
  { n: "500+", l: "Servicios Técnicos e Instaladores" },
  { n: "75+", l: "Profesionales + hotline técnica + formación" },
  { n: "6.200+", l: "m² de infraestructura a tu servicio" },
  { n: "35+", l: "años junto a nuestros principales clientes" },
];

const ESTADOS = [
  {
    label: "Disponible hoy",
    sub: "Acceso a repuesto, documentación técnica y condiciones exclusivas para la red WG.",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400",
    gamas: [
      { g: "Blanca", brands: ["Vestel", "New Pol", "Daewoo", "Icecool", "Telefunken", "Sauber", "Sharp", "Evvo", "Tegran", "Vanguard", "Konen", "Confortec", "Sunfeel", "Selecline", "Vox", "Bru"] },
      { g: "Aire acondicionado", brands: ["Johnson"] },
      { g: "Marrón", brands: ["Toshiba", "JVC", "Electronia", "Hitachi", "Telefunken"] },
    ],
  },
  {
    label: "Próximamente",
    sub: "Más marcas, más producto y nuevas ventajas.",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
    gamas: [
      { g: "Blanca", brands: ["Carrefour Home", "Bluesky", "Qilive", "Cecotec", "Kromsline", "Valberg", "Jocel", "Solthermic", "Telefac"] },
      { g: "Aire acondicionado", brands: ["Klindo", "Climatric", "Cecotec", "Sauber", "Origial"] },
      { g: "Profesional", brands: ["Horeca Select", "Makro Professional", "Metro Professional", "Mainho", "Bartscher", "Retinna", "Efficol", "Crea"] },
      { g: "Pequeño aparato", brands: ["Carrefour Home", "Klindo", "Simpl", "Bluesky", "Jocel", "Mandine"] },
      { g: "Marrón", brands: ["Cecotec", "Thomson", "Onwa", "Origial", "Metz"] },
      { g: "Movilidad", brands: ["Cecotec", "Navee", "Red Bull", "Reebok", "Alfa Romeo", "Nilox"] },
    ],
  },
];

type Eco = { title: string; Icon: LucideIcon; accent: "sky" | "emerald" | "amber" | "violet"; brands: string[] };

const ECOSISTEMAS: Eco[] = [
  { title: "Retail & Marketplaces", Icon: ShoppingCart, accent: "sky", brands: ["Carrefour", "Alcampo / Auchan", "Makro / Metro", "PcComponentes", "Neumese", "Electro Depot"] },
  { title: "Fabricantes", Icon: Factory, accent: "emerald", brands: ["Vestel", "Cecotec", "Thomson", "Sauber", "Evvo", "Melchioni"] },
  { title: "Warranty & Insurance", Icon: ShieldCheck, accent: "amber", brands: ["Assurant", "Caser", "Companjon", "Plus Ultra", "Seyna"] },
  { title: "Mobility", Icon: Bike, accent: "violet", brands: ["Navee", "Esprinet", "Denver", "MT Distribution", "Nilox"] },
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
          <p className="eyebrow mb-4">Experiencia y capacidad</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            La fuerza de una gran red
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Más clientes, más marcas, más oportunidades.
          </p>
        </div>
      </Reveal>

      {/* Stats */}
      <Reveal>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-6 border-y border-border py-10">
          {STATS.map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <p className="font-display text-4xl md:text-5xl text-teal">{s.n}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{s.l}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Marcas: estado */}
      <Reveal>
        <p className="eyebrow mt-16 mb-6">Marcas asociadas</p>
      </Reveal>
      <div className="space-y-6">
        {ESTADOS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className={`h-1 ${s.bar}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                  <h3 className="font-display text-xl text-ink">{s.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{s.sub}</p>
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  {s.gamas.map((gama) => (
                    <div key={gama.g}>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{gama.g}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {gama.brands.map((b) => (
                          <span key={b} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">{b}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Ecosistemas (canales) */}
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
                <div className="flex flex-wrap gap-1.5">
                  {e.brands.map((b) => (
                    <span key={b} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
