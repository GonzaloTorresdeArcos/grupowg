import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, Shield, Wallet, Stethoscope, BookOpen, PiggyBank, HardHat, FileCheck2, FolderCheck, Package, Wrench, Briefcase, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import logo50 from "@/assets/logo-50-light.png";
import networkImg from "@/assets/network.jpg";
import { useEffect } from "react";

const layers = [
  { n: "01", t: "Aliviar presión", d: "Repuestos a coste mayorista y procesos ágiles, menos fricción operativa." },
  { n: "02", t: "Hacer crecer", d: "Equipos nuevos a precio competitivo, garantías extendidas y nuevas gamas y líneas de ingresos." },
  { n: "03", t: "Proteger", d: "Seguros colectivos, salud, vida, protección jurídica, protección de ingresos, ahorro, PRL, compliance y documentación." },
];

const benefits = [
  { icon: Shield, t: "Seguros colectivos", d: "Condiciones preferentes para profesionales y equipos." },
  { icon: Briefcase, t: "Protección jurídica", d: "Asesoramiento legal ante incidencias, reclamaciones y conflictos." },
  { icon: Wallet, t: "Protección de ingresos", d: "Tranquilidad financiera ante baja, accidente o interrupción de actividad." },
  { icon: Stethoscope, t: "Salud", d: "Coberturas médicas para profesionales y familias." },
  { icon: Heart, t: "Vida", d: "Protección familiar y seguridad económica." },
  { icon: PiggyBank, t: "Planes de ahorro", d: "Soluciones de ahorro y previsión." },
  { icon: HardHat, t: "PRL", d: "Prevención de riesgos y cumplimiento en seguridad laboral." },
  { icon: FileCheck2, t: "Compliance asistido", d: "Alta documental, validación y seguimiento normativo." },
  { icon: FolderCheck, t: "Documentación", d: "Todo en regla, actualizado y trazable." },
  { icon: Package, t: "Producto nuevo", d: "Acceso a producto nuevo en condiciones ventajosas." },
  { icon: Wrench, t: "Repuestos a coste", d: "Material sin margen para mejorar competitividad y caja." },
  { icon: BookOpen, t: "Oportunidades comerciales", d: "Activaciones con fabricantes, distribuidores y programas de garantía extendida." },
];

const WGNetwork = () => {
  useEffect(() => {
    document.title = "WG Professional Network · Grupo Warranty Global";
  }, []);

  return (
    <>
      {/* HERO manifiesto */}
      <section className="relative min-h-[90svh] flex items-center bg-ink text-bone overflow-hidden pt-32">
        <img src={networkImg} alt="" width={1600} height={1024} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/60 to-ink" />
        <div className="container-tight relative z-10 py-20">
          <Reveal>
            <p className="eyebrow text-teal-soft mb-6">WG Professional Network</p>
            <h1 className="heading-display text-bone text-[clamp(2.5rem,8vw,7.5rem)] max-w-5xl">
              Se trata de la gente.
              <br />
              <span className="italic font-normal text-teal">Se trata de vosotros.</span>
            </h1>
            <p className="mt-10 max-w-2xl text-lg md:text-xl text-bone/70 leading-relaxed">
              Un compromiso con nuestra red de servicios técnicos. 50 años entrando en las casas
              de la gente y resolviendo problemas reales. La red no son logos ni procesos: sois
              vosotros.
            </p>
            <ul className="mt-10 space-y-2 text-lg text-bone">
              <li>— Los que madrugáis.</li>
              <li>— Los que conducís cientos de kilómetros.</li>
              <li>— Los que dais la cara cuando algo falla.</li>
              <li>— Los que resolvéis lo que nadie más sabe resolver.</li>
            </ul>
            <p className="mt-10 font-display italic text-3xl text-teal">
              Grupo WG funciona gracias a vosotros.
            </p>
            <Link to="/wg-network/inscripcion" className="mt-12 inline-flex items-center gap-2 rounded-full bg-teal px-8 py-4 text-base font-medium text-ink transition-all hover:gap-3 hover:bg-teal-soft">
              Únete a WG Professional Network
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 3 capas */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow mb-4">El plan</p>
              <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
                Un plan estructurado en 3 capas.
              </h2>
            </div>
          </Reveal>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-border" />
            <div className="grid gap-10 md:grid-cols-3">
              {layers.map((l, i) => (
                <Reveal key={l.n} delay={i * 120}>
                  <div className="relative">
                    <div className="hidden md:flex items-center justify-center h-24 w-24 rounded-full bg-ink text-bone font-display text-2xl mb-8 relative z-10 ring-8 ring-bone">
                      {l.n}
                    </div>
                    <p className="md:hidden eyebrow mb-3">Capa {l.n}</p>
                    <h3 className="font-display text-3xl text-ink mb-4">{l.t}</h3>
                    <p className="text-muted-foreground leading-relaxed">{l.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-24 md:py-32 bg-secondary">
        <div className="container-tight">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow mb-4">Beneficios</p>
              <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
                Protegemos de verdad.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Porque no solo importa el trabajo. Importáis vosotros.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-px bg-border border border-border rounded-3xl overflow-hidden md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.t} delay={i * 40}>
                <div className="bg-bone p-8 h-full group hover:bg-card transition-colors">
                  <b.icon className="h-6 w-6 text-teal mb-6" strokeWidth={1.5} />
                  <h3 className="font-display text-xl text-ink mb-2">{b.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-16 max-w-3xl">
              <p className="font-display italic text-2xl md:text-3xl text-ink text-balance">
                Queremos que trabajéis tranquilos. Queremos que estéis cubiertos y seguros.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 compromisos */}
      <section className="relative py-24 md:py-32 bg-ink text-bone overflow-hidden">
        <img src={logo50} alt="" loading="lazy" className="hidden md:block absolute top-0 right-0 w-40 lg:w-56 h-auto opacity-90 z-10" />
        <div className="container-tight relative">
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="eyebrow text-teal-soft mb-4">Innegociables</p>
              <h2 className="heading-display text-bone text-4xl md:text-6xl text-balance">
                3 compromisos innegociables.
              </h2>
            </div>
          </Reveal>

          <div className="space-y-px bg-bone/10 border border-bone/10 rounded-2xl overflow-hidden">
            {[
              { n: "1", t: "Repuestos a coste mayorista", d: "Para que podáis competir, crecer y respirar en el día a día." },
              { n: "2", t: "Garantías extendidas y equipos al mejor precio", d: "Para que tengáis ingresos recurrentes y construyáis clientes fieles." },
              { n: "3", t: "Seguros colectivos", d: "Para que estéis protegidos como merecéis." },
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="bg-ink p-8 md:p-12 grid gap-6 md:grid-cols-12 items-center group hover:bg-ink-soft transition-colors">
                  <p className="md:col-span-1 font-display text-5xl text-teal">{c.n}</p>
                  <h3 className="md:col-span-4 font-display text-3xl text-bone">{c.t}</h3>
                  <p className="md:col-span-6 text-bone/70 leading-relaxed">{c.d}</p>
                  <ChevronRight className="md:col-span-1 h-6 w-6 text-bone/40 transition-all group-hover:text-teal group-hover:translate-x-1" />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-12 font-display italic text-xl md:text-2xl text-bone/80 max-w-3xl mx-auto text-center">
              El resto lo construiremos juntos, según vuestras<br />
              necesidades y apetito.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="container-tight">
          <Reveal>
            <div className="rounded-3xl bg-gradient-ink p-10 md:p-20 text-bone text-center">
              <h2 className="heading-display text-4xl md:text-6xl max-w-3xl mx-auto text-balance">
                Únete a WG Professional Network.
              </h2>
              <p className="mt-6 text-bone/70 max-w-xl mx-auto">
                Un único proceso para activar trabajo, protección y crecimiento.
              </p>
              <Link to="/wg-network/inscripcion" className="mt-10 inline-flex items-center gap-2 rounded-full bg-teal px-8 py-4 text-base font-medium text-ink hover:gap-3 transition-all">
                Comenzar inscripción
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default WGNetwork;
