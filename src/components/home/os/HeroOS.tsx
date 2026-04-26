import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ServiceOSDiagram } from "./ServiceOSDiagram";
import heroPhoto from "@/assets/hero-technician.jpg";

export const HeroOS = () => {
  const { t } = useTranslation("home-hero");
  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden bg-ink text-bone pt-32 pb-16">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal)/0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-wide relative z-10 grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
        {/* LEFT — texto */}
        <div className="lg:col-span-7">
          <div className="badge-os animate-fade-in mb-8">{t("badge")}</div>
          <h1 className="heading-display text-bone text-[clamp(2.5rem,7.2vw,6.5rem)] animate-fade-up">
            {t("title.line1")}
            <br />
            <span className="text-teal italic font-normal">{t("title.line2")}</span>.
          </h1>

          <p className="mt-8 font-display text-2xl md:text-[1.75rem] text-bone/90 max-w-2xl text-balance leading-snug">
            <Trans
              i18nKey="lead"
              t={t}
              components={[<span key="0" className="text-teal-soft" />]}
            />
          </p>

          <p className="mt-6 max-w-xl text-base md:text-lg text-bone/60 leading-relaxed">
            {t("sub")}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/contacto" className="btn-teal">
              {t("ctaPrimary")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/modelo" className="btn-on-dark">
              {t("ctaSecondary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Microdata strip */}
          <div className="mt-14 grid grid-cols-3 max-w-md gap-6 text-bone/55">
            {(["operation", "network", "track"] as const).map((key) => (
              <div key={key}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal/80">
                  {t(`stats.${key}.label`)}
                </p>
                <p className="text-bone font-display text-2xl mt-1">
                  {t(`stats.${key}.value`)}
                </p>
                <p className="text-[11px]">{t(`stats.${key}.caption`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — composición mixta: foto + overlay diagrama */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] border border-foreground/10 bg-ink-elevated">
            <img
              src={heroPhoto}
              alt={t("imageAlt")}
              width={1024}
              height={1280}
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute inset-x-0 top-0 p-6">
              <div className="badge-os">{t("liveBadge")}</div>
            </div>
            {/* Overlay diagrama animado */}
            <div className="absolute inset-x-4 bottom-4">
              <ServiceOSDiagram compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
