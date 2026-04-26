/**
 * Listado ampliado de localidades por provincia con su código postal
 * "cabecera". Cubre los municipios principales y cabeceras de comarca de
 * cada provincia (≈ 1.500 entradas) para que el colaborador pueda excluir
 * localidades concretas dentro de su zona de cobertura.
 *
 * Para las grandes capitales (Madrid, Barcelona, Valencia, Sevilla, Málaga,
 * Zaragoza, Bilbao) se desglosa el municipio capital en distritos / zonas
 * (centro y periferia) para permitir exclusiones más finas (p.ej. atender
 * "Madrid Centro" pero no "Vallecas").
 *
 * Nota: España tiene >8.000 municipios. Esta lista no es exhaustiva, pero
 * incluye prácticamente todos los >5.000 habitantes y todas las cabeceras
 * comarcales relevantes para servicios técnicos / SAT.
 */

export interface Localidad {
  name: string;
  cp: string;
}

export const LOCALIDADES_BY_PROVINCE: Record<string, Localidad[]> = {
  // ============= ANDALUCÍA =============
  "04": [ // Almería
    // ───── 1) Almería capital ─────
    { name: "Almería Capital · Centro", cp: "04001" },
    { name: "Almería Capital · Nueva Andalucía", cp: "04007" },
    { name: "Almería Capital · Zapillo", cp: "04007" },
    { name: "Almería Capital · Ciudad Jardín", cp: "04006" },
    { name: "Almería Capital · El Alquián", cp: "04130" },
    { name: "Almería Capital · Retamar", cp: "04131" },

    // ───── 2) Área metropolitana (≤20–25 km) ─────
    // 2.1 Poniente cercano
    { name: "AL Á. Metro Poniente · Roquetas de Mar", cp: "04740" },
    { name: "AL Á. Metro Poniente · Vícar", cp: "04738" },
    { name: "AL Á. Metro Poniente · La Mojonera", cp: "04745" },
    // 2.2 Norte / área cercana
    { name: "AL Á. Metro Norte · Huércal de Almería", cp: "04230" },
    { name: "AL Á. Metro Norte · Viator", cp: "04240" },

    // ───── 3) Resto provincia de Almería ─────
    // 3.1 Poniente ampliado (25–40 km)
    { name: "AL Poniente Ampliado · El Ejido", cp: "04700" },
    { name: "AL Poniente Ampliado · Adra", cp: "04770" },
    // 3.2 Levante
    { name: "AL Levante · Vera", cp: "04620" },
    { name: "AL Levante · Mojácar", cp: "04638" },
    { name: "AL Levante · Garrucha", cp: "04630" },
    // 3.3 Interior
    { name: "AL Interior · Huércal-Overa", cp: "04600" },
    { name: "AL Interior · Albox", cp: "04800" },
  ],
  "11": [ // Cádiz
    // ───── 1.1 Cádiz capital (barrios) ─────
    { name: "Cádiz Capital · Centro", cp: "11001" },
    { name: "Cádiz Capital · Extramuros", cp: "11008" },
    { name: "Cádiz Capital · La Viña", cp: "11002" },
    { name: "Cádiz Capital · El Mentidero", cp: "11001" },
    { name: "Cádiz Capital · Santa María", cp: "11005" },
    { name: "Cádiz Capital · Puntales", cp: "11011" },
    { name: "Cádiz Capital · Loreto", cp: "11010" },
    { name: "Cádiz Capital · Cerro del Moro", cp: "11012" },
    { name: "Cádiz Capital · Guillén Moreno", cp: "11008" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Bahía de Cádiz
    { name: "CA Á. Metro Bahía · San Fernando", cp: "11100" },
    { name: "CA Á. Metro Bahía · Puerto Real", cp: "11510" },
    { name: "CA Á. Metro Bahía · El Puerto de Santa María", cp: "11500" },
    { name: "CA Á. Metro Bahía · Chiclana de la Frontera", cp: "11130" },

    // ───── 1.3 Resto provincia de Cádiz ─────
    // 1.3.1 Jerez
    { name: "CA Jerez · Jerez de la Frontera", cp: "11401" },
    // 1.3.2 Costa noroeste
    { name: "CA Costa Noroeste · Sanlúcar de Barrameda", cp: "11540" },
    { name: "CA Costa Noroeste · Rota", cp: "11520" },
    { name: "CA Costa Noroeste · Chipiona", cp: "11550" },
    // 1.3.3 Campo de Gibraltar
    { name: "CA Campo de Gibraltar · Algeciras", cp: "11201" },
    { name: "CA Campo de Gibraltar · La Línea de la Concepción", cp: "11300" },
    { name: "CA Campo de Gibraltar · San Roque", cp: "11360" },
    { name: "CA Campo de Gibraltar · Los Barrios", cp: "11370" },
  ],
  "14": [ // Córdoba
    // ───── 1.1 Córdoba capital (distritos) ─────
    { name: "Córdoba Capital · Centro", cp: "14002" },
    { name: "Córdoba Capital · Poniente Norte", cp: "14011" },
    { name: "Córdoba Capital · Poniente Sur", cp: "14013" },
    { name: "Córdoba Capital · Norte-Sierra", cp: "14012" },
    { name: "Córdoba Capital · Sureste", cp: "14014" },
    { name: "Córdoba Capital · Sur", cp: "14010" },
    { name: "Córdoba Capital · Levante", cp: "14006" },
    { name: "Córdoba Capital · Noroeste", cp: "14011" },
    { name: "Córdoba Capital · Fuensanta", cp: "14010" },
    { name: "Córdoba Capital · El Brillante", cp: "14012" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Oeste / Valle del Guadalquivir
    { name: "CO Á. Metro Oeste · Almodóvar del Río", cp: "14720" },
    { name: "CO Á. Metro Oeste · Posadas", cp: "14730" },
    // 1.2.2 Sur cercano
    { name: "CO Á. Metro Sur · La Carlota", cp: "14100" },
    { name: "CO Á. Metro Sur · Guadalcázar", cp: "14112" },
    // 1.2.3 Este cercano
    { name: "CO Á. Metro Este · El Carpio", cp: "14620" },
    { name: "CO Á. Metro Este · Villafranca de Córdoba", cp: "14420" },

    // ───── 1.3 Resto provincia de Córdoba ─────
    // 1.3.1 Sur (Subbética)
    { name: "CO Subbética · Lucena", cp: "14900" },
    { name: "CO Subbética · Cabra", cp: "14940" },
    { name: "CO Subbética · Priego de Córdoba", cp: "14800" },
    // 1.3.2 Campiña
    { name: "CO Campiña · Puente Genil", cp: "14500" },
    { name: "CO Campiña · Montilla", cp: "14550" },
    { name: "CO Campiña · Aguilar de la Frontera", cp: "14920" },
    // 1.3.3 Norte (Los Pedroches / Valle del Guadiato)
    { name: "CO Norte · Pozoblanco", cp: "14400" },
    { name: "CO Norte · Peñarroya-Pueblonuevo", cp: "14200" },
  ],
  "18": [ // Granada
    // ───── 1.1 Granada capital (distritos) ─────
    { name: "Granada Capital · Centro", cp: "18001" },
    { name: "Granada Capital · Albaicín", cp: "18010" },
    { name: "Granada Capital · Sacromonte", cp: "18010" },
    { name: "Granada Capital · Realejo", cp: "18009" },
    { name: "Granada Capital · Zaidín", cp: "18007" },
    { name: "Granada Capital · Chana", cp: "18015" },
    { name: "Granada Capital · Norte", cp: "18013" },
    { name: "Granada Capital · Genil", cp: "18006" },
    { name: "Granada Capital · Ronda", cp: "18004" },
    { name: "Granada Capital · Beiro", cp: "18011" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón Oeste
    { name: "GR Á. Metro Oeste · Santa Fe", cp: "18320" },
    { name: "GR Á. Metro Oeste · Atarfe", cp: "18230" },
    // 1.2.2 Cinturón Sur
    { name: "GR Á. Metro Sur · Armilla", cp: "18100" },
    { name: "GR Á. Metro Sur · Ogíjares", cp: "18151" },
    { name: "GR Á. Metro Sur · La Zubia", cp: "18140" },
    // 1.2.3 Cinturón Norte
    { name: "GR Á. Metro Norte · Maracena", cp: "18200" },
    { name: "GR Á. Metro Norte · Albolote", cp: "18220" },
    { name: "GR Á. Metro Norte · Peligros", cp: "18210" },

    // ───── 1.3 Resto provincia de Granada ─────
    // 1.3.1 Costa Tropical
    { name: "GR Costa Tropical · Motril", cp: "18600" },
    { name: "GR Costa Tropical · Salobreña", cp: "18680" },
    { name: "GR Costa Tropical · Almuñécar", cp: "18690" },
    // 1.3.2 Norte / interior
    { name: "GR Norte Interior · Guadix", cp: "18500" },
    { name: "GR Norte Interior · Baza", cp: "18800" },
    // 1.3.3 Alpujarra
    { name: "GR Alpujarra · Órgiva", cp: "18400" },
    { name: "GR Alpujarra · Lanjarón", cp: "18420" },
  ],
  "21": [ // Huelva
    // ───── 1.1 Huelva capital (barrios) ─────
    { name: "Huelva Capital · Centro", cp: "21001" },
    { name: "Huelva Capital · Isla Chica", cp: "21002" },
    { name: "Huelva Capital · El Matadero", cp: "21003" },
    { name: "Huelva Capital · Molino de la Vega", cp: "21006" },
    { name: "Huelva Capital · Pérez Cubillas", cp: "21006" },
    { name: "Huelva Capital · Verdeluz", cp: "21005" },
    { name: "Huelva Capital · La Orden", cp: "21006" },
    { name: "Huelva Capital · Fuentepiña", cp: "21007" },
    { name: "Huelva Capital · El Carmen", cp: "21002" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "HU Á. Metro Cercano · Punta Umbría", cp: "21100" },
    { name: "HU Á. Metro Cercano · Aljaraque", cp: "21110" },
    { name: "HU Á. Metro Cercano · Gibraleón", cp: "21500" },
    { name: "HU Á. Metro Cercano · Palos de la Frontera", cp: "21810" },
    { name: "HU Á. Metro Cercano · Moguer", cp: "21800" },

    // ───── 1.3 Resto provincia de Huelva ─────
    // 1.3.1 Costa
    { name: "HU Costa · Lepe", cp: "21440" },
    { name: "HU Costa · Isla Cristina", cp: "21410" },
    { name: "HU Costa · Ayamonte", cp: "21400" },
    // 1.3.2 Condado
    { name: "HU Condado · Almonte", cp: "21730" },
    { name: "HU Condado · La Palma del Condado", cp: "21700" },
    // 1.3.3 Sierra
    { name: "HU Sierra · Aracena", cp: "21200" },
    { name: "HU Sierra · Cortegana", cp: "21230" },
    { name: "HU Sierra · Jabugo", cp: "21290" },
  ],
  "23": [ // Jaén
    // ───── 1.1 Jaén capital (barrios) ─────
    { name: "Jaén Capital · Centro", cp: "23001" },
    { name: "Jaén Capital · Peñamefécit", cp: "23004" },
    { name: "Jaén Capital · San Ildefonso", cp: "23007" },
    { name: "Jaén Capital · La Magdalena", cp: "23004" },
    { name: "Jaén Capital · Expansión Norte", cp: "23009" },
    { name: "Jaén Capital · Polígono del Valle", cp: "23009" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "JA Á. Metro Cercano · La Guardia de Jaén", cp: "23170" },
    { name: "JA Á. Metro Cercano · Mancha Real", cp: "23100" },
    { name: "JA Á. Metro Cercano · Torredelcampo", cp: "23640" },
    { name: "JA Á. Metro Cercano · Torredonjimeno", cp: "23650" },
    { name: "JA Á. Metro Cercano · Martos", cp: "23600" },

    // ───── 1.3 Resto provincia de Jaén ─────
    // 1.3.1 Corredor central
    { name: "JA Corredor Central · Linares", cp: "23700" },
    { name: "JA Corredor Central · Andújar", cp: "23740" },
    { name: "JA Corredor Central · Bailén", cp: "23710" },
    // 1.3.2 La Loma
    { name: "JA La Loma · Úbeda", cp: "23400" },
    { name: "JA La Loma · Baeza", cp: "23440" },
    // 1.3.3 Sierra
    { name: "JA Sierra · La Carolina", cp: "23200" },
    { name: "JA Sierra · Cazorla", cp: "23470" },
  ],
  "29": [ // Málaga
    // ───── 1.1 Málaga capital (distritos) ─────
    { name: "Málaga Capital · Centro", cp: "29001" },
    { name: "Málaga Capital · Este", cp: "29017" },
    { name: "Málaga Capital · Ciudad Jardín", cp: "29014" },
    { name: "Málaga Capital · Bailén-Miraflores", cp: "29009" },
    { name: "Málaga Capital · Palma-Palmilla", cp: "29011" },
    { name: "Málaga Capital · Cruz de Humilladero", cp: "29004" },
    { name: "Málaga Capital · Carretera de Cádiz", cp: "29006" },
    { name: "Málaga Capital · Churriana", cp: "29140" },
    { name: "Málaga Capital · Campanillas", cp: "29590" },
    { name: "Málaga Capital · Puerto de la Torre", cp: "29190" },
    { name: "Málaga Capital · Teatinos-Universidad", cp: "29010" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Costa occidental cercana
    { name: "MA Á. Metro Costa Occ · Torremolinos", cp: "29620" },
    { name: "MA Á. Metro Costa Occ · Benalmádena", cp: "29630" },
    // 1.2.2 Valle del Guadalhorce
    { name: "MA Á. Metro Guadalhorce · Alhaurín de la Torre", cp: "29130" },
    { name: "MA Á. Metro Guadalhorce · Alhaurín el Grande", cp: "29120" },
    { name: "MA Á. Metro Guadalhorce · Cártama", cp: "29570" },
    // 1.2.3 Costa oriental cercana
    { name: "MA Á. Metro Costa Or · Rincón de la Victoria", cp: "29730" },

    // ───── 1.3 Resto provincia de Málaga ─────
    // 1.3.1 Costa del Sol occidental
    { name: "MA Costa del Sol Occ · Fuengirola", cp: "29640" },
    { name: "MA Costa del Sol Occ · Marbella", cp: "29600" },
    { name: "MA Costa del Sol Occ · Estepona", cp: "29680" },
    // 1.3.2 Costa oriental / Axarquía
    { name: "MA Axarquía · Vélez-Málaga", cp: "29700" },
    { name: "MA Axarquía · Nerja", cp: "29780" },
    { name: "MA Axarquía · Torrox", cp: "29770" },
    // 1.3.3 Interior
    { name: "MA Interior · Antequera", cp: "29200" },
    { name: "MA Interior · Ronda", cp: "29400" },
  ],
  "41": [ // Sevilla
    // ───── 1) Sevilla Capital · 11 distritos ─────
    { name: "Sevilla Capital · Casco Antiguo", cp: "41004" },
    { name: "Sevilla Capital · Triana", cp: "41010" },
    { name: "Sevilla Capital · Los Remedios", cp: "41011" },
    { name: "Sevilla Capital · Nervión", cp: "41005" },
    { name: "Sevilla Capital · Sur", cp: "41012" },
    { name: "Sevilla Capital · Macarena", cp: "41008" },
    { name: "Sevilla Capital · Norte", cp: "41015" },
    { name: "Sevilla Capital · Este-Alcosa-Torreblanca", cp: "41020" },
    { name: "Sevilla Capital · Cerro-Amate", cp: "41006" },
    { name: "Sevilla Capital · San Pablo-Santa Justa", cp: "41007" },
    { name: "Sevilla Capital · Bellavista-La Palmera", cp: "41013" },

    // ───── 2) Área metropolitana ─────
    // 2.1 Norte
    { name: "SE Á. Metro Norte · La Rinconada", cp: "41309" },
    { name: "SE Á. Metro Norte · Alcalá del Río", cp: "41200" },
    // 2.2 Oeste / Aljarafe
    { name: "SE Á. Metro Oeste · Camas", cp: "41900" },
    { name: "SE Á. Metro Oeste · Tomares", cp: "41940" },
    { name: "SE Á. Metro Oeste · Castilleja de la Cuesta", cp: "41950" },
    { name: "SE Á. Metro Oeste · Mairena del Aljarafe", cp: "41927" },
    { name: "SE Á. Metro Oeste · Bormujos", cp: "41930" },
    { name: "SE Á. Metro Oeste · San Juan de Aznalfarache", cp: "41920" },
    { name: "SE Á. Metro Oeste · Coria del Río", cp: "41100" },
    // 2.3 Sur
    { name: "SE Á. Metro Sur · Dos Hermanas", cp: "41700" },
    { name: "SE Á. Metro Sur · Los Palacios y Villafranca", cp: "41720" },
    // 2.4 Este
    { name: "SE Á. Metro Este · Alcalá de Guadaíra", cp: "41500" },

    // ───── 3) Resto provincia Sevilla ─────
    // 3.1 Sierra Norte
    { name: "SE Sierra Norte · Cazalla de la Sierra", cp: "41370" },
    { name: "SE Sierra Norte · Constantina", cp: "41450" },
    { name: "SE Sierra Norte · El Pedroso", cp: "41360" },
    // 3.2 Campiña / Este
    { name: "SE Campiña Este · Écija", cp: "41400" },
    { name: "SE Campiña Este · Osuna", cp: "41640" },
    { name: "SE Campiña Este · Marchena", cp: "41620" },
    // 3.3 Sur profundo
    { name: "SE Sur Profundo · Utrera", cp: "41710" },
    { name: "SE Sur Profundo · Lebrija", cp: "41740" },
  ],

  // ============= ARAGÓN =============
  "22": [ // Huesca
    // ───── 1.1 Huesca capital (barrios) ─────
    { name: "Huesca Capital · Centro", cp: "22001" },
    { name: "Huesca Capital · Perpetuo Socorro", cp: "22004" },
    { name: "Huesca Capital · Santo Domingo y San Martín", cp: "22002" },
    { name: "Huesca Capital · San Lorenzo", cp: "22003" },
    { name: "Huesca Capital · María Auxiliadora", cp: "22005" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "HSC Á. Metro Cercano · Monzón", cp: "22400" },
    { name: "HSC Á. Metro Cercano · Almudévar", cp: "22270" },
    { name: "HSC Á. Metro Cercano · Tierz", cp: "22193" },
    { name: "HSC Á. Metro Cercano · Quicena", cp: "22192" },

    // ───── 1.3 Resto provincia de Huesca ─────
    // 1.3.1 Somontano / centro
    { name: "HSC Somontano · Barbastro", cp: "22300" },
    // 1.3.2 Pirineo
    { name: "HSC Pirineo · Jaca", cp: "22700" },
    { name: "HSC Pirineo · Sabiñánigo", cp: "22600" },
    { name: "HSC Pirineo · Aínsa", cp: "22330" },
    // 1.3.3 Este / La Litera
    { name: "HSC La Litera · Binéfar", cp: "22500" },
    { name: "HSC La Litera · Fraga", cp: "22520" },
  ],
  "44": [ // Teruel
    // ───── 1.1 Teruel capital (barrios) ─────
    { name: "Teruel Capital · Centro", cp: "44001" },
    { name: "Teruel Capital · Ensanche", cp: "44002" },
    { name: "Teruel Capital · San León", cp: "44003" },
    { name: "Teruel Capital · Arrabal", cp: "44004" },
    { name: "Teruel Capital · Carrel", cp: "44002" },
    { name: "Teruel Capital · Fuenfresca", cp: "44002" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "TE Á. Metro Cercano · Villastar", cp: "44141" },
    { name: "TE Á. Metro Cercano · San Blas", cp: "44195" },
    { name: "TE Á. Metro Cercano · Caudé", cp: "44193" },
    { name: "TE Á. Metro Cercano · Cella", cp: "44370" },

    // ───── 1.3 Resto provincia de Teruel ─────
    // 1.3.1 Bajo Aragón
    { name: "TE Bajo Aragón · Alcañiz", cp: "44600" },
    { name: "TE Bajo Aragón · Andorra", cp: "44500" },
    { name: "TE Bajo Aragón · Calanda", cp: "44570" },
    // 1.3.2 Comunidad de Calatayud / Cuencas Mineras
    { name: "TE Cuencas Mineras · Utrillas", cp: "44760" },
    { name: "TE Cuencas Mineras · Montalbán", cp: "44770" },
    // 1.3.3 Maestrazgo / Este
    { name: "TE Maestrazgo · Alcorisa", cp: "44550" },
    { name: "TE Maestrazgo · Cantavieja", cp: "44140" },
  ],
  "50": [ // Zaragoza
    // ───── 1.1 Zaragoza capital (distritos) ─────
    { name: "Zaragoza Capital · Casco Antiguo", cp: "50003" },
    { name: "Zaragoza Capital · Centro", cp: "50001" },
    { name: "Zaragoza Capital · Delicias", cp: "50010" },
    { name: "Zaragoza Capital · Universidad", cp: "50009" },
    { name: "Zaragoza Capital · San José", cp: "50008" },
    { name: "Zaragoza Capital · Las Fuentes", cp: "50013" },
    { name: "Zaragoza Capital · La Almozara", cp: "50003" },
    { name: "Zaragoza Capital · Oliver-Valdefierro", cp: "50011" },
    { name: "Zaragoza Capital · Torrero-La Paz", cp: "50007" },
    { name: "Zaragoza Capital · Actur-Rey Fernando", cp: "50018" },
    { name: "Zaragoza Capital · El Rabal", cp: "50015" },
    { name: "Zaragoza Capital · Santa Isabel", cp: "50016" },
    { name: "Zaragoza Capital · Casablanca", cp: "50012" },
    { name: "Zaragoza Capital · Miralbueno", cp: "50011" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Norte
    { name: "Z Á. Metro Norte · Villanueva de Gállego", cp: "50830" },
    { name: "Z Á. Metro Norte · San Mateo de Gállego", cp: "50840" },
    // 1.2.2 Oeste
    { name: "Z Á. Metro Oeste · Utebo", cp: "50180" },
    { name: "Z Á. Metro Oeste · Figueruelas", cp: "50639" },
    { name: "Z Á. Metro Oeste · Pedrola", cp: "50690" },
    // 1.2.3 Sur
    { name: "Z Á. Metro Sur · Cuarte de Huerva", cp: "50410" },
    { name: "Z Á. Metro Sur · Cadrete", cp: "50420" },
    { name: "Z Á. Metro Sur · María de Huerva", cp: "50430" },
    // 1.2.4 Este
    { name: "Z Á. Metro Este · La Puebla de Alfindén", cp: "50171" },
    { name: "Z Á. Metro Este · Pastriz", cp: "50194" },
    { name: "Z Á. Metro Este · Alfajarín", cp: "50172" },

    // ───── 1.3 Resto provincia de Zaragoza ─────
    // 1.3.1 Eje oeste (Ribera Alta / Ebro)
    { name: "Z Eje Oeste · Alagón", cp: "50630" },
    { name: "Z Eje Oeste · Gallur", cp: "50650" },
    { name: "Z Eje Oeste · Ejea de los Caballeros", cp: "50600" },
    { name: "Z Eje Oeste · Tauste", cp: "50660" },
    // 1.3.2 Eje sur (Valdejalón)
    { name: "Z Valdejalón · La Almunia de Doña Godina", cp: "50100" },
    { name: "Z Valdejalón · Calatorao", cp: "50280" },
    { name: "Z Valdejalón · Épila", cp: "50290" },
    // 1.3.3 Eje este (Bajo Ebro / Caspe)
    { name: "Z Eje Este · Quinto", cp: "50770" },
    { name: "Z Eje Este · Fuentes de Ebro", cp: "50740" },
    { name: "Z Eje Este · Caspe", cp: "50700" },
    // 1.3.4 Norte / Cinco Villas ampliado
    { name: "Z Cinco Villas · Sos del Rey Católico", cp: "50680" },
    { name: "Z Cinco Villas · Uncastillo", cp: "50678" },
  ],

  // ============= ASTURIAS =============
  "33": [
    { name: "Oviedo", cp: "33001" },
    { name: "Gijón", cp: "33201" },
    { name: "Avilés", cp: "33400" },
    { name: "Siero", cp: "33510" },
    { name: "Langreo", cp: "33930" },
    { name: "Mieres", cp: "33600" },
    { name: "Castrillón", cp: "33450" },
    { name: "Llanera", cp: "33420" },
    { name: "San Martín del Rey Aurelio", cp: "33936" },
    { name: "Villaviciosa", cp: "33300" },
    { name: "Cangas del Narcea", cp: "33800" },
    { name: "Cangas de Onís", cp: "33550" },
    { name: "Llanes", cp: "33500" },
    { name: "Tineo", cp: "33870" },
    { name: "Pravia", cp: "33120" },
    { name: "Grado", cp: "33820" },
    { name: "Lena", cp: "33630" },
    { name: "Navia", cp: "33710" },
    { name: "Luarca (Valdés)", cp: "33700" },
    { name: "Corvera de Asturias", cp: "33416" },
    { name: "Carreño (Candás)", cp: "33430" },
    { name: "Nava", cp: "33520" },
    { name: "Pola de Laviana", cp: "33980" },
    { name: "Piloña (Infiesto)", cp: "33530" },
    { name: "Ribadesella", cp: "33560" },
  ],

  // ============= ISLAS BALEARES =============
  "07": [
    { name: "Palma", cp: "07001" },
    { name: "Calvià", cp: "07181" },
    { name: "Manacor", cp: "07500" },
    { name: "Inca", cp: "07300" },
    { name: "Ibiza (Eivissa)", cp: "07800" },
    { name: "Santa Eulària des Riu", cp: "07840" },
    { name: "Mahón (Maó)", cp: "07701" },
    { name: "Ciutadella de Menorca", cp: "07760" },
    { name: "Marratxí", cp: "07141" },
    { name: "Llucmajor", cp: "07620" },
    { name: "Sant Antoni de Portmany", cp: "07820" },
    { name: "Pollença", cp: "07460" },
    { name: "Felanitx", cp: "07200" },
    { name: "Alcúdia", cp: "07400" },
    { name: "Sóller", cp: "07100" },
    { name: "Sant Josep de sa Talaia", cp: "07830" },
    { name: "Capdepera", cp: "07580" },
    { name: "Andratx", cp: "07150" },
    { name: "Son Servera", cp: "07550" },
    { name: "Santanyí", cp: "07650" },
    { name: "Artà", cp: "07570" },
    { name: "Binissalem", cp: "07350" },
    { name: "Sa Pobla", cp: "07420" },
    { name: "Muro", cp: "07440" },
    { name: "Alaior", cp: "07730" },
    { name: "Es Mercadal", cp: "07740" },
    { name: "Sant Lluís", cp: "07710" },
    { name: "Formentera (Sant Francesc)", cp: "07860" },
  ],

  // ============= CANARIAS =============
  "35": [ // Las Palmas
    // ───── 1.1 Las Palmas de Gran Canaria (barrios) ─────
    { name: "Las Palmas de GC · Vegueta", cp: "35001" },
    { name: "Las Palmas de GC · Triana", cp: "35002" },
    { name: "Las Palmas de GC · Arenales", cp: "35006" },
    { name: "Las Palmas de GC · Ciudad Alta", cp: "35013" },
    { name: "Las Palmas de GC · Schamann", cp: "35013" },
    { name: "Las Palmas de GC · La Isleta", cp: "35009" },
    { name: "Las Palmas de GC · Guanarteme", cp: "35008" },
    { name: "Las Palmas de GC · Alcaravaneras", cp: "35007" },
    { name: "Las Palmas de GC · Tafira", cp: "35017" },
    { name: "Las Palmas de GC · Siete Palmas", cp: "35019" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Norte cercano
    { name: "GC Á. Metro Norte · Arucas", cp: "35400" },
    { name: "GC Á. Metro Norte · Teror", cp: "35330" },
    // 1.2.2 Este cercano
    { name: "GC Á. Metro Este · Telde", cp: "35200" },
    { name: "GC Á. Metro Este · Ingenio", cp: "35250" },

    // ───── 1.3 Resto isla de Gran Canaria ─────
    // 1.3.1 Sur turístico
    { name: "GC Sur Turístico · Maspalomas (San Bartolomé de Tirajana)", cp: "35100" },
    { name: "GC Sur Turístico · Mogán", cp: "35140" },
    // 1.3.2 Oeste / interior
    { name: "GC Oeste Interior · Agaete", cp: "35480" },
    { name: "GC Oeste Interior · Gáldar", cp: "35460" },
    { name: "GC Oeste Interior · Santa María de Guía", cp: "35450" },

    // ───── 1.4 Otras islas de la provincia ─────
    // 1.4.1 Lanzarote
    { name: "Otras Islas Lanzarote · Arrecife", cp: "35500" },
    { name: "Otras Islas Lanzarote · Tías", cp: "35510" },
    { name: "Otras Islas Lanzarote · San Bartolomé", cp: "35550" },
    // 1.4.2 Fuerteventura
    { name: "Otras Islas Fuerteventura · Puerto del Rosario", cp: "35600" },
    { name: "Otras Islas Fuerteventura · La Oliva", cp: "35640" },
    { name: "Otras Islas Fuerteventura · Pájara", cp: "35625" },
  ],
  "38": [ // S.C. Tenerife
    // ───── 1.1 S.C. Tenerife (capital) ─────
    { name: "S.C. Tenerife · Centro-Ifara", cp: "38004" },
    { name: "S.C. Tenerife · Salud-La Salle", cp: "38008" },
    { name: "S.C. Tenerife · Ofra-Costa Sur", cp: "38320" },
    { name: "S.C. Tenerife · Anaga", cp: "38120" },
    { name: "S.C. Tenerife · Suroeste", cp: "38107" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Área metropolitana Santa Cruz – La Laguna
    { name: "TF Á. Metro SC-LL · San Cristóbal de La Laguna", cp: "38201" },
    { name: "TF Á. Metro SC-LL · El Rosario", cp: "38108" },

    // ───── 1.3 Resto isla de Tenerife ─────
    // 1.3.1 Norte
    { name: "TF Norte · Puerto de la Cruz", cp: "38400" },
    { name: "TF Norte · La Orotava", cp: "38300" },
    { name: "TF Norte · Los Realejos", cp: "38410" },
    // 1.3.2 Sur turístico
    { name: "TF Sur Turístico · Arona", cp: "38640" },
    { name: "TF Sur Turístico · Adeje", cp: "38670" },
    { name: "TF Sur Turístico · Granadilla de Abona", cp: "38600" },
    // 1.3.3 Oeste / noroeste
    { name: "TF Oeste · Icod de los Vinos", cp: "38430" },
    { name: "TF Oeste · Garachico", cp: "38450" },
    { name: "TF Oeste · Buenavista del Norte", cp: "38480" },

    // ───── 1.4 Otras islas de la provincia ─────
    // 1.4.1 La Palma
    { name: "TF Otras Islas La Palma · Santa Cruz de La Palma", cp: "38700" },
    { name: "TF Otras Islas La Palma · Los Llanos de Aridane", cp: "38760" },
    // 1.4.2 La Gomera
    { name: "TF Otras Islas La Gomera · San Sebastián de La Gomera", cp: "38800" },
    // 1.4.3 El Hierro
    { name: "TF Otras Islas El Hierro · Valverde", cp: "38900" },
  ],

  // ============= CANTABRIA =============
  "39": [
    // ───── 1.1 Santander (capital) ─────
    { name: "Santander Capital · Centro", cp: "39001" },
    { name: "Santander Capital · Puertochico", cp: "39004" },
    { name: "Santander Capital · Sardinero", cp: "39005" },
    { name: "Santander Capital · Cueto", cp: "39012" },
    { name: "Santander Capital · Valdenoja", cp: "39012" },
    { name: "Santander Capital · Monte", cp: "39012" },
    { name: "Santander Capital · Castilla-Hermida", cp: "39009" },
    { name: "Santander Capital · Nueva Montaña", cp: "39011" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Arco de la Bahía
    { name: "S Á. Metro Bahía · Camargo", cp: "39600" },
    { name: "S Á. Metro Bahía · El Astillero", cp: "39610" },
    { name: "S Á. Metro Bahía · Piélagos", cp: "39470" },
    { name: "S Á. Metro Bahía · Santa Cruz de Bezana", cp: "39100" },

    // ───── 1.3 Resto Cantabria ─────
    // 1.3.1 Eje Torrelavega (hub clave)
    { name: "S Eje Torrelavega · Torrelavega", cp: "39300" },
    { name: "S Eje Torrelavega · Los Corrales de Buelna", cp: "39400" },
    { name: "S Eje Torrelavega · Cartes", cp: "39311" },
    // 1.3.2 Occidente
    { name: "S Occidente · San Vicente de la Barquera", cp: "39540" },
    { name: "S Occidente · Comillas", cp: "39520" },
    // 1.3.3 Oriente
    { name: "S Oriente · Castro Urdiales", cp: "39700" },
    { name: "S Oriente · Laredo", cp: "39770" },
    { name: "S Oriente · Santoña", cp: "39740" },
    // 1.3.4 Interior
    { name: "S Interior · Reinosa", cp: "39200" },
  ],

  // ============= CASTILLA-LA MANCHA =============
  "02": [ // Albacete
    // ───── 1.1 Albacete capital ─────
    { name: "Albacete Capital · Centro", cp: "02001" },
    { name: "Albacete Capital · Ensanche", cp: "02002" },
    { name: "Albacete Capital · Industria", cp: "02006" },
    { name: "Albacete Capital · Hospital", cp: "02006" },
    { name: "Albacete Capital · Santa Teresa", cp: "02003" },
    { name: "Albacete Capital · Parque Sur", cp: "02006" },
    { name: "Albacete Capital · Carretas", cp: "02004" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "AB Á. Metro Cercano · La Roda", cp: "02630" },
    { name: "AB Á. Metro Cercano · Madrigueras", cp: "02230" },
    { name: "AB Á. Metro Cercano · Balazote", cp: "02320" },

    // ───── 1.3 Resto provincia de Albacete ─────
    // 1.3.1 Este
    { name: "AB Este · Almansa", cp: "02640" },
    // 1.3.2 Sur
    { name: "AB Sur · Hellín", cp: "02400" },
    // 1.3.3 Oeste
    { name: "AB Oeste · Villarrobledo", cp: "02600" },
  ],
  "13": [ // Ciudad Real
    // ───── 2.1 Ciudad Real capital ─────
    { name: "Ciudad Real Capital · Centro", cp: "13001" },
    { name: "Ciudad Real Capital · Larache", cp: "13003" },
    { name: "Ciudad Real Capital · Pío XII", cp: "13004" },
    { name: "Ciudad Real Capital · Los Ángeles", cp: "13005" },
    { name: "Ciudad Real Capital · Nuevo Parque", cp: "13002" },

    // ───── 2.2 Área metropolitana ─────
    // 2.2.1 Cinturón cercano
    { name: "CR Á. Metro Cercano · Miguelturra", cp: "13170" },
    { name: "CR Á. Metro Cercano · Poblete", cp: "13179" },
    { name: "CR Á. Metro Cercano · Carrión de Calatrava", cp: "13150" },

    // ───── 2.3 Resto provincia de Ciudad Real ─────
    // 2.3.1 Centro
    { name: "CR Centro · Puertollano", cp: "13500" },
    // 2.3.2 Este
    { name: "CR Este · Valdepeñas", cp: "13300" },
    { name: "CR Este · Manzanares", cp: "13200" },
    // 2.3.3 Norte
    { name: "CR Norte · Alcázar de San Juan", cp: "13600" },
    { name: "CR Norte · Tomelloso", cp: "13700" },
  ],
  "16": [ // Cuenca
    // ───── 3.1 Cuenca capital ─────
    { name: "Cuenca Capital · Centro", cp: "16001" },
    { name: "Cuenca Capital · San Antón", cp: "16002" },
    { name: "Cuenca Capital · Fuente del Oro", cp: "16004" },
    { name: "Cuenca Capital · Tiradores", cp: "16003" },
    { name: "Cuenca Capital · Villa Román", cp: "16005" },

    // ───── 3.2 Área metropolitana ─────
    // 3.2.1 Cinturón cercano
    { name: "CU Á. Metro Cercano · Arcas", cp: "16195" },
    { name: "CU Á. Metro Cercano · Chillarón de Cuenca", cp: "16190" },
    { name: "CU Á. Metro Cercano · Villar de Olalla", cp: "16191" },

    // ───── 3.3 Resto provincia de Cuenca ─────
    // 3.3.1 Oeste
    { name: "CU Oeste · Tarancón", cp: "16400" },
    // 3.3.2 Sur
    { name: "CU Sur · San Clemente", cp: "16600" },
    // 3.3.3 Este
    { name: "CU Este · Motilla del Palancar", cp: "16200" },
  ],
  "19": [ // Guadalajara
    // ───── 4.1 Guadalajara capital ─────
    { name: "Guadalajara Capital · Centro", cp: "19001" },
    { name: "Guadalajara Capital · Aguas Vivas", cp: "19005" },
    { name: "Guadalajara Capital · El Balconcillo", cp: "19004" },
    { name: "Guadalajara Capital · La Chopera", cp: "19003" },
    { name: "Guadalajara Capital · Manantiales", cp: "19002" },

    // ───── 4.2 Área metropolitana ─────
    // 4.2.1 Cinturón cercano
    { name: "GU Á. Metro Cercano · Azuqueca de Henares", cp: "19200" },
    { name: "GU Á. Metro Cercano · Cabanillas del Campo", cp: "19171" },
    { name: "GU Á. Metro Cercano · Marchamalo", cp: "19180" },

    // ───── 4.3 Resto provincia de Guadalajara ─────
    // 4.3.1 Corredor del Henares ampliado
    { name: "GU Corredor Henares · Alovera", cp: "19208" },
    // 4.3.2 Norte
    { name: "GU Norte · Sigüenza", cp: "19250" },
    // 4.3.3 Oeste
    { name: "GU Oeste · Molina de Aragón", cp: "19300" },
  ],
  "45": [ // Toledo
    // ───── 5.1 Toledo capital ─────
    { name: "Toledo Capital · Casco Histórico", cp: "45001" },
    { name: "Toledo Capital · Santa Bárbara", cp: "45006" },
    { name: "Toledo Capital · Buenavista", cp: "45005" },
    { name: "Toledo Capital · Santa Teresa", cp: "45004" },
    { name: "Toledo Capital · Polígono", cp: "45007" },

    // ───── 5.2 Área metropolitana ─────
    // 5.2.1 Cinturón cercano
    { name: "TO Á. Metro Cercano · Bargas", cp: "45593" },
    { name: "TO Á. Metro Cercano · Olías del Rey", cp: "45280" },
    { name: "TO Á. Metro Cercano · Mocejón", cp: "45270" },
    { name: "TO Á. Metro Cercano · Nambroca", cp: "45190" },

    // ───── 5.3 Resto provincia de Toledo ─────
    // 5.3.1 Norte
    { name: "TO Norte · Talavera de la Reina", cp: "45600" },
    // 5.3.2 Centro
    { name: "TO Centro · Illescas", cp: "45200" },
    { name: "TO Centro · Seseña", cp: "45223" },
    // 5.3.3 Sur
    { name: "TO Sur · Ocaña", cp: "45300" },
    { name: "TO Sur · Madridejos", cp: "45710" },
  ],

  // ============= CASTILLA Y LEÓN =============
  "05": [ // Ávila
    // ───── 1.1 Ávila capital (zonas) ─────
    { name: "Ávila Capital · Centro", cp: "05001" },
    { name: "Ávila Capital · Norte", cp: "05003" },
    { name: "Ávila Capital · Sur", cp: "05004" },
    { name: "Ávila Capital · Este", cp: "05002" },
    { name: "Ávila Capital · Oeste", cp: "05005" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "AV Á. Metro Cercano · La Colilla", cp: "05192" },
    { name: "AV Á. Metro Cercano · Martiherrero", cp: "05195" },
    { name: "AV Á. Metro Cercano · El Fresno", cp: "05194" },
    { name: "AV Á. Metro Cercano · Vicolozano", cp: "05130" },

    // ───── 1.3 Resto provincia de Ávila ─────
    // 1.3.1 Valle del Tiétar (sur)
    { name: "AV Valle del Tiétar · Arenas de San Pedro", cp: "05400" },
    { name: "AV Valle del Tiétar · Candeleda", cp: "05480" },
    { name: "AV Valle del Tiétar · Sotillo de la Adrada", cp: "05420" },
    // 1.3.2 Norte / La Moraña
    { name: "AV La Moraña · Arévalo", cp: "05200" },
    // 1.3.3 Oeste
    { name: "AV Oeste · Piedrahíta", cp: "05500" },
    { name: "AV Oeste · El Barco de Ávila", cp: "05600" },
  ],
  "09": [ // Burgos
    // ───── 1.1 Burgos capital ─────
    { name: "Burgos Capital · Centro", cp: "09003" },
    { name: "Burgos Capital · Gamonal", cp: "09007" },
    { name: "Burgos Capital · Capiscol", cp: "09007" },
    { name: "Burgos Capital · Villimar", cp: "09007" },
    { name: "Burgos Capital · San Pedro y San Felices", cp: "09001" },
    { name: "Burgos Capital · Fuentecillas", cp: "09001" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "BU Á. Metro Cercano · Villagonzalo Pedernales", cp: "09195" },
    { name: "BU Á. Metro Cercano · Cardeñajimeno", cp: "09193" },
    { name: "BU Á. Metro Cercano · Quintanadueñas", cp: "09197" },

    // ───── 1.3 Resto provincia de Burgos ─────
    // 1.3.1 Eje Miranda de Ebro
    { name: "BU Eje Miranda de Ebro · Miranda de Ebro", cp: "09200" },
    // 1.3.2 Eje Aranda de Duero
    { name: "BU Eje Aranda de Duero · Aranda de Duero", cp: "09400" },
    // 1.3.3 Norte / Merindades
    { name: "BU Merindades · Villarcayo", cp: "09550" },
    { name: "BU Merindades · Medina de Pomar", cp: "09500" },
  ],
  "24": [ // León
    // ───── 2.1 León capital ─────
    { name: "León Capital · Centro", cp: "24003" },
    { name: "León Capital · Eras de Renueva", cp: "24008" },
    { name: "León Capital · La Palomera", cp: "24007" },
    { name: "León Capital · El Ejido", cp: "24006" },
    { name: "León Capital · La Chantría", cp: "24005" },
    { name: "León Capital · Puente Castro", cp: "24009" },

    // ───── 2.2 Área metropolitana ─────
    // 2.2.1 Cinturón cercano
    { name: "LE Á. Metro Cercano · San Andrés del Rabanedo", cp: "24010" },
    { name: "LE Á. Metro Cercano · Villaquilambre", cp: "24193" },
    { name: "LE Á. Metro Cercano · Valverde de la Virgen", cp: "24391" },

    // ───── 2.3 Resto provincia de León ─────
    // 2.3.1 Ponferrada
    { name: "LE Ponferrada · Ponferrada", cp: "24400" },
    // 2.3.2 Norte / Montaña
    { name: "LE Norte Montaña · Villablino", cp: "24100" },
    // 2.3.3 Sur
    { name: "LE Sur · La Bañeza", cp: "24750" },
    { name: "LE Sur · Astorga", cp: "24700" },
  ],
  "34": [ // Palencia
    // ───── 3.1 Palencia capital ─────
    { name: "Palencia Capital · Centro", cp: "34001" },
    { name: "Palencia Capital · San Antonio", cp: "34004" },
    { name: "Palencia Capital · Allende el Río", cp: "34005" },
    { name: "Palencia Capital · El Cristo", cp: "34006" },
    { name: "Palencia Capital · Ave María", cp: "34003" },

    // ───── 3.2 Área metropolitana ─────
    // 3.2.1 Cinturón cercano
    { name: "P Á. Metro Cercano · Villamuriel de Cerrato", cp: "34190" },
    { name: "P Á. Metro Cercano · Grijota", cp: "34192" },

    // ───── 3.3 Resto provincia de Palencia ─────
    // 3.3.1 Norte (Montaña Palentina)
    { name: "P Norte Montaña · Aguilar de Campoo", cp: "34800" },
    { name: "P Norte Montaña · Guardo", cp: "34880" },
    // 3.3.2 Sur
    { name: "P Sur · Venta de Baños", cp: "34200" },
    { name: "P Sur · Dueñas", cp: "34210" },
  ],
  "37": [ // Salamanca
    // ───── 4.1 Salamanca capital ─────
    { name: "Salamanca Capital · Centro", cp: "37001" },
    { name: "Salamanca Capital · Garrido", cp: "37006" },
    { name: "Salamanca Capital · Pizarrales", cp: "37005" },
    { name: "Salamanca Capital · San José", cp: "37004" },
    { name: "Salamanca Capital · Capuchinos", cp: "37003" },
    { name: "Salamanca Capital · Vidal", cp: "37008" },

    // ───── 4.2 Área metropolitana ─────
    // 4.2.1 Cinturón cercano
    { name: "SA Á. Metro Cercano · Santa Marta de Tormes", cp: "37900" },
    { name: "SA Á. Metro Cercano · Carbajosa de la Sagrada", cp: "37188" },
    { name: "SA Á. Metro Cercano · Villares de la Reina", cp: "37184" },

    // ───── 4.3 Resto provincia de Salamanca ─────
    // 4.3.1 Sur (Ciudad Rodrigo)
    { name: "SA Sur Ciudad Rodrigo · Ciudad Rodrigo", cp: "37500" },
    // 4.3.2 Este / Peñaranda
    { name: "SA Este Peñaranda · Peñaranda de Bracamonte", cp: "37300" },
    // 4.3.3 Oeste / frontera
    { name: "SA Oeste Frontera · Vitigudino", cp: "37210" },
  ],
  "40": [ // Segovia
    // ───── 1.1 Segovia capital ─────
    { name: "Segovia Capital · Centro", cp: "40001" },
    { name: "Segovia Capital · San Lorenzo", cp: "40003" },
    { name: "Segovia Capital · Nueva Segovia", cp: "40006" },
    { name: "Segovia Capital · El Carmen", cp: "40004" },
    { name: "Segovia Capital · San José", cp: "40002" },
    { name: "Segovia Capital · La Albuera", cp: "40005" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Cinturón cercano
    { name: "SG Á. Metro Cercano · La Lastrilla", cp: "40196" },
    { name: "SG Á. Metro Cercano · Palazuelos de Eresma", cp: "40194" },
    { name: "SG Á. Metro Cercano · San Cristóbal de Segovia", cp: "40197" },
    { name: "SG Á. Metro Cercano · Hontoria", cp: "40195" },

    // ───── 1.3 Resto provincia de Segovia ─────
    // 1.3.1 Noroeste
    { name: "SG Noroeste · Cuéllar", cp: "40200" },
    // 1.3.2 Norte
    { name: "SG Norte · Cantalejo", cp: "40320" },
    // 1.3.3 Este
    { name: "SG Este · Riaza", cp: "40500" },
    { name: "SG Este · Ayllón", cp: "40520" },
  ],
  "42": [ // Soria
    // ───── 2.1 Soria capital ─────
    { name: "Soria Capital · Centro", cp: "42001" },
    { name: "Soria Capital · Santa Bárbara", cp: "42003" },
    { name: "Soria Capital · El Calaverón", cp: "42004" },
    { name: "Soria Capital · Los Pajaritos", cp: "42002" },
    { name: "Soria Capital · San Pedro", cp: "42005" },

    // ───── 2.2 Área metropolitana ─────
    // 2.2.1 Cinturón cercano
    { name: "SO Á. Metro Cercano · Golmayo", cp: "42190" },
    { name: "SO Á. Metro Cercano · Los Rábanos", cp: "42191" },

    // ───── 2.3 Resto provincia de Soria ─────
    // 2.3.1 Oeste
    { name: "SO Oeste · Almazán", cp: "42200" },
    // 2.3.2 Norte
    { name: "SO Norte · Ólvega", cp: "42110" },
    { name: "SO Norte · Ágreda", cp: "42100" },
    // 2.3.3 Sur
    { name: "SO Sur · El Burgo de Osma", cp: "42300" },
  ],
  "47": [ // Valladolid
    // ───── 3.1 Valladolid capital ─────
    { name: "Valladolid Capital · Centro", cp: "47001" },
    { name: "Valladolid Capital · Delicias", cp: "47013" },
    { name: "Valladolid Capital · Parquesol", cp: "47014" },
    { name: "Valladolid Capital · Huerta del Rey", cp: "47007" },
    { name: "Valladolid Capital · Rondilla", cp: "47010" },
    { name: "Valladolid Capital · Pilarica", cp: "47011" },
    { name: "Valladolid Capital · Pajarillos", cp: "47012" },
    { name: "Valladolid Capital · La Victoria", cp: "47009" },

    // ───── 3.2 Área metropolitana ─────
    // 3.2.1 Norte
    { name: "VA Á. Metro Norte · Zaratán", cp: "47610" },
    { name: "VA Á. Metro Norte · Cigales", cp: "47270" },
    // 3.2.2 Oeste
    { name: "VA Á. Metro Oeste · Arroyo de la Encomienda", cp: "47195" },
    // 3.2.3 Sur
    { name: "VA Á. Metro Sur · Laguna de Duero", cp: "47140" },
    { name: "VA Á. Metro Sur · Boecillo", cp: "47151" },
    // 3.2.4 Este
    { name: "VA Á. Metro Este · Cabezón de Pisuerga", cp: "47260" },
    { name: "VA Á. Metro Este · Santovenia de Pisuerga", cp: "47185" },

    // ───── 3.3 Resto provincia de Valladolid ─────
    // 3.3.1 Sur
    { name: "VA Sur · Medina del Campo", cp: "47400" },
    // 3.3.2 Oeste
    { name: "VA Oeste · Tordesillas", cp: "47100" },
    // 3.3.3 Norte
    { name: "VA Norte · Medina de Rioseco", cp: "47800" },
  ],
  "49": [ // Zamora
    // ───── 4.1 Zamora capital ─────
    { name: "Zamora Capital · Centro", cp: "49001" },
    { name: "Zamora Capital · La Lana", cp: "49004" },
    { name: "Zamora Capital · San José Obrero", cp: "49005" },
    { name: "Zamora Capital · Los Bloques", cp: "49006" },
    { name: "Zamora Capital · Vista Alegre", cp: "49007" },

    // ───── 4.2 Área metropolitana ─────
    // 4.2.1 Cinturón cercano
    { name: "ZA Á. Metro Cercano · Morales del Vino", cp: "49700" },
    { name: "ZA Á. Metro Cercano · Villaralbo", cp: "49159" },
    { name: "ZA Á. Metro Cercano · Roales", cp: "49160" },

    // ───── 4.3 Resto provincia de Zamora ─────
    // 4.3.1 Norte
    { name: "ZA Norte · Benavente", cp: "49600" },
    // 4.3.2 Oeste
    { name: "ZA Oeste · Alcañices", cp: "49500" },
    // 4.3.3 Sur
    { name: "ZA Sur · Toro", cp: "49800" },
  ],

  // ============= CATALUÑA =============
  "08": [ // Barcelona
    // ───── 1.1 Barcelona capital ─────
    { name: "Barcelona Capital · Ciutat Vella", cp: "08001" },
    { name: "Barcelona Capital · Eixample", cp: "08010" },
    { name: "Barcelona Capital · Sants-Montjuïc", cp: "08014" },
    { name: "Barcelona Capital · Les Corts", cp: "08028" },
    { name: "Barcelona Capital · Sarrià-Sant Gervasi", cp: "08017" },
    { name: "Barcelona Capital · Gràcia", cp: "08012" },
    { name: "Barcelona Capital · Horta-Guinardó", cp: "08035" },
    { name: "Barcelona Capital · Nou Barris", cp: "08016" },
    { name: "Barcelona Capital · Sant Andreu", cp: "08030" },
    { name: "Barcelona Capital · Sant Martí", cp: "08018" },

    // ───── 1.2 Área metropolitana ─────
    // 1.2.1 Norte
    { name: "B Á. Metro Norte · Santa Coloma de Gramenet", cp: "08921" },
    { name: "B Á. Metro Norte · Badalona", cp: "08911" },
    { name: "B Á. Metro Norte · Montcada i Reixac", cp: "08110" },
    // 1.2.2 Oeste
    { name: "B Á. Metro Oeste · L'Hospitalet de Llobregat", cp: "08901" },
    { name: "B Á. Metro Oeste · Cornellà de Llobregat", cp: "08940" },
    { name: "B Á. Metro Oeste · Esplugues de Llobregat", cp: "08950" },
    { name: "B Á. Metro Oeste · Sant Just Desvern", cp: "08960" },
    // 1.2.3 Sur
    { name: "B Á. Metro Sur · El Prat de Llobregat", cp: "08820" },
    { name: "B Á. Metro Sur · Viladecans", cp: "08840" },
    { name: "B Á. Metro Sur · Gavà", cp: "08850" },
    { name: "B Á. Metro Sur · Castelldefels", cp: "08860" },
    // 1.2.4 Interior
    { name: "B Á. Metro Interior · Sant Cugat del Vallès", cp: "08172" },
    { name: "B Á. Metro Interior · Cerdanyola del Vallès", cp: "08290" },
    { name: "B Á. Metro Interior · Rubí", cp: "08191" },

    // ───── 1.3 Resto provincia de Barcelona ─────
    // 1.3.1 Vallès
    { name: "B Vallès · Sabadell", cp: "08201" },
    { name: "B Vallès · Terrassa", cp: "08221" },
    // 1.3.2 Maresme
    { name: "B Maresme · Mataró", cp: "08301" },
    // 1.3.3 Penedès / Garraf
    { name: "B Penedès Garraf · Vilanova i la Geltrú", cp: "08800" },
    { name: "B Penedès Garraf · Vilafranca del Penedès", cp: "08720" },
  ],
  "17": [ // Girona
    // ───── 2.1 Girona capital ─────
    { name: "Girona Capital · Barri Vell", cp: "17004" },
    { name: "Girona Capital · Eixample", cp: "17001" },
    { name: "Girona Capital · Montilivi", cp: "17003" },
    { name: "Girona Capital · Santa Eugènia", cp: "17006" },
    { name: "Girona Capital · Palau", cp: "17003" },

    // ───── 2.2 Área metropolitana ─────
    // 2.2.1 Cinturón cercano
    { name: "GI Á. Metro Cercano · Salt", cp: "17190" },
    { name: "GI Á. Metro Cercano · Sarrià de Ter", cp: "17840" },
    { name: "GI Á. Metro Cercano · Fornells de la Selva", cp: "17458" },

    // ───── 2.3 Resto provincia de Girona ─────
    // 2.3.1 Costa Brava
    { name: "GI Costa Brava · Blanes", cp: "17300" },
    { name: "GI Costa Brava · Lloret de Mar", cp: "17310" },
    { name: "GI Costa Brava · Sant Feliu de Guíxols", cp: "17220" },
    // 2.3.2 Norte / Alt Empordà
    { name: "GI Alt Empordà · Figueres", cp: "17600" },
    // 2.3.3 Interior
    { name: "GI Interior · Olot", cp: "17800" },
    { name: "GI Interior · Banyoles", cp: "17820" },
  ],
  "25": [ // Lleida
    // ───── 3.1 Lleida capital ─────
    { name: "Lleida Capital · Centre Històric", cp: "25002" },
    { name: "Lleida Capital · Cappont", cp: "25001" },
    { name: "Lleida Capital · Balàfia", cp: "25005" },
    { name: "Lleida Capital · Pardinyes", cp: "25005" },
    { name: "Lleida Capital · Secà de Sant Pere", cp: "25005" },

    // ───── 3.2 Área metropolitana ─────
    // 3.2.1 Cinturón cercano
    { name: "L Á. Metro Cercano · Alpicat", cp: "25110" },
    { name: "L Á. Metro Cercano · Alcarràs", cp: "25180" },
    { name: "L Á. Metro Cercano · Torrefarrera", cp: "25123" },

    // ───── 3.3 Resto provincia de Lleida ─────
    // 3.3.1 Ponent
    { name: "L Ponent · Mollerussa", cp: "25230" },
    { name: "L Ponent · Tàrrega", cp: "25300" },
    // 3.3.2 Pirineo
    { name: "L Pirineo · La Seu d'Urgell", cp: "25700" },
    { name: "L Pirineo · Tremp", cp: "25620" },
    // 3.3.3 Oeste
    { name: "L Oeste · Fraga", cp: "22520" },
  ],
  "43": [ // Tarragona
    // ───── 4.1 Tarragona capital ─────
    { name: "Tarragona Capital · Centre", cp: "43001" },
    { name: "Tarragona Capital · Part Alta", cp: "43003" },
    { name: "Tarragona Capital · Sant Pere i Sant Pau", cp: "43007" },
    { name: "Tarragona Capital · Torreforta", cp: "43006" },
    { name: "Tarragona Capital · Bonavista", cp: "43008" },

    // ───── 4.2 Área metropolitana ─────
    // 4.2.1 Costa cercana
    { name: "T Á. Metro Costa · Reus", cp: "43201" },
    { name: "T Á. Metro Costa · Salou", cp: "43840" },
    { name: "T Á. Metro Costa · Vila-seca", cp: "43480" },

    // ───── 4.3 Resto provincia de Tarragona ─────
    // 4.3.1 Costa sur
    { name: "T Costa Sur · Cambrils", cp: "43850" },
    { name: "T Costa Sur · L'Hospitalet de l'Infant", cp: "43890" },
    // 4.3.2 Ebro
    { name: "T Ebro · Tortosa", cp: "43500" },
    { name: "T Ebro · Amposta", cp: "43870" },
    // 4.3.3 Interior
    { name: "T Interior · Valls", cp: "43800" },
    { name: "T Interior · Montblanc", cp: "43400" },
  ],

  // ============= C. VALENCIANA =============
  "03": [ // Alicante
    // Capital
    { name: "Alicante Capital · Centro", cp: "03001" },
    { name: "Alicante Capital · Ensanche-Diputación", cp: "03003" },
    { name: "Alicante Capital · Benalúa", cp: "03007" },
    { name: "Alicante Capital · Carolinas", cp: "03012" },
    { name: "Alicante Capital · Babel", cp: "03008" },
    { name: "Alicante Capital · Playa de San Juan", cp: "03540" },
    { name: "Alicante Capital · Virgen del Remedio", cp: "03010" },
    { name: "Alicante Capital · San Blas", cp: "03005" },
    // Área metropolitana
    { name: "A Á. Metro Norte · Sant Joan d'Alacant", cp: "03550" },
    { name: "A Á. Metro Norte · El Campello", cp: "03560" },
    { name: "A Á. Metro Norte · Mutxamel", cp: "03110" },
    { name: "A Á. Metro Oeste · San Vicente del Raspeig", cp: "03690" },
    // Resto provincia
    { name: "A Marina Alta · Dénia", cp: "03700" },
    { name: "A Marina Alta · Jávea/Xàbia", cp: "03730" },
    { name: "A Marina Alta · Calpe", cp: "03710" },
    { name: "A Marina Alta · Benissa", cp: "03720" },
    { name: "A Marina Alta · Teulada-Moraira", cp: "03725" },
    { name: "A Marina Baixa · Benidorm", cp: "03501" },
    { name: "A Marina Baixa · Altea", cp: "03590" },
    { name: "A Marina Baixa · La Nucía", cp: "03530" },
    { name: "A Marina Baixa · L'Alfàs del Pi", cp: "03580" },
    { name: "A Marina Baixa · Villajoyosa", cp: "03570" },
    { name: "A Alcoià Comtat · Alcoy", cp: "03801" },
    { name: "A Alcoià Comtat · Ibi", cp: "03440" },
    { name: "A Alcoià Comtat · Cocentaina", cp: "03820" },
    { name: "A Alcoià Comtat · Muro de Alcoy", cp: "03830" },
    { name: "A Vinalopó · Villena", cp: "03400" },
    { name: "A Vinalopó · Elda", cp: "03600" },
    { name: "A Vinalopó · Petrer", cp: "03610" },
    { name: "A Vinalopó · Novelda", cp: "03660" },
    { name: "A Vinalopó · Monóvar", cp: "03640" },
    { name: "A Sur Metro Ampliado · Elche", cp: "03201" },
    { name: "A Sur Metro Ampliado · Santa Pola", cp: "03130" },
    { name: "A Sur Metro Ampliado · Crevillente", cp: "03330" },
    { name: "A Vega Baja · Orihuela", cp: "03300" },
    { name: "A Vega Baja · Torrevieja", cp: "03180" },
    { name: "A Vega Baja · Guardamar del Segura", cp: "03140" },
    { name: "A Vega Baja · Almoradí", cp: "03160" },
    { name: "A Vega Baja · Rojales", cp: "03170" },
    { name: "A Vega Baja · Pilar de la Horadada", cp: "03190" },
  ],
  "12": [ // Castellón
    // Capital
    { name: "Castellón Capital · Centro", cp: "12001" },
    { name: "Castellón Capital · Grao", cp: "12100" },
    { name: "Castellón Capital · Oeste", cp: "12006" },
    { name: "Castellón Capital · Norte", cp: "12004" },
    { name: "Castellón Capital · Sur", cp: "12005" },
    // Área metropolitana
    { name: "CS Á. Metro Cercano · Almassora", cp: "12550" },
    { name: "CS Á. Metro Cercano · Benicàssim", cp: "12560" },
    { name: "CS Á. Metro Cercano · Borriana", cp: "12530" },
    { name: "CS Á. Metro Cercano · Vila-real", cp: "12540" },
    // Resto provincia
    { name: "CS Plana Ampliada · Onda", cp: "12200" },
    { name: "CS Plana Ampliada · L'Alcora", cp: "12110" },
    { name: "CS Plana Ampliada · Nules", cp: "12520" },
    { name: "CS Plana Ampliada · Almenara", cp: "12590" },
    { name: "CS Norte Litoral · Benicarló", cp: "12580" },
    { name: "CS Norte Litoral · Vinaròs", cp: "12500" },
    { name: "CS Norte Litoral · Peñíscola", cp: "12598" },
    { name: "CS Norte Litoral · Alcalà de Xivert", cp: "12570" },
    { name: "CS Interior Norte · Sant Mateu", cp: "12170" },
    { name: "CS Interior Sur · Segorbe", cp: "12400" },
    { name: "CS Interior Sur · Altura", cp: "12410" },
  ],
  "46": [ // Valencia
    // Valencia capital — distritos
    { name: "Valencia Capital · Ciutat Vella", cp: "46001" },
    { name: "Valencia Capital · Eixample", cp: "46004" },
    { name: "Valencia Capital · Extramurs", cp: "46008" },
    { name: "Valencia Capital · Campanar", cp: "46015" },
    { name: "Valencia Capital · La Saïdia", cp: "46009" },
    { name: "Valencia Capital · El Pla del Real", cp: "46021" },
    { name: "Valencia Capital · L'Olivereta", cp: "46018" },
    { name: "Valencia Capital · Patraix", cp: "46014" },
    { name: "Valencia Capital · Jesús", cp: "46017" },
    { name: "Valencia Capital · Quatre Carreres", cp: "46006" },
    { name: "Valencia Capital · Poblats Marítims", cp: "46011" },
    { name: "Valencia Capital · Camins al Grau", cp: "46023" },
    { name: "Valencia Capital · Algirós", cp: "46022" },
    { name: "Valencia Capital · Benimaclet", cp: "46020" },
    { name: "Valencia Capital · Rascanya", cp: "46019" },
    { name: "Valencia Capital · Benicalap", cp: "46025" },
    { name: "Valencia Capital · Pobles del Nord", cp: "46016" },
    { name: "Valencia Capital · Pobles de l'Oest", cp: "46035" },
    { name: "Valencia Capital · Pobles del Sud", cp: "46012" },
    // Área metropolitana
    { name: "V Á. Metro Norte · Burjassot", cp: "46100" },
    { name: "V Á. Metro Norte · Paterna", cp: "46980" },
    { name: "V Á. Metro Norte · Godella", cp: "46110" },
    { name: "V Á. Metro Norte · Rocafort", cp: "46111" },
    { name: "V Á. Metro Norte · Moncada", cp: "46113" },
    { name: "V Á. Metro Norte · Massamagrell", cp: "46130" },
    { name: "V Á. Metro Norte · Alboraya", cp: "46120" },
    { name: "V Á. Metro Oeste · Mislata", cp: "46920" },
    { name: "V Á. Metro Oeste · Quart de Poblet", cp: "46930" },
    { name: "V Á. Metro Oeste · Xirivella", cp: "46950" },
    { name: "V Á. Metro Oeste · Manises", cp: "46940" },
    { name: "V Á. Metro Oeste · Aldaia", cp: "46960" },
    { name: "V Á. Metro Oeste · Alaquàs", cp: "46970" },
    { name: "V Á. Metro Oeste · Torrent", cp: "46900" },
    { name: "V Á. Metro Sur · Alfafar", cp: "46910" },
    { name: "V Á. Metro Sur · Sedaví", cp: "46910" },
    { name: "V Á. Metro Sur · Catarroja", cp: "46470" },
    { name: "V Á. Metro Sur · Massanassa", cp: "46470" },
    { name: "V Á. Metro Sur · Paiporta", cp: "46200" },
    { name: "V Á. Metro Sur · Picanya", cp: "46210" },
    { name: "V Á. Metro Sur · Benetússer", cp: "46910" },
    { name: "V Á. Metro Sur · Silla", cp: "46460" },
    // Resto provincia
    { name: "V Camp de Morvedre · Sagunto", cp: "46500" },
    { name: "V Camp de Morvedre · Puerto de Sagunto", cp: "46520" },
    { name: "V Camp de Morvedre · Canet d'en Berenguer", cp: "46529" },
    { name: "V Camp de Morvedre · Puçol", cp: "46530" },
    { name: "V Ribera Sur Litoral · Cullera", cp: "46400" },
    { name: "V Ribera Sur Litoral · Sueca", cp: "46410" },
    { name: "V Ribera Sur Litoral · Algemesí", cp: "46680" },
    { name: "V Ribera Sur Litoral · Alzira", cp: "46600" },
    { name: "V Ribera Sur Litoral · Carcaixent", cp: "46740" },
    { name: "V Ribera Sur Litoral · Carlet", cp: "46240" },
    { name: "V Safor · Gandía", cp: "46700" },
    { name: "V Safor · Oliva", cp: "46780" },
    { name: "V Safor · Tavernes de la Valldigna", cp: "46760" },
    { name: "V Safor · Xeraco", cp: "46770" },
    { name: "V Interior · Xàtiva", cp: "46800" },
    { name: "V Interior · Ontinyent", cp: "46870" },
    { name: "V Interior · Llíria", cp: "46160" },
    { name: "V Interior · Requena", cp: "46340" },
    { name: "V Interior · Utiel", cp: "46300" },
  ],

  // ============= EXTREMADURA =============
  "06": [ // Badajoz
    { name: "Badajoz", cp: "06001" },
    { name: "Mérida", cp: "06800" },
    { name: "Don Benito", cp: "06400" },
    { name: "Almendralejo", cp: "06200" },
    { name: "Villanueva de la Serena", cp: "06700" },
    { name: "Zafra", cp: "06300" },
    { name: "Olivenza", cp: "06100" },
    { name: "Montijo", cp: "06480" },
    { name: "Villafranca de los Barros", cp: "06220" },
    { name: "Jerez de los Caballeros", cp: "06380" },
    { name: "Azuaga", cp: "06920" },
    { name: "Castuera", cp: "06420" },
    { name: "Llerena", cp: "06900" },
    { name: "Fregenal de la Sierra", cp: "06340" },
    { name: "Alburquerque", cp: "06510" },
    { name: "Talavera la Real", cp: "06140" },
    { name: "Aceuchal", cp: "06207" },
    { name: "Calamonte", cp: "06810" },
    { name: "Los Santos de Maimona", cp: "06230" },
    { name: "Quintana de la Serena", cp: "06450" },
  ],
  "10": [ // Cáceres
    { name: "Cáceres", cp: "10001" },
    { name: "Plasencia", cp: "10600" },
    { name: "Navalmoral de la Mata", cp: "10300" },
    { name: "Trujillo", cp: "10200" },
    { name: "Coria", cp: "10800" },
    { name: "Miajadas", cp: "10100" },
    { name: "Moraleja", cp: "10840" },
    { name: "Jaraíz de la Vera", cp: "10400" },
    { name: "Valencia de Alcántara", cp: "10500" },
    { name: "Arroyo de la Luz", cp: "10900" },
    { name: "Logrosán", cp: "10120" },
    { name: "Hervás", cp: "10700" },
    { name: "Guadalupe", cp: "10140" },
    { name: "Casar de Cáceres", cp: "10190" },
    { name: "Talayuela", cp: "10310" },
    { name: "Montehermoso", cp: "10810" },
    { name: "Malpartida de Cáceres", cp: "10910" },
  ],

  // ============= GALICIA =============
  "15": [ // A Coruña
    { name: "A Coruña", cp: "15001" },
    { name: "Santiago de Compostela", cp: "15701" },
    { name: "Ferrol", cp: "15401" },
    { name: "Narón", cp: "15570" },
    { name: "Oleiros", cp: "15173" },
    { name: "Carballo", cp: "15100" },
    { name: "Arteixo", cp: "15142" },
    { name: "Ames", cp: "15220" },
    { name: "Culleredo", cp: "15670" },
    { name: "Cambre", cp: "15660" },
    { name: "Ribeira", cp: "15960" },
    { name: "Boiro", cp: "15930" },
    { name: "Betanzos", cp: "15300" },
    { name: "Sada", cp: "15160" },
    { name: "Bergondo", cp: "15165" },
    { name: "Cee", cp: "15270" },
    { name: "Noia", cp: "15200" },
    { name: "Padrón", cp: "15900" },
    { name: "Melide", cp: "15800" },
    { name: "Negreira", cp: "15830" },
    { name: "Ortigueira", cp: "15330" },
    { name: "As Pontes de García Rodríguez", cp: "15320" },
    { name: "Pontedeume", cp: "15600" },
    { name: "Fene", cp: "15500" },
    { name: "Mugardos", cp: "15620" },
    { name: "Teo", cp: "15883" },
    { name: "Brión", cp: "15865" },
    { name: "Muros", cp: "15250" },
    { name: "Carral", cp: "15175" },
  ],
  "27": [ // Lugo
    { name: "Lugo", cp: "27001" },
    { name: "Monforte de Lemos", cp: "27400" },
    { name: "Viveiro", cp: "27850" },
    { name: "Vilalba", cp: "27800" },
    { name: "Sarria", cp: "27600" },
    { name: "Ribadeo", cp: "27700" },
    { name: "Foz", cp: "27780" },
    { name: "Burela", cp: "27880" },
    { name: "Chantada", cp: "27500" },
    { name: "Cervo", cp: "27891" },
    { name: "Quiroga", cp: "27320" },
    { name: "Becerreá", cp: "27640" },
  ],
  "32": [ // Ourense
    { name: "Ourense", cp: "32001" },
    { name: "O Barco de Valdeorras", cp: "32300" },
    { name: "Verín", cp: "32600" },
    { name: "O Carballiño", cp: "32500" },
    { name: "A Rúa", cp: "32350" },
    { name: "Allariz", cp: "32660" },
    { name: "Xinzo de Limia", cp: "32630" },
    { name: "Ribadavia", cp: "32400" },
    { name: "Celanova", cp: "32800" },
    { name: "Maceda", cp: "32700" },
    { name: "O Pereiro de Aguiar", cp: "32710" },
  ],
  "36": [ // Pontevedra
    { name: "Pontevedra", cp: "36001" },
    { name: "Vigo", cp: "36201" },
    { name: "Redondela", cp: "36800" },
    { name: "Vilagarcía de Arousa", cp: "36600" },
    { name: "Cangas", cp: "36940" },
    { name: "Marín", cp: "36900" },
    { name: "Ponteareas", cp: "36860" },
    { name: "Lalín", cp: "36500" },
    { name: "A Estrada", cp: "36680" },
    { name: "Sanxenxo", cp: "36960" },
    { name: "O Porriño", cp: "36400" },
    { name: "Tui", cp: "36700" },
    { name: "Bueu", cp: "36930" },
    { name: "Moaña", cp: "36950" },
    { name: "Nigrán", cp: "36350" },
    { name: "Gondomar", cp: "36380" },
    { name: "Vilanova de Arousa", cp: "36620" },
    { name: "Cambados", cp: "36630" },
    { name: "Cuntis", cp: "36670" },
    { name: "Caldas de Reis", cp: "36650" },
    { name: "Mos", cp: "36415" },
    { name: "Salvaterra de Miño", cp: "36450" },
    { name: "Poio", cp: "36005" },
    { name: "Baiona", cp: "36300" },
  ],

  // ============= LA RIOJA =============
  "26": [
    { name: "Logroño", cp: "26001" },
    { name: "Calahorra", cp: "26500" },
    { name: "Arnedo", cp: "26580" },
    { name: "Haro", cp: "26200" },
    { name: "Lardero", cp: "26140" },
    { name: "Nájera", cp: "26300" },
    { name: "Alfaro", cp: "26540" },
    { name: "Santo Domingo de la Calzada", cp: "26250" },
    { name: "Villamediana de Iregua", cp: "26142" },
    { name: "Cenicero", cp: "26350" },
    { name: "Autol", cp: "26560" },
    { name: "Rincón de Soto", cp: "26550" },
    { name: "Pradejón", cp: "26510" },
    { name: "Navarrete", cp: "26370" },
    { name: "Ezcaray", cp: "26280" },
    { name: "Quel", cp: "26570" },
    { name: "Cervera del Río Alhama", cp: "26520" },
  ],

  // ============= MADRID =============
  // Estructura operativa:
  //   1) Madrid capital — 21 distritos
  //   2) Área metropolitana — Norte / Este (Corredor del Henares) / Sur / Oeste-Noroeste / Sureste
  //   3) Resto Comunidad — Sierra Norte / Sierra Noroeste / Sierra Oeste / Vegas y Sureste rural
  "28": [
    // ───── 1) Madrid capital · 21 distritos ─────
    { name: "Madrid capital · Centro", cp: "28013" },
    { name: "Madrid capital · Arganzuela", cp: "28005" },
    { name: "Madrid capital · Retiro", cp: "28009" },
    { name: "Madrid capital · Salamanca", cp: "28001" },
    { name: "Madrid capital · Chamartín", cp: "28036" },
    { name: "Madrid capital · Tetuán", cp: "28020" },
    { name: "Madrid capital · Chamberí", cp: "28010" },
    { name: "Madrid capital · Fuencarral-El Pardo", cp: "28034" },
    { name: "Madrid capital · Moncloa-Aravaca", cp: "28008" },
    { name: "Madrid capital · Latina", cp: "28011" },
    { name: "Madrid capital · Carabanchel", cp: "28019" },
    { name: "Madrid capital · Usera", cp: "28026" },
    { name: "Madrid capital · Puente de Vallecas", cp: "28038" },
    { name: "Madrid capital · Moratalaz", cp: "28030" },
    { name: "Madrid capital · Ciudad Lineal", cp: "28017" },
    { name: "Madrid capital · Hortaleza", cp: "28043" },
    { name: "Madrid capital · Villaverde", cp: "28021" },
    { name: "Madrid capital · Villa de Vallecas", cp: "28031" },
    { name: "Madrid capital · Vicálvaro", cp: "28032" },
    { name: "Madrid capital · San Blas-Canillejas", cp: "28022" },
    { name: "Madrid capital · Barajas", cp: "28042" },

    // ───── 2) Área metropolitana · Norte ─────
    { name: "Á. Metro Norte · Alcobendas", cp: "28100" },
    { name: "Á. Metro Norte · San Sebastián de los Reyes", cp: "28700" },
    { name: "Á. Metro Norte · Tres Cantos", cp: "28760" },
    { name: "Á. Metro Norte · Colmenar Viejo", cp: "28770" },
    { name: "Á. Metro Norte · Algete", cp: "28110" },

    // ───── 2) Área metropolitana · Este (Corredor del Henares) ─────
    { name: "Á. Metro Este · Coslada", cp: "28820" },
    { name: "Á. Metro Este · San Fernando de Henares", cp: "28830" },
    { name: "Á. Metro Este · Torrejón de Ardoz", cp: "28850" },
    { name: "Á. Metro Este · Alcalá de Henares", cp: "28801" },
    { name: "Á. Metro Este · Mejorada del Campo", cp: "28840" },
    { name: "Á. Metro Este · Velilla de San Antonio", cp: "28891" },
    { name: "Á. Metro Este · Paracuellos de Jarama", cp: "28860" },
    { name: "Á. Metro Este · Daganzo de Arriba", cp: "28814" },
    { name: "Á. Metro Este · Camarma de Esteruelas", cp: "28816" },
    { name: "Á. Metro Este · Meco", cp: "28880" },
    { name: "Á. Metro Este · Villalbilla", cp: "28810" },
    { name: "Á. Metro Este · Loeches", cp: "28890" },

    // ───── 2) Área metropolitana · Sur ─────
    { name: "Á. Metro Sur · Getafe", cp: "28901" },
    { name: "Á. Metro Sur · Leganés", cp: "28911" },
    { name: "Á. Metro Sur · Alcorcón", cp: "28921" },
    { name: "Á. Metro Sur · Móstoles", cp: "28931" },
    { name: "Á. Metro Sur · Fuenlabrada", cp: "28940" },
    { name: "Á. Metro Sur · Parla", cp: "28980" },
    { name: "Á. Metro Sur · Pinto", cp: "28320" },
    { name: "Á. Metro Sur · Valdemoro", cp: "28340" },
    { name: "Á. Metro Sur · Humanes de Madrid", cp: "28970" },
    { name: "Á. Metro Sur · Griñón", cp: "28971" },
    { name: "Á. Metro Sur · Cubas de la Sagra", cp: "28978" },

    // ───── 2) Área metropolitana · Oeste / Noroeste ─────
    { name: "Á. Metro Oeste · Pozuelo de Alarcón", cp: "28223" },
    { name: "Á. Metro Oeste · Majadahonda", cp: "28220" },
    { name: "Á. Metro Oeste · Las Rozas", cp: "28230" },
    { name: "Á. Metro Oeste · Boadilla del Monte", cp: "28660" },
    { name: "Á. Metro Oeste · Villaviciosa de Odón", cp: "28670" },
    { name: "Á. Metro Oeste · Collado Villalba", cp: "28400" },
    { name: "Á. Metro Oeste · Villanueva de la Cañada", cp: "28691" },
    { name: "Á. Metro Oeste · Villanueva del Pardillo", cp: "28229" },
    { name: "Á. Metro Oeste · Galapagar", cp: "28260" },
    { name: "Á. Metro Oeste · Torrelodones", cp: "28250" },
    { name: "Á. Metro Oeste · Hoyo de Manzanares", cp: "28240" },

    // ───── 2) Área metropolitana · Sureste ─────
    { name: "Á. Metro Sureste · Rivas-Vaciamadrid", cp: "28521" },
    { name: "Á. Metro Sureste · Arganda del Rey", cp: "28500" },
    { name: "Á. Metro Sureste · San Martín de la Vega", cp: "28330" },
    { name: "Á. Metro Sureste · Ciempozuelos", cp: "28350" },

    // ───── 3) Resto Comunidad · Sierra Norte ─────
    { name: "Sierra Norte · Buitrago del Lozoya", cp: "28730" },
    { name: "Sierra Norte · Lozoya", cp: "28742" },
    { name: "Sierra Norte · Rascafría", cp: "28740" },
    { name: "Sierra Norte · Torrelaguna", cp: "28180" },
    { name: "Sierra Norte · La Cabrera", cp: "28751" },
    { name: "Sierra Norte · Miraflores de la Sierra", cp: "28792" },
    { name: "Sierra Norte · Soto del Real", cp: "28791" },
    { name: "Sierra Norte · Manzanares el Real", cp: "28410" },

    // ───── 3) Resto Comunidad · Sierra Noroeste ─────
    { name: "Sierra Noroeste · Guadarrama", cp: "28440" },
    { name: "Sierra Noroeste · San Lorenzo de El Escorial", cp: "28200" },
    { name: "Sierra Noroeste · El Escorial", cp: "28280" },
    { name: "Sierra Noroeste · Cercedilla", cp: "28470" },
    { name: "Sierra Noroeste · Navacerrada", cp: "28491" },
    { name: "Sierra Noroeste · Moralzarzal", cp: "28411" },

    // ───── 3) Resto Comunidad · Sierra Oeste ─────
    { name: "Sierra Oeste · San Martín de Valdeiglesias", cp: "28680" },
    { name: "Sierra Oeste · Villa del Prado", cp: "28630" },
    { name: "Sierra Oeste · Navalcarnero", cp: "28600" },
    { name: "Sierra Oeste · Aldea del Fresno", cp: "28620" },

    // ───── 3) Resto Comunidad · Vegas / Sureste rural ─────
    { name: "Vegas / Sureste rural · Aranjuez", cp: "28300" },
    { name: "Vegas / Sureste rural · Chinchón", cp: "28370" },
    { name: "Vegas / Sureste rural · Villarejo de Salvanés", cp: "28590" },
    { name: "Vegas / Sureste rural · Colmenar de Oreja", cp: "28380" },
    { name: "Vegas / Sureste rural · Morata de Tajuña", cp: "28530" },
  ],

  // ============= MURCIA =============
  "30": [
    { name: "Murcia", cp: "30001" },
    { name: "Cartagena", cp: "30201" },
    { name: "Lorca", cp: "30800" },
    { name: "Molina de Segura", cp: "30500" },
    { name: "Alcantarilla", cp: "30820" },
    { name: "Águilas", cp: "30880" },
    { name: "Cieza", cp: "30530" },
    { name: "Yecla", cp: "30510" },
    { name: "Jumilla", cp: "30520" },
    { name: "Caravaca de la Cruz", cp: "30400" },
    { name: "Torre-Pacheco", cp: "30700" },
    { name: "San Javier", cp: "30730" },
    { name: "Mazarrón", cp: "30870" },
    { name: "San Pedro del Pinatar", cp: "30740" },
    { name: "Mula", cp: "30170" },
    { name: "Totana", cp: "30850" },
    { name: "Alhama de Murcia", cp: "30840" },
    { name: "Calasparra", cp: "30420" },
    { name: "Las Torres de Cotillas", cp: "30565" },
    { name: "Archena", cp: "30600" },
    { name: "Bullas", cp: "30180" },
    { name: "Fuente Álamo", cp: "30320" },
    { name: "Abarán", cp: "30550" },
    { name: "Santomera", cp: "30140" },
    { name: "Beniel", cp: "30130" },
    { name: "Puerto Lumbreras", cp: "30890" },
    { name: "Cehegín", cp: "30430" },
    { name: "Moratalla", cp: "30440" },
    { name: "Lorquí", cp: "30564" },
    { name: "Ceutí", cp: "30562" },
  ],

  // ============= NAVARRA =============
  "31": [
    // ───── 3.1 Pamplona (capital) ─────
    { name: "Pamplona Capital · Casco Antiguo", cp: "31001" },
    { name: "Pamplona Capital · Ensanche", cp: "31002" },
    { name: "Pamplona Capital · Iturrama", cp: "31007" },
    { name: "Pamplona Capital · San Juan", cp: "31011" },
    { name: "Pamplona Capital · Rochapea", cp: "31014" },
    { name: "Pamplona Capital · Chantrea", cp: "31015" },
    { name: "Pamplona Capital · Mendillorri", cp: "31016" },

    // ───── 3.2 Área metropolitana ─────
    // 3.2.1 Norte
    { name: "NA Á. Metro Norte · Villava", cp: "31610" },
    { name: "NA Á. Metro Norte · Burlada", cp: "31600" },
    { name: "NA Á. Metro Norte · Huarte", cp: "31620" },
    // 3.2.2 Oeste
    { name: "NA Á. Metro Oeste · Barañáin", cp: "31010" },
    { name: "NA Á. Metro Oeste · Zizur Mayor", cp: "31180" },
    // 3.2.3 Sur
    { name: "NA Á. Metro Sur · Noáin", cp: "31110" },
    { name: "NA Á. Metro Sur · Beriáin", cp: "31191" },

    // ───── 3.3 Resto Navarra ─────
    // 3.3.1 Norte / Pirineo
    { name: "NA Norte Pirineo · Elizondo", cp: "31700" },
    { name: "NA Norte Pirineo · Roncal", cp: "31415" },
    // 3.3.2 Centro
    { name: "NA Centro · Estella", cp: "31200" },
    { name: "NA Centro · Tafalla", cp: "31300" },
    // 3.3.3 Sur / Ribera
    { name: "NA Sur Ribera · Tudela", cp: "31500" },
  ],

  // ============= PAÍS VASCO =============
  "01": [ // Álava
    { name: "Vitoria-Gasteiz", cp: "01001" },
    { name: "Llodio", cp: "01400" },
    { name: "Amurrio", cp: "01470" },
    { name: "Salvatierra (Agurain)", cp: "01200" },
    { name: "Laudio", cp: "01400" },
    { name: "Ayala (Aiara)", cp: "01476" },
    { name: "Iruña Oka", cp: "01230" },
    { name: "Oyón (Oion)", cp: "01320" },
    { name: "Alegría-Dulantzi", cp: "01240" },
    { name: "Laguardia", cp: "01300" },
    { name: "Labastida", cp: "01330" },
  ],
  "20": [ // Gipuzkoa
    { name: "San Sebastián (Donostia)", cp: "20001" },
    { name: "Irún", cp: "20301" },
    { name: "Errenteria", cp: "20100" },
    { name: "Eibar", cp: "20600" },
    { name: "Zarautz", cp: "20800" },
    { name: "Hernani", cp: "20120" },
    { name: "Tolosa", cp: "20400" },
    { name: "Arrasate (Mondragón)", cp: "20500" },
    { name: "Bergara", cp: "20570" },
    { name: "Andoain", cp: "20140" },
    { name: "Pasaia", cp: "20110" },
    { name: "Lasarte-Oria", cp: "20160" },
    { name: "Beasain", cp: "20200" },
    { name: "Azkoitia", cp: "20720" },
    { name: "Azpeitia", cp: "20730" },
    { name: "Oñati", cp: "20560" },
    { name: "Zumarraga", cp: "20700" },
    { name: "Urnieta", cp: "20130" },
    { name: "Lezo", cp: "20100" },
    { name: "Oiartzun", cp: "20180" },
    { name: "Hondarribia", cp: "20280" },
    { name: "Usurbil", cp: "20170" },
    { name: "Ordizia", cp: "20240" },
    { name: "Zumaia", cp: "20750" },
    { name: "Getaria", cp: "20808" },
    { name: "Deba", cp: "20820" },
    { name: "Mutriku", cp: "20830" },
    { name: "Soraluze", cp: "20590" },
  ],
  "48": [ // Bizkaia
    // — Bilbao capital: distritos centrales —
    { name: "Bilbao · Abando", cp: "48001" },
    { name: "Bilbao · Casco Viejo (Ibaiondo)", cp: "48005" },
    { name: "Bilbao · Indautxu", cp: "48010" },
    { name: "Bilbao · Begoña", cp: "48006" },
    // — Bilbao capital: distritos periféricos —
    { name: "Bilbao · Deusto", cp: "48014" },
    { name: "Bilbao · Uribarri", cp: "48007" },
    { name: "Bilbao · Errekalde", cp: "48012" },
    { name: "Bilbao · Basurto-Zorroza", cp: "48013" },
    { name: "Bilbao · Otxarkoaga-Txurdinaga", cp: "48004" },
    { name: "Barakaldo", cp: "48901" },
    { name: "Getxo", cp: "48930" },
    { name: "Portugalete", cp: "48920" },
    { name: "Santurtzi", cp: "48980" },
    { name: "Basauri", cp: "48970" },
    { name: "Leioa", cp: "48940" },
    { name: "Durango", cp: "48200" },
    { name: "Galdakao", cp: "48960" },
    { name: "Sestao", cp: "48910" },
    { name: "Erandio", cp: "48950" },
    { name: "Sopelana", cp: "48600" },
    { name: "Amorebieta-Etxano", cp: "48340" },
    { name: "Ermua", cp: "48260" },
    { name: "Mungia", cp: "48100" },
    { name: "Bermeo", cp: "48370" },
    { name: "Gernika-Lumo", cp: "48300" },
    { name: "Markina-Xemein", cp: "48270" },
    { name: "Arrigorriaga", cp: "48480" },
    { name: "Iurreta", cp: "48215" },
    { name: "Ondarroa", cp: "48700" },
    { name: "Lekeitio", cp: "48280" },
    { name: "Zalla", cp: "48860" },
    { name: "Balmaseda", cp: "48800" },
    { name: "Güeñes", cp: "48840" },
    { name: "Sopuerta", cp: "48190" },
    { name: "Berriz", cp: "48240" },
    { name: "Etxebarri", cp: "48450" },
    { name: "Berango", cp: "48640" },
    { name: "Plentzia", cp: "48620" },
  ],

  // ============= CEUTA Y MELILLA =============
  "51": [
    // ───── 1.1 Ceuta capital ─────
    { name: "Ceuta Capital · Centro", cp: "51001" },
    { name: "Ceuta Capital · Hadú", cp: "51002" },
    { name: "Ceuta Capital · El Príncipe", cp: "51003" },
    { name: "Ceuta Capital · Recinto Sur", cp: "51001" },
    { name: "Ceuta Capital · Benzú", cp: "51004" },
    // ───── 1.3 Resto territorio de Ceuta ─────
    // 1.3.1 Periferia
    { name: "CE Periferia · Monte Hacho", cp: "51002" },
    { name: "CE Periferia · García Aldave", cp: "51003" },
  ],
  "52": [
    // ───── 2.1 Melilla capital ─────
    { name: "Melilla Capital · Centro", cp: "52001" },
    { name: "Melilla Capital · Ensanche", cp: "52003" },
    { name: "Melilla Capital · Industrial", cp: "52006" },
    { name: "Melilla Capital · Cabrerizas", cp: "52005" },
    { name: "Melilla Capital · Real", cp: "52002" },
    // ───── 2.3 Resto territorio de Melilla ─────
    // 2.3.1 Periferia
    { name: "ME Periferia · Rostrogordo", cp: "52004" },
    { name: "ME Periferia · Barrio Chino", cp: "52006" },
  ],
};

export const localidadesByProvincia = (code: string): Localidad[] =>
  LOCALIDADES_BY_PROVINCE[code] ?? [];

/** Llave única estable para una localidad (provincia + nombre) */
export const localidadKey = (provinciaCode: string, name: string) =>
  `${provinciaCode}::${name}`;

// ============================================================
//  AGRUPACIÓN JERÁRQUICA DE LOCALIDADES (nivel 1 → nivel 2)
// ============================================================
// Mapa de prefijo (parte antes del primer " · ") a su jerarquía operativa.
// Si un prefijo no está en el mapa, se trata como un grupo plano de nivel 1
// con el propio prefijo y sin subgrupo.

export interface LocalityGrouping {
  level1: string; // ej. "Área Metropolitana"
  level2?: string; // ej. "Norte"
}

const PREFIX_GROUPING: Record<string, LocalityGrouping> = {
  // ─── Madrid (28) ───
  "Madrid capital": { level1: "Madrid capital" },
  "Á. Metro Norte": { level1: "Área Metropolitana", level2: "Norte" },
  "Á. Metro Este": { level1: "Área Metropolitana", level2: "Este / Corredor del Henares" },
  "Á. Metro Sur": { level1: "Área Metropolitana", level2: "Sur" },
  "Á. Metro Oeste": { level1: "Área Metropolitana", level2: "Oeste / Noroeste" },
  "Á. Metro Sureste": { level1: "Área Metropolitana", level2: "Sureste" },
  "Sierra Norte": { level1: "Resto de Comunidad", level2: "Sierra Norte" },
  "Sierra Noroeste": { level1: "Resto de Comunidad", level2: "Sierra Noroeste" },
  "Sierra Oeste": { level1: "Resto de Comunidad", level2: "Sierra Oeste" },
  "Vegas / Sureste rural": { level1: "Resto de Comunidad", level2: "Vegas / Sureste rural" },

  // ─── Sevilla (41) ───
  "Sevilla Capital": { level1: "Sevilla Capital" },
  "SE Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte" },
  "SE Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste / Aljarafe" },
  "SE Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur" },
  "SE Á. Metro Este": { level1: "Área metropolitana", level2: "Este" },
  "SE Sierra Norte": { level1: "Resto provincia Sevilla", level2: "Sierra Norte" },
  "SE Campiña Este": { level1: "Resto provincia Sevilla", level2: "Campiña / Este" },
  "SE Sur Profundo": { level1: "Resto provincia Sevilla", level2: "Sur profundo" },

  // ─── Almería (04) ───
  "Almería Capital": { level1: "Almería capital" },
  "AL Á. Metro Poniente": { level1: "Área metropolitana", level2: "Poniente cercano" },
  "AL Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte / área cercana" },
  "AL Poniente Ampliado": { level1: "Resto provincia de Almería", level2: "Poniente ampliado (25–40 km)" },
  "AL Levante": { level1: "Resto provincia de Almería", level2: "Levante" },
  "AL Interior": { level1: "Resto provincia de Almería", level2: "Interior" },

  // ─── Cádiz (11) ───
  "Cádiz Capital": { level1: "Cádiz capital" },
  "CA Á. Metro Bahía": { level1: "Área metropolitana", level2: "Bahía de Cádiz" },
  "CA Jerez": { level1: "Resto provincia de Cádiz", level2: "Jerez" },
  "CA Costa Noroeste": { level1: "Resto provincia de Cádiz", level2: "Costa noroeste" },
  "CA Campo de Gibraltar": { level1: "Resto provincia de Cádiz", level2: "Campo de Gibraltar" },

  // ─── Córdoba (14) ───
  "Córdoba Capital": { level1: "Córdoba capital" },
  "CO Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste / Valle del Guadalquivir" },
  "CO Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur cercano" },
  "CO Á. Metro Este": { level1: "Área metropolitana", level2: "Este cercano" },
  "CO Subbética": { level1: "Resto provincia de Córdoba", level2: "Sur (Subbética)" },
  "CO Campiña": { level1: "Resto provincia de Córdoba", level2: "Campiña" },
  "CO Norte": { level1: "Resto provincia de Córdoba", level2: "Norte (Los Pedroches / Valle del Guadiato)" },

  // ─── Granada (18) ───
  "Granada Capital": { level1: "Granada capital" },
  "GR Á. Metro Oeste": { level1: "Área metropolitana", level2: "Cinturón Oeste" },
  "GR Á. Metro Sur": { level1: "Área metropolitana", level2: "Cinturón Sur" },
  "GR Á. Metro Norte": { level1: "Área metropolitana", level2: "Cinturón Norte" },
  "GR Costa Tropical": { level1: "Resto provincia de Granada", level2: "Costa Tropical" },
  "GR Norte Interior": { level1: "Resto provincia de Granada", level2: "Norte / interior" },
  "GR Alpujarra": { level1: "Resto provincia de Granada", level2: "Alpujarra" },

  // ─── Huelva (21) ───
  "Huelva Capital": { level1: "Huelva capital" },
  "HU Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "HU Costa": { level1: "Resto provincia de Huelva", level2: "Costa" },
  "HU Condado": { level1: "Resto provincia de Huelva", level2: "Condado" },
  "HU Sierra": { level1: "Resto provincia de Huelva", level2: "Sierra" },

  // ─── Jaén (23) ───
  "Jaén Capital": { level1: "Jaén capital" },
  "JA Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "JA Corredor Central": { level1: "Resto provincia de Jaén", level2: "Corredor central" },
  "JA La Loma": { level1: "Resto provincia de Jaén", level2: "La Loma" },
  "JA Sierra": { level1: "Resto provincia de Jaén", level2: "Sierra" },

  // ─── Málaga (29) ───
  "Málaga Capital": { level1: "Málaga capital" },
  "MA Á. Metro Costa Occ": { level1: "Área metropolitana", level2: "Costa occidental cercana" },
  "MA Á. Metro Guadalhorce": { level1: "Área metropolitana", level2: "Valle del Guadalhorce" },
  "MA Á. Metro Costa Or": { level1: "Área metropolitana", level2: "Costa oriental cercana" },
  "MA Costa del Sol Occ": { level1: "Resto provincia de Málaga", level2: "Costa del Sol occidental" },
  "MA Axarquía": { level1: "Resto provincia de Málaga", level2: "Costa oriental / Axarquía" },
  "MA Interior": { level1: "Resto provincia de Málaga", level2: "Interior" },

  // ─── Huesca (22) ───
  "Huesca Capital": { level1: "Huesca capital" },
  "HSC Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "HSC Somontano": { level1: "Resto provincia de Huesca", level2: "Somontano / centro" },
  "HSC Pirineo": { level1: "Resto provincia de Huesca", level2: "Pirineo" },
  "HSC La Litera": { level1: "Resto provincia de Huesca", level2: "Este / La Litera" },

  // ─── Teruel (44) ───
  "Teruel Capital": { level1: "Teruel capital" },
  "TE Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "TE Bajo Aragón": { level1: "Resto provincia de Teruel", level2: "Bajo Aragón" },
  "TE Cuencas Mineras": { level1: "Resto provincia de Teruel", level2: "Comunidad de Calatayud / Cuencas Mineras" },
  "TE Maestrazgo": { level1: "Resto provincia de Teruel", level2: "Maestrazgo / Este" },

  // ─── Zaragoza (50) ───
  "Zaragoza Capital": { level1: "Zaragoza capital" },
  "Z Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte" },
  "Z Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste" },
  "Z Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur" },
  "Z Á. Metro Este": { level1: "Área metropolitana", level2: "Este" },
  "Z Eje Oeste": { level1: "Resto provincia de Zaragoza", level2: "Eje oeste (Ribera Alta / Ebro)" },
  "Z Valdejalón": { level1: "Resto provincia de Zaragoza", level2: "Eje sur (Valdejalón)" },
  "Z Eje Este": { level1: "Resto provincia de Zaragoza", level2: "Eje este (Bajo Ebro / Caspe)" },
  "Z Cinco Villas": { level1: "Resto provincia de Zaragoza", level2: "Norte / Cinco Villas ampliado" },

  // ─── Las Palmas (35) ───
  "Las Palmas de GC": { level1: "Las Palmas de Gran Canaria" },
  "GC Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte cercano" },
  "GC Á. Metro Este": { level1: "Área metropolitana", level2: "Este cercano" },
  "GC Sur Turístico": { level1: "Resto isla de Gran Canaria", level2: "Sur turístico" },
  "GC Oeste Interior": { level1: "Resto isla de Gran Canaria", level2: "Oeste / interior" },
  "Otras Islas Lanzarote": { level1: "Otras islas de la provincia", level2: "Lanzarote" },
  "Otras Islas Fuerteventura": { level1: "Otras islas de la provincia", level2: "Fuerteventura" },

  // ─── S.C. Tenerife (38) ───
  "S.C. Tenerife": { level1: "S.C. Tenerife (capital)" },
  "TF Á. Metro SC-LL": { level1: "Área metropolitana", level2: "Área metropolitana Santa Cruz – La Laguna" },
  "TF Norte": { level1: "Resto isla de Tenerife", level2: "Norte" },
  "TF Sur Turístico": { level1: "Resto isla de Tenerife", level2: "Sur turístico" },
  "TF Oeste": { level1: "Resto isla de Tenerife", level2: "Oeste / noroeste" },
  "TF Otras Islas La Palma": { level1: "Otras islas de la provincia", level2: "La Palma" },
  "TF Otras Islas La Gomera": { level1: "Otras islas de la provincia", level2: "La Gomera" },
  "TF Otras Islas El Hierro": { level1: "Otras islas de la provincia", level2: "El Hierro" },

  // ─── Cantabria (39) ───
  "Santander Capital": { level1: "Santander (capital)" },
  "S Á. Metro Bahía": { level1: "Área metropolitana", level2: "Arco de la Bahía" },
  "S Eje Torrelavega": { level1: "Resto Cantabria", level2: "Eje Torrelavega (hub clave)" },
  "S Occidente": { level1: "Resto Cantabria", level2: "Occidente" },
  "S Oriente": { level1: "Resto Cantabria", level2: "Oriente" },
  "S Interior": { level1: "Resto Cantabria", level2: "Interior" },

  // ─── Ávila (05) ───
  "Ávila Capital": { level1: "Ávila capital" },
  "AV Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "AV Valle del Tiétar": { level1: "Resto provincia de Ávila", level2: "Valle del Tiétar (sur)" },
  "AV La Moraña": { level1: "Resto provincia de Ávila", level2: "Norte / La Moraña" },
  "AV Oeste": { level1: "Resto provincia de Ávila", level2: "Oeste" },

  // ─── Burgos (09) ───
  "Burgos Capital": { level1: "Burgos capital" },
  "BU Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "BU Eje Miranda de Ebro": { level1: "Resto provincia de Burgos", level2: "Eje Miranda de Ebro" },
  "BU Eje Aranda de Duero": { level1: "Resto provincia de Burgos", level2: "Eje Aranda de Duero" },
  "BU Merindades": { level1: "Resto provincia de Burgos", level2: "Norte / Merindades" },

  // ─── León (24) ───
  "León Capital": { level1: "León capital" },
  "LE Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "LE Ponferrada": { level1: "Resto provincia de León", level2: "Ponferrada" },
  "LE Norte Montaña": { level1: "Resto provincia de León", level2: "Norte / Montaña" },
  "LE Sur": { level1: "Resto provincia de León", level2: "Sur" },

  // ─── Palencia (34) ───
  "Palencia Capital": { level1: "Palencia capital" },
  "P Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "P Norte Montaña": { level1: "Resto provincia de Palencia", level2: "Norte (Montaña Palentina)" },
  "P Sur": { level1: "Resto provincia de Palencia", level2: "Sur" },

  // ─── Salamanca (37) ───
  "Salamanca Capital": { level1: "Salamanca capital" },
  "SA Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "SA Sur Ciudad Rodrigo": { level1: "Resto provincia de Salamanca", level2: "Sur (Ciudad Rodrigo)" },
  "SA Este Peñaranda": { level1: "Resto provincia de Salamanca", level2: "Este / Peñaranda" },
  "SA Oeste Frontera": { level1: "Resto provincia de Salamanca", level2: "Oeste / frontera" },

  // ─── Segovia (40) ───
  "Segovia Capital": { level1: "Segovia capital" },
  "SG Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "SG Noroeste": { level1: "Resto provincia de Segovia", level2: "Noroeste" },
  "SG Norte": { level1: "Resto provincia de Segovia", level2: "Norte" },
  "SG Este": { level1: "Resto provincia de Segovia", level2: "Este" },

  // ─── Soria (42) ───
  "Soria Capital": { level1: "Soria capital" },
  "SO Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "SO Oeste": { level1: "Resto provincia de Soria", level2: "Oeste" },
  "SO Norte": { level1: "Resto provincia de Soria", level2: "Norte" },
  "SO Sur": { level1: "Resto provincia de Soria", level2: "Sur" },

  // ─── Valladolid (47) ───
  "Valladolid Capital": { level1: "Valladolid capital" },
  "VA Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte" },
  "VA Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste" },
  "VA Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur" },
  "VA Á. Metro Este": { level1: "Área metropolitana", level2: "Este" },
  "VA Sur": { level1: "Resto provincia de Valladolid", level2: "Sur" },
  "VA Oeste": { level1: "Resto provincia de Valladolid", level2: "Oeste" },
  "VA Norte": { level1: "Resto provincia de Valladolid", level2: "Norte" },

  // ─── Zamora (49) ───
  "Zamora Capital": { level1: "Zamora capital" },
  "ZA Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "ZA Norte": { level1: "Resto provincia de Zamora", level2: "Norte" },
  "ZA Oeste": { level1: "Resto provincia de Zamora", level2: "Oeste" },
  "ZA Sur": { level1: "Resto provincia de Zamora", level2: "Sur" },

  // ─── Albacete (02) ───
  "Albacete Capital": { level1: "Albacete capital" },
  "AB Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "AB Este": { level1: "Resto provincia de Albacete", level2: "Este" },
  "AB Sur": { level1: "Resto provincia de Albacete", level2: "Sur" },
  "AB Oeste": { level1: "Resto provincia de Albacete", level2: "Oeste" },

  // ─── Ciudad Real (13) ───
  "Ciudad Real Capital": { level1: "Ciudad Real capital" },
  "CR Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "CR Centro": { level1: "Resto provincia de Ciudad Real", level2: "Centro" },
  "CR Este": { level1: "Resto provincia de Ciudad Real", level2: "Este" },
  "CR Norte": { level1: "Resto provincia de Ciudad Real", level2: "Norte" },

  // ─── Cuenca (16) ───
  "Cuenca Capital": { level1: "Cuenca capital" },
  "CU Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "CU Oeste": { level1: "Resto provincia de Cuenca", level2: "Oeste" },
  "CU Sur": { level1: "Resto provincia de Cuenca", level2: "Sur" },
  "CU Este": { level1: "Resto provincia de Cuenca", level2: "Este" },

  // ─── Guadalajara (19) ───
  "Guadalajara Capital": { level1: "Guadalajara capital" },
  "GU Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "GU Corredor Henares": { level1: "Resto provincia de Guadalajara", level2: "Corredor del Henares ampliado" },
  "GU Norte": { level1: "Resto provincia de Guadalajara", level2: "Norte" },
  "GU Oeste": { level1: "Resto provincia de Guadalajara", level2: "Oeste" },

  // ─── Toledo (45) ───
  "Toledo Capital": { level1: "Toledo capital" },
  "TO Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "TO Norte": { level1: "Resto provincia de Toledo", level2: "Norte" },
  "TO Centro": { level1: "Resto provincia de Toledo", level2: "Centro" },
  "TO Sur": { level1: "Resto provincia de Toledo", level2: "Sur" },

  // ─── Barcelona (08) ───
  "Barcelona Capital": { level1: "Barcelona capital" },
  "B Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte" },
  "B Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste" },
  "B Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur" },
  "B Á. Metro Interior": { level1: "Área metropolitana", level2: "Interior" },
  "B Vallès": { level1: "Resto provincia de Barcelona", level2: "Vallès" },
  "B Maresme": { level1: "Resto provincia de Barcelona", level2: "Maresme" },
  "B Penedès Garraf": { level1: "Resto provincia de Barcelona", level2: "Penedès / Garraf" },

  // ─── Girona (17) ───
  "Girona Capital": { level1: "Girona capital" },
  "GI Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "GI Costa Brava": { level1: "Resto provincia de Girona", level2: "Costa Brava" },
  "GI Alt Empordà": { level1: "Resto provincia de Girona", level2: "Norte / Alt Empordà" },
  "GI Interior": { level1: "Resto provincia de Girona", level2: "Interior" },

  // ─── Lleida (25) ───
  "Lleida Capital": { level1: "Lleida capital" },
  "L Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "L Ponent": { level1: "Resto provincia de Lleida", level2: "Ponent" },
  "L Pirineo": { level1: "Resto provincia de Lleida", level2: "Pirineo" },
  "L Oeste": { level1: "Resto provincia de Lleida", level2: "Oeste" },

  // ─── Tarragona (43) ───
  "Tarragona Capital": { level1: "Tarragona capital" },
  "T Á. Metro Costa": { level1: "Área metropolitana", level2: "Costa cercana" },
  "T Costa Sur": { level1: "Resto provincia de Tarragona", level2: "Costa sur" },
  "T Ebro": { level1: "Resto provincia de Tarragona", level2: "Ebro" },
  "T Interior": { level1: "Resto provincia de Tarragona", level2: "Interior" },

  // ─── Ceuta (51) ───
  "Ceuta Capital": { level1: "Ceuta capital" },
  "CE Periferia": { level1: "Resto territorio de Ceuta", level2: "Periferia" },

  // ─── Melilla (52) ───
  "Melilla Capital": { level1: "Melilla capital" },
  "ME Periferia": { level1: "Resto territorio de Melilla", level2: "Periferia" },

  // ─── Navarra (31) ───
  "Pamplona Capital": { level1: "Pamplona (capital)" },
  "NA Á. Metro Norte": { level1: "Área metropolitana", level2: "Norte" },
  "NA Á. Metro Oeste": { level1: "Área metropolitana", level2: "Oeste" },
  "NA Á. Metro Sur": { level1: "Área metropolitana", level2: "Sur" },
  "NA Norte Pirineo": { level1: "Resto Navarra", level2: "Norte / Pirineo" },
  "NA Centro": { level1: "Resto Navarra", level2: "Centro" },
  "NA Sur Ribera": { level1: "Resto Navarra", level2: "Sur / Ribera" },
};

export interface LocalitySubgroup {
  key: string; // identificador estable: "L1" o "L1::L2"
  level2: string | null; // null cuando es un grupo plano
  localidades: Localidad[];
}

export interface LocalityGroup {
  key: string; // nivel 1
  level1: string;
  hasSubgroups: boolean;
  subgroups: LocalitySubgroup[]; // si hasSubgroups=false → un único subgrupo con level2=null
  localidades: Localidad[]; // todas las localidades de este nivel 1 (atajo)
}

/**
 * Devuelve las localidades de una provincia agrupadas en hasta 2 niveles
 * jerárquicos a partir del prefijo `"Grupo · Localidad"` o
 * `"Grupo · Sub · Localidad"`. Para provincias sin prefijos reconocibles,
 * devuelve un único grupo "Localidades" plano.
 */
export const getGroupedLocalidades = (provinciaCode: string): LocalityGroup[] => {
  const list = LOCALIDADES_BY_PROVINCE[provinciaCode] ?? [];
  if (list.length === 0) return [];

  const byL1 = new Map<string, Map<string | "__flat__", Localidad[]>>();

  for (const loc of list) {
    const sepIdx = loc.name.indexOf(" · ");
    let l1 = "Localidades";
    let l2: string | null = null;
    if (sepIdx >= 0) {
      const prefix = loc.name.slice(0, sepIdx);
      const grouping = PREFIX_GROUPING[prefix];
      if (grouping) {
        l1 = grouping.level1;
        l2 = grouping.level2 ?? null;
      } else {
        l1 = prefix;
      }
    }
    if (!byL1.has(l1)) byL1.set(l1, new Map());
    const subMap = byL1.get(l1)!;
    const subKey = l2 ?? "__flat__";
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey)!.push(loc);
  }

  const groups: LocalityGroup[] = [];
  for (const [l1, subMap] of byL1) {
    const subgroups: LocalitySubgroup[] = [];
    let hasSubgroups = false;
    const allLocs: Localidad[] = [];
    for (const [subKey, locs] of subMap) {
      const level2 = subKey === "__flat__" ? null : (subKey as string);
      if (level2) hasSubgroups = true;
      subgroups.push({
        key: level2 ? `${l1}::${level2}` : l1,
        level2,
        localidades: locs,
      });
      allLocs.push(...locs);
    }
    groups.push({
      key: l1,
      level1: l1,
      hasSubgroups,
      subgroups,
      localidades: allLocs,
    });
  }
  return groups;
};
