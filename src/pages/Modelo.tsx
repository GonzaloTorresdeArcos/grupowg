import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { ProblemBlock } from "@/components/home/os/ProblemBlock";
import { SolutionBlock } from "@/components/home/os/SolutionBlock";
import { DifferentialBlock } from "@/components/home/os/DifferentialBlock";
import { ServiceOSBlock } from "@/components/home/os/ServiceOSBlock";
import { LifecycleBlock } from "@/components/home/os/LifecycleBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Modelo = () => {
  useEffect(() => {
    document.title = "Modelo · WG Service OS";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "El modelo WG Service OS: un sistema único de control y ejecución del servicio postventa, de principio a fin.",
    );
  }, []);

  return (
    <>
      <PageHero
        eyebrow="01 · Modelo"
        title={
          <>
            Un sistema operativo,
            <br />
            <span className="text-teal italic">no un proveedor</span>.
          </>
        }
        subtitle="Convertimos el servicio postventa en un sistema que funciona. Bajo control. Operación, experiencia y conocimiento técnico integrados de principio a fin."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />
      <ProblemBlock />
      <SolutionBlock />
      <DifferentialBlock />
      <ServiceOSBlock />
      <LifecycleBlock />
      <ClosingBlock />
    </>
  );
};

export default Modelo;
