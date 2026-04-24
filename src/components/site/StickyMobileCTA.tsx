import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const StickyMobileCTA = () => {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);
  const lastY = useRef(0);

  // Hide on the inscription page itself (CTA would be redundant)
  const hideOnRoute = pathname.startsWith("/wg-network/inscripcion");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Show after scrolling past the hero
      const passedHero = y > 240;
      // Hide when scrolling up quickly near the top
      setVisible(passedHero);

      // Detect proximity to footer to avoid overlap
      const footer = document.querySelector("footer");
      if (footer) {
        const rect = footer.getBoundingClientRect();
        setNearFooter(rect.top < window.innerHeight - 40);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Observe mobile menu state via dataset on <html>
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setMenuOpen(html.dataset.mobileMenu === "open");
    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["data-mobile-menu"] });
    return () => observer.disconnect();
  }, []);

  const shouldShow = visible && !menuOpen && !nearFooter && !hideOnRoute;

  return (
    <div
      className={cn(
        "lg:hidden fixed inset-x-4 z-40 transition-all duration-300 ease-smooth",
        "pb-[env(safe-area-inset-bottom)]",
        shouldShow
          ? "opacity-100 translate-y-0 pointer-events-auto bottom-4"
          : "opacity-0 translate-y-4 pointer-events-none bottom-0"
      )}
      aria-hidden={!shouldShow}
    >
      <Link
        to="/wg-network/inscripcion"
        className="flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-medium text-bone shadow-elevated"
      >
        Únete a WG Network
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
};
