import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { buildCrumbs } from "@/lib/breadcrumbs";

interface BreadcrumbsProps {
  dark?: boolean;
}

export const Breadcrumbs = ({ dark = true }: BreadcrumbsProps) => {
  const { pathname } = useLocation();
  const { t } = useTranslation("breadcrumbs");
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);

  if (crumbs.length === 0) return null;

  const baseText = dark ? "text-bone/55" : "text-ink/55";
  const linkText = dark ? "text-bone/70 hover:text-bone" : "text-ink/70 hover:text-ink";
  const currentText = dark ? "text-bone" : "text-ink";
  const sepText = dark ? "text-bone/30" : "text-ink/30";

  // Etiqueta traducida: usa el último segmento del path como clave en el
  // namespace `breadcrumbs`. Si no existe, cae al label calculado por slug.
  const labelFor = (to: string, fallback: string) => {
    const slug = to.split("/").filter(Boolean).pop() ?? "";
    return t(slug, { defaultValue: fallback });
  };

  return (
    <nav
      aria-label={t("ariaLabel")}
      className={cn(
        "absolute left-0 right-0 top-[168px] md:top-[224px] z-10 container-tight pt-3 pb-2 text-xs pointer-events-none",
        baseText,
      )}
    >
      <ol className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <li className="flex items-center gap-1.5">
          <Link
            to="/"
            className={cn("inline-flex items-center gap-1 transition-colors", linkText)}
            aria-label={t("homeAriaLabel")}
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t("home")}</span>
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.to} className="flex items-center gap-1.5">
            <ChevronRight className={cn("h-3.5 w-3.5", sepText)} aria-hidden="true" />
            {c.isLast ? (
              <span className={cn("font-medium", currentText)} aria-current="page">
                {labelFor(c.to, c.label)}
              </span>
            ) : (
              <Link to={c.to} className={cn("transition-colors", linkText)}>
                {labelFor(c.to, c.label)}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
