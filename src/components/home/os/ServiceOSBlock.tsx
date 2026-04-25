import { Reveal } from "@/components/site/Reveal";
import { Check, X } from "lucide-react";

const before = [
  "Sistemas desconectados",
  "Decisiones manuales",
  "Falta de control",
  "Silos de información",
];
const after = [
  "Sistema único",
  "Decisiones estructuradas",
  "Control completo",
  "Datos integrados en tiempo real",
];

export const ServiceOSBlock = () => (
  <section className="relative py-28 md:py-36 overflow-hidden bg-background">
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-25 pointer-events-none" />
    <div className="container-tight relative">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow-mono mb-4">05 · WG Service OS</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance">
            El sistema operativo del servicio.
          </h2>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
            Una capa que conecta todo el servicio: convierte cada interacción en una decisión
            estructurada y cada decisión en una ejecución medible.
          </p>

          <div className="mt-10 space-y-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal mb-2">Qué es</p>
              <p className="text-foreground text-base leading-relaxed">
                Una capa que conecta personas, procesos y tecnología en un único flujo operativo.
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal mb-2">Qué hace</p>
              <p className="text-foreground text-base leading-relaxed">
                Interacción → Decisión → Ejecución. En un mismo sistema, sin fricción.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={150}>
          <div className="rounded-3xl border border-foreground/10 bg-ink-elevated overflow-hidden">
            <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">
                Antes vs ahora
              </p>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-foreground/10">
              <div className="p-8 md:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-6">
                  Antes
                </p>
                <ul className="space-y-4">
                  {before.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-foreground/70">
                      <X className="h-4 w-4 text-foreground/30 mt-1 shrink-0" />
                      <span className="text-[15px]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 md:p-10 bg-teal/5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-6">
                  Ahora
                </p>
                <ul className="space-y-4">
                  {after.map((a) => (
                    <li key={a} className="flex items-start gap-3 text-foreground">
                      <Check className="h-4 w-4 text-teal mt-1 shrink-0" />
                      <span className="text-[15px]">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
