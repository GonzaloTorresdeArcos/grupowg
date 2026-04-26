import { Reveal } from "@/components/site/Reveal";
import { useTranslation } from "react-i18next";

export const ExperienceBlock = () => {
  const { t } = useTranslation("home-experience");
  const bullets = t("bullets", { returnObjects: true }) as string[];
  return (
    <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
      <div className="container-tight grid lg:grid-cols-12 gap-12 items-center">
        <Reveal className="lg:col-span-7">
          <h2 className="heading-display text-foreground text-4xl md:text-6xl text-balance leading-[1.05]">
            {t("title.line1")}
            <br />
            <span className="text-teal italic">{t("title.line2")}</span>
          </h2>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={150}>
          <p className="text-lg text-muted-foreground leading-relaxed">{t("lead")}</p>
          <ul className="mt-8 space-y-4">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-foreground/85 border-t border-foreground/10 pt-4"
              >
                <span className="font-mono text-teal text-xs mt-1">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};
