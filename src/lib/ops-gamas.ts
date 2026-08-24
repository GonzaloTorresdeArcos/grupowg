// -----------------------------------------------------------------------------
// Diccionario de etiquetas de gama — CAPA DE PRESENTACIÓN
//
// El valor interno (BD, RPCs, importador) NO cambia nunca. Este mapa solo
// traduce el valor almacenado a la etiqueta que ve el usuario.
//
// Regla de negocio vigente: 'Profesional' se presenta como
// 'Industrial / Profesional'. El resto de gamas se muestran igual (con el
// acento correcto cuando el dato viene sin acentuar).
// -----------------------------------------------------------------------------

export const GAMA_LABELS: Record<string, string> = {
  Profesional: "Industrial / Profesional",
  Marron: "Marrón",
  Blanca: "Blanca",
  PAE: "PAE",
  Movilidad: "Movilidad",
  Clima: "Clima",
  // Variantes con prefijo "Gama " tal y como llegan de ops_tecnicos.gama_principal
  "Gama Profesional": "Industrial / Profesional",
  "Gama Marron": "Marrón",
  "Gama Marrón": "Marrón",
  "Gama Blanca": "Blanca",
  "Gama PAE": "PAE",
  "Gama Movilidad": "Movilidad",
  "Gama Clima": "Clima",
};

/** Etiqueta de display de una gama. Devuelve el valor original si no está mapeado. */
export const gamaLabel = (g: string | null | undefined, fallback = "—"): string => {
  if (g == null) return fallback;
  const t = String(g).trim();
  if (!t) return fallback;
  return GAMA_LABELS[t] ?? t;
};

/** Aplica el diccionario a una lista de valores de gama (para selectores). */
export const gamaDisplayMap = (values: readonly string[]): Record<string, string> =>
  Object.fromEntries(values.map((v) => [v, gamaLabel(v, v)]));
