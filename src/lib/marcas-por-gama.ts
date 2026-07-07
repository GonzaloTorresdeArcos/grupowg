/**
 * Marcas gestionadas por WG, agrupadas por gama del simulador.
 * `confirmadas` = descuento OEM cerrado (bloque Vestel — stock activado).
 * `wip` = acceso a repuesto en incorporación (resto de marcas).
 * Nombres tal cual figuran en la documentación oficial WG.
 */
export interface MarcasGama {
  confirmadas: string[];
  wip: string[];
}

export const MARCAS_POR_GAMA: Record<string, MarcasGama> = {
  blanca: {
    confirmadas: ["New Pol", "Daewoo", "Icecool", "Telefunken", "Sauber", "Sharp", "Evvo", "Tegran", "Vanguard", "Konen", "Ecron", "Confortec", "Sunfeel", "Selecline", "Climatric", "Kympo", "Laurus", "Schontech", "Vestel", "Vox", "Bru"],
    wip: ["Carrefour Home", "Bluesky", "Qilive", "Cecotec", "Kromsline", "Valberg", "Jocel", "Solthermic", "Telefac"],
  },
  confort: {
    confirmadas: ["Johnson"],
    wip: ["Klindo", "Climatric", "Cecotec", "Sauber", "Origial"],
  },
  marron: {
    confirmadas: ["Toshiba", "JVC", "Electronia", "Hitachi", "Telefunken"],
    wip: ["Cecotec", "Thomson", "Onwa", "Origial", "Metz"],
  },
  pae: {
    confirmadas: [],
    wip: ["Carrefour Home", "Klindo", "Simpl", "Bluesky", "Jocel", "Mandine"],
  },
  profesional: {
    confirmadas: [],
    wip: ["Horeca Select", "Makro Professional", "Metro Professional", "Mainho", "Bartscher", "Retinna", "Efficol", "Crea"],
  },
  movilidad: {
    confirmadas: [],
    wip: ["Cecotec", "Navee", "Red Bull", "Reebok", "Alfa Romeo", "Nilox"],
  },
  electronica: {
    confirmadas: [],
    wip: [],
  },
};
