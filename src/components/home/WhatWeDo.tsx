import { Reveal } from "@/components/site/Reveal";

const chips = [
  "Gama blanca", "Gama marrón", "PAE", "Climatización",
  "Movilidad", "Electrónica de consumo", "Repuestos", "Seguros",
];

export const WhatWeDo = () => (
  <section className="py-24 md:py-32 bg-secondary">
    <div className="container-tight grid gap-16 md:grid-cols-12">
      <Reveal className="md:col-span-5">
        <p className="eyebrow mb-4">02 · Qué hacemos</p>
        <h2 className="heading-display text-ink text-4xl md:text-5xl text-balance">
          El servicio empieza cuando otros acaban.
        </h2>
      </Reveal>

      <Reveal delay={120} className="md:col-span-7 space-y-6 text-ink-soft text-lg leading-relaxed">
        <p>
          Grupo WG gestiona soluciones postventa, garantías, reparaciones, asistencia técnica,
          repuestos y servicios asegurados para grandes marcas.
        </p>
        <p>
          Trabajamos en garantía primaria, garantía extendida, asistencia técnica y gestión
          integral de incidencias en múltiples categorías.
        </p>

        <div className="pt-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-ink/15 bg-bone px-4 py-2 text-sm text-ink hover:border-teal hover:text-teal-deep transition-colors"
            >
              {c}
            </span>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
