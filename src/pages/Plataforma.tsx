import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { PlatformBlock } from "@/components/home/os/PlatformBlock";
import { IntelligenceBlock } from "@/components/home/os/IntelligenceBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Plataforma = () => {
  useEffect(() => {
    document.title = "Plataforma · WG Service OS";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "La plataforma WG Service OS: arquitectura modular Core + Módulos + Capacidades, con capas de inteligencia técnica, producto, supply y automation.",
    );
  }, []);

  return (
    <>
      <PageHero
        eyebrow="03 · Plataforma"
        title={
          <>
            La arquitectura del{" "}
            <span className="text-teal italic">sistema</span>.
          </>
        }
        subtitle="Una plataforma modular y API-first que orquesta cada interacción, aplica criterio, ejecuta y registra. Diseñada para escalar sin perder control."
        cta={{ label: "Hablar con nuestro equipo", to: "/contacto" }}
      />
      <PlatformBlock />
      <IntelligenceBlock />
      <ClosingBlock />
    </>
  );
};

export default Plataforma;
