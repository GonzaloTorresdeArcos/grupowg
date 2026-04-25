import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SimplePage } from "@/components/site/SimplePage";
import { AccessibilityRequestForm } from "@/components/site/AccessibilityRequestForm";

const Accesibilidad = () => {
  useEffect(() => {
    document.title = "Declaración de accesibilidad · Grupo Warranty Global";
    const desc =
      "Declaración de accesibilidad de grupowg.com conforme al Real Decreto 1112/2018 y a la norma UNE-EN 301 549 (WCAG 2.1 nivel AA).";
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  const today = new Date().toLocaleDateString("es-ES", { dateStyle: "long" });

  return (
    <SimplePage
      eyebrow="Legal"
      title="Declaración de accesibilidad"
      intro="Grupo Warranty Global se compromete a hacer accesible su sitio web grupowg.com, de conformidad con el Real Decreto 1112/2018, de 7 de septiembre, por el que se transpone al ordenamiento jurídico español la Directiva (UE) 2016/2102."
    >
      <div className="max-w-3xl space-y-8 text-ink-soft leading-relaxed">
        <p className="text-sm text-muted-foreground">
          Última revisión: {today}
        </p>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            1. Situación de cumplimiento
          </h2>
          <p>
            Este sitio web es <strong className="text-ink">parcialmente conforme</strong> con
            la norma <strong className="text-ink">UNE-EN 301 549:2022</strong> (que recoge las
            <span> </span>WCAG 2.1 nivel AA), debido a las excepciones y a la falta de
            conformidad de los aspectos que se indican a continuación.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            2. Contenido no accesible
          </h2>
          <p>
            El contenido que se recoge a continuación no es accesible por lo siguiente:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-2">
            <li>
              <strong className="text-ink">Falta de conformidad con el RD 1112/2018:</strong>
              <ul className="list-[circle] pl-5 mt-2 space-y-1">
                <li>
                  Algunas imágenes decorativas o de apoyo pueden no disponer de un
                  texto alternativo equivalente.
                </li>
                <li>
                  Determinados componentes interactivos pueden presentar una relación
                  de contraste inferior a la requerida en estados específicos
                  (hover/focus).
                </li>
                <li>
                  Algunos documentos PDF anteriores a 2024 publicados pueden no ser
                  totalmente accesibles.
                </li>
              </ul>
            </li>
            <li>
              <strong className="text-ink">Carga desproporcionada:</strong> no aplica.
            </li>
            <li>
              <strong className="text-ink">Contenido no incluido en el ámbito de la
              legislación aplicable:</strong> mapas interactivos de terceros (siempre que
              se proporcione la información esencial en formato accesible alternativo) y
              contenidos embebidos de redes sociales.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            3. Preparación de la declaración
          </h2>
          <p>
            La presente declaración fue preparada el {today}. El método empleado ha
            sido una <strong className="text-ink">autoevaluación</strong> llevada a cabo por
            el propio equipo de Grupo Warranty Global, basada en la revisión de los
            criterios de conformidad WCAG 2.1 nivel AA.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            4. Observaciones y datos de contacto
          </h2>
          <p>
            Puede realizar comunicaciones sobre requisitos de accesibilidad (artículo
            10.2.a del RD 1112/2018) como, por ejemplo:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>Informar sobre cualquier posible incumplimiento por parte de este sitio.</li>
            <li>Transmitir otras dificultades de acceso al contenido.</li>
            <li>Formular cualquier otra consulta o sugerencia de mejora.</li>
          </ul>
          <p className="mt-4">
            Contacto:{" "}
            <a href="mailto:info@grupowg.com" className="underline hover:text-ink">
              info@grupowg.com
            </a>
            . Las comunicaciones serán recibidas y tratadas por el equipo responsable de
            accesibilidad del sitio.
          </p>
        </section>

        <section id="formulario" className="scroll-mt-24">
          <h2 className="font-display text-2xl text-ink mb-3">
            5. Formulario de comunicaciones de accesibilidad
          </h2>
          <p className="mb-5">
            Utiliza este formulario para presentar <strong className="text-ink">solicitudes de
            información accesible</strong>, <strong className="text-ink">quejas</strong>,{" "}
            <strong className="text-ink">reclamaciones</strong> o{" "}
            <strong className="text-ink">sugerencias de mejora</strong>. Responderemos en el
            plazo máximo de veinte días hábiles, conforme al artículo 12 del RD 1112/2018.
          </p>
          <AccessibilityRequestForm />
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            6. Procedimiento de aplicación
          </h2>
          <p>
            Si una vez realizada una solicitud de información accesible o queja, ésta
            hubiera sido desestimada, no se estuviera de acuerdo con la decisión adoptada
            o la respuesta no cumpliera los requisitos del artículo 12.5 del RD 1112/2018,
            la persona interesada podrá iniciar una{" "}
            <strong className="text-ink">reclamación</strong> para conocer y oponerse a los
            motivos de la desestimación, instar la adopción de las medidas oportunas o
            exponer las razones por las que se considera que la respuesta no cumple los
            requisitos exigidos. Igualmente se podrá iniciar una reclamación en caso de
            haber transcurrido el plazo de veinte días hábiles sin haber obtenido respuesta.
          </p>
          <p className="mt-3">
            La reclamación podrá presentarse a través de la dirección de correo
            electrónico indicada en el apartado 4.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            7. Contenido opcional
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              El sitio está diseñado siguiendo principios de diseño accesible: estructura
              semántica HTML5, navegación por teclado, foco visible, jerarquía de
              encabezados y uso de tokens de color con contraste adecuado.
            </li>
            <li>
              Se utilizan tipografías legibles y tamaños relativos que permiten al
              usuario ampliar el texto hasta un 200% sin pérdida de funcionalidad.
            </li>
            <li>
              El sitio es responsive y se adapta a distintos tamaños de pantalla y
              orientaciones.
            </li>
            <li>
              Compatibilidad probada con las últimas versiones de los principales
              navegadores (Chrome, Firefox, Safari, Edge).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            8. Normativa aplicable
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Real Decreto 1112/2018, de 7 de septiembre, sobre accesibilidad de los sitios web y aplicaciones para dispositivos móviles del sector público.</li>
            <li>Directiva (UE) 2016/2102 del Parlamento Europeo y del Consejo.</li>
            <li>Norma UNE-EN 301 549:2022 (WCAG 2.1 nivel AA).</li>
          </ul>
          <p className="mt-4">
            Consulta también nuestra{" "}
            <Link to="/legal/privacidad" className="underline hover:text-ink">
              Política de privacidad
            </Link>
            , el{" "}
            <Link to="/legal/aviso-legal" className="underline hover:text-ink">
              Aviso legal
            </Link>{" "}
            y la{" "}
            <Link to="/legal/cookies" className="underline hover:text-ink">
              Política de cookies
            </Link>
            .
          </p>
        </section>
      </div>
    </SimplePage>
  );
};

export default Accesibilidad;
