import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/PageHero";
import { LifecycleBlock } from "@/components/home/os/LifecycleBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Modelo = () => {
  const { t } = useTranslation("modelo");

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
      <LifecycleBlock />
      <ClosingBlock lineOne={t("closing.lineOne")} lineTwo={t("closing.lineTwo")} />
    </>
  );
};

export default Modelo;
