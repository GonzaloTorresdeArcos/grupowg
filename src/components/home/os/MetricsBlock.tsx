import { Reveal } from "@/components/site/Reveal";
import { useTranslation } from "react-i18next";

export const MetricsBlock = () => {
  const { t } = useTranslation("home-metrics");
  const items = t("items", { returnObjects: true }) as { v: string; l: string; c: string }[];
  return (
    <section className="py-24 md:py-32 bg-background text-foreground border-y border-foreground/5">
      <div className="container-tight">
        <Reveal>
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <div>
              <h2 className="heading-display text-foreground text-3xl md:text-5xl text-balance max-w-2xl">
                {t("title")}
              </h2>
              <p className="mt-4 text-foreground/60 max-w-xl text-base leading-relaxed">{t("lead")}</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/40">
              {t("tag")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 border-t border-l border-border">
          {items.map((m, i) => (
            <Reveal key={m.l} delay={i * 60}>
              <div className="border-r border-b border-border p-8 md:p-10 h-full hover:bg-bone/[0.02] transition-colors group relative overflow-hidden">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80 mb-6">
                  {m.c}
                </p>
                <p className="font-display text-foreground text-4xl md:text-5xl lg:text-6xl tracking-tight">
                  {m.v}
                </p>
                <p className="mt-3 text-foreground/60 text-sm">{m.l}</p>
                <div className="absolute top-0 right-0 h-px w-0 bg-teal transition-all duration-700 group-hover:w-full" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
