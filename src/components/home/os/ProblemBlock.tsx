import { Reveal } from "@/components/site/Reveal";
import { XCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export const ProblemBlock = () => {
  const { t } = useTranslation("home-problem");
  const items = t("items", { returnObjects: true }) as { t: string; d: string }[];
  return (
    <section className="py-28 md:py-36 bg-background border-t border-foreground/5">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-4xl md:text-6xl text-foreground max-w-3xl text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="italic text-teal" />]}
            />
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 gap-px bg-foreground/10 rounded-2xl overflow-hidden border border-foreground/10">
          {items.map((p, i) => (
            <Reveal key={p.t} delay={i * 80}>
              <div className="bg-background p-8 md:p-10 h-full">
                <XCircle className="h-5 w-5 text-foreground/30 mb-4" />
                <h3 className="heading-tight text-foreground text-xl md:text-2xl">{p.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed text-sm md:text-base">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={400}>
          <p className="mt-14 font-display text-2xl md:text-3xl text-foreground/85 max-w-3xl text-balance">
            <Trans
              i18nKey="result"
              t={t}
              components={[<span key="0" className="text-teal" />]}
            />
          </p>
        </Reveal>
      </div>
    </section>
  );
};
