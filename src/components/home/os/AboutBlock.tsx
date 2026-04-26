import { Reveal } from "@/components/site/Reveal";
import { useTranslation } from "react-i18next";

export const AboutBlock = () => {
  const { t } = useTranslation("home-about");
  const pillars = t("pillars", { returnObjects: true }) as { label: string; text: string }[];
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container-tight">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          </Reveal>

          <Reveal className="lg:col-span-8" delay={100}>
            <h2 className="heading-display text-foreground text-3xl md:text-5xl text-balance leading-[1.08]">
              {t("title.line1")}
              <br />
              {t("title.line2")}
              <br />
              <span className="text-teal italic">{t("title.line3")}</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-2xl">
              {t("lead")}
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-6 border-t border-foreground/10 pt-10">
              {pillars.map((p) => (
                <div key={p.label}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal mb-2">
                    {p.label}
                  </p>
                  <p className="text-foreground/80 text-sm leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
