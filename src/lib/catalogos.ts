/**
 * Catálogos compartidos para el motor de matching y la captación.
 * Mantener sincronizado con los códigos usados en la base de datos
 * (wg_network_applications.familias_producto / marcas_codes).
 */

export const FAMILIAS = [
  { code: "linea_blanca", label: "Línea blanca (lavadoras, frigoríficos...)" },
  { code: "linea_marron", label: "Línea marrón (TV, audio, vídeo)" },
  { code: "climatizacion", label: "Climatización (A/A, bombas de calor)" },
  { code: "calentadores", label: "Calentadores y calderas" },
  { code: "pae", label: "Pequeño aparato electrodoméstico (PAE)" },
  { code: "solar", label: "Energía solar / aerotermia" },
  { code: "informatica", label: "Informática y periféricos" },
  { code: "telefonia", label: "Telefonía móvil" },
] as const;

export const MARCAS = [
  { code: "bosch", label: "Bosch" },
  { code: "siemens", label: "Siemens" },
  { code: "balay", label: "Balay" },
  { code: "samsung", label: "Samsung" },
  { code: "lg", label: "LG" },
  { code: "sony", label: "Sony" },
  { code: "daikin", label: "Daikin" },
  { code: "mitsubishi", label: "Mitsubishi" },
  { code: "junkers", label: "Junkers" },
  { code: "vaillant", label: "Vaillant" },
  { code: "whirlpool", label: "Whirlpool" },
  { code: "fagor", label: "Fagor" },
] as const;

export const familiaLabel = (code: string) =>
  FAMILIAS.find((f) => f.code === code)?.label ?? code;

export const marcaLabel = (code: string) =>
  MARCAS.find((m) => m.code === code)?.label ?? code;

export const URGENCY_OPTIONS = [
  { code: "low", label: "Baja", color: "bg-muted text-ink" },
  { code: "normal", label: "Normal", color: "bg-secondary text-ink" },
  { code: "high", label: "Alta", color: "bg-amber-100 text-amber-900" },
  { code: "urgent", label: "Urgente", color: "bg-red-100 text-red-900" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  assigned: "Asignada",
  in_progress: "En curso",
  closed: "Cerrada",
  cancelled: "Cancelada",
};
