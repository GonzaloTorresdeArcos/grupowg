import { Reveal } from "@/components/site/Reveal";
import { Cpu, Package2, Truck, Sparkles, Receipt } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

// Nombres de capa siempre en EN (instrucción del usuario)
const LAYER_META = [
  { icon: Cpu, code: "INT/01", t: "Technical Intelligence" },
  { icon: Package2, code: "INT/02", t: "Product Intelligence" },
  { icon: Receipt, code: "INT/03", t: "RMA & Recovery" },
  { icon: Truck, code: "INT/04", t: "Supply Intelligence" },
  { icon: Sparkles, code: "INT/05", t: "Automation & Decision" },
];

export const IntelligenceBlock = () => {
  const { t } = useTranslation("home-intelligence");
  const layers = t("layers", { returnObjects: true }) as { bullets: string[]; closing: string }[];
  return (
    <section className="py-28 md:py-36 bg-background text-foreground relative overflow-hidden border-y border-foreground/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--teal)/0.1),transparent_60%)]" />
      <div className="container-tight relative">
        <Reveal>
          <p className="eyebrow-mono mb-4 text-teal">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-4xl text-balance leading-[1.05]">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
          <p className="mt-6 max-w-2xl text-foreground/65 text-lg leading-relaxed">{t("lead")}</p>
          <p className="mt-4 font-display text-foreground/85 text-xl md:text-2xl italic max-w-2xl">
            {t("tagline")}
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-muted/50 border border-border rounded-2xl overflow-hidden">
          {layers.map((l, i) => {
            const meta = LAYER_META[i];
            const Icon = meta.icon;
            return (
              <Reveal key={meta.t} delay={i * 70}>
                <article className="bg-background p-7 md:p-8 h-full flex flex-col hover:bg-bone/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-7">
                    <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-[10px] text-foreground/40">{meta.code}</span>
                  </div>
                  <h3 className="heading-tight text-foreground text-xl">{meta.t}</h3>
                  <ul className="mt-5 space-y-2 flex-1">
                    {l.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex gap-2.5 text-sm text-foreground/70 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 pt-5 border-t border-border text-teal text-[13px] italic leading-snug">
                    {l.closing}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={500}>
          <div className="mt-16 max-w-5xl mx-auto text-center">
            <p className="font-display text-2xl md:text-3xl text-foreground/90 text-balance leading-snug">
              <Trans
                i18nKey="synthesis"
                t={t}
                components={[<span key="0" className="text-teal" />]}
              />
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
