import { Reveal } from "@/components/site/Reveal";
import { Trans, useTranslation } from "react-i18next";

export const SolutionBlock = () => {
  const { t } = useTranslation("home-solution");
  return (
    <section className="relative py-28 md:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--teal)/0.08),transparent_55%)]" />
      <div className="container-tight relative">
        <Reveal>
          <p className="eyebrow-mono mb-6 text-center">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-center text-4xl md:text-6xl lg:text-7xl max-w-5xl mx-auto text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
          <p className="mt-10 text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("lead")}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-20 max-w-3xl mx-auto text-center border-t border-foreground/10 pt-12">
            <p className="font-display text-2xl md:text-3xl text-foreground/85 text-balance leading-snug">
              {t("closingLine1")}
              <br />
              <span className="text-foreground">{t("closingLine2")}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
