import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, AlertTriangle, Workflow, Eye, Brain, Cog } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const problemas = [
  "Múltiples proveedores operando sin coordinación.",
  "Sistemas que no se comunican entre sí.",
  "Decisiones sin criterio técnico estructurado.",
  "Falta de visibilidad sobre lo que realmente ocurre.",
];

const diferenciales = [
  {
    icon: Eye,
    title: "Control end-to-end",
    desc: "Visión completa del servicio, independientemente de quién lo ejecute.",
  },
  {
    icon: Brain,
    title: "Conocimiento técnico y de producto",
    desc: "Validamos la calidad del servicio y transformamos la actividad en información útil para mejorar.",
  },
  {
    icon: Cog,
    title: "Ejecución integrada",
    desc: "Desde el primer contacto hasta la resolución, sin fricción.",
  },
];

const Grupo = () => {
  useEffect(() => {
    document.title = "Grupo WG · Donde otros terminan, nosotros empezamos";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "Grupo WG convierte el servicio postventa en un sistema bajo control: operación, experiencia y conocimiento técnico integrados de principio a fin.",
    );
  }, []);

  return (
    <>
      <PageHero
        title={
          <>
            Donde otros terminan,{" "}
            <span className="text-teal italic">nosotros empezamos</span>.
          </>
        }
        subtitle={
          <>
            Convertimos el servicio postventa en un sistema que funciona. Bajo control.
            Incluso cuando el servicio está fragmentado entre múltiples proveedores.
            <br />
            <br />
            Integramos operación, experiencia de cliente y conocimiento técnico para
            ejecutar, controlar y optimizar el servicio de principio a fin.
          </>
        }
        cta={{ label: "Hablar con nuestro equipo", to: "/contacto" }}
      />

      {/* PROBLEMA */}
      <section className="py-24 md:py-32 bg-background border-t border-foreground/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-15 pointer-events-none" />
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4">01 · Problema</p>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              Hoy el servicio postventa{" "}
              <span className="text-teal italic">no funciona como un sistema</span>.
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 gap-8">
            <Reveal>
              <ul className="space-y-4">
                {problemas.map((p) => (
                  <li
                    key={p}
                    className="flex gap-3 items-start text-foreground/85 text-lg leading-relaxed"
                  >
                    <span className="text-teal mt-2 leading-none">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={150}>
              <div className="card-os p-8 h-full flex flex-col justify-center">
                <AlertTriangle className="h-6 w-6 text-teal mb-4" />
                <p className="eyebrow-mono mb-3 text-foreground/60">Resultado</p>
                <p className="font-display text-2xl md:text-3xl text-foreground/90 leading-snug text-balance">
                  Más coste, más incidencias y una{" "}
                  <span className="text-teal italic">experiencia inconsistente</span>.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SOLUCIÓN */}
      <section className="py-24 md:py-32 bg-ink text-bone relative overflow-hidden border-t border-foreground/5">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--teal)/0.12),transparent_60%)]" />
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4 text-bone/60">02 · Solución</p>
            <h2 className="heading-display text-bone text-4xl md:text-6xl max-w-4xl text-balance">
              Un único sistema de{" "}
              <span className="text-teal italic">control y ejecución</span> del servicio.
            </h2>
            <p className="mt-8 max-w-2xl text-bone/70 text-lg leading-relaxed">
              Conectamos todos los elementos —personas, procesos y tecnología— en un flujo
              único, coordinado y medible.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-14 flex items-center gap-5 max-w-3xl">
              <Workflow className="h-8 w-8 text-teal flex-shrink-0" />
              <p className="font-display text-2xl md:text-3xl text-bone/90 leading-snug text-balance">
                No se trata de gestionar partes.{" "}
                <span className="text-teal italic">
                  Se trata de hacer que el sistema funcione.
                </span>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4">03 · Diferencial</p>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              Control. Conocimiento.{" "}
              <span className="text-teal italic">Ejecución</span>.
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {diferenciales.map((d, i) => {
              const Icon = d.icon;
              return (
                <Reveal key={d.title} delay={i * 100}>
                  <div className="card-os h-full p-7">
                    <Icon className="h-6 w-6 text-teal mb-5" />
                    <p className="heading-tight text-foreground text-xl">{d.title}</p>
                    <p className="mt-3 text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={350}>
            <div className="mt-16 flex flex-wrap gap-3">
              <Link to="/modelo" className="btn-teal">
                Ver el modelo
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/contacto" className="btn-on-light">
                Hablar con nuestro equipo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <ClosingBlock />
    </>
  );
};

export default Grupo;
