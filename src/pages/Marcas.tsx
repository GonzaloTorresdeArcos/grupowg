import { useTranslation } from "react-i18next";
import { SimplePage } from "@/components/site/SimplePage";
import { Brands } from "@/components/home/Brands";

const MarcasPage = () => {
  const { t } = useTranslation("marcas");
  return (
    <>
      <SimplePage eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <Brands />
    </>
  );
};

export default MarcasPage;
