/**
 * Listado representativo de las principales localidades de cada provincia
 * española con su código postal "cabecera". No es exhaustivo (España tiene
 * más de 8.000 municipios), pero cubre las cabeceras de comarca y ciudades
 * más relevantes que un colaborador querría poder excluir de su zona de
 * cobertura.
 *
 * Estructura: localidad → { name, cp (código postal principal o rango) }.
 * Para CP con varios distritos se indica el primero como representativo.
 */

export interface Localidad {
  name: string;
  cp: string;
}

export const LOCALIDADES_BY_PROVINCE: Record<string, Localidad[]> = {
  // === ANDALUCÍA ===
  "04": [ // Almería
    { name: "Almería", cp: "04001" },
    { name: "Roquetas de Mar", cp: "04740" },
    { name: "El Ejido", cp: "04700" },
    { name: "Níjar", cp: "04100" },
    { name: "Vícar", cp: "04738" },
    { name: "Adra", cp: "04770" },
    { name: "Huércal-Overa", cp: "04600" },
  ],
  "11": [ // Cádiz
    { name: "Cádiz", cp: "11001" },
    { name: "Jerez de la Frontera", cp: "11401" },
    { name: "Algeciras", cp: "11201" },
    { name: "San Fernando", cp: "11100" },
    { name: "El Puerto de Santa María", cp: "11500" },
    { name: "Chiclana de la Frontera", cp: "11130" },
    { name: "La Línea de la Concepción", cp: "11300" },
    { name: "Puerto Real", cp: "11510" },
    { name: "Sanlúcar de Barrameda", cp: "11540" },
  ],
  "14": [ // Córdoba
    { name: "Córdoba", cp: "14001" },
    { name: "Lucena", cp: "14900" },
    { name: "Puente Genil", cp: "14500" },
    { name: "Montilla", cp: "14550" },
    { name: "Priego de Córdoba", cp: "14800" },
    { name: "Cabra", cp: "14940" },
    { name: "Baena", cp: "14850" },
  ],
  "18": [ // Granada
    { name: "Granada", cp: "18001" },
    { name: "Motril", cp: "18600" },
    { name: "Almuñécar", cp: "18690" },
    { name: "Baza", cp: "18800" },
    { name: "Loja", cp: "18300" },
    { name: "Maracena", cp: "18200" },
    { name: "Armilla", cp: "18100" },
  ],
  "21": [ // Huelva
    { name: "Huelva", cp: "21001" },
    { name: "Lepe", cp: "21440" },
    { name: "Almonte", cp: "21730" },
    { name: "Moguer", cp: "21800" },
    { name: "Ayamonte", cp: "21400" },
    { name: "Isla Cristina", cp: "21410" },
  ],
  "23": [ // Jaén
    { name: "Jaén", cp: "23001" },
    { name: "Linares", cp: "23700" },
    { name: "Andújar", cp: "23740" },
    { name: "Úbeda", cp: "23400" },
    { name: "Martos", cp: "23600" },
    { name: "Alcalá la Real", cp: "23680" },
  ],
  "29": [ // Málaga
    { name: "Málaga", cp: "29001" },
    { name: "Marbella", cp: "29600" },
    { name: "Mijas", cp: "29650" },
    { name: "Fuengirola", cp: "29640" },
    { name: "Torremolinos", cp: "29620" },
    { name: "Vélez-Málaga", cp: "29700" },
    { name: "Estepona", cp: "29680" },
    { name: "Benalmádena", cp: "29630" },
    { name: "Antequera", cp: "29200" },
    { name: "Ronda", cp: "29400" },
  ],
  "41": [ // Sevilla
    { name: "Sevilla", cp: "41001" },
    { name: "Dos Hermanas", cp: "41700" },
    { name: "Alcalá de Guadaíra", cp: "41500" },
    { name: "Utrera", cp: "41710" },
    { name: "Mairena del Aljarafe", cp: "41927" },
    { name: "Écija", cp: "41400" },
    { name: "Carmona", cp: "41410" },
    { name: "Tomares", cp: "41940" },
  ],

  // === ARAGÓN ===
  "22": [ // Huesca
    { name: "Huesca", cp: "22001" },
    { name: "Monzón", cp: "22400" },
    { name: "Barbastro", cp: "22300" },
    { name: "Fraga", cp: "22520" },
    { name: "Jaca", cp: "22700" },
    { name: "Sabiñánigo", cp: "22600" },
  ],
  "44": [ // Teruel
    { name: "Teruel", cp: "44001" },
    { name: "Alcañiz", cp: "44600" },
    { name: "Andorra", cp: "44500" },
    { name: "Calanda", cp: "44570" },
  ],
  "50": [ // Zaragoza
    { name: "Zaragoza", cp: "50001" },
    { name: "Calatayud", cp: "50300" },
    { name: "Utebo", cp: "50180" },
    { name: "Ejea de los Caballeros", cp: "50600" },
    { name: "Tarazona", cp: "50500" },
    { name: "Caspe", cp: "50700" },
  ],

  // === ASTURIAS ===
  "33": [
    { name: "Oviedo", cp: "33001" },
    { name: "Gijón", cp: "33201" },
    { name: "Avilés", cp: "33400" },
    { name: "Siero", cp: "33510" },
    { name: "Langreo", cp: "33930" },
    { name: "Mieres", cp: "33600" },
    { name: "Castrillón", cp: "33450" },
    { name: "Llanera", cp: "33420" },
  ],

  // === ISLAS BALEARES ===
  "07": [
    { name: "Palma", cp: "07001" },
    { name: "Calvià", cp: "07181" },
    { name: "Manacor", cp: "07500" },
    { name: "Inca", cp: "07300" },
    { name: "Ibiza (Eivissa)", cp: "07800" },
    { name: "Santa Eulària des Riu", cp: "07840" },
    { name: "Mahón", cp: "07701" },
    { name: "Ciutadella de Menorca", cp: "07760" },
  ],

  // === CANARIAS ===
  "35": [ // Las Palmas
    { name: "Las Palmas de Gran Canaria", cp: "35001" },
    { name: "Telde", cp: "35200" },
    { name: "Santa Lucía de Tirajana", cp: "35110" },
    { name: "San Bartolomé de Tirajana", cp: "35100" },
    { name: "Arrecife", cp: "35500" },
    { name: "Puerto del Rosario", cp: "35600" },
    { name: "Arucas", cp: "35400" },
  ],
  "38": [ // S.C. Tenerife
    { name: "Santa Cruz de Tenerife", cp: "38001" },
    { name: "San Cristóbal de La Laguna", cp: "38201" },
    { name: "Arona", cp: "38640" },
    { name: "Adeje", cp: "38670" },
    { name: "Granadilla de Abona", cp: "38600" },
    { name: "La Orotava", cp: "38300" },
    { name: "Los Realejos", cp: "38410" },
    { name: "Puerto de la Cruz", cp: "38400" },
    { name: "Santa Cruz de La Palma", cp: "38700" },
  ],

  // === CANTABRIA ===
  "39": [
    { name: "Santander", cp: "39001" },
    { name: "Torrelavega", cp: "39300" },
    { name: "Castro-Urdiales", cp: "39700" },
    { name: "Camargo", cp: "39600" },
    { name: "Piélagos", cp: "39470" },
    { name: "Laredo", cp: "39770" },
  ],

  // === CASTILLA-LA MANCHA ===
  "02": [ // Albacete
    { name: "Albacete", cp: "02001" },
    { name: "Hellín", cp: "02400" },
    { name: "Villarrobledo", cp: "02600" },
    { name: "Almansa", cp: "02640" },
    { name: "La Roda", cp: "02630" },
  ],
  "13": [ // Ciudad Real
    { name: "Ciudad Real", cp: "13001" },
    { name: "Puertollano", cp: "13500" },
    { name: "Tomelloso", cp: "13700" },
    { name: "Alcázar de San Juan", cp: "13600" },
    { name: "Valdepeñas", cp: "13300" },
    { name: "Manzanares", cp: "13200" },
  ],
  "16": [ // Cuenca
    { name: "Cuenca", cp: "16001" },
    { name: "Tarancón", cp: "16400" },
    { name: "San Clemente", cp: "16600" },
    { name: "Motilla del Palancar", cp: "16200" },
  ],
  "19": [ // Guadalajara
    { name: "Guadalajara", cp: "19001" },
    { name: "Azuqueca de Henares", cp: "19200" },
    { name: "Alovera", cp: "19208" },
    { name: "Cabanillas del Campo", cp: "19171" },
    { name: "Sigüenza", cp: "19250" },
  ],
  "45": [ // Toledo
    { name: "Toledo", cp: "45001" },
    { name: "Talavera de la Reina", cp: "45600" },
    { name: "Illescas", cp: "45200" },
    { name: "Seseña", cp: "45223" },
    { name: "Torrijos", cp: "45500" },
    { name: "Yuncos", cp: "45210" },
  ],

  // === CASTILLA Y LEÓN ===
  "05": [ // Ávila
    { name: "Ávila", cp: "05001" },
    { name: "Arévalo", cp: "05200" },
    { name: "Arenas de San Pedro", cp: "05400" },
  ],
  "09": [ // Burgos
    { name: "Burgos", cp: "09001" },
    { name: "Miranda de Ebro", cp: "09200" },
    { name: "Aranda de Duero", cp: "09400" },
    { name: "Briviesca", cp: "09240" },
  ],
  "24": [ // León
    { name: "León", cp: "24001" },
    { name: "Ponferrada", cp: "24400" },
    { name: "San Andrés del Rabanedo", cp: "24010" },
    { name: "Astorga", cp: "24700" },
    { name: "La Bañeza", cp: "24750" },
  ],
  "34": [ // Palencia
    { name: "Palencia", cp: "34001" },
    { name: "Aguilar de Campoo", cp: "34800" },
    { name: "Guardo", cp: "34880" },
  ],
  "37": [ // Salamanca
    { name: "Salamanca", cp: "37001" },
    { name: "Béjar", cp: "37700" },
    { name: "Ciudad Rodrigo", cp: "37500" },
    { name: "Santa Marta de Tormes", cp: "37900" },
  ],
  "40": [ // Segovia
    { name: "Segovia", cp: "40001" },
    { name: "Cuéllar", cp: "40200" },
    { name: "El Espinar", cp: "40400" },
  ],
  "42": [ // Soria
    { name: "Soria", cp: "42001" },
    { name: "Almazán", cp: "42200" },
    { name: "Burgo de Osma", cp: "42300" },
  ],
  "47": [ // Valladolid
    { name: "Valladolid", cp: "47001" },
    { name: "Medina del Campo", cp: "47400" },
    { name: "Laguna de Duero", cp: "47140" },
    { name: "Arroyo de la Encomienda", cp: "47195" },
  ],
  "49": [ // Zamora
    { name: "Zamora", cp: "49001" },
    { name: "Benavente", cp: "49600" },
    { name: "Toro", cp: "49800" },
  ],

  // === CATALUÑA ===
  "08": [ // Barcelona
    { name: "Barcelona", cp: "08001" },
    { name: "L'Hospitalet de Llobregat", cp: "08901" },
    { name: "Badalona", cp: "08911" },
    { name: "Terrassa", cp: "08221" },
    { name: "Sabadell", cp: "08201" },
    { name: "Mataró", cp: "08301" },
    { name: "Santa Coloma de Gramenet", cp: "08921" },
    { name: "Cornellà de Llobregat", cp: "08940" },
    { name: "Sant Boi de Llobregat", cp: "08830" },
    { name: "Granollers", cp: "08400" },
    { name: "Vilanova i la Geltrú", cp: "08800" },
    { name: "Manresa", cp: "08240" },
    { name: "Rubí", cp: "08191" },
    { name: "Castelldefels", cp: "08860" },
    { name: "El Prat de Llobregat", cp: "08820" },
    { name: "Vic", cp: "08500" },
    { name: "Igualada", cp: "08700" },
  ],
  "17": [ // Girona
    { name: "Girona", cp: "17001" },
    { name: "Figueres", cp: "17600" },
    { name: "Blanes", cp: "17300" },
    { name: "Lloret de Mar", cp: "17310" },
    { name: "Olot", cp: "17800" },
    { name: "Salt", cp: "17190" },
  ],
  "25": [ // Lleida
    { name: "Lleida", cp: "25001" },
    { name: "Balaguer", cp: "25600" },
    { name: "Tàrrega", cp: "25300" },
    { name: "Mollerussa", cp: "25230" },
    { name: "La Seu d'Urgell", cp: "25700" },
  ],
  "43": [ // Tarragona
    { name: "Tarragona", cp: "43001" },
    { name: "Reus", cp: "43201" },
    { name: "Tortosa", cp: "43500" },
    { name: "El Vendrell", cp: "43700" },
    { name: "Cambrils", cp: "43850" },
    { name: "Salou", cp: "43840" },
    { name: "Valls", cp: "43800" },
  ],

  // === C. VALENCIANA ===
  "03": [ // Alicante
    { name: "Alicante", cp: "03001" },
    { name: "Elche", cp: "03201" },
    { name: "Torrevieja", cp: "03180" },
    { name: "Orihuela", cp: "03300" },
    { name: "Benidorm", cp: "03501" },
    { name: "Alcoy", cp: "03801" },
    { name: "San Vicente del Raspeig", cp: "03690" },
    { name: "Elda", cp: "03600" },
    { name: "Dénia", cp: "03700" },
    { name: "Petrer", cp: "03610" },
    { name: "Villena", cp: "03400" },
    { name: "Santa Pola", cp: "03130" },
    { name: "Calp", cp: "03710" },
    { name: "Jávea (Xàbia)", cp: "03730" },
  ],
  "12": [ // Castellón
    { name: "Castellón de la Plana", cp: "12001" },
    { name: "Vila-real", cp: "12540" },
    { name: "Burriana", cp: "12530" },
    { name: "Vinaròs", cp: "12500" },
    { name: "Benicarló", cp: "12580" },
    { name: "Onda", cp: "12200" },
  ],
  "46": [ // Valencia
    { name: "Valencia", cp: "46001" },
    { name: "Gandía", cp: "46700" },
    { name: "Torrent", cp: "46900" },
    { name: "Paterna", cp: "46980" },
    { name: "Sagunto", cp: "46500" },
    { name: "Alzira", cp: "46600" },
    { name: "Mislata", cp: "46920" },
    { name: "Burjassot", cp: "46100" },
    { name: "Xirivella", cp: "46950" },
    { name: "Quart de Poblet", cp: "46930" },
    { name: "Manises", cp: "46940" },
    { name: "Cullera", cp: "46400" },
    { name: "Xàtiva", cp: "46800" },
    { name: "Ontinyent", cp: "46870" },
  ],

  // === EXTREMADURA ===
  "06": [ // Badajoz
    { name: "Badajoz", cp: "06001" },
    { name: "Mérida", cp: "06800" },
    { name: "Don Benito", cp: "06400" },
    { name: "Almendralejo", cp: "06200" },
    { name: "Villanueva de la Serena", cp: "06700" },
    { name: "Zafra", cp: "06300" },
  ],
  "10": [ // Cáceres
    { name: "Cáceres", cp: "10001" },
    { name: "Plasencia", cp: "10600" },
    { name: "Navalmoral de la Mata", cp: "10300" },
    { name: "Trujillo", cp: "10200" },
    { name: "Coria", cp: "10800" },
  ],

  // === GALICIA ===
  "15": [ // A Coruña
    { name: "A Coruña", cp: "15001" },
    { name: "Santiago de Compostela", cp: "15701" },
    { name: "Ferrol", cp: "15401" },
    { name: "Narón", cp: "15570" },
    { name: "Oleiros", cp: "15173" },
    { name: "Carballo", cp: "15100" },
    { name: "Arteixo", cp: "15142" },
  ],
  "27": [ // Lugo
    { name: "Lugo", cp: "27001" },
    { name: "Monforte de Lemos", cp: "27400" },
    { name: "Viveiro", cp: "27850" },
    { name: "Vilalba", cp: "27800" },
  ],
  "32": [ // Ourense
    { name: "Ourense", cp: "32001" },
    { name: "O Barco de Valdeorras", cp: "32300" },
    { name: "Verín", cp: "32600" },
    { name: "O Carballiño", cp: "32500" },
  ],
  "36": [ // Pontevedra
    { name: "Pontevedra", cp: "36001" },
    { name: "Vigo", cp: "36201" },
    { name: "Redondela", cp: "36800" },
    { name: "Vilagarcía de Arousa", cp: "36600" },
    { name: "Cangas", cp: "36940" },
    { name: "Marín", cp: "36900" },
    { name: "Ponteareas", cp: "36860" },
  ],

  // === LA RIOJA ===
  "26": [
    { name: "Logroño", cp: "26001" },
    { name: "Calahorra", cp: "26500" },
    { name: "Arnedo", cp: "26580" },
    { name: "Haro", cp: "26200" },
    { name: "Lardero", cp: "26140" },
  ],

  // === MADRID ===
  "28": [
    { name: "Madrid", cp: "28001" },
    { name: "Móstoles", cp: "28931" },
    { name: "Alcalá de Henares", cp: "28801" },
    { name: "Fuenlabrada", cp: "28940" },
    { name: "Leganés", cp: "28911" },
    { name: "Getafe", cp: "28901" },
    { name: "Alcorcón", cp: "28921" },
    { name: "Torrejón de Ardoz", cp: "28850" },
    { name: "Parla", cp: "28980" },
    { name: "Alcobendas", cp: "28100" },
    { name: "Las Rozas", cp: "28230" },
    { name: "San Sebastián de los Reyes", cp: "28700" },
    { name: "Pozuelo de Alarcón", cp: "28223" },
    { name: "Coslada", cp: "28820" },
    { name: "Rivas-Vaciamadrid", cp: "28521" },
    { name: "Valdemoro", cp: "28340" },
    { name: "Majadahonda", cp: "28220" },
    { name: "Collado Villalba", cp: "28400" },
    { name: "Aranjuez", cp: "28300" },
    { name: "Boadilla del Monte", cp: "28660" },
    { name: "Pinto", cp: "28320" },
    { name: "San Fernando de Henares", cp: "28830" },
    { name: "Tres Cantos", cp: "28760" },
  ],

  // === MURCIA ===
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
  ],

  // === NAVARRA ===
  "31": [
    { name: "Pamplona", cp: "31001" },
    { name: "Tudela", cp: "31500" },
    { name: "Barañáin", cp: "31010" },
    { name: "Burlada", cp: "31600" },
    { name: "Estella", cp: "31200" },
    { name: "Tafalla", cp: "31300" },
  ],

  // === PAÍS VASCO ===
  "01": [ // Álava
    { name: "Vitoria-Gasteiz", cp: "01001" },
    { name: "Llodio", cp: "01400" },
    { name: "Amurrio", cp: "01470" },
  ],
  "20": [ // Gipuzkoa
    { name: "San Sebastián (Donostia)", cp: "20001" },
    { name: "Irún", cp: "20301" },
    { name: "Errenteria", cp: "20100" },
    { name: "Eibar", cp: "20600" },
    { name: "Zarautz", cp: "20800" },
    { name: "Hernani", cp: "20120" },
    { name: "Tolosa", cp: "20400" },
  ],
  "48": [ // Bizkaia
    { name: "Bilbao", cp: "48001" },
    { name: "Barakaldo", cp: "48901" },
    { name: "Getxo", cp: "48930" },
    { name: "Portugalete", cp: "48920" },
    { name: "Santurtzi", cp: "48980" },
    { name: "Basauri", cp: "48970" },
    { name: "Leioa", cp: "48940" },
    { name: "Durango", cp: "48200" },
    { name: "Galdakao", cp: "48960" },
  ],

  // === CEUTA Y MELILLA ===
  "51": [{ name: "Ceuta", cp: "51001" }],
  "52": [{ name: "Melilla", cp: "52001" }],
};

export const localidadesByProvincia = (code: string): Localidad[] =>
  LOCALIDADES_BY_PROVINCE[code] ?? [];

/** Llave única estable para una localidad (provincia + nombre) */
export const localidadKey = (provinciaCode: string, name: string) =>
  `${provinciaCode}::${name}`;
