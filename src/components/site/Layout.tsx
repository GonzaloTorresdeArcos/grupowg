import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCTA } from "./StickyMobileCTA";
import { useEffect } from "react";

// Rutas que mantienen tema CLARO (look antiguo): WG Network + Inscripción
const LIGHT_PATHS = ["/wg-network"];

export const Layout = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  const isLight = LIGHT_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${isLight ? "theme-light" : ""}`}>
      <Header dark={!isLight} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer dark={!isLight} />
      <StickyMobileCTA />
    </div>
  );
};
