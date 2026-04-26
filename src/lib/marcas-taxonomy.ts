/**
 * Catálogo de marcas y su mapeo a familias específicas (códigos de gamas-taxonomy).
 *
 * Sirve para que en la inscripción solo se ofrezcan las marcas que tienen sentido
 * según las familias seleccionadas, y para registrar el tipo de relación SAT
 * (oficial / autorizado / multimarca).
 *
 * Mantener `code` estable: se persiste en wg_network_applications.marcas_codes.
 * El detalle (familias por marca + tipo SAT) se guarda en datos_seguros.marcas_detalle
 * para no requerir cambios de esquema.
 */

export type SatRelacion = "oficial" | "autorizado" | "multimarca";

export const SAT_RELACIONES: { code: SatRelacion; label: string; hint: string }[] = [
  {
    code: "oficial",
    label: "SAT Oficial",
    hint: "Servicio Técnico Oficial reconocido por la marca, con contrato directo.",
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

export interface MarcaDef {
  code: string;
  label: string;
  /** Familias (códigos de gamas-taxonomy) que la marca cubre habitualmente. */
  familias: string[];
}

export const MARCAS: MarcaDef[] = [
  // ─── Gama blanca ──────────────────────────────────────────────────────
  {
    code: "bosch",
    label: "Bosch",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.lavasecadoras",
      "blanca.frigorificos", "blanca.combi", "blanca.congeladores",
      "blanca.lavavajillas", "blanca.hornos", "blanca.placas", "blanca.campanas",
      "pae.cafeteras", "pae.batidoras", "pae.aspiradores",
    ],
  },
  {
    code: "siemens",
    label: "Siemens",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.lavasecadoras",
      "blanca.frigorificos", "blanca.combi", "blanca.lavavajillas",
      "blanca.hornos", "blanca.placas", "blanca.campanas",
    ],
  },
  {
    code: "balay",
    label: "Balay",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.combi", "blanca.lavavajillas", "blanca.hornos",
      "blanca.placas", "blanca.campanas",
    ],
  },
  {
    code: "neff",
    label: "Neff",
    familias: ["blanca.hornos", "blanca.placas", "blanca.campanas", "blanca.lavavajillas"],
  },
  {
    code: "gaggenau",
    label: "Gaggenau",
    familias: ["blanca.hornos", "blanca.placas", "blanca.campanas", "blanca.frigorificos"],
  },
  {
    code: "whirlpool",
    label: "Whirlpool",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.combi", "blanca.lavavajillas", "blanca.hornos", "blanca.placas",
    ],
  },
  {
    code: "indesit",
    label: "Indesit",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.lavavajillas", "blanca.hornos",
    ],
  },
  {
    code: "hotpoint",
    label: "Hotpoint",
    familias: ["blanca.lavadoras", "blanca.frigorificos", "blanca.lavavajillas", "blanca.hornos"],
  },
  {
    code: "fagor",
    label: "Fagor",
    familias: [
      "blanca.lavadoras", "blanca.frigorificos", "blanca.lavavajillas",
      "blanca.hornos", "blanca.placas", "blanca.campanas", "blanca.cocinas",
    ],
  },
  {
    code: "edesa",
    label: "Edesa",
    familias: ["blanca.lavadoras", "blanca.frigorificos", "blanca.lavavajillas", "blanca.cocinas"],
  },
  {
    code: "teka",
    label: "Teka",
    familias: ["blanca.hornos", "blanca.placas", "blanca.campanas", "blanca.lavavajillas"],
  },
  {
    code: "smeg",
    label: "Smeg",
    familias: [
      "blanca.lavadoras", "blanca.frigorificos", "blanca.lavavajillas",
      "blanca.hornos", "blanca.placas", "blanca.campanas", "blanca.cocinas",
      "pae.cafeteras", "pae.tostadoras", "pae.batidoras",
    ],
  },
  {
    code: "aeg",
    label: "AEG",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.lavavajillas", "blanca.hornos", "blanca.placas",
    ],
  },
  {
    code: "electrolux",
    label: "Electrolux",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.lavavajillas", "blanca.hornos", "pae.aspiradores",
    ],
  },
  {
    code: "zanussi",
    label: "Zanussi",
    familias: ["blanca.lavadoras", "blanca.frigorificos", "blanca.lavavajillas", "blanca.hornos"],
  },
  {
    code: "candy",
    label: "Candy",
    familias: ["blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos", "blanca.lavavajillas"],
  },
  {
    code: "haier",
    label: "Haier",
    familias: [
      "blanca.lavadoras", "blanca.frigorificos", "blanca.combi",
      "blanca.lavavajillas", "confort.aire",
    ],
  },
  {
    code: "hisense",
    label: "Hisense",
    familias: ["blanca.frigorificos", "blanca.combi", "marron.tv", "confort.aire"],
  },
  {
    code: "beko",
    label: "Beko",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.frigorificos",
      "blanca.lavavajillas", "blanca.hornos",
    ],
  },
  {
    code: "miele",
    label: "Miele",
    familias: [
      "blanca.lavadoras", "blanca.secadoras", "blanca.lavasecadoras",
      "blanca.frigorificos", "blanca.lavavajillas", "blanca.hornos",
      "blanca.placas", "blanca.campanas", "pae.aspiradores", "pae.cafeteras",
    ],
  },

  // ─── Gama marrón / electrónica ────────────────────────────────────────
  {
    code: "samsung",
    label: "Samsung",
    familias: [
      "marron.tv", "marron.audio", "marron.video",
      "electronica.smartphones", "electronica.tablets", "electronica.monitores",
      "electronica.wearables",
      "blanca.lavadoras", "blanca.frigorificos", "confort.aire",
    ],
  },
  {
    code: "lg",
    label: "LG",
    familias: [
      "marron.tv", "marron.audio", "marron.proyeccion",
      "electronica.monitores", "electronica.smartphones",
      "blanca.lavadoras", "blanca.frigorificos", "confort.aire",
    ],
  },
  {
    code: "sony",
    label: "Sony",
    familias: [
      "marron.tv", "marron.audio", "marron.video", "marron.proyeccion",
      "electronica.gaming",
    ],
  },
  {
    code: "philips",
    label: "Philips",
    familias: [
      "marron.tv", "marron.audio",
      "pae.cafeteras", "pae.aspiradores", "pae.afeitadoras", "pae.secadores",
    ],
  },
  {
    code: "panasonic",
    label: "Panasonic",
    familias: ["marron.tv", "marron.audio", "marron.video", "confort.aire"],
  },
  {
    code: "tcl",
    label: "TCL",
    familias: ["marron.tv", "confort.aire"],
  },
  {
    code: "xiaomi",
    label: "Xiaomi",
    familias: [
      "electronica.smartphones", "electronica.tablets", "electronica.wearables",
      "marron.tv", "pae.aspiradores", "movilidad.patinetes",
    ],
  },
  {
    code: "apple",
    label: "Apple",
    familias: [
      "electronica.smartphones", "electronica.tablets", "electronica.ordenadores",
      "electronica.monitores", "electronica.wearables", "marron.audio",
    ],
  },
  {
    code: "huawei",
    label: "Huawei",
    familias: ["electronica.smartphones", "electronica.tablets", "electronica.wearables", "electronica.redes"],
  },
  {
    code: "hp",
    label: "HP",
    familias: ["electronica.ordenadores", "electronica.impresoras", "electronica.monitores"],
  },
  {
    code: "lenovo",
    label: "Lenovo",
    familias: ["electronica.ordenadores", "electronica.tablets", "electronica.monitores"],
  },
  {
    code: "asus",
    label: "ASUS",
    familias: ["electronica.ordenadores", "electronica.monitores", "electronica.redes"],
  },
  {
    code: "dell",
    label: "Dell",
    familias: ["electronica.ordenadores", "electronica.monitores"],
  },
  {
    code: "epson",
    label: "Epson",
    familias: ["electronica.impresoras", "marron.proyeccion"],
  },
  {
    code: "canon",
    label: "Canon",
    familias: ["electronica.impresoras"],
  },
  {
    code: "brother",
    label: "Brother",
    familias: ["electronica.impresoras"],
  },

  // ─── Climatización / confort ──────────────────────────────────────────
  {
    code: "daikin",
    label: "Daikin",
    familias: ["confort.aire", "confort.deshumidificadores"],
  },
  {
    code: "mitsubishi",
    label: "Mitsubishi Electric",
    familias: ["confort.aire", "confort.deshumidificadores"],
  },
  {
    code: "fujitsu",
    label: "Fujitsu",
    familias: ["confort.aire"],
  },
  {
    code: "toshiba",
    label: "Toshiba",
    familias: ["confort.aire", "marron.tv"],
  },
  {
    code: "midea",
    label: "Midea",
    familias: ["confort.aire", "blanca.lavadoras"],
  },
  {
    code: "hitachi",
    label: "Hitachi",
    familias: ["confort.aire", "blanca.frigorificos"],
  },
  {
    code: "junkers",
    label: "Junkers",
    familias: ["confort.calefactores"],
  },
  {
    code: "vaillant",
    label: "Vaillant",
    familias: ["confort.calefactores"],
  },
  {
    code: "saunier",
    label: "Saunier Duval",
    familias: ["confort.calefactores"],
  },
  {
    code: "rowenta",
    label: "Rowenta",
    familias: [
      "pae.aspiradores", "pae.planchas", "pae.centros_planchado",
      "pae.secadores", "pae.afeitadoras",
      "confort.ventiladores", "confort.calefactores", "confort.purificadores",
    ],
  },
  {
    code: "tefal",
    label: "Tefal",
    familias: [
      "pae.cafeteras", "pae.tostadoras", "pae.batidoras",
      "pae.freidoras", "pae.robots_cocina", "pae.planchas",
    ],
  },
  {
    code: "moulinex",
    label: "Moulinex",
    familias: ["pae.batidoras", "pae.robots_cocina", "pae.cafeteras"],
  },
  {
    code: "delonghi",
    label: "De'Longhi",
    familias: ["pae.cafeteras", "confort.aire", "confort.calefactores"],
  },
  {
    code: "krups",
    label: "Krups",
    familias: ["pae.cafeteras", "pae.batidoras", "pae.tostadoras"],
  },
  {
    code: "nespresso",
    label: "Nespresso",
    familias: ["pae.cafeteras"],
  },
  {
    code: "jura",
    label: "Jura",
    familias: ["pae.cafeteras"],
  },
  {
    code: "cecotec",
    label: "Cecotec",
    familias: [
      "pae.cafeteras", "pae.freidoras", "pae.robots_cocina", "pae.aspiradores",
      "confort.aire", "confort.ventiladores",
      "movilidad.patinetes",
    ],
  },
  {
    code: "irobot",
    label: "iRobot (Roomba)",
    familias: ["pae.aspiradores"],
  },
  {
    code: "dyson",
    label: "Dyson",
    familias: ["pae.aspiradores", "pae.secadores", "pae.planchas_pelo", "confort.ventiladores", "confort.purificadores"],
  },
  {
    code: "braun",
    label: "Braun",
    familias: ["pae.afeitadoras", "pae.batidoras"],
  },
  {
    code: "remington",
    label: "Remington",
    familias: ["pae.secadores", "pae.afeitadoras", "pae.planchas_pelo"],
  },
  {
    code: "ghd",
    label: "ghd",
    familias: ["pae.planchas_pelo", "pae.secadores"],
  },

  // ─── Movilidad ────────────────────────────────────────────────────────
  {
    code: "segway",
    label: "Segway / Ninebot",
    familias: ["movilidad.patinetes", "movilidad.scooters"],
  },
  {
    code: "ducati_urban",
    label: "Ducati Urban e-Mobility",
    familias: ["movilidad.patinetes", "movilidad.bicicletas"],
  },
  {
    code: "askoll",
    label: "Askoll",
    familias: ["movilidad.motos", "movilidad.bicicletas"],
  },
  {
    code: "niu",
    label: "NIU",
    familias: ["movilidad.motos", "movilidad.scooters"],
  },

  // ─── Profesional / horeca ─────────────────────────────────────────────
  {
    code: "fagor_industrial",
    label: "Fagor Industrial",
    familias: [
      "profesional.camaras_frigorificas", "profesional.armarios_refrigerados",
      "profesional.hornos_industriales", "profesional.lavavajillas_industriales",
      "profesional.cocinas_industriales", "profesional.tuneles_lavado",
    ],
  },
  {
    code: "rational",
    label: "Rational",
    familias: ["profesional.hornos_industriales"],
  },
  {
    code: "infrico",
    label: "Infrico",
    familias: [
      "profesional.camaras_frigorificas", "profesional.armarios_refrigerados",
      "profesional.mesas_refrigeradas",
    ],
  },
  {
    code: "sammic",
    label: "Sammic",
    familias: [
      "profesional.lavavajillas_industriales", "profesional.lavavasos",
      "profesional.cortadoras", "profesional.picadoras",
    ],
  },
  {
    code: "winterhalter",
    label: "Winterhalter",
    familias: ["profesional.lavavajillas_industriales", "profesional.lavavasos", "profesional.tuneles_lavado"],
  },
  {
    code: "hobart",
    label: "Hobart",
    familias: [
      "profesional.lavavajillas_industriales", "profesional.tuneles_lavado",
      "profesional.cortadoras", "profesional.picadoras", "profesional.amasadoras",
    ],
  },
];

export const marcaByCode = (code: string) => MARCAS.find((m) => m.code === code);
export const marcaLabel = (code: string) => marcaByCode(code)?.label ?? code;

/**
 * Devuelve las marcas compatibles con el set de familias seleccionadas.
 * Una marca es compatible si cubre al menos una de las familias.
 */
export const marcasForFamilias = (familias: string[]): MarcaDef[] => {
  if (!familias.length) return MARCAS;
  const set = new Set(familias);
  return MARCAS.filter((m) => m.familias.some((f) => set.has(f)));
};

/**
 * Subconjunto de familias que una marca cubre dentro del set seleccionado.
 */
export const matchingFamilias = (marca: MarcaDef, familias: string[]): string[] => {
  if (!familias.length) return marca.familias;
  const set = new Set(familias);
  return marca.familias.filter((f) => set.has(f));
};

/** Detalle persistido por marca seleccionada. */
export interface MarcaDetalle {
  code: string;
  relacion: SatRelacion;
  /** Familias específicas que el colaborador atiende para esta marca. */
  familias: string[];
}
