/**
 * Configuración global de i18n.
 *
 * - Idiomas soportados: ES (default), EN, PT, FR.
 * - Detecta el idioma del navegador en la primera visita; si no es soportado,
 *   cae a ES.
 * - Persiste la elección del usuario en localStorage bajo `wg:lang`.
 * - Namespaces: `common`, `header`, `footer`, `breadcrumbs`, `contacto`,
 *   los `home-*` (uno por bloque de la home), las páginas marketing
 *   (`grupo`, `modelo`, `soluciones`, `plataforma`, `industrias`,
 *   `experiencia`, `marcas`, `aniversario`, `wg-network`), `inscripcion`,
 *   `portal` y `legal`.
 *
 * Las traducciones viven en `src/i18n/locales/<lang>/<namespace>.json` y se
 * importan estáticamente para no añadir un loader HTTP.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ---------- ES ----------
import esCommon from "./locales/es/common.json";
import esHeader from "./locales/es/header.json";
import esFooter from "./locales/es/footer.json";
import esBreadcrumbs from "./locales/es/breadcrumbs.json";
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
import esHomeExperienceMethod from "./locales/es/home-experience-method.json";
import esHomeExperienceGov from "./locales/es/home-experience-governance.json";
import esGrupo from "./locales/es/grupo.json";
import esModelo from "./locales/es/modelo.json";
import esSoluciones from "./locales/es/soluciones.json";
import esPlataforma from "./locales/es/plataforma.json";
import esIndustrias from "./locales/es/industrias.json";
import esExperiencia from "./locales/es/experiencia.json";
import esMarcas from "./locales/es/marcas.json";
import esAniversario from "./locales/es/aniversario.json";

// ---------- EN ----------
import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enFooter from "./locales/en/footer.json";
import enBreadcrumbs from "./locales/en/breadcrumbs.json";
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
import enHomeExperienceMethod from "./locales/en/home-experience-method.json";
import enHomeExperienceGov from "./locales/en/home-experience-governance.json";
import enGrupo from "./locales/en/grupo.json";
import enModelo from "./locales/en/modelo.json";
import enSoluciones from "./locales/en/soluciones.json";
import enPlataforma from "./locales/en/plataforma.json";
import enIndustrias from "./locales/en/industrias.json";
import enExperiencia from "./locales/en/experiencia.json";
import enMarcas from "./locales/en/marcas.json";
import enAniversario from "./locales/en/aniversario.json";

// ---------- PT ----------
import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptFooter from "./locales/pt/footer.json";
import ptBreadcrumbs from "./locales/pt/breadcrumbs.json";
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
import ptHomeExperienceMethod from "./locales/pt/home-experience-method.json";
import ptHomeExperienceGov from "./locales/pt/home-experience-governance.json";
import ptGrupo from "./locales/pt/grupo.json";
import ptModelo from "./locales/pt/modelo.json";
import ptSoluciones from "./locales/pt/soluciones.json";
import ptPlataforma from "./locales/pt/plataforma.json";
import ptIndustrias from "./locales/pt/industrias.json";
import ptExperiencia from "./locales/pt/experiencia.json";
import ptMarcas from "./locales/pt/marcas.json";
import ptAniversario from "./locales/pt/aniversario.json";

// ---------- FR ----------
import frCommon from "./locales/fr/common.json";
import frHeader from "./locales/fr/header.json";
import frFooter from "./locales/fr/footer.json";
import frBreadcrumbs from "./locales/fr/breadcrumbs.json";
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
import frHomeExperienceMethod from "./locales/fr/home-experience-method.json";
import frHomeExperienceGov from "./locales/fr/home-experience-governance.json";
import frGrupo from "./locales/fr/grupo.json";
import frModelo from "./locales/fr/modelo.json";
import frSoluciones from "./locales/fr/soluciones.json";
import frPlataforma from "./locales/fr/plataforma.json";
import frIndustrias from "./locales/fr/industrias.json";
import frExperiencia from "./locales/fr/experiencia.json";
import frMarcas from "./locales/fr/marcas.json";
import frAniversario from "./locales/fr/aniversario.json";

export const SUPPORTED_LANGS = ["es", "en", "pt", "fr"] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<AppLang, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
};

const buildBundle = (b: {
  common: unknown; header: unknown; footer: unknown; contacto: unknown;
  homeHero: unknown; homeProblem: unknown; homeSolution: unknown; homeDifferential: unknown;
  homeServiceos: unknown; homeMetrics: unknown; homeLifecycle: unknown; homeSolutions: unknown;
  homePlatform: unknown; homeIntelligence: unknown; homeIndustries: unknown; homeExperience: unknown;
  homeNetwork: unknown; homeAbout: unknown; homeClosing: unknown; homeDiagram: unknown;
  homeExperienceMethod: unknown; homeExperienceGov: unknown;
  grupo: unknown; modelo: unknown; soluciones: unknown; plataforma: unknown;
  industrias: unknown; experiencia: unknown; marcas: unknown; aniversario: unknown;
}) => ({
  common: b.common,
  header: b.header,
  footer: b.footer,
  contacto: b.contacto,
  "home-hero": b.homeHero,
  "home-problem": b.homeProblem,
  "home-solution": b.homeSolution,
  "home-differential": b.homeDifferential,
  "home-serviceos": b.homeServiceos,
  "home-metrics": b.homeMetrics,
  "home-lifecycle": b.homeLifecycle,
  "home-solutions": b.homeSolutions,
  "home-platform": b.homePlatform,
  "home-intelligence": b.homeIntelligence,
  "home-industries": b.homeIndustries,
  "home-experience": b.homeExperience,
  "home-network": b.homeNetwork,
  "home-about": b.homeAbout,
  "home-closing": b.homeClosing,
  "home-diagram": b.homeDiagram,
  "home-experience-method": b.homeExperienceMethod,
  "home-experience-governance": b.homeExperienceGov,
  grupo: b.grupo,
  modelo: b.modelo,
  soluciones: b.soluciones,
  plataforma: b.plataforma,
  industrias: b.industrias,
  experiencia: b.experiencia,
  marcas: b.marcas,
  aniversario: b.aniversario,
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: buildBundle({
        common: esCommon, header: esHeader, footer: esFooter, contacto: esContacto,
        homeHero: esHomeHero, homeProblem: esHomeProblem, homeSolution: esHomeSolution,
        homeDifferential: esHomeDifferential, homeServiceos: esHomeServiceos,
        homeMetrics: esHomeMetrics, homeLifecycle: esHomeLifecycle, homeSolutions: esHomeSolutions,
        homePlatform: esHomePlatform, homeIntelligence: esHomeIntelligence,
        homeIndustries: esHomeIndustries, homeExperience: esHomeExperience,
        homeNetwork: esHomeNetwork, homeAbout: esHomeAbout, homeClosing: esHomeClosing,
        homeDiagram: esHomeDiagram, homeExperienceMethod: esHomeExperienceMethod,
        homeExperienceGov: esHomeExperienceGov,
        grupo: esGrupo, modelo: esModelo, soluciones: esSoluciones, plataforma: esPlataforma,
        industrias: esIndustrias, experiencia: esExperiencia, marcas: esMarcas, aniversario: esAniversario,
      }),
      en: buildBundle({
        common: enCommon, header: enHeader, footer: enFooter, contacto: enContacto,
        homeHero: enHomeHero, homeProblem: enHomeProblem, homeSolution: enHomeSolution,
        homeDifferential: enHomeDifferential, homeServiceos: enHomeServiceos,
        homeMetrics: enHomeMetrics, homeLifecycle: enHomeLifecycle, homeSolutions: enHomeSolutions,
        homePlatform: enHomePlatform, homeIntelligence: enHomeIntelligence,
        homeIndustries: enHomeIndustries, homeExperience: enHomeExperience,
        homeNetwork: enHomeNetwork, homeAbout: enHomeAbout, homeClosing: enHomeClosing,
        homeDiagram: enHomeDiagram, homeExperienceMethod: enHomeExperienceMethod,
        homeExperienceGov: enHomeExperienceGov,
        grupo: enGrupo, modelo: enModelo, soluciones: enSoluciones, plataforma: enPlataforma,
        industrias: enIndustrias, experiencia: enExperiencia, marcas: enMarcas, aniversario: enAniversario,
      }),
      pt: buildBundle({
        common: ptCommon, header: ptHeader, footer: ptFooter, contacto: ptContacto,
        homeHero: ptHomeHero, homeProblem: ptHomeProblem, homeSolution: ptHomeSolution,
        homeDifferential: ptHomeDifferential, homeServiceos: ptHomeServiceos,
        homeMetrics: ptHomeMetrics, homeLifecycle: ptHomeLifecycle, homeSolutions: ptHomeSolutions,
        homePlatform: ptHomePlatform, homeIntelligence: ptHomeIntelligence,
        homeIndustries: ptHomeIndustries, homeExperience: ptHomeExperience,
        homeNetwork: ptHomeNetwork, homeAbout: ptHomeAbout, homeClosing: ptHomeClosing,
        homeDiagram: ptHomeDiagram, homeExperienceMethod: ptHomeExperienceMethod,
        homeExperienceGov: ptHomeExperienceGov,
        grupo: ptGrupo, modelo: ptModelo, soluciones: ptSoluciones, plataforma: ptPlataforma,
        industrias: ptIndustrias, experiencia: ptExperiencia, marcas: ptMarcas, aniversario: ptAniversario,
      }),
      fr: buildBundle({
        common: frCommon, header: frHeader, footer: frFooter, contacto: frContacto,
        homeHero: frHomeHero, homeProblem: frHomeProblem, homeSolution: frHomeSolution,
        homeDifferential: frHomeDifferential, homeServiceos: frHomeServiceos,
        homeMetrics: frHomeMetrics, homeLifecycle: frHomeLifecycle, homeSolutions: frHomeSolutions,
        homePlatform: frHomePlatform, homeIntelligence: frHomeIntelligence,
        homeIndustries: frHomeIndustries, homeExperience: frHomeExperience,
        homeNetwork: frHomeNetwork, homeAbout: frHomeAbout, homeClosing: frHomeClosing,
        homeDiagram: frHomeDiagram, homeExperienceMethod: frHomeExperienceMethod,
        homeExperienceGov: frHomeExperienceGov,
        grupo: frGrupo, modelo: frModelo, soluciones: frSoluciones, plataforma: frPlataforma,
        industrias: frIndustrias, experiencia: frExperiencia, marcas: frMarcas, aniversario: frAniversario,
      }),
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
