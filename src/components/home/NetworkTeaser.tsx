import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import networkImg from "@/assets/network.jpg";

export const NetworkTeaser = () => (
  <section className="py-24 md:py-32 bg-bone">
    <div className="container-tight grid gap-12 md:gap-16 lg:grid-cols-12 items-end">
      <Reveal className="lg:col-span-7">
        <p className="eyebrow mb-4">07 · WG Professional Network</p>
        <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
          Se trata de la gente.{" "}
          <span className="italic font-normal text-teal">Se trata de vosotros.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl">
          Un compromiso con nuestra red de servicios técnicos.
        </p>

        <div className="mt-10 space-y-3 text-ink-soft text-base md:text-lg leading-relaxed">
          <p>50 años entrando en las casas de la gente y resolviendo problemas reales.</p>
          <p className="text-muted-foreground">La red no son logos ni procesos: sois vosotros.</p>
          <ul className="pt-4 space-y-1.5 text-base text-ink">
            <li>— Los que madrugáis.</li>
            <li>— Los que conducís cientos de kilómetros.</li>
            <li>— Los que dais la cara cuando algo falla.</li>
            <li>— Los que resolvéis lo que nadie más sabe resolver.</li>
          </ul>
        </div>

        <p className="mt-10 font-display italic text-2xl text-ink">
          Grupo WG funciona gracias a vosotros.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/wg-network" className="btn-primary">
            Conocer la red
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link to="/wg-network/inscripcion" className="btn-teal">
            Únete a WG Professional Network
          </Link>
        </div>
      </Reveal>

      <Reveal delay={150} className="lg:col-span-5">
        <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-ink">
          <img
            src={networkImg}
            alt="Red profesional WG"
            width={1280}
            height={1600}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-8">
            <p className="text-bone/70 text-xs uppercase tracking-[0.2em] mb-2">Manifiesto</p>
            <p className="text-bone font-display text-2xl leading-tight text-balance">
              Donde otros terminan, nosotros empezamos.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
