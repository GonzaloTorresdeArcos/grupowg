import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, AlertTriangle, Workflow, Eye, Brain, Cog } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

const ICONS = [Eye, Brain, Cog] as const;

const Index = () => {
  const { t } = useTranslation("grupo");

  useEffect(() => {
    document.title = t("seo.title");
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", t("seo.description"));
  }, [t]);

  const problemas = t("problem.items", { returnObjects: true }) as string[];
  const diferenciales = t("differential.items", { returnObjects: true }) as Array<{
    title: string;
    desc: string;
  }>;

  return (
    <>
      <PageHero
        title={
          <>
            {t("hero.titleA")}{" "}
            <span className="text-teal italic">{t("hero.titleB")}</span>.
          </>
        }
        subtitle={
          <>
            {t("hero.subtitleA")}
            <br />
            <br />
            {t("hero.subtitleB")}{" "}
            <span className="whitespace-nowrap">{t("hero.subtitleC")}</span>.
          </>
        }
        cta={{ label: t("hero.cta"), to: "/contacto" }}
      />

      {/* PROBLEMA */}
      <section className="section-padding bg-background border-t border-foreground/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-15 pointer-events-none" />
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4">{t("problem.eyebrow")}</p>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              {t("problem.titleA")}{" "}
              <span className="text-teal italic">{t("problem.titleB")}</span>.
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 gap-8">
            <Reveal>
              <ul className="space-y-4">
                {problemas.map((p) => (
                  <li
                    key={p}
                    className="flex gap-3 items-start text-foreground/85 text-lg leading-relaxed"
                  >
                    <span className="text-teal mt-2 leading-none">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={150}>
              <div className="card-os p-8 h-full flex flex-col justify-center">
                <AlertTriangle className="h-6 w-6 text-teal mb-4" />
                <p className="eyebrow-mono mb-3 text-foreground/60">{t("problem.resultLabel")}</p>
                <p className="font-display text-2xl md:text-3xl text-foreground/90 leading-snug text-balance">
                  {t("problem.resultA")}{" "}
                  <span className="text-teal italic">{t("problem.resultB")}</span>.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SOLUCIÓN */}
      <section className="section-padding bg-ink text-bone relative overflow-hidden border-t border-foreground/5">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,hsl(var(--teal)/0.12),transparent_60%)]" />
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4 text-bone/60">{t("solution.eyebrow")}</p>
            <h2 className="heading-display text-bone text-4xl md:text-6xl max-w-4xl text-balance">
              {t("solution.titleA")}{" "}
              <span className="text-teal italic">{t("solution.titleB")}</span> {t("solution.titleC")}
            </h2>
            <p className="mt-8 max-w-2xl text-bone/70 text-lg leading-relaxed">
              {t("solution.lead")}
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-14 flex items-center gap-5 max-w-3xl">
              <Workflow className="h-8 w-8 text-teal flex-shrink-0" />
              <p className="font-display text-2xl md:text-3xl text-bone/90 leading-snug text-balance">
                {t("solution.quoteA")}{" "}
                <span className="text-teal italic">{t("solution.quoteB")}</span>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="section-padding bg-background relative overflow-hidden">
        <div className="container-tight relative">
          <Reveal>
            <p className="eyebrow-mono mb-4">{t("differential.eyebrow")}</p>
            <h2 className="heading-display text-foreground text-4xl md:text-6xl max-w-3xl text-balance">
              {t("differential.titleA")}{" "}
              <span className="text-teal italic">{t("differential.titleB")}</span>.
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {diferenciales.map((d, i) => {
              const Icon = ICONS[i] ?? Eye;
              return (
                <Reveal key={d.title} delay={i * 100}>
                  <div className="card-os h-full p-7">
                    <Icon className="h-6 w-6 text-teal mb-5" />
                    <p className="heading-tight text-foreground text-xl">{d.title}</p>
                    <p className="mt-3 text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={350}>
            <div className="mt-16 flex flex-wrap gap-3">
              <Link to="/modelo" className="btn-teal">
                {t("differential.ctaPrimary")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/contacto" className="btn-on-light">
                {t("differential.ctaSecondary")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default Index;
