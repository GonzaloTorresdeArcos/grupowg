/**
 * PRV-UAT-FS1 · FILTER SCOPE HONESTY.
 *
 * Regla: "control visible = control efectivo". Una ruta solo puede mostrar los
 * controles que sus RPC consumen de verdad. Performance Real llama a
 * ctr_portfolio_resumen/arbol/no_resueltas SIN parámetros y a
 * ctr_programa_ficha/ctr_obligaciones_programa solo con p_programa: por tanto
 * NO puede exhibir período, comparación ni dimensiones operativas.
 *
 * Cambiar de perfil NO borra el estado global de filtros: F0–F4 lo siguen
 * usando; simplemente no se muestra donde no gobierna nada.
 */

export type PerfilFiltros =
  /** Barra estándar completa: período, comparación y dimensiones operativas. */
  | "operativa"
  /** Solo selector/navegación de programa + as-of del snapshot. */
  | "programa"
  /** Ningún control: la página no consume filtro alguno. */
  | "ninguno";

/** Matriz ruta → perfil de filtros realmente soportado por sus RPC. */
export const PERFIL_POR_RUTA: { prefijo: string; perfil: PerfilFiltros }[] = [
  { prefijo: "/operaciones/performance-real", perfil: "programa" },
  { prefijo: "/operaciones/contratos", perfil: "ninguno" },

];

export const perfilFiltros = (pathname: string): PerfilFiltros =>
  PERFIL_POR_RUTA.find((r) => pathname.startsWith(r.prefijo))?.perfil ?? "operativa";
