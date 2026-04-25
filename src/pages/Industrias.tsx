import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { IndustriesBlock } from "@/components/home/os/IndustriesBlock";
import { MetricsBlock } from "@/components/home/os/MetricsBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Industrias = () => {
  useEffect(() => {
    document.title = "Industrias · WG Service OS";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "El mismo sistema, adaptado a tu sector: fabricantes, aseguradoras, retail & ecommerce y movilidad.",
    );
  }, []);

  return (
    <>
      <PageHero
        
        title={
          <>
            Un modelo.{" "}
            <span className="text-teal italic">Múltiples realidades</span>.
          </>
        }
        subtitle="Aplicamos el sistema en entornos reales, con múltiples actores, alto volumen y exigencia operativa."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />
      <IndustriesBlock />
      <MetricsBlock />
      <ClosingBlock />
    </>
  );
};

export default Industrias;
