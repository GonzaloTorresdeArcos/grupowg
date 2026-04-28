/**
 * Blank Screen Detector
 * -----------------------------------------------------------
 * Observa cambios de ruta y, tras un breve margen para que React
 * pinte, comprueba si el contenido visible está "vacío".
 * Si lo está, registra en consola y en `window.__blankScreenLog`
 * un informe con: URL, idioma, timestamp y errores de consola
 * recientes.
 *
 * Uso: importar una vez en `src/main.tsx`:
 *   import { initBlankScreenDetector } from "@/lib/blank-screen-detector";
 *   if (import.meta.env.DEV) initBlankScreenDetector();
 */

export interface BlankScreenReport {
  timestamp: string;
  url: string;
  pathname: string;
  language: string;
  viewport: { w: number; h: number };
  visibleText: number;
  visibleNodes: number;
  recentErrors: string[];
}

declare global {
  interface Window {
    __blankScreenLog?: BlankScreenReport[];
    __blankScreenDetectorInstalled?: boolean;
  }
}

const RECENT_ERRORS: string[] = [];
const MAX_ERRORS = 20;
const CHECK_DELAY_MS = 1200; // margen para render + Suspense

function recordError(msg: string) {
  RECENT_ERRORS.push(`[${new Date().toISOString()}] ${msg}`);
  if (RECENT_ERRORS.length > MAX_ERRORS) RECENT_ERRORS.shift();
}

function getActiveLanguage(): string {
  return (
    document.documentElement.lang ||
    (navigator.language ?? "unknown")
  );
}

function measureContent(root: HTMLElement) {
  // Texto visible (sin scripts/styles)
  const text = (root.innerText || "").trim();
  // Nodos significativos en viewport
  const nodes = root.querySelectorAll(
    "main, section, article, h1, h2, h3, p, img, button, a, form, table"
  ).length;
  return { text: text.length, nodes };
}

function isBlank(root: HTMLElement): { blank: boolean; text: number; nodes: number } {
  const { text, nodes } = measureContent(root);
  // Heurística: muy poco texto y casi sin nodos semánticos
  const blank = text < 20 && nodes < 3;
  return { blank, text, nodes };
}

function buildReport(text: number, nodes: number): BlankScreenReport {
  return {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    pathname: window.location.pathname + window.location.search + window.location.hash,
    language: getActiveLanguage(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    visibleText: text,
    visibleNodes: nodes,
    recentErrors: [...RECENT_ERRORS],
  };
}

function checkAndReport(reason: string) {
  const root = document.getElementById("root") as HTMLElement | null;
  if (!root) return;
  const { blank, text, nodes } = isBlank(root);
  if (!blank) return;

  const report = buildReport(text, nodes);
  window.__blankScreenLog ??= [];
  window.__blankScreenLog.push(report);

  // Log agrupado y bien visible
  // eslint-disable-next-line no-console
  console.group(
    `%c[BlankScreenDetector] Posible pantalla blanca (${reason})`,
    "color:#fff;background:#b00020;padding:2px 6px;border-radius:3px;font-weight:bold"
  );
  // eslint-disable-next-line no-console
  console.log("URL:      ", report.url);
  // eslint-disable-next-line no-console
  console.log("Ruta:     ", report.pathname);
  // eslint-disable-next-line no-console
  console.log("Idioma:   ", report.language);
  // eslint-disable-next-line no-console
  console.log("Viewport: ", report.viewport);
  // eslint-disable-next-line no-console
  console.log("Texto/Nodos:", `${report.visibleText} chars / ${report.visibleNodes} nodos`);
  if (report.recentErrors.length) {
    // eslint-disable-next-line no-console
    console.log("Errores recientes:");
    // eslint-disable-next-line no-console
    report.recentErrors.forEach((e) => console.log("  •", e));
  } else {
    // eslint-disable-next-line no-console
    console.log("Errores recientes: (ninguno capturado)");
  }
  // eslint-disable-next-line no-console
  console.log(
    "Inspecciona el historial completo con: window.__blankScreenLog"
  );
  // eslint-disable-next-line no-console
  console.groupEnd();
}

function scheduleCheck(reason: string) {
  window.setTimeout(() => checkAndReport(reason), CHECK_DELAY_MS);
}

function patchHistory() {
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    const r = origPush.apply(this, args as Parameters<typeof origPush>);
    window.dispatchEvent(new Event("bsd:locationchange"));
    return r;
  };
  history.replaceState = function (...args) {
    const r = origReplace.apply(this, args as Parameters<typeof origReplace>);
    window.dispatchEvent(new Event("bsd:locationchange"));
    return r;
  };
  window.addEventListener("popstate", () =>
    window.dispatchEvent(new Event("bsd:locationchange"))
  );
}

function captureErrors() {
  window.addEventListener("error", (ev) => {
    const where = ev.filename ? ` @ ${ev.filename}:${ev.lineno}:${ev.colno}` : "";
    recordError(`error: ${ev.message}${where}`);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason =
      typeof ev.reason === "string"
        ? ev.reason
        : ev.reason?.message ?? JSON.stringify(ev.reason);
    recordError(`unhandledrejection: ${reason}`);
  });
  // Interceptar console.error sin perder el comportamiento original
  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      recordError(
        "console.error: " +
          args
            .map((a) =>
              a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a)
            )
            .join(" ")
      );
    } catch {
      /* noop */
    }
    origErr(...args);
  };
}

export function initBlankScreenDetector() {
  if (typeof window === "undefined") return;
  if (window.__blankScreenDetectorInstalled) return;
  window.__blankScreenDetectorInstalled = true;

  window.__blankScreenLog ??= [];
  captureErrors();
  patchHistory();

  window.addEventListener("bsd:locationchange", () => scheduleCheck("navegación"));
  window.addEventListener("load", () => scheduleCheck("carga inicial"));

  // Si el documento ya está cargado cuando se instala, comprobar igualmente.
  if (document.readyState === "complete") scheduleCheck("init");

  // eslint-disable-next-line no-console
  console.info(
    "%c[BlankScreenDetector] Activo. Usa window.__blankScreenLog para ver el historial.",
    "color:#0a7"
  );
}
