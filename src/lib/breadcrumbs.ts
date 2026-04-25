/**
 * Lógica compartida de breadcrumbs: derivar segmentos legibles desde un
 * `pathname` y construir el JSON-LD `BreadcrumbList`.
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

export type Crumb = {
  label: string;
  to: string;
  isLast: boolean;
};

export const formatSegment = (slug: string): string => {
  if (ROUTE_LABELS[slug]) return ROUTE_LABELS[slug];
  return slug
    .split("-")
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
};

export const buildCrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: formatSegment(seg),
    to: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
};

export const buildBreadcrumbJsonLd = (crumbs: Crumb[], origin: string) => ({
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
