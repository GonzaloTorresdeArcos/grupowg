import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import networkImg from "@/assets/network.jpg";

export const NetworkTeaser = () => {
  const { t } = useTranslation("home-network");
  const items = t("items", { returnObjects: true }) as string[];
  return (
    <section className="py-24 md:py-32 bg-bone">
      <div className="container-tight grid gap-12 md:gap-16 lg:grid-cols-12 items-end">
        <Reveal className="lg:col-span-7">
          <p className="eyebrow mb-4">{t("eyebrow")}</p>
          <h2 className="heading-display text-ink text-4xl md:text-6xl text-balance">
            <Trans
              i18nKey="title"
              t={t}
              components={[<span key="0" className="italic font-normal text-teal" />]}
            />
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">{t("lead")}</p>

          <div className="mt-10 space-y-3 text-ink-soft text-base md:text-lg leading-relaxed">
            <p>{t("p1")}</p>
            <p className="text-muted-foreground">{t("p2")}</p>
            <ul className="pt-4 space-y-1.5 text-base text-ink">
              {items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>

          <p className="mt-10 font-display italic text-2xl text-ink">{t("tagline")}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/wg-network" className="btn-primary">
              {t("ctaPrimary")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/wg-network/inscripcion" className="btn-teal">
              {t("ctaSecondary")}
            </Link>
          </div>
        </Reveal>

        <Reveal delay={150} className="lg:col-span-5">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-ink">
            <img
              src={networkImg}
              alt={t("imageAlt")}
              width={1280}
              height={1600}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-8">
              <p className="text-bone/70 text-xs uppercase tracking-[0.2em] mb-2">
                {t("manifestoLabel")}
              </p>
              <p className="text-bone font-display text-2xl leading-tight text-balance">
                {t("manifesto")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
