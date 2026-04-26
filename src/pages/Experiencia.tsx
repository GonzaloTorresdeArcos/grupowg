import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/PageHero";
import { ExperienceBlock } from "@/components/home/os/ExperienceBlock";
import { ExperienceMethodBlock } from "@/components/home/os/ExperienceMethodBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Experiencia = () => {
  const { t } = useTranslation("experiencia");

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

  return (
    <>
      <PageHero
        title={
          <>
            {t("hero.titleA")}{" "}
            <span className="text-teal italic">{t("hero.titleB")}</span> {t("hero.titleC")}
          </>
        }
        subtitle={t("hero.subtitle")}
        cta={{ label: t("hero.cta"), to: "/contacto" }}
      />
      <ExperienceBlock />
      <ExperienceMethodBlock />
      <ClosingBlock />
    </>
  );
};

export default Experiencia;
