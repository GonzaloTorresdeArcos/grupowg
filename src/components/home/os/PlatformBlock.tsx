import { Reveal } from "@/components/site/Reveal";

export const PlatformBlock = () => (
  <section className="py-28 md:py-36 bg-background">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">09 · Plataforma</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
          La arquitectura del sistema.
        </h2>
      </Reveal>

      <Reveal delay={150}>
        <div className="mt-16 rounded-3xl border border-foreground/10 bg-ink-elevated overflow-hidden">
          {/* CORE */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10 relative">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">Core</p>
              <p className="font-mono text-[10px] text-foreground/40">L1</p>
            </div>
            <div className="md:col-span-9">
              <h3 className="heading-tight text-foreground text-2xl md:text-3xl">
                Orquesta todo el servicio
              </h3>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                El motor central del sistema. Recibe cada interacción, aplica criterio,
                desencadena ejecución y registra todo lo que ocurre.
              </p>
            </div>
          </div>

          {/* MÓDULOS */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12 border-b border-foreground/10">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">Módulos</p>
              <p className="font-mono text-[10px] text-foreground/40">L2</p>
            </div>
            <div className="md:col-span-9 grid sm:grid-cols-3 gap-4">
              {["Execute", "Control Tower", "Scale"].map((m) => (
                <div
                  key={m}
                  className="rounded-xl border border-foreground/10 bg-background p-5"
                >
                  <p className="font-mono text-[10px] text-teal/80 uppercase tracking-[0.2em] mb-2">
                    Módulo
                  </p>
                  <p className="heading-tight text-foreground text-lg">{m}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CAPACIDADES */}
          <div className="grid md:grid-cols-12 gap-6 p-8 md:p-12">
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal mb-2">
                Capacidades
              </p>
              <p className="font-mono text-[10px] text-foreground/40">L3</p>
            </div>
            <div className="md:col-span-9 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                "Datos en tiempo real",
                "Integración API-first",
                "Automatización de decisiones",
                "Auditoría continua",
              ].map((c) => (
                <div
                  key={c}
                  className="rounded-lg border border-foreground/10 px-4 py-3 text-sm text-foreground/80 hover:border-teal/40 hover:text-foreground transition-colors"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
