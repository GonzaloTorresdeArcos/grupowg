import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/PageHero";
import { IndustriesBlock } from "@/components/home/os/IndustriesBlock";
import { MetricsBlock } from "@/components/home/os/MetricsBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Industrias = () => {
  const { t } = useTranslation("industrias");

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
            <span className="text-teal italic">{t("hero.titleB")}</span>.
          </>
        }
        subtitle={t("hero.subtitle")}
        cta={{ label: t("hero.cta"), to: "/contacto" }}
      />
      <IndustriesBlock />
      <MetricsBlock />
      <ClosingBlock />
    </>
  );
};

export default Industrias;
