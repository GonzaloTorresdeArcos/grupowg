import { Reveal } from "@/components/site/Reveal";
import { ArrowUpRight, Cog, Eye, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

// Datos no traducibles (nombres de producto en EN siempre, iconos, códigos)
const META = [
  { icon: Cog, code: "WG/01", name: "WG Execute", featured: false },
  { icon: Eye, code: "WG/02", name: "WG Control Tower", featured: true },
  { icon: Globe, code: "WG/03", name: "WG Scale", featured: false },
];

export const SolutionsBlock = () => {
  const { t } = useTranslation("home-solutions");
  const cards = t("cards", { returnObjects: true }) as {
    sub: string;
    d: string;
    bullets: string[];
    tagline: string;
  }[];
  return (
    <section className="py-28 md:py-36 bg-ink-elevated border-y border-foreground/5">
      <div className="container-tight">
        <Reveal>
          <p className="eyebrow-mono mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="text-teal italic" />]}
            />
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => {
            const meta = META[i];
            const Icon = meta.icon;
            return (
              <Reveal key={meta.name} delay={i * 100}>
                <div
                  className={`group h-full rounded-2xl border ${
                    meta.featured
                      ? "border-teal/40 bg-gradient-to-br from-teal/5 to-transparent"
                      : "border-foreground/10 bg-card"
                  } p-8 md:p-10 transition-all duration-300 hover:border-teal/40 relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-12 w-12 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal" />
                    </div>
                    <span className="font-mono text-xs text-foreground/30">{meta.code}</span>
                  </div>
                  <h3 className="heading-tight text-foreground text-2xl md:text-3xl">{meta.name}</h3>
                  <p className="mt-2 text-teal text-sm font-medium">{c.sub}</p>
                  <p className="mt-5 text-muted-foreground leading-relaxed text-[15px]">{c.d}</p>
                  <ul className="mt-8 space-y-2 border-t border-foreground/10 pt-6">
                    {c.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex gap-3 text-sm text-foreground/85 before:content-['→'] before:text-teal before:font-mono"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-8 pt-6 border-t border-foreground/10 text-foreground italic text-[15px] leading-snug">
                    {c.tagline}
                  </p>
                  <Link
                    to="/soluciones"
                    className="mt-6 inline-flex items-center gap-2 text-sm text-teal font-medium hover:gap-3 transition-all"
                  >
                    {t("viewDetail")} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
