import { useEffect } from "react";
import { SimplePage } from "@/components/site/SimplePage";

const AvisoLegal = () => {
  useEffect(() => {
    document.title = "Aviso legal · Grupo Warranty Global";
  }, []);

  return (
    <SimplePage
      eyebrow="Legal"
      title="Aviso legal"
      intro="Condiciones generales de uso del sitio web de Grupo Warranty Global, conforme a la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE)."
    >
      <div className="max-w-3xl space-y-6 text-ink-soft leading-relaxed">
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Titularidad</h2>
          <p>
            Este sitio web es propiedad de Grupo Warranty Global, marca comercial bajo la
            que operan Serseguro, Hiperservice y Asure Componentes.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Condiciones de uso</h2>
          <p>
            El acceso y uso del sitio implica la aceptación de las presentes condiciones.
            El usuario se compromete a hacer un uso adecuado de los contenidos y servicios
            ofrecidos.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Propiedad intelectual</h2>
          <p>
            Todos los contenidos, marcas, logotipos y diseños están protegidos por derechos
            de propiedad intelectual e industrial. Queda prohibida su reproducción sin
            autorización expresa.
          </p>
        </div>
      </div>
    </SimplePage>
  );
};

export default AvisoLegal;
