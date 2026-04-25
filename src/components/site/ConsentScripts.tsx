import { useEffect } from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

// IDs por defecto (placeholders). Si los dejas vacíos, no se carga nada.
// Reemplaza por los IDs reales cuando los tengas (idealmente en variables de entorno).
const GA_MEASUREMENT_ID = ""; // p.ej. "G-XXXXXXXXXX"
const META_PIXEL_ID = ""; // p.ej. "1234567890"

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const SCRIPT_FLAGS = {
  ga: "data-wg-cookie-script-ga",
  meta: "data-wg-cookie-script-meta",
} as const;

const removeScriptsByFlag = (flag: string) => {
  document.querySelectorAll(`script[${flag}]`).forEach((el) => el.remove());
};

const loadGA4 = (id: string) => {
  if (!id) return;
  if (document.querySelector(`script[${SCRIPT_FLAGS.ga}]`)) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.setAttribute(SCRIPT_FLAGS.ga, "loader");
  document.head.appendChild(s);

  const init = document.createElement("script");
  init.setAttribute(SCRIPT_FLAGS.ga, "init");
  init.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'granted'
    });
    gtag('config', '${id}', { anonymize_ip: true });
  `;
  document.head.appendChild(init);
};

const unloadGA4 = () => {
  removeScriptsByFlag(SCRIPT_FLAGS.ga);
  // limpiar cookies _ga / _gid del dominio
  if (typeof document !== "undefined") {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name && (name === "_ga" || name.startsWith("_ga_") || name === "_gid")) {
        const domain = window.location.hostname.replace(/^www\./, "");
        document.cookie = `${name}=; Max-Age=0; path=/;`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain};`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain};`;
      }
    });
  }
  window.gtag = undefined;
};

const loadMetaPixel = (id: string) => {
  if (!id) return;
  if (document.querySelector(`script[${SCRIPT_FLAGS.meta}]`)) return;

  const s = document.createElement("script");
  s.setAttribute(SCRIPT_FLAGS.meta, "init");
  s.text = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;t.setAttribute('${SCRIPT_FLAGS.meta}','loader');
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${id}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(s);
};

const unloadMetaPixel = () => {
  removeScriptsByFlag(SCRIPT_FLAGS.meta);
  if (typeof document !== "undefined") {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name && (name === "_fbp" || name === "_fbc")) {
        const domain = window.location.hostname.replace(/^www\./, "");
        document.cookie = `${name}=; Max-Age=0; path=/;`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain};`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain};`;
      }
    });
  }
  window.fbq = undefined;
  window._fbq = undefined;
};

/**
 * Carga / descarga de scripts de terceros según el consentimiento.
 * Renderiza nada — solo efectos secundarios.
 */
export const ConsentScripts = () => {
  const { ready, isCategoryEnabled } = useCookieConsent();

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    if (isCategoryEnabled("analytics")) {
      loadGA4(GA_MEASUREMENT_ID);
    } else {
      unloadGA4();
    }

    if (isCategoryEnabled("marketing")) {
      loadMetaPixel(META_PIXEL_ID);
    } else {
      unloadMetaPixel();
    }
  }, [ready, isCategoryEnabled]);

  return null;
};
