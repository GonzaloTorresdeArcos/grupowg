import { useEffect } from "react";
import { PageHero } from "@/components/site/PageHero";
import { ExperienceBlock } from "@/components/home/os/ExperienceBlock";
import { ExperienceMethodBlock } from "@/components/home/os/ExperienceMethodBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Experiencia = () => {
  useEffect(() => {
    document.title = "Experiencia cliente · WG Service OS";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute(
      "content",
      "La experiencia no es un canal, es el resultado del sistema. Visibilidad real, una sola conversación y resolución en primera visita.",
    );
  }, []);

  return (
    <>
      <PageHero
        eyebrow="05 · Experiencia"
        title={
          <>
            La experiencia es el{" "}
            <span className="text-teal italic">resultado</span> del sistema.
          </>
        }
        subtitle="Sin scripts forzados, sin canales inconexos, sin promesas vacías. Solo respuestas claras, trazabilidad completa y resolución real."
        cta={{ label: "Solicitar información", to: "/contacto" }}
      />
      <ExperienceBlock />
      <ExperienceMethodBlock />
      
      <ClosingBlock />
    </>
  );
};

export default Experiencia;
