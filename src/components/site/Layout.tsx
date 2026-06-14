import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCTA } from "./StickyMobileCTA";
import { Breadcrumbs } from "./Breadcrumbs";
import { RouteBoundary } from "./RouteBoundary";
import { useEffect } from "react";
import { buildBreadcrumbJsonLd, buildCrumbs } from "@/lib/breadcrumbs";

// Rutas que mantienen tema CLARO (look antiguo): WG Network + Inscripción
const LIGHT_PATHS = ["/wg-network", "/"];

// Rutas en las que NO mostramos breadcrumbs (home + portal)
const HIDE_BREADCRUMBS = ["/", "/portal"];

const SCRIPT_ID = "ld-breadcrumbs";

const removeBreadcrumbScript = () => {
  document.querySelectorAll(`script#${SCRIPT_ID}`).forEach((el) => el.remove());
};

export const Layout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  // Canonical + og:url per route (self-referencing).
  useEffect(() => {
    const CANONICAL_BASE = "https://grupowg.lovable.app";
    const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const href = `${CANONICAL_BASE}${path}`;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", href);

    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", href);
  }, [pathname]);


  const isLight = true;
  const showBreadcrumbs =
    !HIDE_BREADCRUMBS.includes(pathname) && !pathname.startsWith("/portal");

  // Sincroniza JSON-LD BreadcrumbList con la ruta actual.
  // Garantiza limpieza siempre, incluso al volver a home u otras rutas
  // sin breadcrumbs, porque el Layout permanece montado entre navegaciones.
  useEffect(() => {
    // Limpieza defensiva en cada navegación.
    removeBreadcrumbScript();

    if (!showBreadcrumbs) return;

    const crumbs = buildCrumbs(pathname);
    if (crumbs.length === 0) return;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://grupowg.com";

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = SCRIPT_ID;
    ld.text = JSON.stringify(buildBreadcrumbJsonLd(crumbs, origin));
    document.head.appendChild(ld);

    return removeBreadcrumbScript;
  }, [pathname, showBreadcrumbs]);

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${isLight ? "theme-light" : ""}`}>
      <Header dark={!isLight} />
      <main className="flex-1 relative">
        {showBreadcrumbs && <Breadcrumbs dark={!isLight} />}
        <RouteBoundary key={pathname}>
          <Outlet />
        </RouteBoundary>
      </main>
      <Footer dark={!isLight} />
      <StickyMobileCTA />
    </div>
  );
};
