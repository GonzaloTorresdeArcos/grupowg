/**
 * Navegación global del sitio.
 *
 * Fuente única de verdad: cualquier cambio de orden o etiqueta debe hacerse
 * aquí y se reflejará automáticamente en `<Header />` y `<Footer />`.
 */

export type NavItem = {
  to: string;
  label: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/**
 * Enlaces principales que aparecen en la barra superior (desktop + drawer móvil).
 * Su orden define también cómo se renderizan en el grupo "Sistema" del footer
 * (filtrando los que no pertenecen a ese grupo).
 */
export const primaryNav: NavItem[] = [
  { to: "/modelo", label: "Modelo" },
  { to: "/soluciones", label: "Soluciones" },
  { to: "/experiencia", label: "Experiencia" },
  { to: "/industrias", label: "Industrias" },
  { to: "/portal/login", label: "Área privada" },
];

/**
 * Enlaces secundarios mostrados en el drawer móvil del header.
 */
export const secondaryNav: NavItem[] = [
  { to: "/contacto", label: "Contacto" },
  { to: "/legal/privacidad", label: "Privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
];

/**
 * Agrupaciones del footer. El grupo "system" reutiliza el orden de `primaryNav`
 * (excluyendo Grupo WG y WG Network, que viven en sus propios grupos) para
 * garantizar paridad con la barra superior.
 */
export const footerNav: NavGroup[] = [
  {
    id: "system",
    label: "Sistema",
    items: primaryNav.filter(
      (item) => !["/portal/login"].includes(item.to),
    ),
  },
  {
    id: "company",
    label: "Compañía",
    items: [
      { to: "/", label: "Grupo WG" },
      { to: "/marcas", label: "Marcas" },
      { to: "/50-aniversario", label: "50 aniversario" },
      { to: "/contacto", label: "Contacto" },
    ],
  },
  {
    id: "network",
    label: "Red profesional",
    items: [
      { to: "/wg-network", label: "WG Professional Network" },
      { to: "/wg-network/inscripcion", label: "Únete a la red" },
      { to: "/portal/login", label: "Área privada" },
    ],
  },
];

/**
 * Enlaces legales del pie inferior.
 */
export const legalNav: NavItem[] = [
  { to: "/legal/privacidad", label: "Política de privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
  { to: "/legal/cookies", label: "Política de cookies" },
  { to: "/legal/accesibilidad", label: "Accesibilidad" },
];
