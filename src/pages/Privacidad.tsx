import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SimplePage } from "@/components/site/SimplePage";

const Privacidad = () => {
  useEffect(() => {
    document.title = "Política de privacidad · Grupo Warranty Global";
    const desc =
      "Información sobre el tratamiento de datos personales en Grupo Warranty Global, conforme al RGPD y la LOPDGDD: responsable, finalidades, base legítima, destinatarios, conservación y derechos.";
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  return (
    <SimplePage
      eyebrow="Legal"
      title="Política de privacidad"
      intro="Información sobre el tratamiento de datos personales en Grupo Warranty Global, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)."
    >
      <div className="max-w-3xl space-y-8 text-ink-soft leading-relaxed">
        <p className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}
        </p>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            1. Responsable del tratamiento
          </h2>
          <ul className="space-y-1.5">
            <li><strong className="text-ink">Razón social:</strong> Grupo Warranty Global (denominación comercial bajo la que operan Serseguro, Hiperservice y Asure Componentes).</li>
            <li><strong className="text-ink">CIF:</strong> [pendiente de cumplimentar]</li>
            <li><strong className="text-ink">Domicilio:</strong> España [dirección postal completa pendiente de cumplimentar]</li>
            <li><strong className="text-ink">Email de contacto:</strong>{" "}
              <a href="mailto:info@grupowg.com" className="underline hover:text-ink">
                info@grupowg.com
              </a>
            </li>
            <li><strong className="text-ink">Delegado de Protección de Datos (DPD):</strong> [pendiente de designar / email]</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            2. Finalidades del tratamiento
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-ink">Atención de consultas y solicitudes</strong>{" "}
              recibidas a través del formulario de contacto y del email corporativo.
            </li>
            <li>
              <strong className="text-ink">Gestión de la red WG Professional Network:</strong>{" "}
              tramitación de inscripciones de colaboradores, evaluación de candidaturas y
              ejecución del contrato de colaboración.
            </li>
            <li>
              <strong className="text-ink">Gestión operativa de incidencias y servicio postventa</strong>{" "}
              en nombre de nuestros clientes (fabricantes, distribuidores, aseguradoras).
            </li>
            <li>
              <strong className="text-ink">Cumplimiento de obligaciones legales,</strong>{" "}
              fiscales y contables.
            </li>
            <li>
              <strong className="text-ink">Análisis estadístico de uso del sitio</strong>{" "}
              y, en su caso, comunicaciones comerciales, sólo si has prestado tu
              consentimiento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            3. Base jurídica del tratamiento
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-ink">Consentimiento del interesado</strong> (art. 6.1.a
              RGPD): formularios de contacto, suscripciones, cookies analíticas y de
              marketing.
            </li>
            <li>
              <strong className="text-ink">Ejecución de un contrato</strong> (art. 6.1.b RGPD):
              relación con colaboradores de la red, prestación de servicios.
            </li>
            <li>
              <strong className="text-ink">Cumplimiento de una obligación legal</strong> (art.
              6.1.c RGPD): facturación, contabilidad, requerimientos administrativos.
            </li>
            <li>
              <strong className="text-ink">Interés legítimo</strong> (art. 6.1.f RGPD): seguridad
              del sitio, prevención del fraude, comunicaciones a clientes existentes
              sobre servicios análogos.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            4. Categorías de datos tratados
          </h2>
          <p>
            Datos identificativos (nombre, empresa), datos de contacto (email, teléfono,
            dirección), datos profesionales (CIF, capacidad técnica, marcas trabajadas
            en el caso de colaboradores) y datos de navegación cuando hayas consentido
            cookies analíticas o de marketing. No tratamos categorías especiales del
            art. 9 RGPD salvo consentimiento explícito o base habilitante específica.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            5. Plazos de conservación
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Consultas de contacto: hasta 12 meses desde la última interacción, salvo
              que deriven en una relación contractual.
            </li>
            <li>
              Datos contractuales (clientes, colaboradores): durante la vigencia del
              contrato y los plazos legales de prescripción posteriores (hasta 6 años
              en materia mercantil/fiscal).
            </li>
            <li>
              Cookies y datos de navegación: según se indica en la{" "}
              <Link to="/legal/cookies" className="underline hover:text-ink">
                Política de cookies
              </Link>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            6. Destinatarios y encargados del tratamiento
          </h2>
          <p>
            No cedemos tus datos a terceros salvo obligación legal. Sí los comunicamos
            a proveedores que actúan como{" "}
            <em>encargados del tratamiento</em> bajo contrato (art. 28 RGPD), entre
            otros: proveedor de hosting y backend (Lovable Cloud / Supabase), servicios
            de envío de email transaccional, herramientas de analítica y, en el caso
            de colaboradores aprobados, los clientes para los que se preste servicio.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            7. Transferencias internacionales
          </h2>
          <p>
            Algunos de nuestros proveedores pueden tratar datos fuera del EEE. En esos
            casos contamos con garantías adecuadas conforme al Capítulo V del RGPD
            (Cláusulas Contractuales Tipo de la Comisión Europea y/o decisiones de
            adecuación).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            8. Tus derechos
          </h2>
          <p>
            Puedes ejercer en cualquier momento tus derechos de{" "}
            <strong className="text-ink">
              acceso, rectificación, supresión, oposición, limitación, portabilidad
            </strong>{" "}
            y a no ser objeto de decisiones automatizadas escribiendo a{" "}
            <a href="mailto:info@grupowg.com" className="underline hover:text-ink">
              info@grupowg.com
            </a>{" "}
            indicando el derecho que ejercitas y acompañando copia de un documento
            identificativo. Asimismo, puedes retirar el consentimiento prestado en
            cualquier momento, sin que ello afecte a la licitud del tratamiento previo.
          </p>
          <p className="mt-3">
            Si consideras que el tratamiento no se ajusta a la normativa, puedes
            presentar una reclamación ante la{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-ink"
            >
              Agencia Española de Protección de Datos (AEPD)
            </a>
            , c/ Jorge Juan, 6 · 28001 Madrid.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            9. Medidas de seguridad
          </h2>
          <p>
            Aplicamos medidas técnicas y organizativas apropiadas para garantizar un
            nivel de seguridad adecuado al riesgo (art. 32 RGPD): cifrado en tránsito
            (TLS), control de accesos por roles, registros de actividad, copias de
            seguridad y auditorías periódicas a nuestros encargados del tratamiento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            10. Menores de edad
          </h2>
          <p>
            Nuestros servicios están dirigidos a profesionales y empresas. No
            recogemos conscientemente datos de menores de 14 años. Si detectas que un
            menor nos ha facilitado datos sin consentimiento, contacta con nosotros
            para eliminarlos.
          </p>
        </section>
      </div>
    </SimplePage>
  );
};

export default Privacidad;
