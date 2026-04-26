/**
 * Configuración global de i18n.
 *
 * - Idiomas soportados: ES (default), EN, PT, FR.
 * - Detecta el idioma del navegador en la primera visita; si no es soportado,
 *   cae a ES.
 * - Persiste la elección del usuario en localStorage bajo `wg:lang`.
 * - Namespaces: `common`, `header`, `footer`, `contacto`. Las páginas que se
 *   traduzcan en sprints siguientes añadirán su propio namespace.
 *
 * Las traducciones viven en `src/i18n/locales/<lang>/<namespace>.json` y se
 * importan estáticamente para no añadir un loader HTTP.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import esCommon from "./locales/es/common.json";
import esHeader from "./locales/es/header.json";
import esFooter from "./locales/es/footer.json";
import esContacto from "./locales/es/contacto.json";

import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enFooter from "./locales/en/footer.json";
import enContacto from "./locales/en/contacto.json";

import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptFooter from "./locales/pt/footer.json";
import ptContacto from "./locales/pt/contacto.json";

import frCommon from "./locales/fr/common.json";
import frHeader from "./locales/fr/header.json";
import frFooter from "./locales/fr/footer.json";
import frContacto from "./locales/fr/contacto.json";

export const SUPPORTED_LANGS = ["es", "en", "pt", "fr"] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<AppLang, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { common: esCommon, header: esHeader, footer: esFooter, contacto: esContacto },
      en: { common: enCommon, header: enHeader, footer: enFooter, contacto: enContacto },
      pt: { common: ptCommon, header: ptHeader, footer: ptFooter, contacto: ptContacto },
      fr: { common: frCommon, header: frHeader, footer: frFooter, contacto: frContacto },
    },
    fallbackLng: "es",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    nonExplicitSupportedLngs: true, // 'es-ES' -> 'es'
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React ya escapa
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "wg:lang",
      caches: ["localStorage"],
    },
    returnNull: false,
  });

// Mantén el atributo `lang` del <html> sincronizado con el idioma activo
const syncHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng.split("-")[0];
  }
};
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
