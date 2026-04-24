import { Reveal } from "@/components/site/Reveal";
import { useState } from "react";
import { cn } from "@/lib/utils";

const groups = [
  { id: "retail", label: "Grandes superficies", brands: ["Carrefour", "Alcampo", "Eroski", "Makro"] },
  { id: "ecom", label: "Ecommerce / Marketplaces", brands: ["Metro-Market"] },
  { id: "fab", label: "Fabricantes", brands: ["Vestel", "Cecotec", "Evvo", "Sauber"] },
  { id: "dist", label: "Distribuidores", brands: ["Neumesse", "ElectroDepot", "PC Componentes", "Acadesa", "Jocel", "Telefac"] },
  { id: "mob", label: "Mobility", brands: ["Navee", "Nilox", "Denver", "Ducati", "Aprilia", "Jeep", "Lamborghini", "Red Bull"] },
  { id: "ins", label: "Compañías de seguros", brands: ["Assurant", "AIG", "Caser", "Plus Ultra", "Companjon", "Seyna"] },
];

export const Brands = () => {
  const [active, setActive] = useState(groups[0].id);
  const current = groups.find((g) => g.id === active)!;

  return (
    <section className="py-24 md:py-32 bg-bone border-t border-border">
      <div className="container-tight">
        <Reveal>
          <div className="max-w-3xl mb-12">
            <p className="eyebrow mb-4">04 · Confianza</p>
            <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
              Marcas a las que damos respuesta.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Grandes distribuidores, fabricantes, ecommerce, operadores de movilidad y compañías
              aseguradoras confían en Grupo WG para dar respuesta a sus clientes.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-wrap gap-2 mb-10 border-b border-border pb-6">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActive(g.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs md:text-sm font-medium transition-all",
                active === g.id
                  ? "bg-ink text-bone"
                  : "bg-transparent text-muted-foreground hover:text-ink"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden min-h-[280px]">
          {current.brands.map((b) => (
            <div
              key={b}
              className="bg-bone aspect-[5/2] flex items-center justify-center group transition-colors hover:bg-card"
            >
              <span className="font-display text-xl md:text-2xl text-muted-foreground/70 group-hover:text-ink transition-colors tracking-tight">
                {b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
