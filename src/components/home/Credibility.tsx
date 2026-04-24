import { Reveal } from "@/components/site/Reveal";

const stats = [
  { kpi: "50", suffix: "años", label: "de experiencia" },
  { kpi: "+80.000", suffix: "incidencias", label: "gestionadas al año" },
  { kpi: "+300", suffix: "SATs", label: "colaboradores" },
  { kpi: "70", suffix: "profesionales", label: "en equipo" },
  { kpi: "+25", suffix: "años", label: "con clientes estratégicos" },
  { kpi: "3", suffix: "compañías", label: "especializadas" },
];

export const Credibility = () => (
  <section className="py-24 md:py-32 bg-bone">
    <div className="container-tight">
      <Reveal>
        <div className="flex items-end justify-between gap-8 mb-16 md:mb-20">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">01 · Cifras</p>
            <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
              Esto es lo que hacemos cada día.
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-muted-foreground italic font-display">
            La confianza no se construye en una campaña. Se construye respondiendo.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-3 border-t border-l border-border">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <div className="border-b border-r border-border p-6 md:p-10 group hover:bg-card transition-colors">
              <p className="font-display font-light text-ink text-5xl md:text-7xl tracking-tight leading-none">
                {s.kpi}
              </p>
              <p className="mt-3 text-sm md:text-base text-ink/80">
                <span className="font-medium">{s.suffix}</span>{" "}
                <span className="text-muted-foreground">{s.label}</span>
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <p className="md:hidden mt-8 text-sm text-muted-foreground italic font-display">
        La confianza no se construye en una campaña. Se construye respondiendo.
      </p>
    </div>
  </section>
);
