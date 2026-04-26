import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { Workflow, Gauge, Sparkles } from "lucide-react";

const META = [
  { icon: Workflow, code: "EXP/01" },
  { icon: Gauge, code: "EXP/02" },
  { icon: Sparkles, code: "EXP/03" },
];

export const ExperienceMethodBlock = () => {
  const { t } = useTranslation("home-experience-method");

  const blocks = (t("blocks", { returnObjects: true }) as Array<{
    title: string;
    lead: string;
    bullets: string[];
    closing: string;
  }>) || [];

  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container-tight">
        <Reveal>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance leading-[1.05]">
            {t("titleA")}{" "}
            <span className="text-teal italic">{t("titleB")}</span>.
          </h2>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
            {t("lead")}
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {blocks.map((b, i) => {
            const Icon = META[i]?.icon ?? Workflow;
            const code = META[i]?.code ?? "";
            return (
              <Reveal key={code} delay={i * 100}>
                <article className="h-full rounded-2xl border border-foreground/10 bg-card p-8 hover:border-teal/40 transition-colors flex flex-col">
                  <div className="flex items-center justify-between mb-7">
                    <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-[10px] text-foreground/30">{code}</span>
                  </div>
                  <h3 className="font-display text-2xl text-foreground leading-snug">{b.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.lead}</p>
                  <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-6 flex-1">
                    {b.bullets.map((x) => (
                      <li
                        key={x}
                        className="flex gap-3 text-sm text-foreground/85 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 pt-6 border-t border-foreground/10 font-display italic text-foreground/90 text-[15px] leading-snug">
                    "{b.closing}"
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
