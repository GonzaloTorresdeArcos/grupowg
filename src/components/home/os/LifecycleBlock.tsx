import { Reveal } from "@/components/site/Reveal";
import { ArrowRight, Target, Activity, Gauge, Link2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

const KPI_ICONS = [Target, Gauge, Activity, Link2];

export const LifecycleBlock = () => {
  const { t } = useTranslation("home-lifecycle");
  const stages = t("stages", { returnObjects: true }) as { t: string; d: string }[];
  const has = t("has", { returnObjects: true }) as string[];
  const enables = t("enables", { returnObjects: true }) as string[];
  const kpis = t("kpis", { returnObjects: true }) as { t: string; d: string }[];

  return (
    <section className="py-28 md:py-36 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20 pointer-events-none" />
      <div className="container-wide relative">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow1")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-4xl text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
          <p className="mt-6 text-muted-foreground max-w-2xl text-lg leading-relaxed">
            {t("lead")}
          </p>
        </Reveal>

        {/* Flow — 9 etapas */}
        <Reveal delay={150}>
          <div className="mt-16 -mx-6 md:mx-0">
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3 overflow-x-auto md:overflow-visible px-6 md:px-0 pb-4 snap-x snap-mandatory">
              {stages.map((s, i) => {
                const code = String(i + 1).padStart(2, "0");
                return (
                  <div
                    key={code}
                    className="snap-start min-w-[240px] md:min-w-0 relative group"
                  >
                    <div className="card-os h-full p-5 relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-[11px] text-teal">{code}</span>
                        {i < stages.length - 1 && (
                          <ArrowRight className="h-3.5 w-3.5 text-foreground/20 hidden xl:block" />
                        )}
                      </div>
                      <p className="heading-tight text-foreground text-base lg:text-lg">{s.t}</p>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.d}</p>

                      <div className="absolute top-1/2 -right-1.5 h-1.5 w-1.5 rounded-full bg-teal hidden xl:block opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Cómo funciona */}
        <Reveal delay={250}>
          <div className="mt-24 border-t border-foreground/10 pt-16">
            <p className="eyebrow-mono mb-4">{t("eyebrow2")}</p>
            <h3 className="heading-display text-foreground text-3xl md:text-5xl max-w-3xl text-balance">
              <Trans
                i18nKey="subtitle"
                t={t}
                components={[<span key="0" className="text-teal italic" />]}
              />
            </h3>

            {/* Dos columnas: estructura y consecuencia */}
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              <Reveal>
                <div className="card-os h-full p-8">
                  <p className="eyebrow-mono mb-5 text-foreground/60">{t("hasLabel")}</p>
                  <ul className="space-y-3">
                    {has.map((item) => (
                      <li key={item} className="flex gap-3 text-foreground/85">
                        <span className="text-teal mt-1.5 leading-none">·</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="card-os h-full p-8">
                  <p className="eyebrow-mono mb-5 text-foreground/60">{t("enablesLabel")}</p>
                  <ul className="space-y-3">
                    {enables.map((item) => (
                      <li key={item} className="flex gap-3 text-foreground/85">
                        <span className="text-teal mt-1.5 leading-none">·</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Síntesis: 4 pilares como prueba del diseño sistémico */}
            <div className="mt-20">
              <Reveal>
                <h4 className="heading-display text-foreground text-2xl md:text-4xl max-w-3xl text-balance">
                  <Trans
                    i18nKey="synthesis"
                    t={t}
                    components={[<span key="0" className="text-teal italic" />]}
                  />
                </h4>
              </Reveal>

              <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k, i) => {
                  const Icon = KPI_ICONS[i];
                  return (
                    <Reveal key={k.t} delay={i * 80}>
                      <div className="card-os h-full p-6">
                        <Icon className="h-5 w-5 text-teal mb-4" />
                        <p className="heading-tight text-foreground text-lg">{k.t}</p>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{k.d}</p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
};
