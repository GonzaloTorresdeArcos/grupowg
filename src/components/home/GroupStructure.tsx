import { Reveal } from "@/components/site/Reveal";
import serseguro from "@/assets/logo-serseguro.png";
import hiperservice from "@/assets/logo-hiperservice.png";

const companies = [
  {
    name: "Serseguro",
    img: serseguro,
    text: "Gestión de garantías, asistencia, TPA y servicios para aseguradoras, retail y programas de protección.",
  },
  {
    name: "Hiperservice",
    img: hiperservice,
    text: "Operación técnica, red de SATs, gestión de incidencias, reparaciones y servicio postventa.",
  },
  {
    name: "Asure Componentes",
    img: null,
    text: "Venta, gestión y distribución de repuestos, componentes y soluciones técnicas.",
  },
];

export const GroupStructure = () => (
  <section className="py-24 md:py-32 bg-secondary">
    <div className="container-tight">
      <Reveal>
        <div className="max-w-3xl mb-16">
          <p className="eyebrow mb-4">05 · Estructura</p>
          <h2 className="heading-display text-ink text-4xl md:text-5xl text-balance">
            Un grupo. Tres especializaciones.{" "}
            <span className="text-teal font-normal">Una misma forma de responder.</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {companies.map((c, i) => (
          <Reveal key={c.name} delay={i * 80}>
            <article className="card-soft h-full p-8 md:p-10 flex flex-col">
              <div className="h-20 mb-8 flex items-center">
                {c.img ? (
                  <img src={c.img} alt={c.name} loading="lazy" className="max-h-16 object-contain" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-ink flex items-center justify-center">
                      <span className="text-bone font-display text-sm">A</span>
                    </div>
                    <span className="font-display text-2xl text-ink tracking-tight">Asure</span>
                    <span className="text-muted-foreground text-sm tracking-wide">componentes</span>
                  </div>
                )}
              </div>
              <h3 className="font-display text-2xl text-ink mb-4">{c.name}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{c.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
