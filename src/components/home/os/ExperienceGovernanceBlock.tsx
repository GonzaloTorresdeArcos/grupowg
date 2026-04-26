import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

const LAYER_META = [
  { icon: Sparkles, code: "EXP" },
  { icon: ShieldCheck, code: "GOV" },
];

const FLOW_CODES = ["01", "02", "03", "04"];

export const ExperienceGovernanceBlock = () => {
  const { t } = useTranslation("home-experience-governance");

  const layers = (t("layers", { returnObjects: true }) as Array<{
    title: string;
    sub: string;
    bullets: string[];
    closing: string;
  }>) || [];

  const flow = (t("flow", { returnObjects: true }) as Array<{ t: string; d: string }>) || [];

  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
            {t("titleA")}{" "}
            <span className="text-teal italic">{t("titleB")}</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 gap-6">
          {layers.map((l, i) => {
            const Icon = LAYER_META[i]?.icon ?? Sparkles;
            const code = LAYER_META[i]?.code ?? "";
            return (
              <Reveal key={code} delay={i * 100}>
                <article className="h-full rounded-2xl border border-foreground/10 bg-card p-8 md:p-10 hover:border-teal/40 transition-colors">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-xs text-foreground/30">{code}</span>
                  </div>
                  <h3 className="font-display text-2xl text-foreground leading-snug">{l.title}</h3>
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
            <p className="eyebrow-mono mb-4">{t("flowEyebrow")}</p>
            <h3 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance leading-[1.05]">
              {t("flowTitleA")}{" "}
              <span className="text-teal italic">{t("flowTitleB")}</span>.
            </h3>
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-12 rounded-2xl border border-foreground/10 bg-ink-elevated p-8 md:p-10">
            <div className="grid md:grid-cols-4 gap-6 md:gap-2 items-stretch">
              {flow.map((s, i) => (
                <div key={FLOW_CODES[i]} className="relative flex md:flex-col gap-4 md:gap-0">
                  <div className="flex-1 md:px-4">
                    <p className="font-mono text-xs text-teal mb-2">{FLOW_CODES[i]}</p>
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
            <div className="mt-10 pt-8 border-t border-foreground/10 text-center">
              <p className="font-display italic text-foreground text-lg md:text-xl text-balance">
                {t("flowClosingA")}{" "}
                <span className="text-teal">{t("flowClosingB")}</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
