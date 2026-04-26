import { Reveal } from "@/components/site/Reveal";
import logo50 from "@/assets/logo-50-dark.png";

export const AnniversarySection = () => (
  <section className="py-20 md:py-28 lg:py-32 bg-ink text-bone overflow-hidden">
    <div className="container-tight grid gap-12 md:gap-10 lg:gap-16 md:grid-cols-12 items-center">
      <Reveal className="md:col-span-5 flex justify-center md:justify-start">
        <div className="relative inline-block">
          <div className="absolute -inset-10 bg-teal/10 blur-3xl rounded-full" aria-hidden="true" />
          <img
            src={logo50}
            alt="50 aniversario Grupo Warranty Global"
            loading="lazy"
            className="relative w-56 sm:w-64 md:w-72 lg:w-80 h-auto"
          />
        </div>
      </Reveal>

      <Reveal delay={120} className="md:col-span-7">
        <p className="eyebrow text-teal-soft mb-3 md:mb-4 leading-none">50 aniversario</p>
        <h2 className="heading-display text-bone text-4xl md:text-5xl lg:text-6xl text-balance leading-[1.05] md:leading-[1.02]">
          50 años resolviendo.
        </h2>
        <div className="mt-6 md:mt-8 space-y-4 text-bone/70 text-base md:text-lg leading-[1.65] md:leading-[1.6] max-w-xl">
          <p>Este aniversario no es solo una cifra. Es una seña de identidad.</p>
          <p>
            50 años de oficio, relaciones duraderas, equipo estable, clientes que siguen confiando
            y decenas de miles de incidencias resueltas cada año.
          </p>
        </div>
        <p className="mt-8 md:mt-10 font-display italic text-2xl md:text-3xl text-teal text-balance leading-[1.2] md:leading-[1.15] max-w-xl">
          La mejor forma de celebrar 50 años es seguir respondiendo.
        </p>
      </Reveal>
    </div>
  </section>
);
