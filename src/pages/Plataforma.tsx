import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { PlatformBlock } from "@/components/home/os/PlatformBlock";
import { IntelligenceBlock } from "@/components/home/os/IntelligenceBlock";
import { ExperienceGovernanceBlock } from "@/components/home/os/ExperienceGovernanceBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Plataforma = () => {
  useEffect(() => {
    document.title = "WG Service OS · Plataforma de servicio postventa";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "WG Service OS: el sistema que conecta, ejecuta y controla todo el servicio postventa. Core, módulos (Execute, Control Tower, Scale) y capas de inteligencia técnica, producto, RMA, supply y automation.",
    );
  }, []);

  return (
    <>
      <PageHero
        title={
          <>
            WG Service OS.{" "}
            <span className="text-teal italic">El sistema</span> que conecta, ejecuta y controla.
          </>
        }
        subtitle="El servicio postventa no es una suma de partes. Es un sistema que debe funcionar de forma coordinada. Integramos operación, control e inteligencia en una única plataforma para ejecutar, medir y optimizar de principio a fin."
        cta={{ label: "Hablar con nuestro equipo", to: "/contacto" }}
      />
      <PlatformBlock />
      <IntelligenceBlock />
      <ExperienceGovernanceBlock />
      <ClosingBlock />
    </>
  );
};

export default Plataforma;
