import { useTranslation } from "react-i18next";
import { SimplePage } from "@/components/site/SimplePage";
import { AnniversarySection } from "@/components/home/AnniversarySection";

const Aniversario = () => {
  const { t } = useTranslation("aniversario");
  return (
    <>
      <SimplePage eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <AnniversarySection />
    </>
  );
};

export default Aniversario;
