import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { PlatformBlock } from "@/components/home/os/PlatformBlock";
import { IntelligenceBlock } from "@/components/home/os/IntelligenceBlock";
import { ExperienceGovernanceBlock } from "@/components/home/os/ExperienceGovernanceBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const ServiceOS = () => {
  const { t } = useTranslation("plataforma");
  const { isClient, loading } = useUserRole();

  useEffect(() => {
    document.title = "Service OS · Área privada";
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-sm text-muted-foreground">Cargando…</div>
    );
  }

  if (!isClient) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="bg-background">
      <div className="border-b border-border px-6 md:px-10 py-10 md:py-14 bg-card">
        <p className="eyebrow-mono mb-3">Área privada · Clientes</p>
        <h1 className="font-display text-3xl md:text-5xl text-foreground max-w-3xl text-balance">
          Service OS.{" "}
          <span className="text-teal italic">Nuestra IP operativa</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-foreground/70 text-base md:text-lg">
          Plataforma, inteligencia operativa, gobernanza y experiencia: el sistema completo que opera por debajo de tu postventa.
        </p>
      </div>
      <PlatformBlock />
      <IntelligenceBlock />
      <ExperienceGovernanceBlock />
      <ClosingBlock
        lineOne={t("closing.lineOne", { defaultValue: "Hablemos sobre cómo activamos Service OS en tu operación." })}
        lineTwo={t("closing.lineTwo", { defaultValue: "" })}
      />
    </div>
  );
};

export default ServiceOS;
