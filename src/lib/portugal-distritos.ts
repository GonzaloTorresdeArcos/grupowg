/**
 * Distritos de Portugal (continental + regiones autónomas).
 * Códigos siguen el estándar ISO 3166-2:PT.
 *
 * Cobertura: 18 distritos continentales + 2 regiones autónomas (Açores, Madeira) = 20 entradas.
 * Coordenadas aproximadas de la capital de cada distrito/región.
 */

export interface Distrito {
  code: string; // ISO PT-XX
  name: string;
  region: string; // Norte, Centro, Lisboa, Alentejo, Algarve, Açores, Madeira
  lat: number;
  lng: number;
}

export const DISTRITOS_PT: Distrito[] = [
  // ───── Norte ─────
  { code: "PT-03", name: "Braga", region: "Norte", lat: 41.5454, lng: -8.4265 },
  { code: "PT-04", name: "Bragança", region: "Norte", lat: 41.8061, lng: -6.7567 },
  { code: "PT-13", name: "Porto", region: "Norte", lat: 41.1579, lng: -8.6291 },
  { code: "PT-16", name: "Viana do Castelo", region: "Norte", lat: 41.6918, lng: -8.8345 },
  { code: "PT-17", name: "Vila Real", region: "Norte", lat: 41.3006, lng: -7.7441 },

  // ───── Centro ─────
  { code: "PT-01", name: "Aveiro", region: "Centro", lat: 40.6405, lng: -8.6538 },
  { code: "PT-05", name: "Castelo Branco", region: "Centro", lat: 39.8222, lng: -7.4918 },
  { code: "PT-06", name: "Coimbra", region: "Centro", lat: 40.2033, lng: -8.4103 },
  { code: "PT-09", name: "Guarda", region: "Centro", lat: 40.5374, lng: -7.2659 },
  { code: "PT-10", name: "Leiria", region: "Centro", lat: 39.7437, lng: -8.8071 },
  { code: "PT-18", name: "Viseu", region: "Centro", lat: 40.6566, lng: -7.9122 },

  // ───── Lisboa e Vale do Tejo ─────
  { code: "PT-11", name: "Lisboa", region: "Lisboa", lat: 38.7223, lng: -9.1393 },
  { code: "PT-14", name: "Santarém", region: "Lisboa", lat: 39.2362, lng: -8.6859 },
  { code: "PT-15", name: "Setúbal", region: "Lisboa", lat: 38.5244, lng: -8.8882 },

  // ───── Alentejo ─────
  { code: "PT-02", name: "Beja", region: "Alentejo", lat: 38.0151, lng: -7.8632 },
  { code: "PT-07", name: "Évora", region: "Alentejo", lat: 38.5713, lng: -7.9135 },
  { code: "PT-12", name: "Portalegre", region: "Alentejo", lat: 39.2967, lng: -7.4281 },

  // ───── Algarve ─────
  { code: "PT-08", name: "Faro", region: "Algarve", lat: 37.0194, lng: -7.9304 },

  // ───── Regiones autónomas ─────
  { code: "PT-20", name: "Açores", region: "Açores", lat: 37.7412, lng: -25.6756 },
  { code: "PT-30", name: "Madeira", region: "Madeira", lat: 32.6669, lng: -16.9241 },
];

export const distritoByCode = (code: string) => DISTRITOS_PT.find((d) => d.code === code);
