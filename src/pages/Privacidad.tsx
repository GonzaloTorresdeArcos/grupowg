import { useEffect } from "react";
import { SimplePage } from "@/components/site/SimplePage";

const Privacidad = () => {
  useEffect(() => {
    document.title = "Política de privacidad · Grupo Warranty Global";
  }, []);

  return (
    <SimplePage
      eyebrow="Legal"
      title="Política de privacidad"
      intro="Información sobre el tratamiento de datos personales en Grupo Warranty Global, conforme al Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD."
    >
      <div className="prose prose-neutral max-w-3xl space-y-6 text-ink-soft leading-relaxed">
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Responsable del tratamiento</h2>
          <p>
            Grupo Warranty Global (Serseguro, Hiperservice y Asure Componentes) es
            responsable de los datos recogidos a través de este sitio web y los formularios
            de contacto e inscripción a WG Professional Network.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Finalidad</h2>
          <p>
            Gestionar la relación comercial, atender solicitudes de información, tramitar
            inscripciones a la red profesional y dar cumplimiento a obligaciones legales.
          </p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-ink mb-3">Derechos</h2>
          <p>
            Puedes ejercer en cualquier momento tus derechos de acceso, rectificación,
            supresión, oposición, limitación y portabilidad escribiendo a nuestro
            departamento de protección de datos.
          </p>
        </div>
      </div>
    </SimplePage>
  );
};

export default Privacidad;
