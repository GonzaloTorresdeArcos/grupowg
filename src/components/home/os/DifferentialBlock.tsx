import { Reveal } from "@/components/site/Reveal";
import { GitBranch, BrainCircuit, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [GitBranch, BrainCircuit, Workflow];
const CODES = ["01", "02", "03"];

export const DifferentialBlock = () => {
  const { t } = useTranslation("home-differential");
  const items = t("items", { returnObjects: true }) as { t: string; d: string }[];
  return (
    <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-5xl max-w-3xl text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl">{t("lead")}</p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {items.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={c.t} delay={i * 100}>
                <div className="card-os group h-full p-8 md:p-10 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-xs text-foreground/30">{CODES[i]}</span>
                  </div>
                  <h3 className="heading-tight text-foreground text-2xl">{c.t}</h3>
                  <p className="mt-4 text-muted-foreground leading-relaxed text-[15px]">{c.d}</p>
                  <div className="absolute -bottom-px left-0 h-px w-0 bg-teal transition-all duration-700 group-hover:w-full" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
