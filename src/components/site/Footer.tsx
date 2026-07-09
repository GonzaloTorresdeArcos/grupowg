import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { footerNav, legalNav } from "@/config/navigation";

interface FooterProps {
  dark?: boolean;
}

// Span de columna en desktop (md+) por id de grupo, para mantener proporciones.
const GROUP_SPAN: Record<string, string> = {
  system: "md:col-span-2",
  company: "md:col-span-2",
  network: "md:col-span-3",
};

export const Footer = ({ dark = true }: FooterProps) => {
  const { openPreferences } = useCookieConsent();
  const { t } = useTranslation("footer");
  const location = useLocation();
  const navigate = useNavigate();
  const bg = dark ? "bg-ink" : "bg-ink";
  const textBase = "text-bone/70";
  const textHover = "hover:text-bone";
  const labelMuted = "text-bone/40";

  const detailsRefs = useRef<Array<HTMLDetailsElement | null>>([]);
  const [allOpen, setAllOpen] = useState(false);

  const handleNavClick = (to: string) => (e: React.MouseEvent) => {
    const hasHash = to.includes("#");
    if (!hasHash) {
      // Si ya estamos en la ruta destino, hacer scroll al top
      if (location.pathname === to) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    e.preventDefault();
    const [rawPath, hash] = to.split("#");
    const targetPath = rawPath || "/";
    const scrollToHash = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (location.pathname === targetPath) {
      scrollToHash();
    } else {
      navigate(to);
      window.setTimeout(scrollToHash, 120);
    }
  };



  const toggleAll = () => {
    const next = !allOpen;
    detailsRefs.current.forEach((el) => {
      if (el) el.open = next;
    });
    setAllOpen(next);
  };

  const handleDetailsToggle = () => {
    const states = detailsRefs.current.map((el) => !!el?.open);
    if (states.every(Boolean)) setAllOpen(true);
    else if (states.every((s) => !s)) setAllOpen(false);
  };

  // Helpers de traducción con fallback al label original
  const groupLabel = (id: string, fallback: string) =>
    t(`groups.${id}`, { defaultValue: fallback });
  const itemLabel = (to: string, fallback: string) =>
    t(`items.${to}`, { defaultValue: fallback });

  return (
    <footer className={cn(bg, textBase, "relative overflow-hidden")}>
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />
      <div className="container-tight relative py-16 md:py-20">
        {/* Bloque marca */}
        <div className="md:grid md:gap-12 md:grid-cols-12">
          <div className="md:col-span-5 space-y-6 mb-10 md:mb-0">
            <Logo className="h-10 brightness-0 invert opacity-90" />
            <p className="font-display text-3xl text-bone leading-tight max-w-md text-balance">
              {t("tagline")}
            </p>
            <p className="text-sm text-bone/55 max-w-md leading-relaxed">{t("lead")}</p>
          </div>

          {/* Móvil: acordeón nativo (<details>) — sin saltos de layout, accesible */}
          <div className="md:hidden">
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={toggleAll}
                aria-expanded={allOpen}
                className={cn(
                  "text-[11px] uppercase tracking-[0.2em] text-bone/60 hover:text-bone",
                  "py-1.5 px-2 -mx-2 rounded-md",
                  "outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                )}
              >
                {allOpen ? t("collapseAll") : t("expandAll")}
              </button>
            </div>
            <div className="divide-y divide-bone/10 border-y border-bone/10">
            {footerNav.map((group, idx) => (
              <details
                key={group.id}
                className="group"
                ref={(el) => {
                  detailsRefs.current[idx] = el;
                }}
                onToggle={handleDetailsToggle}
              >
                <summary
                  className={cn(
                    "flex items-center justify-between py-3 px-2 -mx-2 rounded-md cursor-pointer select-none",
                    "text-[11px] uppercase tracking-[0.2em] text-bone/80 list-none",
                    "[&::-webkit-details-marker]:hidden",
                    "outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                  )}
                >
                  {groupLabel(group.id, group.label)}
                  <ChevronDown
                    className="h-3.5 w-3.5 text-bone/50 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-3 space-y-0.5 text-[13px]">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={handleNavClick(item.to)}
                        className={cn(
                          "block py-1 px-2 -mx-2 rounded-md text-bone/75",
                          textHover,
                          "outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:text-bone",
                        )}
                      >
                        {itemLabel(item.to, item.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            </div>
          </div>

          {/* Desktop: columnas */}
          {footerNav.map((group) => (
            <div
              key={group.id}
              className={cn("hidden md:block", GROUP_SPAN[group.id] ?? "md:col-span-2")}
            >
              <p className={cn("text-xs uppercase tracking-[0.2em] mb-4", labelMuted)}>
                {groupLabel(group.id, group.label)}
              </p>
              <ul className="space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} onClick={handleNavClick(item.to)} className={textHover}>
                      {itemLabel(item.to, item.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline bg-bone/10 my-10 md:my-12" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-bone/45">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((l) => (
              <Link key={l.to} to={l.to} className={textHover}>
                {itemLabel(l.to, l.label)}
              </Link>
            ))}
            <button
              type="button"
              onClick={openPreferences}
              className={cn(textHover, "underline-offset-2 hover:underline")}
            >
              {t("configureCookies")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
