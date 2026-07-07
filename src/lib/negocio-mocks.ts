// Mocks para la capa comercial del portal WG Network
// Repuestos a coste + Tienda de equipos

export type GamaRepuesto =
  | "blanca" | "marron" | "climatizacion" | "pae" | "movilidad" | "profesional";

export const GAMA_LABEL: Record<GamaRepuesto, string> = {
  blanca: "Blanca",
  marron: "Marrón",
  climatizacion: "Climatización",
  pae: "Pequeño aparato",
  movilidad: "Movilidad",
  profesional: "Profesional",
};

export type Repuesto = {
  id: string;
  nombre: string;
  ref: string;
  marca: string;
  gama: GamaRepuesto;
  stock: "alto" | "medio" | "bajo";
  precio: number; // €, precio a coste
};

export const MARCAS_REPUESTO = [
  "Vestel", "Toshiba", "JVC", "Hitachi", "Sharp", "Telefunken",
  "Daewoo", "New Pol", "Cecotec", "Johnson", "Thomson", "Sauber",
] as const;

export const MOCK_REPUESTOS: Repuesto[] = [
  { id: "r1",  nombre: "Bomba de desagüe universal",       ref: "VS-BD-4210",   marca: "Vestel",     gama: "blanca",        stock: "alto",  precio: 18.40 },
  { id: "r2",  nombre: "Resistencia horno 2200W",           ref: "VS-RH-2200",   marca: "Vestel",     gama: "blanca",        stock: "alto",  precio: 22.90 },
  { id: "r3",  nombre: "Módulo electrónico lavadora",       ref: "VS-ML-8815",   marca: "Vestel",     gama: "blanca",        stock: "medio", precio: 74.30 },
  { id: "r4",  nombre: "Compresor frigorífico 1/6 HP",      ref: "VS-CF-016",    marca: "Vestel",     gama: "blanca",        stock: "bajo",  precio: 89.00 },
  { id: "r5",  nombre: "Panel TFT 43'' repuesto",           ref: "TS-P43-A1",    marca: "Toshiba",    gama: "marron",        stock: "medio", precio: 128.50 },
  { id: "r6",  nombre: "Placa fuente TV LED",               ref: "TS-PF-2044",   marca: "Toshiba",    gama: "marron",        stock: "alto",  precio: 34.20 },
  { id: "r7",  nombre: "Mando universal original",          ref: "JV-MU-100",    marca: "JVC",        gama: "marron",        stock: "alto",  precio: 9.80 },
  { id: "r8",  nombre: "Placa T-CON pantalla",              ref: "SH-TC-5502",   marca: "Sharp",      gama: "marron",        stock: "medio", precio: 41.60 },
  { id: "r9",  nombre: "Ventilador axial split interior",   ref: "HT-VX-090",    marca: "Hitachi",    gama: "climatizacion", stock: "medio", precio: 28.70 },
  { id: "r10", nombre: "Placa control bomba de calor",      ref: "JH-PC-BC12",   marca: "Johnson",    gama: "climatizacion", stock: "bajo",  precio: 96.00 },
  { id: "r11", nombre: "Sensor NTC evaporador",             ref: "HT-NTC-010",   marca: "Hitachi",    gama: "climatizacion", stock: "alto",  precio: 6.40 },
  { id: "r12", nombre: "Motor batidora 600W",               ref: "CC-MB-600",    marca: "Cecotec",    gama: "pae",           stock: "alto",  precio: 12.10 },
  { id: "r13", nombre: "Resistencia freidora aire 1500W",   ref: "CC-RF-1500",   marca: "Cecotec",    gama: "pae",           stock: "alto",  precio: 15.90 },
  { id: "r14", nombre: "Vaso vidrio robot cocina",          ref: "CC-VR-2200",   marca: "Cecotec",    gama: "pae",           stock: "medio", precio: 21.30 },
  { id: "r15", nombre: "Batería patinete 36V 10Ah",         ref: "NP-BP-3610",   marca: "New Pol",    gama: "movilidad",     stock: "bajo",  precio: 118.00 },
  { id: "r16", nombre: "Controladora bicicleta eléctrica",  ref: "TF-CE-250",    marca: "Telefunken", gama: "movilidad",     stock: "medio", precio: 46.50 },
  { id: "r17", nombre: "Cargador 42V 2A",                   ref: "TF-CG-4202",   marca: "Telefunken", gama: "movilidad",     stock: "alto",  precio: 14.20 },
  { id: "r18", nombre: "Motor lavavajillas industrial",     ref: "DW-ML-INS",    marca: "Daewoo",     gama: "profesional",   stock: "bajo",  precio: 132.00 },
  { id: "r19", nombre: "Bomba recirculación pro",           ref: "DW-BR-P08",    marca: "Daewoo",     gama: "profesional",   stock: "medio", precio: 58.40 },
  { id: "r20", nombre: "Termostato mecánico horno",         ref: "TH-TM-060",    marca: "Thomson",    gama: "blanca",        stock: "alto",  precio: 7.80 },
];

// -------- Equipos --------
export type CategoriaEquipo =
  | "lavado" | "frio" | "coccion" | "climatizacion" | "tv" | "pae" | "movilidad";

export const CATEGORIA_LABEL: Record<CategoriaEquipo, string> = {
  lavado: "Lavado",
  frio: "Frío",
  coccion: "Cocción",
  climatizacion: "Climatización",
  tv: "TV / Imagen",
  pae: "Pequeño aparato",
  movilidad: "Movilidad",
};

export type Equipo = {
  id: string;
  modelo: string;
  marca: string;
  categoria: CategoriaEquipo;
  precioRed: number;   // Precio red WG (compra colaborador)
  pvp: number;         // PVP orientativo
};

export const equipoMargen = (e: Equipo) =>
  Math.round(((e.pvp - e.precioRed) / e.pvp) * 100);

export const MOCK_EQUIPOS: Equipo[] = [
  { id: "e1",  modelo: "Lavadora 8kg Inverter W48",        marca: "Vestel",   categoria: "lavado",         precioRed: 249,  pvp: 379 },
  { id: "e2",  modelo: "Lavadora 9kg Silence Pro",         marca: "Sauber",   categoria: "lavado",         precioRed: 279,  pvp: 449 },
  { id: "e3",  modelo: "Secadora bomba calor 8kg",         marca: "Vestel",   categoria: "lavado",         precioRed: 359,  pvp: 549 },
  { id: "e4",  modelo: "Frigo combi NoFrost 186cm",        marca: "Vestel",   categoria: "frio",           precioRed: 429,  pvp: 649 },
  { id: "e5",  modelo: "Frigo americano Side-by-Side",     marca: "Thomson",  categoria: "frio",           precioRed: 749,  pvp: 1099 },
  { id: "e6",  modelo: "Arcón congelador 200L",            marca: "Evvo",     categoria: "frio",           precioRed: 289,  pvp: 429 },
  { id: "e7",  modelo: "Horno multifunción pirolítico",    marca: "Vestel",   categoria: "coccion",        precioRed: 259,  pvp: 399 },
  { id: "e8",  modelo: "Placa inducción 60cm 4 zonas",     marca: "Sauber",   categoria: "coccion",        precioRed: 199,  pvp: 329 },
  { id: "e9",  modelo: "Split 3000 frig. A++/A+",          marca: "Vestel",   categoria: "climatizacion",  precioRed: 349,  pvp: 549 },
  { id: "e10", modelo: "Split 4500 frig. Inverter",        marca: "Thomson",  categoria: "climatizacion",  precioRed: 429,  pvp: 649 },
  { id: "e11", modelo: 'Smart TV 55" 4K',                  marca: "Vestel",   categoria: "tv",             precioRed: 349,  pvp: 549 },
  { id: "e12", modelo: 'Smart TV 65" QLED',                marca: "Thomson",  categoria: "tv",             precioRed: 549,  pvp: 849 },
  { id: "e13", modelo: "Robot cocina multifunción",        marca: "Cecotec",  categoria: "pae",            precioRed: 189,  pvp: 299 },
  { id: "e14", modelo: "Patinete eléctrico 25km/h",        marca: "Cecotec",  categoria: "movilidad",      precioRed: 269,  pvp: 429 },
];
