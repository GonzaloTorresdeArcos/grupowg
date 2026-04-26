import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SimplePage } from "@/components/site/SimplePage";

const AvisoLegal = () => {
  const { t, i18n } = useTranslation("legal");
  useEffect(() => {
    document.title = t("legalNotice.seoTitle");
    const desc = t("legalNotice.seoDesc");
    let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, [t]);

  const isEs = i18n.language.startsWith("es");

  return (
    <SimplePage eyebrow={t("eyebrow")} title={t("legalNotice.title")} intro={t("legalNotice.intro")}>
      {!isEs && (
        <div className="max-w-3xl mb-8 rounded-lg border-l-4 border-teal bg-teal/5 px-4 py-3 text-sm text-ink-soft">
          {t("officialNotice")}
        </div>
      )}
      <div className="max-w-3xl space-y-8 text-ink-soft leading-relaxed">
        <p className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}
        </p>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            1. Datos identificativos del titular
          </h2>
          <ul className="space-y-1.5">
            <li><strong className="text-ink">Titular:</strong> Grupo Warranty Global (Serseguro, Hiperservice y Asure Componentes).</li>
            <li><strong className="text-ink">CIF:</strong> [pendiente de cumplimentar]</li>
            <li><strong className="text-ink">Domicilio social:</strong> España [dirección postal completa pendiente de cumplimentar]</li>
            <li><strong className="text-ink">Datos registrales:</strong> [Registro Mercantil, tomo, folio, hoja — pendiente]</li>
            <li><strong className="text-ink">Email:</strong>{" "}
              <a href="mailto:info@grupowg.com" className="underline hover:text-ink">
                info@grupowg.com
              </a>
            </li>
            <li><strong className="text-ink">Sitio web:</strong> grupowg.com</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            2. Objeto y ámbito
          </h2>
          <p>
            El presente Aviso Legal regula el acceso y uso del sitio web grupowg.com
            (en adelante, el "Sitio"). El acceso al Sitio atribuye la condición de
            usuario e implica la aceptación plena de todas las cláusulas aquí
            recogidas, así como de la{" "}
            <Link to="/legal/privacidad" className="underline hover:text-ink">
              Política de privacidad
            </Link>{" "}
            y la{" "}
            <Link to="/legal/cookies" className="underline hover:text-ink">
              Política de cookies
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            3. Condiciones de uso
          </h2>
          <p>
            El usuario se compromete a hacer un uso adecuado y lícito del Sitio y de
            sus contenidos, conforme a la normativa aplicable, la moral y las buenas
            costumbres. En particular, se compromete a no:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>Utilizar los contenidos con fines o efectos contrarios a la ley.</li>
            <li>Realizar acciones que dañen, sobrecarguen o deterioren el Sitio o impidan su normal utilización.</li>
            <li>Introducir o difundir virus, código malicioso o cualquier elemento que pueda alterar el Sitio o sus sistemas.</li>
            <li>Acceder sin autorización a áreas restringidas del Sitio.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            4. Propiedad intelectual e industrial
          </h2>
          <p>
            Todos los contenidos del Sitio (textos, imágenes, vídeos, logotipos, marcas,
            diseños gráficos, código fuente y bases de datos) son titularidad de Grupo
            Warranty Global o de terceros que han autorizado su uso, y están protegidos
            por la legislación española e internacional sobre propiedad intelectual e
            industrial.
          </p>
          <p className="mt-3">
            Queda expresamente prohibida la reproducción, distribución, comunicación
            pública, transformación o cualquier otra forma de explotación, total o
            parcial, sin autorización expresa y por escrito del titular.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            5. Responsabilidad y exclusión de garantías
          </h2>
          <p>
            Grupo Warranty Global no garantiza la disponibilidad y continuidad
            permanente del Sitio. En la medida permitida por la ley, queda excluida
            cualquier responsabilidad por los daños y perjuicios derivados de la falta
            de disponibilidad o de la presencia de virus o elementos lesivos.
          </p>
          <p className="mt-3">
            El Sitio puede contener enlaces a sitios de terceros sobre los que Grupo
            Warranty Global no ejerce control. La inclusión de enlaces no implica
            recomendación ni asunción de responsabilidad sobre dichos contenidos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            6. Protección de datos
          </h2>
          <p>
            El tratamiento de datos personales recabados a través del Sitio se rige por
            la{" "}
            <Link to="/legal/privacidad" className="underline hover:text-ink">
              Política de privacidad
            </Link>
            , que forma parte integrante de este Aviso Legal.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            7. Modificaciones
          </h2>
          <p>
            Grupo Warranty Global se reserva el derecho a efectuar, en cualquier
            momento y sin previo aviso, modificaciones en la información contenida en
            el Sitio o en su configuración y presentación.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            8. Legislación aplicable y jurisdicción
          </h2>
          <p>
            Las presentes condiciones se rigen por la legislación española. Para la
            resolución de cualquier controversia derivada del acceso o uso del Sitio,
            las partes se someten a los Juzgados y Tribunales del domicilio del
            titular, salvo que la normativa aplicable disponga otro fuero
            imperativamente.
          </p>
        </section>
      </div>
    </SimplePage>
  );
};

export default AvisoLegal;
