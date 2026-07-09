/**
 * Navegación global del sitio.
 *
 * La web se centra exclusivamente en WG Professional Network.
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

export const primaryNav: NavItem[] = [
  { to: "/", label: "El plan" },
  { to: "/#simulador", label: "Simulador" },
  { to: "/#marcas", label: "Marcas" },
  { to: "/wg-network/inscripcion", label: "Únete a la red" },
  { to: "/portal/login", label: "Acceso colaboradores" },
];

export const secondaryNav: NavItem[] = [
  { to: "/portal/login", label: "Área privada" },
  { to: "/contacto", label: "Contacto" },
  { to: "/legal/privacidad", label: "Privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
];

export const footerNav: NavGroup[] = [
  {
    id: "network",
    label: "Red profesional",
    items: [
      { to: "/", label: "El plan" },
      { to: "/wg-network/inscripcion", label: "Únete a la red" },
      { to: "/portal/login", label: "Área privada" },
    ],
  },
  {
    id: "company",
    label: "Compañía",
    items: [
      { to: "/contacto", label: "Contacto" },
    ],
  },
];

export const legalNav: NavItem[] = [
  { to: "/legal/privacidad", label: "Política de privacidad" },
  { to: "/legal/aviso-legal", label: "Aviso legal" },
  { to: "/legal/cookies", label: "Política de cookies" },
  { to: "/legal/accesibilidad", label: "Accesibilidad" },
];
