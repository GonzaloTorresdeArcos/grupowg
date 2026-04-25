import { Reveal } from "@/components/site/Reveal";
import { XCircle } from "lucide-react";

const problems = [
  { t: "Múltiples proveedores sin coordinación", d: "Operación fragmentada, responsabilidades difusas, escalados que se pierden." },
  { t: "Sistemas desconectados", d: "Datos en silos. Sin trazabilidad real entre incidencia, ejecución y cierre." },
  { t: "Decisiones sin criterio técnico", d: "Asignaciones por geografía o tarifa, no por capacidad real ni conocimiento de producto." },
  { t: "Falta de visibilidad", d: "El cliente final no sabe qué pasa con su caso. Tú tampoco." },
];

export const ProblemBlock = () => (
  <section className="py-28 md:py-36 bg-background border-t border-foreground/5">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">02 · El problema</p>
        <h2 className="heading-display text-4xl md:text-6xl text-foreground max-w-3xl text-balance">
          Hoy el servicio postventa{" "}
          <span className="italic text-teal">no funciona como un sistema</span>.
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 gap-px bg-foreground/10 rounded-2xl overflow-hidden border border-foreground/10">
        {problems.map((p, i) => (
          <Reveal key={p.t} delay={i * 80}>
            <div className="bg-background p-8 md:p-10 h-full">
              <XCircle className="h-5 w-5 text-foreground/30 mb-4" />
              <h3 className="heading-tight text-foreground text-xl md:text-2xl">{p.t}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed text-sm md:text-base">{p.d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={400}>
        <p className="mt-14 font-display text-2xl md:text-3xl text-foreground/85 max-w-3xl text-balance">
          Resultado:{" "}
          <span className="text-teal">más coste · más incidencias · peor experiencia.</span>
        </p>
      </Reveal>
    </div>
  </section>
);
