import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { SolutionsDetailBlock } from "@/components/home/os/SolutionsDetailBlock";

const Soluciones = () => {
  useEffect(() => {
    document.title = "Soluciones · WG Execute · Control Tower · Scale";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "Tres formas de activar el sistema de servicio: WG Execute (lo operamos por ti), WG Control Tower (visión única multi-proveedor) y WG Scale (despliegue internacional con control).",
    );
  }, []);

  return (
    <>
      <PageHero
        
        title={
          <>
            Tres formas de{" "}
            <span className="text-teal italic">activar el sistema</span>.
          </>
        }
        subtitle="Execute, Control Tower y Scale. Eliges el grado de implicación; nosotros aseguramos que el servicio funcione con calidad, control y consistencia."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />
      <SolutionsDetailBlock />
    </>
  );
};

export default Soluciones;
