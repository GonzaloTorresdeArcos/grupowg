import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import {
  Cog, Eye, Globe,
  Headphones, Users2, Wrench, Truck, PackageSearch, ShieldCheck,
  Database, LineChart,
  Layers, Network, Boxes, MapPin,
  ArrowUpRight, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { LifecycleBlock } from "@/components/home/os/LifecycleBlock";

type ModuleKey = "execute" | "controlTower" | "scale";

type ModuleDef = {
  key: ModuleKey;
  code: string;
  icon: typeof Cog;
  bullets?: { icon: typeof Cog }[];
  pillars?: { icon: typeof Cog }[];
  hasOutcomes: boolean;
};

const MODULES: ModuleDef[] = [
  {
    key: "execute",
    code: "WG/01",
    icon: Cog,
    bullets: [
      { icon: Headphones },
      { icon: Users2 },
      { icon: Wrench },
      { icon: Truck },
      { icon: PackageSearch },
      { icon: ShieldCheck },
    ],
    hasOutcomes: false,
  },
  {
    key: "controlTower",
    code: "WG/02",
    icon: Eye,
    pillars: [{ icon: Database }, { icon: LineChart }],
    hasOutcomes: true,
  },
  {
    key: "scale",
    code: "WG/03",
    icon: Globe,
    pillars: [{ icon: Layers }, { icon: Network }, { icon: Boxes }, { icon: MapPin }],
    hasOutcomes: true,
  },
];

const CAPABILITY_ICONS = [Wrench, LineChart, ShieldCheck];

export const SolutionsDetailBlock = () => {
  const { t } = useTranslation("soluciones");
  const { t: tCommon } = useTranslation("common");

  const capabilities = (t("capabilities.items", { returnObjects: true }) as Array<{
    title: string;
    lead: string;
    bullets: string[];
    closing: string;
  }>) || [];

  return (
    <>
      {/* Intro grid: 3 módulos overview */}
      <section className="py-24 md:py-32 bg-background border-y border-foreground/5">
        <div className="container-tight">
          <Reveal>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              {t("intro.titleA")}{" "}
              <span className="text-teal italic">{t("intro.titleB")}</span> {t("intro.titleC")}
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              {t("intro.lead")}
            </p>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10 rounded-2xl overflow-hidden">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              return (
                <Reveal key={m.code} delay={i * 80}>
                  <a
                    href={`#${m.code.toLowerCase().replace("/", "-")}`}
                    className="group block h-full bg-card p-8 md:p-10 transition-colors hover:bg-ink-elevated"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <span className="font-mono text-xs text-foreground/40">{m.code}</span>
                      <ArrowRight className="h-4 w-4 text-foreground/30 transition-all group-hover:text-teal group-hover:translate-x-1" />
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-6">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <h3 className="heading-tight text-foreground text-2xl">{tCommon(`solutionNames.${m.key}`)}</h3>
                    <p className="mt-5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {t(`modules.${m.key}.intro`)}
                    </p>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detalle de cada módulo */}
      {MODULES.map((m, idx) => {
        const Icon = m.icon;
        const anchor = m.code.toLowerCase().replace("/", "-");
        const bullets = m.bullets
          ? ((t(`modules.${m.key}.bullets`, { returnObjects: true }) as string[]) || [])
          : [];
        const pillars = m.pillars
          ? ((t(`modules.${m.key}.pillars`, { returnObjects: true }) as Array<{
              title: string;
              items: string[];
            }>) || [])
          : [];
        const outcomes = m.hasOutcomes
          ? (t(`modules.${m.key}.outcomes`, { returnObjects: true }) as { from: string; to: string })
          : null;

        return (
          <section
            key={m.code}
            id={anchor}
            className={`py-24 md:py-32 scroll-mt-24 ${
              idx % 2 === 0 ? "bg-ink-elevated" : "bg-background"
            } border-b border-foreground/5`}
          >
            <div className="container-tight">
              <Reveal>
                <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20">
                  {/* Header column */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="font-mono text-xs text-teal">{m.code}</span>
                      <span className="h-px w-12 bg-teal/40" />
                    </div>
                    <div className="h-14 w-14 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center mb-8">
                      <Icon className="h-6 w-6 text-teal" />
                    </div>
                    <h3 className="heading-display text-foreground text-3xl md:text-5xl text-balance leading-[1.05]">
                      {tCommon(`solutionNames.${m.key}`)}
                    </h3>
                    <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                      {t(`modules.${m.key}.intro`)}
                    </p>

                    {outcomes && (
                      <div className="mt-10 rounded-xl border border-teal/20 bg-teal/5 p-6">
                        <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
                          {t("outcomeChange")}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm text-muted-foreground line-through">
                            {outcomes.from}
                          </span>
                          <ArrowRight className="h-4 w-4 text-teal flex-shrink-0" />
                          <span className="text-base font-medium text-foreground">
                            {outcomes.to}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="space-y-8">
                    {m.bullets && bullets.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-px bg-foreground/10 border border-foreground/10 rounded-2xl overflow-hidden">
                        {bullets.map((text, bi) => {
                          const BIcon = m.bullets![bi]?.icon ?? Cog;
                          return (
                            <div key={`${anchor}-b-${bi}`} className="bg-card p-5 flex items-start gap-4">
                              <div className="h-9 w-9 rounded-lg border border-teal/30 text-teal flex items-center justify-center flex-shrink-0">
                                <BIcon className="h-4 w-4" strokeWidth={1.5} />
                              </div>
                              <p className="text-sm text-foreground/85 leading-relaxed pt-1">
                                {text}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {m.pillars && pillars.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {pillars.map((p, pi) => {
                          const PIcon = m.pillars![pi]?.icon ?? Cog;
                          return (
                            <div
                              key={`${anchor}-p-${pi}`}
                              className="rounded-xl border border-foreground/10 bg-card p-6"
                            >
                              <div className="flex items-center gap-3 mb-5">
                                <div className="h-9 w-9 rounded-lg bg-teal/10 border border-teal/30 text-teal flex items-center justify-center">
                                  <PIcon className="h-4 w-4" strokeWidth={1.5} />
                                </div>
                                <h4 className="font-display text-base text-foreground">
                                  {p.title}
                                </h4>
                              </div>
                              <ul className="space-y-2.5">
                                {p.items.map((it, ii) => (
                                  <li
                                    key={`${anchor}-p-${pi}-i-${ii}`}
                                    className="flex gap-2.5 text-sm text-foreground/80 leading-relaxed before:content-['→'] before:text-teal before:font-mono before:flex-shrink-0"
                                  >
                                    {it}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border-t border-foreground/10 pt-6">
                      <p className="font-display italic text-foreground text-lg md:text-xl leading-snug">
                        "{t(`modules.${m.key}.closing`)}"
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        );
      })}

      {/* Sistema Warranty Global — flujo de 9 etapas */}
      <LifecycleBlock />

      {/* Capacidades del sistema */}
      <section className="py-24 md:py-32 bg-ink-elevated border-y border-foreground/5">

        <div className="container-tight">
          <Reveal>
            <p className="eyebrow-mono mb-4">{t("capabilities.eyebrow")}</p>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              {t("capabilities.titleA")}{" "}
              <span className="text-teal italic">{t("capabilities.titleB")}</span>{" "}
              {t("capabilities.titleC")}
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              {t("capabilities.lead")}
            </p>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {capabilities.map((c, i) => {
              const Icon = CAPABILITY_ICONS[i] ?? Wrench;
              const code = `CAP/0${i + 1}`;
              return (
                <Reveal key={code} delay={i * 80}>
                  <article className="group h-full rounded-2xl border border-foreground/10 bg-card p-8 md:p-10 transition-all hover:border-teal/40">
                    <div className="flex items-start justify-between mb-8">
                      <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-teal" />
                      </div>
                      <span className="font-mono text-xs text-foreground/30">{code}</span>
                    </div>
                    <h3 className="font-display text-2xl text-foreground leading-snug">
                      {c.title}
                    </h3>
                    <p className="mt-3 text-sm text-teal font-medium leading-relaxed">{c.lead}</p>
                    <ul className="mt-6 space-y-2 border-t border-foreground/10 pt-6">
                      {c.bullets.map((b, bi) => (
                        <li
                          key={`${code}-b-${bi}`}
                          className="flex gap-3 text-sm text-foreground/80 leading-relaxed before:content-['→'] before:text-teal before:font-mono"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 pt-6 border-t border-foreground/10 font-display italic text-foreground/90 text-[15px] leading-snug">
                      "{c.closing}"
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-tight">
          <Reveal>
            <div className="rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/10 via-card to-card p-10 md:p-16 text-center">
              <p className="eyebrow-mono mb-4 text-teal">{t("ctaFinal.eyebrow")}</p>
              <h3 className="heading-display text-foreground text-3xl md:text-5xl text-balance max-w-3xl mx-auto leading-[1.05]">
                {t("ctaFinal.titleA")}{" "}
                <span className="text-teal italic">{t("ctaFinal.titleB")}</span>{" "}
                {t("ctaFinal.titleC")}
              </h3>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link to="/contacto" className="btn-teal">
                  {t("ctaFinal.ctaPrimary")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contacto"
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-teal transition-colors"
                >
                  {t("ctaFinal.ctaSecondary")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};
