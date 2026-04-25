import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
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
            Un sistema operativo de servicio,{" "}
            <span className="text-teal italic">end-to-end</span>.
          </>
        }
        subtitle="El rendimiento del servicio no depende de áreas aisladas, sino de cómo funciona el sistema en su conjunto. Estructuramos el servicio como un flujo completo, donde cada etapa está conectada, tiene un objetivo claro y contribuye directamente al resultado final."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />
      <LifecycleBlock />
    </>
  );
};

export default Modelo;
