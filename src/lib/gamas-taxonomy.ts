/**
 * Taxonomía oficial Modelo WG — Gamas y familias de producto.
 * Estructura jerárquica: Gama → Subcategoría (opcional) → Familia.
 *
 * El código de cada familia es el que se persiste en
 * wg_network_applications.familias_producto. Mantener estable.
 */

export interface FamiliaItem {
  code: string;
  label: string;
}

export interface SubgrupoFamilias {
  label: string;
  items: FamiliaItem[];
}

export interface GamaDef {
  code: string;
  label: string;
  emoji?: string;
  /** Si tiene subgrupos, se renderizan agrupados; si no, va plano. */
  subgrupos?: SubgrupoFamilias[];
  items?: FamiliaItem[];
}

export const GAMAS: GamaDef[] = [
  {
    code: "blanca",
    label: "Gama blanca",
    emoji: "🔷",
    subgrupos: [
      {
        label: "Lavado",
        items: [
          { code: "blanca.lavadoras", label: "Lavadoras" },
          { code: "blanca.secadoras", label: "Secadoras" },
          { code: "blanca.lavasecadoras", label: "Lavasecadoras" },
        ],
      },
      {
        label: "Frío",
        items: [
          { code: "blanca.frigorificos", label: "Frigoríficos" },
          { code: "blanca.combi", label: "Combi" },
          { code: "blanca.congeladores", label: "Congeladores" },
        ],
      },
      {
        label: "Lavavajillas",
        items: [
          { code: "blanca.lavavajillas", label: "Lavavajillas" },
        ],
      },
      {
        label: "Cocción",
        items: [
          { code: "blanca.hornos", label: "Hornos" },
          { code: "blanca.placas", label: "Placas" },
          { code: "blanca.campanas", label: "Campanas" },
          { code: "blanca.cocinas", label: "Cocinas completas" },
        ],
      },
    ],
  },
  {
    code: "marron",
    label: "Gama marrón",
    emoji: "🔷",
    items: [
      { code: "marron.tv", label: "Televisión (LED, QLED, Smart TV)" },
      { code: "marron.audio", label: "Audio (barras, altavoces, hi-fi, auriculares)" },
      { code: "marron.video", label: "Vídeo / multimedia (TV box, streaming)" },
      { code: "marron.proyeccion", label: "Proyección (proyectores)" },
      { code: "marron.recepcion", label: "Recepción (decodificadores)" },
    ],
  },
  {
    code: "pae",
    label: "PAE — Pequeño aparato electrodoméstico",
    emoji: "🔷",
    subgrupos: [
      {
        label: "Cocina",
        items: [
          { code: "pae.cafeteras", label: "Cafeteras" },
          { code: "pae.tostadoras", label: "Tostadoras" },
          { code: "pae.batidoras", label: "Batidoras / licuadoras" },
          { code: "pae.freidoras", label: "Freidoras (air fryer)" },
          { code: "pae.robots_cocina", label: "Robots de cocina" },
        ],
      },
      {
        label: "Limpieza",
        items: [
          { code: "pae.aspiradores", label: "Aspiradores (escoba, robot, trineo)" },
          { code: "pae.vaporetas", label: "Vaporetas" },
        ],
      },
      {
        label: "Plancha",
        items: [
          { code: "pae.planchas", label: "Planchas" },
          { code: "pae.centros_planchado", label: "Centros de planchado" },
        ],
      },
      {
        label: "Cuidado personal",
        items: [
          { code: "pae.secadores", label: "Secadores" },
          { code: "pae.afeitadoras", label: "Afeitadoras" },
          { code: "pae.planchas_pelo", label: "Planchas de pelo" },
        ],
      },
    ],
  },
  {
    code: "confort",
    label: "Climatización",
    emoji: "🔷",
    items: [
      { code: "confort.aire", label: "Aire acondicionado (portátil / split)" },
      { code: "confort.ventiladores", label: "Ventiladores" },
      { code: "confort.calefactores", label: "Calefactores / radiadores eléctricos" },
      { code: "confort.deshumidificadores", label: "Deshumidificadores" },
      { code: "confort.humidificadores", label: "Humidificadores" },
      { code: "confort.purificadores", label: "Purificadores de aire" },
    ],
  },
  {
    code: "movilidad",
    label: "Movilidad",
    emoji: "🔷",
    items: [
      { code: "movilidad.patinetes", label: "Patinetes eléctricos" },
      { code: "movilidad.bicicletas", label: "Bicicletas eléctricas" },
      { code: "movilidad.scooters", label: "Scooters eléctricos ligeros" },
      { code: "movilidad.motos", label: "Motocicletas eléctricas (ciclomotor / urbano)" },
      { code: "movilidad.accesorios", label: "Accesorios (baterías, cargadores)" },
    ],
  },
  {
    code: "electronica",
    label: "Electrónica de consumo",
    emoji: "🔷",
    items: [
      { code: "electronica.ordenadores", label: "Ordenadores (portátiles, sobremesa)" },
      { code: "electronica.tablets", label: "Tablets" },
      { code: "electronica.smartphones", label: "Smartphones" },
      { code: "electronica.monitores", label: "Monitores" },
      { code: "electronica.impresoras", label: "Impresoras" },
      { code: "electronica.redes", label: "Redes (routers, repetidores, PLC)" },
      { code: "electronica.gaming", label: "Gaming (consolas, accesorios)" },
      { code: "electronica.wearables", label: "Wearables" },
    ],
  },
  {
    code: "profesional",
    label: "Gama profesional",
    emoji: "🔷",
    subgrupos: [
      {
        label: "Frío profesional",
        items: [
          { code: "profesional.camaras_frigorificas", label: "Cámaras frigoríficas" },
          { code: "profesional.armarios_refrigerados", label: "Armarios refrigerados" },
          { code: "profesional.congeladores_industriales", label: "Congeladores industriales" },
          { code: "profesional.mesas_refrigeradas", label: "Mesas refrigeradas" },
        ],
      },
      {
        label: "Cocción profesional",
        items: [
          { code: "profesional.hornos_industriales", label: "Hornos industriales" },
          { code: "profesional.planchas_profesionales", label: "Planchas profesionales" },
          { code: "profesional.freidoras_industriales", label: "Freidoras industriales" },
          { code: "profesional.cocinas_industriales", label: "Cocinas industriales" },
          { code: "profesional.parrillas", label: "Parrillas" },
        ],
      },
      {
        label: "Lavado profesional",
        items: [
          { code: "profesional.lavavajillas_industriales", label: "Lavavajillas industriales" },
          { code: "profesional.tuneles_lavado", label: "Túneles de lavado" },
          { code: "profesional.lavavasos", label: "Lavavasos" },
        ],
      },
      {
        label: "Preparación de alimentos",
        items: [
          { code: "profesional.cortadoras", label: "Cortadoras" },
          { code: "profesional.picadoras", label: "Picadoras" },
          { code: "profesional.amasadoras", label: "Amasadoras" },
        ],
      },
    ],
  },
];

/** Devuelve plano: todas las familias con su gama y subgrupo. */
export const allFamilias = (): Array<FamiliaItem & { gama: string; subgrupo?: string }> => {
  const out: Array<FamiliaItem & { gama: string; subgrupo?: string }> = [];
  for (const g of GAMAS) {
    if (g.items) {
      for (const it of g.items) out.push({ ...it, gama: g.label });
    }
    if (g.subgrupos) {
      for (const s of g.subgrupos) {
        for (const it of s.items) out.push({ ...it, gama: g.label, subgrupo: s.label });
      }
    }
  }
  return out;
};

/** Códigos de familias de una gama (incluyendo todos sus subgrupos). */
export const familiaCodesOfGama = (gamaCode: string): string[] => {
  const g = GAMAS.find((x) => x.code === gamaCode);
  if (!g) return [];
  const codes: string[] = [];
  if (g.items) codes.push(...g.items.map((i) => i.code));
  if (g.subgrupos) {
    for (const s of g.subgrupos) codes.push(...s.items.map((i) => i.code));
  }
  return codes;
};

export const familiaLabelByCode = (code: string): string => {
  const all = allFamilias();
  return all.find((f) => f.code === code)?.label ?? code;
};
