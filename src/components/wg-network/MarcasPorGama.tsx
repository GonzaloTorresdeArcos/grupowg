import { useState } from "react";
import { Reveal } from "@/components/site/Reveal";
import { ChevronDown } from "lucide-react";

type Gama = { g: string; disponible: string[]; proximamente: string[] };

const GAMAS: Gama[] = [
  {
    g: "Blanca",
    disponible: ["Vestel", "New Pol", "Daewoo", "Icecool", "Telefunken", "Sauber", "Sharp", "Evvo", "Tegran", "Vanguard", "Konen", "Confortec", "Sunfeel", "Selecline", "Vox", "Bru"],
    proximamente: ["Carrefour Home", "Bluesky", "Qilive", "Cecotec", "Kromsline", "Valberg", "Jocel", "Solthermic", "Telefac"],
  },
  {
    g: "Marrón",
    disponible: ["Toshiba", "JVC", "Electronia", "Hitachi", "Telefunken"],
    proximamente: ["Cecotec", "Thomson", "Onwa", "Origial", "Metz"],
  },
  {
    g: "Aire acondicionado",
    disponible: ["Johnson"],
    proximamente: ["Klindo", "Climatric", "Cecotec", "Sauber", "Origial"],
  },
  {
    g: "Profesional",
    disponible: [],
    proximamente: ["Horeca Select", "Makro Professional", "Metro Professional", "Mainho", "Bartscher", "Retinna", "Efficol", "Crea"],
  },
  {
    g: "Pequeño aparato",
    disponible: [],
    proximamente: ["Carrefour Home", "Klindo", "Simpl", "Bluesky", "Jocel", "Mandine"],
  },
  {
    g: "Movilidad",
    disponible: [],
    proximamente: ["Cecotec", "Navee", "Red Bull", "Reebok", "Alfa Romeo", "Nilox"],
  },
];

const GamaCard = ({ gama }: { gama: Gama }) => {
  const [open, setOpen] = useState(false);
  const total = gama.disponible.length + gama.proximamente.length;
  const active = gama.disponible.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-card transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="font-display text-xl text-ink">{gama.g}</span>
          <span className="text-sm text-muted-foreground">· {total} marcas</span>
          <span className={`text-xs font-medium ${active ? "text-emerald-600" : "text-amber-600"}`}>
            {active ? "repuesto activo" : "próximamente"}
          </span>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 md:px-6 pb-6 pt-1 space-y-5">
          {gama.disponible.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-mono uppercase tracking-wider text-emerald-700">Disponible hoy</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gama.disponible.map((b) => (
                  <span key={b} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink">{b}</span>
                ))}
              </div>
            </div>
          )}
          {gama.proximamente.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <p className="text-xs font-mono uppercase tracking-wider text-amber-700">Próximamente</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gama.proximamente.map((b) => (
                  <span key={b} className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MarcasPorGama = () => (
  <section className="py-24 md:py-32 bg-card">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-10">
          <p className="eyebrow mb-4">Marcas gestionadas</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            Hasta un 70% de descuento en repuesto OEM.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Cuanto mejor resuelvas el trabajo que te asigna WG, mayor descuento OEM en el repuesto de tus reparaciones fuera de garantía.
          </p>
        </div>
      </Reveal>
      <div className="space-y-3">
        {GAMAS.map((g, i) => (
          <Reveal key={g.g} delay={i * 60}>
            <GamaCard gama={g} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
