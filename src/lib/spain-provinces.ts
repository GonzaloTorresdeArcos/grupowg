/**
 * Listado simplificado de provincias españolas con coordenadas aproximadas
 * (capital de provincia) usadas para el selector de cobertura.
 */

export interface Provincia {
  code: string;
  name: string;
  ccaa: string;
  lat: number;
  lng: number;
}

export const PROVINCIAS: Provincia[] = [
  { code: "01", name: "Álava", ccaa: "País Vasco", lat: 42.85, lng: -2.67 },
  { code: "02", name: "Albacete", ccaa: "Castilla-La Mancha", lat: 38.99, lng: -1.86 },
  { code: "03", name: "Alicante", ccaa: "C. Valenciana", lat: 38.35, lng: -0.48 },
  { code: "04", name: "Almería", ccaa: "Andalucía", lat: 36.84, lng: -2.46 },
  { code: "05", name: "Ávila", ccaa: "Castilla y León", lat: 40.66, lng: -4.7 },
  { code: "06", name: "Badajoz", ccaa: "Extremadura", lat: 38.88, lng: -6.97 },
  { code: "07", name: "Illes Balears", ccaa: "Islas Baleares", lat: 39.57, lng: 2.65 },
  { code: "08", name: "Barcelona", ccaa: "Cataluña", lat: 41.39, lng: 2.17 },
  { code: "09", name: "Burgos", ccaa: "Castilla y León", lat: 42.34, lng: -3.7 },
  { code: "10", name: "Cáceres", ccaa: "Extremadura", lat: 39.47, lng: -6.37 },
  { code: "11", name: "Cádiz", ccaa: "Andalucía", lat: 36.53, lng: -6.29 },
  { code: "12", name: "Castellón", ccaa: "C. Valenciana", lat: 39.99, lng: -0.04 },
  { code: "13", name: "Ciudad Real", ccaa: "Castilla-La Mancha", lat: 38.98, lng: -3.93 },
  { code: "14", name: "Córdoba", ccaa: "Andalucía", lat: 37.88, lng: -4.78 },
  { code: "15", name: "A Coruña", ccaa: "Galicia", lat: 43.36, lng: -8.41 },
  { code: "16", name: "Cuenca", ccaa: "Castilla-La Mancha", lat: 40.07, lng: -2.13 },
  { code: "17", name: "Girona", ccaa: "Cataluña", lat: 41.98, lng: 2.82 },
  { code: "18", name: "Granada", ccaa: "Andalucía", lat: 37.18, lng: -3.6 },
  { code: "19", name: "Guadalajara", ccaa: "Castilla-La Mancha", lat: 40.63, lng: -3.16 },
  { code: "20", name: "Gipuzkoa", ccaa: "País Vasco", lat: 43.32, lng: -1.98 },
  { code: "21", name: "Huelva", ccaa: "Andalucía", lat: 37.26, lng: -6.95 },
  { code: "22", name: "Huesca", ccaa: "Aragón", lat: 42.14, lng: -0.41 },
  { code: "23", name: "Jaén", ccaa: "Andalucía", lat: 37.77, lng: -3.79 },
  { code: "24", name: "León", ccaa: "Castilla y León", lat: 42.6, lng: -5.57 },
  { code: "25", name: "Lleida", ccaa: "Cataluña", lat: 41.62, lng: 0.62 },
  { code: "26", name: "La Rioja", ccaa: "La Rioja", lat: 42.46, lng: -2.45 },
  { code: "27", name: "Lugo", ccaa: "Galicia", lat: 43.01, lng: -7.56 },
  { code: "28", name: "Madrid", ccaa: "Madrid", lat: 40.42, lng: -3.7 },
  { code: "29", name: "Málaga", ccaa: "Andalucía", lat: 36.72, lng: -4.42 },
  { code: "30", name: "Murcia", ccaa: "Murcia", lat: 37.99, lng: -1.13 },
  { code: "31", name: "Navarra", ccaa: "Navarra", lat: 42.81, lng: -1.65 },
  { code: "32", name: "Ourense", ccaa: "Galicia", lat: 42.34, lng: -7.86 },
  { code: "33", name: "Asturias", ccaa: "Asturias", lat: 43.36, lng: -5.85 },
  { code: "34", name: "Palencia", ccaa: "Castilla y León", lat: 42.01, lng: -4.53 },
  { code: "35", name: "Las Palmas", ccaa: "Canarias", lat: 28.12, lng: -15.43 },
  { code: "36", name: "Pontevedra", ccaa: "Galicia", lat: 42.43, lng: -8.65 },
  { code: "37", name: "Salamanca", ccaa: "Castilla y León", lat: 40.97, lng: -5.66 },
  { code: "38", name: "S.C. Tenerife", ccaa: "Canarias", lat: 28.47, lng: -16.25 },
  { code: "39", name: "Cantabria", ccaa: "Cantabria", lat: 43.46, lng: -3.81 },
  { code: "40", name: "Segovia", ccaa: "Castilla y León", lat: 40.95, lng: -4.12 },
  { code: "41", name: "Sevilla", ccaa: "Andalucía", lat: 37.39, lng: -5.99 },
  { code: "42", name: "Soria", ccaa: "Castilla y León", lat: 41.76, lng: -2.47 },
  { code: "43", name: "Tarragona", ccaa: "Cataluña", lat: 41.12, lng: 1.25 },
  { code: "44", name: "Teruel", ccaa: "Aragón", lat: 40.34, lng: -1.11 },
  { code: "45", name: "Toledo", ccaa: "Castilla-La Mancha", lat: 39.86, lng: -4.02 },
  { code: "46", name: "Valencia", ccaa: "C. Valenciana", lat: 39.47, lng: -0.38 },
  { code: "47", name: "Valladolid", ccaa: "Castilla y León", lat: 41.65, lng: -4.72 },
  { code: "48", name: "Bizkaia", ccaa: "País Vasco", lat: 43.26, lng: -2.92 },
  { code: "49", name: "Zamora", ccaa: "Castilla y León", lat: 41.5, lng: -5.75 },
  { code: "50", name: "Zaragoza", ccaa: "Aragón", lat: 41.65, lng: -0.88 },
  { code: "51", name: "Ceuta", ccaa: "Ceuta", lat: 35.89, lng: -5.32 },
  { code: "52", name: "Melilla", ccaa: "Melilla", lat: 35.29, lng: -2.94 },
];

export const provinciaByCode = (code: string) => PROVINCIAS.find((p) => p.code === code);
