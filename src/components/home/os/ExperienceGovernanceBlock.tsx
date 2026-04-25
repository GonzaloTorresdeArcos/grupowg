import { Reveal } from "@/components/site/Reveal";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

const layers = [
  {
    icon: Sparkles,
    code: "EXP",
    t: "Capa de experiencia",
    sub: "La experiencia como resultado del sistema",
    bullets: [
      "Captura desde el primer contacto",
      "Coherencia en todo el journey",
      "Medición basada en rendimiento (TAT, FTF)",
    ],
    closing: "La experiencia no se gestiona. Se construye desde el sistema.",
  },
  {
    icon: ShieldCheck,
    code: "GOV",
    t: "Capa de gobierno",
    sub: "Control y cumplimiento estructural",
    bullets: [
      "Homologación de red técnica",
      "Control documental",
      "Cumplimiento contractual",
      "Gestión de riesgos",
    ],
    closing: "Aseguramos que el sistema no solo funciona. Cumple.",
  },
];

const flow = [
  { code: "01", t: "Entrada", d: "Interacción", color: "text-teal" },
  { code: "02", t: "Decisión", d: "Sistema", color: "text-teal" },
  { code: "03", t: "Ejecución", d: "Operación", color: "text-teal" },
  { code: "04", t: "Control", d: "Seguimiento", color: "text-teal" },
];

export const ExperienceGovernanceBlock = () => (
  <section className="py-28 md:py-36 bg-background">
    <div className="container-tight">
      <Reveal>
        <p className="eyebrow-mono mb-4">03 · Capas transversales</p>
        <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
          Experiencia y gobierno,{" "}
          <span className="text-teal italic">por diseño</span>.
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 gap-6">
        {layers.map((l, i) => {
          const Icon = l.icon;
          return (
            <Reveal key={l.code} delay={i * 100}>
              <article className="h-full rounded-2xl border border-foreground/10 bg-card p-8 md:p-10 hover:border-teal/40 transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <span className="font-mono text-xs text-foreground/30">{l.code}</span>
                </div>
                <h3 className="font-display text-2xl text-foreground leading-snug">{l.t}</h3>
                <p className="mt-2 text-teal text-sm font-medium">{l.sub}</p>
                <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-6">
                  {l.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 text-sm text-foreground/85 leading-relaxed before:content-['→'] before:text-teal before:font-mono"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 pt-6 border-t border-foreground/10 font-display italic text-foreground/90 text-[15px] leading-snug">
                  "{l.closing}"
                </p>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* Bloque clave: de la incidencia a la resolución */}
      <Reveal delay={200}>
        <div className="mt-20 md:mt-28">
          <p className="eyebrow-mono mb-4">04 · De la incidencia a la resolución</p>
          <h3 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance leading-[1.05]">
            Cuatro momentos.{" "}
            <span className="text-teal italic">Un único flujo</span>.
          </h3>
        </div>
      </Reveal>

      <Reveal delay={300}>
        <div className="mt-12 rounded-2xl border border-foreground/10 bg-ink-elevated p-8 md:p-10">
          <div className="grid md:grid-cols-4 gap-6 md:gap-2 items-stretch">
            {flow.map((s, i) => (
              <div key={s.code} className="relative flex md:flex-col gap-4 md:gap-0">
                <div className="flex-1 md:px-4">
                  <p className={`font-mono text-xs ${s.color} mb-2`}>{s.code}</p>
                  <p className="font-display text-xl md:text-2xl text-foreground">{s.t}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    <span className="font-mono text-teal">→</span> {s.d}
                  </p>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight className="hidden md:block h-4 w-4 text-foreground/20 absolute -right-2 top-2" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-foreground/10">
            <p className="font-display italic text-foreground text-lg md:text-xl text-balance">
              Cada interacción no solo resuelve un caso.{" "}
              <span className="text-teal">Mejora el sistema.</span>
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
