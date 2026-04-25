import { Reveal } from "@/components/site/Reveal";

const metrics = [
  { v: "+150K", l: "Incidencias gestionadas / año", c: "Operación" },
  { v: "+400", l: "Servicios técnicos en red", c: "Cobertura" },
  { v: "50 años", l: "De experiencia operativa", c: "Trayectoria" },
  { v: "4 hubs", l: "Madrid · Barcelona · Valencia · Canarias", c: "Presencia" },
  { v: "Multi-país", l: "Operación internacional", c: "Escala" },
  { v: "+25 años", l: "De relación con clientes clave", c: "Confianza" },
];

export const MetricsBlock = () => (
  <section className="py-24 md:py-32 bg-ink text-bone border-y border-foreground/5">
    <div className="container-tight">
      <Reveal>
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <div>
            
            <h2 className="heading-display text-bone text-3xl md:text-5xl text-balance max-w-2xl">
              Esto es lo que hacemos cada día.
            </h2>
            <p className="mt-4 text-bone/60 max-w-xl text-base leading-relaxed">
              Modelo aplicado en algunos de los principales retailers, fabricantes y aseguradoras
              de España y Europa.
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone/40">
            wg-os :: metrics.live
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-3 border-t border-l border-bone/10">
        {metrics.map((m, i) => (
          <Reveal key={m.l} delay={i * 60}>
            <div className="border-r border-b border-bone/10 p-8 md:p-10 h-full hover:bg-bone/[0.02] transition-colors group relative overflow-hidden">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80 mb-6">
                {m.c}
              </p>
              <p className="font-display text-bone text-4xl md:text-5xl lg:text-6xl tracking-tight">
                {m.v}
              </p>
              <p className="mt-3 text-bone/60 text-sm">{m.l}</p>
              <div className="absolute top-0 right-0 h-px w-0 bg-teal transition-all duration-700 group-hover:w-full" />
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
