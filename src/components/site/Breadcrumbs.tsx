import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Etiquetas legibles por slug de ruta. Cualquier ruta no listada usa el slug
 * formateado (capitalizado, guiones reemplazados por espacios).
 */
const ROUTE_LABELS: Record<string, string> = {
  modelo: "Modelo",
  soluciones: "Soluciones",
  plataforma: "Plataforma",
  experiencia: "Experiencia",
  industrias: "Industrias",
  grupo: "Grupo WG",
  "que-hacemos": "Qué hacemos",
  marcas: "Marcas",
  "wg-network": "WG Network",
  inscripcion: "Inscripción",
  "50-aniversario": "50 aniversario",
  contacto: "Contacto",
  legal: "Legal",
  privacidad: "Política de privacidad",
  "aviso-legal": "Aviso legal",
  cookies: "Política de cookies",
  accesibilidad: "Accesibilidad",
  estado: "Consultar estado",
};

const formatSegment = (slug: string): string => {
  if (ROUTE_LABELS[slug]) return ROUTE_LABELS[slug];
  return slug
    .split("-")
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
};

interface BreadcrumbsProps {
  dark?: boolean;
}

export const Breadcrumbs = ({ dark = true }: BreadcrumbsProps) => {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => ({
      label: formatSegment(seg),
      to: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
    }));
  }, [pathname]);

  // JSON-LD para SEO (BreadcrumbList)
  useEffect(() => {
    if (crumbs.length === 0) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://grupowg.com";
    const id = "ld-breadcrumbs";
    document.getElementById(id)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = id;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: `${origin}/`,
        },
        ...crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: c.label,
          item: `${origin}${c.to}`,
        })),
      ],
    });
    document.head.appendChild(ld);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [crumbs]);

  if (crumbs.length === 0) return null;

  const baseText = dark ? "text-bone/55" : "text-ink/55";
  const linkText = dark ? "text-bone/70 hover:text-bone" : "text-ink/70 hover:text-ink";
  const currentText = dark ? "text-bone" : "text-ink";
  const sepText = dark ? "text-bone/30" : "text-ink/30";

  return (
    <nav
      aria-label="Migas de pan"
      className={cn(
        "absolute left-0 right-0 top-[68px] md:top-[76px] z-10 container-tight pt-3 pb-2 text-xs pointer-events-none",
        baseText,
      )}
    >
      <ol className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <li className="flex items-center gap-1.5">
          <Link
            to="/"
            className={cn("inline-flex items-center gap-1 transition-colors", linkText)}
            aria-label="Inicio"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.to} className="flex items-center gap-1.5">
            <ChevronRight className={cn("h-3.5 w-3.5", sepText)} aria-hidden="true" />
            {c.isLast ? (
              <span className={cn("font-medium", currentText)} aria-current="page">
                {c.label}
              </span>
            ) : (
              <Link to={c.to} className={cn("transition-colors", linkText)}>
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
