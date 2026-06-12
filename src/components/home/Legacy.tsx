import { Reveal } from "@/components/site/Reveal";
import legacyImg from "@/assets/legacy.webp";

export const Legacy = () => (
  <section className="relative py-32 md:py-44 bg-background text-foreground overflow-hidden">
    <img
      src={legacyImg}
      alt=""
      width={1600}
      height={1024}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover opacity-25"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />

    <div className="container-tight relative z-10">
      <Reveal>
        <div className="max-w-2xl">
          <p className="eyebrow text-teal-soft mb-6">06 · Cultura</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance">
            Una forma de hacer las cosas que no cambia.
          </h2>
          <div className="mt-10 space-y-6 text-lg text-foreground/70 leading-relaxed">
            <p>
              Grupo WG nace de una idea sencilla: cuando alguien necesita ayuda, se responde.
            </p>
            <p>
              Ese espíritu de servicio, transmitido desde el origen de la compañía, sigue marcando
              nuestra manera de trabajar.
            </p>
          </div>
          <p className="mt-12 font-display italic text-3xl md:text-4xl text-teal">
            Así nos enseñaron a hacerlo.
          </p>
        </div>
      </Reveal>
    </div>
  </section>
);
