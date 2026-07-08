/**
 * Catálogo de marcas agrupadas por GAMA (no por familia).
 *
 * Una marca puede aparecer en varias gamas (p.ej. Samsung en Blanca, Marrón,
 * Confort y Electrónica). Se persiste como pares (gama, marca) para saber
 * exactamente para qué gama el colaborador trabaja cada marca y con qué tipo
 * de relación (oficial / autorizado / multimarca).
 */

export type SatRelacion = "oficial" | "autorizado" | "multimarca";

export const SAT_RELACIONES: { code: SatRelacion; label: string; hint: string }[] = [
  {
    code: "oficial",
    label: "Servicio Técnico Oficial del Fabricante",
    hint: "Servicio Técnico Oficial reconocido directamente por el fabricante, con contrato vigente.",
  },
  {
    code: "autorizado",
    label: "SAT Autorizado",
    hint: "Autorizado por la marca o un mayorista para reparaciones en garantía.",
  },
  {
    code: "multimarca",
    label: "Multimarca",
    hint: "Trabajáis la marca sin acuerdo formal (fuera de garantía / repuestos).",
  },
];

export interface MarcasPorGama {
  /** Código de la gama (debe coincidir con gamas-taxonomy). */
  gama: string;
  /** Etiqueta visible. */
  label: string;
  emoji?: string;
  /** Lista de marcas oficiales que trabajan esta gama. */
  marcas: string[];
}

export const MARCAS_BY_GAMA: MarcasPorGama[] = [
  {
    gama: "blanca",
    label: "Gama blanca",
    emoji: "🔷",
    marcas: [
      "Bosch", "Siemens", "Balay", "Beko", "Whirlpool", "Indesit", "Hotpoint",
      "Electrolux", "AEG", "LG", "Samsung", "Haier", "Candy", "Hoover",
      "Miele", "Hisense", "Teka", "Grundig", "Sharp", "Corberó",
      "Neff", "Gaggenau", "Smeg", "Fagor", "Edesa", "Zanussi", "Midea",
      "Hitachi", "Daewoo", "Aspes", "New Pol", "Svan", "EAS Electric",
    ],
  },
  {
    gama: "marron",
    label: "Gama marrón (TV / Audio)",
    emoji: "🔷",
    marcas: [
      "Samsung", "LG", "Sony", "Hisense", "TCL", "Philips", "Panasonic",
      "Sharp", "Xiaomi", "Grundig", "Thomson", "JVC", "Telefunken", "Metz",
      "Blaupunkt", "Streamview", "Strong", "Denver", "Qilive", "TD Systems",
      "Bose", "Sonos", "Yamaha", "Harman Kardon", "Pioneer", "Toshiba",
      "Loewe", "Bang & Olufsen",
    ],
  },
  {
    gama: "pae",
    label: "PAE — Pequeño electrodoméstico",
    emoji: "🔷",
    marcas: [
      "Cecotec", "Philips", "Bosch", "Braun", "Moulinex", "Tefal", "Rowenta",
      "Krups", "DeLonghi", "Kenwood", "Russell Hobbs", "Severin", "Ufesa",
      "Orbegozo", "Black+Decker", "Ninja", "Shark", "Xiaomi", "Solac", "Taurus",
      "Nespresso", "Jura", "iRobot (Roomba)", "Dyson", "Remington", "ghd",
      "Smeg", "Miele", "Electrolux", "Princess", "Jata", "Lacor",
    ],
  },
  {
    gama: "confort",
    label: "Climatización",
    emoji: "🔷",
    marcas: [
      "Daikin", "Mitsubishi Electric", "Fujitsu", "LG", "Samsung", "Hisense",
      "Haier", "Toshiba", "Panasonic", "Carrier", "Johnson", "Daitsu",
      "Orbegozo", "Cecotec", "Rowenta", "DeLonghi", "Honeywell", "Tristar",
      "Taurus", "Equation (Leroy Merlin)",
      "Hitachi", "Midea", "Junkers", "Vaillant", "Saunier Duval", "Baxi",
      "Ferroli", "Ariston", "Beretta", "Roca",
    ],
  },
  {
    gama: "movilidad",
    label: "Movilidad",
    emoji: "🔷",
    marcas: [
      "Xiaomi", "Cecotec", "Ninebot (Segway)", "Nilox", "Denver", "SmartGyro",
      "Youin", "UrbanGlide", "Dualtron", "Kugoo", "Navee", "Aprilia", "Ducati",
      "Jeep", "Lamborghini", "Red Bull", "E-Twow", "Hiboy", "Kaabo", "Inokim",
      "Segway", "Ducati Urban e-Mobility", "Askoll", "NIU", "Silence",
      "Super Soco", "Sunra", "Velocifero",
    ],
  },
  {
    gama: "electronica",
    label: "Electrónica de consumo (IT / Digital)",
    emoji: "🔷",
    marcas: [
      "Apple", "Samsung", "HP", "Lenovo", "Dell", "Asus", "Acer", "MSI",
      "Huawei", "Xiaomi", "LG", "Sony", "Canon", "Epson", "Brother", "TP-Link",
      "Netgear", "Logitech", "Corsair", "Razer",
      "Microsoft", "Google", "OnePlus", "Oppo", "Realme", "Nokia", "Motorola",
      "Honor", "Nintendo", "Garmin", "Fitbit", "JBL", "AOC", "BenQ", "ViewSonic",
      "D-Link", "Asus ROG", "Kingston", "WD",
    ],
  },
  {
    gama: "profesional",
    label: "Gama profesional (Makro / Horeca)",
    emoji: "🔷",
    marcas: [
      "Rational", "Winterhalter", "Hobart", "Electrolux Professional",
      "Fagor Industrial", "Teka Industrial", "Coreco", "Infrico", "Polar",
      "Bartscher", "Buffalo", "Sammic", "Robot Coupe", "Dynamic", "Santos",
      "Jemi", "Zanussi Professional", "Scotsman", "Hoshizaki", "Brema",
      "Lainox", "Convotherm", "Unox", "Angelo Po", "Repagas", "Mainho",
      "Movilfrit", "Frucosol", "Eurofred", "Liebherr Professional",
    ],
  },
];

/** Genera un código estable (slug) a partir del nombre de la marca. */
export const marcaSlug = (label: string): string =>
  label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Código compuesto gama+marca para persistencia (ej. "blanca:bosch"). */
export const marcaCode = (gama: string, label: string): string =>
  `${gama}:${marcaSlug(label)}`;

/** Detalle persistido por marca seleccionada (en datos_seguros.marcas_detalle). */
export interface MarcaDetalle {
  /** Código compuesto gama:slug (estable). */
  code: string;
  /** Gama a la que pertenece esta selección. */
  gama: string;
  /** Nombre legible de la marca. */
  label: string;
  /** Tipo de relación SAT con la marca para esta gama. */
  relacion: SatRelacion;
}

export const gamasConMarcas = () => MARCAS_BY_GAMA.map((g) => g.gama);
