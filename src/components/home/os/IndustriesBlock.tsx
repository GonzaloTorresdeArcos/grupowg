import { Reveal } from "@/components/site/Reveal";
import { Factory, Shield, ShoppingBag, Bike, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const industries = [
  {
    icon: Factory,
    name: "Fabricantes",
    matters: "Costes de garantía, TAT, FTF, NPS técnico, control sobre red.",
    apply: "Service OS conecta tu producción con la realidad del campo. Datos de fallo en tiempo real.",
    achieve: "Reducción de coste de garantía y mejora medible de calidad.",
    clients: "Vestel · Cecotec · Sauber · Evvo",
  },
  {
    icon: Shield,
    name: "Aseguradoras",
    matters: "Siniestralidad, ratio combinado, satisfacción del asegurado, fraude.",
    apply: "Validación técnica antes del pago. Ejecución directa sin intermediarios.",
    achieve: "Menor coste por siniestro y mayor velocidad de resolución.",
    clients: "Compañías líderes en hogar y movilidad",
  },
  {
    icon: ShoppingBag,
    name: "Retail & ecommerce",
    matters: "Devoluciones, reparación in-warranty, experiencia post-compra.",
    apply: "Recogida, diagnóstico, reparación y reentrega como un único flujo.",
    achieve: "Menor coste de devolución y mayor recompra.",
    clients: "Grandes superficies y pure players",
  },
  {
    icon: Bike,
    name: "Movilidad",
    matters: "Disponibilidad de flota, mantenimiento preventivo, repuestos críticos.",
    apply: "Operación 24/7 con red certificada y stock optimizado.",
    achieve: "Aumento de disponibilidad y reducción de downtime.",
    clients: "Operadores de movilidad eléctrica y micromovilidad",
  },
];

export const IndustriesBlock = () => {
  const [active, setActive] = useState(0);
  const I = industries[active];
  const Icon = I.icon;
  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">11 · Industrias</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            El mismo sistema. Adaptado a{" "}
            <span className="text-teal italic">tu sector</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid lg:grid-cols-12 gap-8">
          {/* Tabs verticales */}
          <Reveal className="lg:col-span-4">
            <div className="flex flex-col border border-foreground/10 rounded-2xl overflow-hidden bg-ink-elevated">
              {industries.map((ind, i) => {
                const I2 = ind.icon;
                const isActive = i === active;
                return (
                  <button
                    key={ind.name}
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex items-center gap-4 px-6 py-5 text-left border-b border-foreground/10 last:border-b-0 transition-all group",
                      isActive ? "bg-teal/5" : "hover:bg-foreground/[0.02]",
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-teal/15 border-teal/40 text-teal"
                          : "border-foreground/15 text-foreground/60",
                      )}
                    >
                      <I2 className="h-4 w-4" />
                    </div>
                    <span
                      className={cn(
                        "flex-1 font-medium",
                        isActive ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {ind.name}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isActive ? "text-teal translate-x-0.5" : "text-foreground/30",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Detalle */}
          <Reveal key={active} className="lg:col-span-8" delay={50}>
            <div className="rounded-2xl border border-foreground/10 bg-card p-8 md:p-12 h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="heading-tight text-foreground text-3xl">{I.name}</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 mt-8">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Qué les importa
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.matters}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Cómo aplicamos
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.apply}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-3">
                    Qué conseguimos
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{I.achieve}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">
                  Clientes
                </p>
                <p className="text-foreground/80">{I.clients}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
