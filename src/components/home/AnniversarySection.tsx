import { Reveal } from "@/components/site/Reveal";
import logo50 from "@/assets/logo-50-dark.png";

export const AnniversarySection = () => (
  <section className="py-24 md:py-32 bg-ink text-bone overflow-hidden">
    <div className="container-tight grid gap-12 md:grid-cols-12 items-center">
      <Reveal className="md:col-span-5 flex justify-center md:justify-start">
        <div className="relative">
          <div className="absolute -inset-10 bg-teal/10 blur-3xl rounded-full" />
          <img
            src={logo50}
            alt="50 aniversario Grupo Warranty Global"
            loading="lazy"
            className="relative w-64 md:w-80 h-auto"
          />
        </div>
      </Reveal>

      <Reveal delay={120} className="md:col-span-7">
        <p className="eyebrow text-teal-soft mb-4">50 aniversario</p>
        <h2 className="heading-display text-bone text-4xl md:text-6xl text-balance">
          50 años resolviendo.
        </h2>
        <div className="mt-8 space-y-4 text-bone/70 leading-relaxed text-lg">
          <p>Este aniversario no es solo una cifra. Es una seña de identidad.</p>
          <p>
            50 años de oficio, relaciones duraderas, equipo estable, clientes que siguen confiando
            y decenas de miles de incidencias resueltas cada año.
          </p>
        </div>
        <p className="mt-10 font-display italic text-2xl md:text-3xl text-teal">
          La mejor forma de celebrar 50 años es seguir respondiendo.
        </p>
      </Reveal>
    </div>
  </section>
);
