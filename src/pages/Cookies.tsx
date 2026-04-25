import { useEffect } from "react";
import { SimplePage } from "@/components/site/SimplePage";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const COOKIE_TABLE: Array<{
  name: string;
  provider: string;
  type: "Propia" | "Terceros";
  category: "Necesaria" | "Preferencias" | "Analítica" | "Marketing";
  purpose: string;
  duration: string;
}> = [
  {
    name: "wg:cookie-consent:v1",
    provider: "grupowg.com",
    type: "Propia",
    category: "Necesaria",
    purpose: "Almacena tu decisión sobre el uso de cookies y la fecha del consentimiento.",
    duration: "24 meses",
  },
  {
    name: "wg:contacto:draft:v1",
    provider: "grupowg.com",
    type: "Propia",
    category: "Preferencias",
    purpose:
      "Guarda de forma local el borrador del formulario de contacto para no perder los datos al recargar.",
    duration: "7 días",
  },
  {
    name: "sb-* (Lovable Cloud)",
    provider: "grupowg.com",
    type: "Propia",
    category: "Necesaria",
    purpose:
      "Cookies de sesión y autenticación del portal de colaboradores. Imprescindibles para iniciar sesión.",
    duration: "Sesión / 1 año",
  },
  {
    name: "_ga, _ga_*",
    provider: "Google Ireland Ltd.",
    type: "Terceros",
    category: "Analítica",
    purpose:
      "Estadísticas agregadas de uso del sitio (páginas vistas, sesiones, dispositivo) con IP anonimizada.",
    duration: "Hasta 24 meses",
  },
  {
    name: "_gid",
    provider: "Google Ireland Ltd.",
    type: "Terceros",
    category: "Analítica",
    purpose: "Distinguir usuarios de forma anónima durante la sesión.",
    duration: "24 horas",
  },
  {
    name: "_fbp",
    provider: "Meta Platforms Ireland Ltd.",
    type: "Terceros",
    category: "Marketing",
    purpose:
      "Identificador de navegador para medir conversiones de campañas y mostrar contenido relevante.",
    duration: "3 meses",
  },
];

const Cookies = () => {
  const { openPreferences, withdraw, consent, version } = useCookieConsent();

  useEffect(() => {
    document.title = "Política de cookies · Grupo Warranty Global";
    const desc =
      "Información sobre las cookies que utiliza grupowg.com, sus finalidades, duración, proveedores y cómo configurarlas o retirar tu consentimiento.";
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
      title="Política de cookies"
      intro="Esta política explica qué cookies utilizamos en grupowg.com, con qué finalidad, durante cuánto tiempo y cómo puedes configurarlas o retirar tu consentimiento en cualquier momento, conforme al art. 22 LSSI-CE y la Guía sobre el uso de cookies de la AEPD."
    >
      <div className="max-w-4xl space-y-10 text-ink-soft leading-relaxed">
        {/* Acciones rápidas */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm text-foreground font-medium">
            Configura tu consentimiento
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Puedes modificar tu elección o retirar el consentimiento en cualquier
            momento. La retirada no afecta a la licitud del tratamiento previo.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={openPreferences}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-ink text-bone hover:bg-ink/90 transition-colors"
            >
              Configurar cookies
            </button>
            {consent && (
              <button
                type="button"
                onClick={withdraw}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Retirar consentimiento
              </button>
            )}
          </div>
          {consent && (
            <p className="mt-4 text-xs text-muted-foreground">
              Última decisión:{" "}
              <span className="font-medium text-foreground">
                {consent.decision === "accept_all"
                  ? "Aceptar todo"
                  : consent.decision === "reject_all"
                    ? "Rechazar todo"
                    : "Personalizado"}
              </span>{" "}
              · Guardada el{" "}
              {new Date(consent.acceptedAt).toLocaleString("es-ES", {
                dateStyle: "long",
                timeStyle: "short",
              })}{" "}
              · Caduca el{" "}
              {new Date(consent.expiresAt).toLocaleDateString("es-ES", {
                dateStyle: "long",
              })}{" "}
              · Versión {version}
            </p>
          )}
        </div>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">¿Qué es una cookie?</h2>
          <p>
            Una cookie es un pequeño fichero de datos que un sitio web guarda en tu
            navegador. Sirve para que el sitio recuerde información sobre tu visita
            (idioma, sesión, preferencias) o para obtener estadísticas de uso. La Ley
            34/2002 (LSSI-CE) y el RGPD exigen tu consentimiento informado para
            cualquier cookie que no sea estrictamente necesaria.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            Tipos de cookies que utilizamos
          </h2>
          <ul className="space-y-3">
            <li>
              <strong className="text-ink">Estrictamente necesarias:</strong>{" "}
              imprescindibles para el funcionamiento (sesión, seguridad, recordar tu
              propio consentimiento). No requieren consentimiento.
            </li>
            <li>
              <strong className="text-ink">Preferencias:</strong> recuerdan
              elecciones tuyas como borradores de formulario o ajustes de
              visualización.
            </li>
            <li>
              <strong className="text-ink">Analíticas:</strong> nos permiten conocer
              de forma agregada cómo se usa el sitio para mejorarlo.
            </li>
            <li>
              <strong className="text-ink">Marketing:</strong> miden eficacia de
              campañas y permiten mostrar contenido más relevante.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            Detalle de cookies utilizadas
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Las cookies de terceros solo se cargan tras tu consentimiento explícito a
            la categoría correspondiente.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-ink">Cookie</th>
                  <th className="px-4 py-3 font-medium text-ink">Proveedor</th>
                  <th className="px-4 py-3 font-medium text-ink">Tipo</th>
                  <th className="px-4 py-3 font-medium text-ink">Categoría</th>
                  <th className="px-4 py-3 font-medium text-ink">Finalidad</th>
                  <th className="px-4 py-3 font-medium text-ink">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COOKIE_TABLE.map((c) => (
                  <tr key={c.name} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.provider}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs">
                      {c.purpose}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            Transferencias internacionales
          </h2>
          <p>
            Algunos proveedores (Google, Meta) pueden tratar datos fuera del Espacio
            Económico Europeo. En esos casos, las transferencias se amparan en las
            Cláusulas Contractuales Tipo aprobadas por la Comisión Europea y/o en
            decisiones de adecuación, conforme al Capítulo V del RGPD.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            Cómo gestionar las cookies en tu navegador
          </h2>
          <p>
            Además de la herramienta de configuración de este sitio, puedes
            bloquear o eliminar cookies desde la configuración de tu navegador:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">
            Vigencia y cambios en la política
          </h2>
          <p>
            Esta política puede actualizarse para adaptarla a cambios normativos o a
            nuevas funcionalidades del sitio. Cuando los cambios sean sustanciales
            (nuevas categorías, nuevas finalidades) volveremos a solicitar tu
            consentimiento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink mb-3">Contacto</h2>
          <p>
            Para cualquier consulta sobre cookies o protección de datos, escribe a{" "}
            <a
              href="mailto:info@grupowg.com"
              className="underline hover:text-ink font-medium"
            >
              info@grupowg.com
            </a>
            .
          </p>
        </section>
      </div>
    </SimplePage>
  );
};

export default Cookies;
