/**
 * Configuración global de i18n.
 *
 * - Idiomas soportados: ES (default), EN, PT, FR.
 * - Detecta el idioma del navegador en la primera visita; si no es soportado,
 *   cae a ES.
 * - Persiste la elección del usuario en localStorage bajo `wg:lang`.
 * - Namespaces: `common`, `header`, `footer`, `contacto` y los `home-*` que
 *   componen la portada (un namespace por bloque).
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
import esHomeHero from "./locales/es/home-hero.json";
import esHomeProblem from "./locales/es/home-problem.json";
import esHomeSolution from "./locales/es/home-solution.json";
import esHomeDifferential from "./locales/es/home-differential.json";
import esHomeServiceos from "./locales/es/home-serviceos.json";
import esHomeMetrics from "./locales/es/home-metrics.json";
import esHomeLifecycle from "./locales/es/home-lifecycle.json";
import esHomeSolutions from "./locales/es/home-solutions.json";
import esHomePlatform from "./locales/es/home-platform.json";
import esHomeIntelligence from "./locales/es/home-intelligence.json";
import esHomeIndustries from "./locales/es/home-industries.json";
import esHomeExperience from "./locales/es/home-experience.json";
import esHomeNetwork from "./locales/es/home-network.json";
import esHomeAbout from "./locales/es/home-about.json";
import esHomeClosing from "./locales/es/home-closing.json";
import esHomeDiagram from "./locales/es/home-diagram.json";

import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enFooter from "./locales/en/footer.json";
import enContacto from "./locales/en/contacto.json";
import enHomeHero from "./locales/en/home-hero.json";
import enHomeProblem from "./locales/en/home-problem.json";
import enHomeSolution from "./locales/en/home-solution.json";
import enHomeDifferential from "./locales/en/home-differential.json";
import enHomeServiceos from "./locales/en/home-serviceos.json";
import enHomeMetrics from "./locales/en/home-metrics.json";
import enHomeLifecycle from "./locales/en/home-lifecycle.json";
import enHomeSolutions from "./locales/en/home-solutions.json";
import enHomePlatform from "./locales/en/home-platform.json";
import enHomeIntelligence from "./locales/en/home-intelligence.json";
import enHomeIndustries from "./locales/en/home-industries.json";
import enHomeExperience from "./locales/en/home-experience.json";
import enHomeNetwork from "./locales/en/home-network.json";
import enHomeAbout from "./locales/en/home-about.json";
import enHomeClosing from "./locales/en/home-closing.json";
import enHomeDiagram from "./locales/en/home-diagram.json";

import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptFooter from "./locales/pt/footer.json";
import ptContacto from "./locales/pt/contacto.json";
import ptHomeHero from "./locales/pt/home-hero.json";
import ptHomeProblem from "./locales/pt/home-problem.json";
import ptHomeSolution from "./locales/pt/home-solution.json";
import ptHomeDifferential from "./locales/pt/home-differential.json";
import ptHomeServiceos from "./locales/pt/home-serviceos.json";
import ptHomeMetrics from "./locales/pt/home-metrics.json";
import ptHomeLifecycle from "./locales/pt/home-lifecycle.json";
import ptHomeSolutions from "./locales/pt/home-solutions.json";
import ptHomePlatform from "./locales/pt/home-platform.json";
import ptHomeIntelligence from "./locales/pt/home-intelligence.json";
import ptHomeIndustries from "./locales/pt/home-industries.json";
import ptHomeExperience from "./locales/pt/home-experience.json";
import ptHomeNetwork from "./locales/pt/home-network.json";
import ptHomeAbout from "./locales/pt/home-about.json";
import ptHomeClosing from "./locales/pt/home-closing.json";
import ptHomeDiagram from "./locales/pt/home-diagram.json";

import frCommon from "./locales/fr/common.json";
import frHeader from "./locales/fr/header.json";
import frFooter from "./locales/fr/footer.json";
import frContacto from "./locales/fr/contacto.json";
import frHomeHero from "./locales/fr/home-hero.json";
import frHomeProblem from "./locales/fr/home-problem.json";
import frHomeSolution from "./locales/fr/home-solution.json";
import frHomeDifferential from "./locales/fr/home-differential.json";
import frHomeServiceos from "./locales/fr/home-serviceos.json";
import frHomeMetrics from "./locales/fr/home-metrics.json";
import frHomeLifecycle from "./locales/fr/home-lifecycle.json";
import frHomeSolutions from "./locales/fr/home-solutions.json";
import frHomePlatform from "./locales/fr/home-platform.json";
import frHomeIntelligence from "./locales/fr/home-intelligence.json";
import frHomeIndustries from "./locales/fr/home-industries.json";
import frHomeExperience from "./locales/fr/home-experience.json";
import frHomeNetwork from "./locales/fr/home-network.json";
import frHomeAbout from "./locales/fr/home-about.json";
import frHomeClosing from "./locales/fr/home-closing.json";
import frHomeDiagram from "./locales/fr/home-diagram.json";

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
      es: {
        common: esCommon,
        header: esHeader,
        footer: esFooter,
        contacto: esContacto,
        "home-hero": esHomeHero,
        "home-problem": esHomeProblem,
        "home-solution": esHomeSolution,
        "home-differential": esHomeDifferential,
        "home-serviceos": esHomeServiceos,
        "home-metrics": esHomeMetrics,
        "home-lifecycle": esHomeLifecycle,
        "home-solutions": esHomeSolutions,
        "home-platform": esHomePlatform,
        "home-intelligence": esHomeIntelligence,
        "home-industries": esHomeIndustries,
        "home-experience": esHomeExperience,
        "home-network": esHomeNetwork,
        "home-about": esHomeAbout,
        "home-closing": esHomeClosing,
        "home-diagram": esHomeDiagram,
      },
      en: {
        common: enCommon,
        header: enHeader,
        footer: enFooter,
        contacto: enContacto,
        "home-hero": enHomeHero,
        "home-problem": enHomeProblem,
        "home-solution": enHomeSolution,
        "home-differential": enHomeDifferential,
        "home-serviceos": enHomeServiceos,
        "home-metrics": enHomeMetrics,
        "home-lifecycle": enHomeLifecycle,
        "home-solutions": enHomeSolutions,
        "home-platform": enHomePlatform,
        "home-intelligence": enHomeIntelligence,
        "home-industries": enHomeIndustries,
        "home-experience": enHomeExperience,
        "home-network": enHomeNetwork,
        "home-about": enHomeAbout,
        "home-closing": enHomeClosing,
        "home-diagram": enHomeDiagram,
      },
      pt: {
        common: ptCommon,
        header: ptHeader,
        footer: ptFooter,
        contacto: ptContacto,
        "home-hero": ptHomeHero,
        "home-problem": ptHomeProblem,
        "home-solution": ptHomeSolution,
        "home-differential": ptHomeDifferential,
        "home-serviceos": ptHomeServiceos,
        "home-metrics": ptHomeMetrics,
        "home-lifecycle": ptHomeLifecycle,
        "home-solutions": ptHomeSolutions,
        "home-platform": ptHomePlatform,
        "home-intelligence": ptHomeIntelligence,
        "home-industries": ptHomeIndustries,
        "home-experience": ptHomeExperience,
        "home-network": ptHomeNetwork,
        "home-about": ptHomeAbout,
        "home-closing": ptHomeClosing,
        "home-diagram": ptHomeDiagram,
      },
      fr: {
        common: frCommon,
        header: frHeader,
        footer: frFooter,
        contacto: frContacto,
        "home-hero": frHomeHero,
        "home-problem": frHomeProblem,
        "home-solution": frHomeSolution,
        "home-differential": frHomeDifferential,
        "home-serviceos": frHomeServiceos,
        "home-metrics": frHomeMetrics,
        "home-lifecycle": frHomeLifecycle,
        "home-solutions": frHomeSolutions,
        "home-platform": frHomePlatform,
        "home-intelligence": frHomeIntelligence,
        "home-industries": frHomeIndustries,
        "home-experience": frHomeExperience,
        "home-network": frHomeNetwork,
        "home-about": frHomeAbout,
        "home-closing": frHomeClosing,
        "home-diagram": frHomeDiagram,
      },
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
