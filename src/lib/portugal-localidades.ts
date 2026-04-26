/**
 * Listado de concelhos/freguesias por distrito de Portugal con su código postal
 * "cabecera". Estructura paralela a `spain-localidades.ts` para que el componente
 * CoverageMap funcione de forma idéntica.
 *
 * Cobertura:
 *  - Lisboa: freguesias de la capital + Á.Metro Norte/Sul/Oeste + Resto distrito.
 *  - Porto: freguesias del centro + Grande Porto + Resto distrito.
 *  - Resto distritos: capital + concelhos principales agrupados por sub-región.
 */

import type { Localidad, LocalityGroup, LocalitySubgroup, LocalityGrouping } from "./spain-localidades";

// Re-exports para mantener una sola fuente de tipos
export type { Localidad, LocalityGroup, LocalitySubgroup, LocalityGrouping };

export const LOCALIDADES_BY_DISTRITO_PT: Record<string, Localidad[]> = {
  // ============================================================
  //                          NORTE
  // ============================================================

  // ───── Porto (PT-13) ─────
  "PT-13": [
    // 1) Porto capital (freguesias)
    { name: "Porto Capital · Cedofeita", cp: "4050-099" },
    { name: "Porto Capital · Bonfim", cp: "4300-006" },
    { name: "Porto Capital · Campanhã", cp: "4300-052" },
    { name: "Porto Capital · Paranhos", cp: "4200-030" },
    { name: "Porto Capital · Ramalde", cp: "4100-440" },
    { name: "Porto Capital · Aldoar/Foz/Nevogilde", cp: "4150-141" },
    { name: "Porto Capital · Lordelo do Ouro/Massarelos", cp: "4150-456" },
    { name: "Porto Capital · Sé/Vitória/Miragaia/São Nicolau", cp: "4050-272" },

    // 2) Grande Porto (área metropolitana)
    { name: "PRT Á. Metro Sul · Vila Nova de Gaia", cp: "4400-001" },
    { name: "PRT Á. Metro Norte · Matosinhos", cp: "4450-001" },
    { name: "PRT Á. Metro Norte · Maia", cp: "4470-001" },
    { name: "PRT Á. Metro Este · Gondomar", cp: "4420-001" },
    { name: "PRT Á. Metro Este · Valongo", cp: "4440-001" },
    { name: "PRT Á. Metro Oeste · Vila do Conde", cp: "4480-001" },
    { name: "PRT Á. Metro Oeste · Póvoa de Varzim", cp: "4490-001" },

    // 3) Resto distrito Porto
    { name: "PRT Tâmega · Penafiel", cp: "4560-001" },
    { name: "PRT Tâmega · Paredes", cp: "4580-001" },
    { name: "PRT Tâmega · Lousada", cp: "4620-001" },
    { name: "PRT Tâmega · Felgueiras", cp: "4610-001" },
    { name: "PRT Tâmega · Marco de Canaveses", cp: "4630-001" },
    { name: "PRT Sousa · Paços de Ferreira", cp: "4590-001" },
    { name: "PRT Douro · Amarante", cp: "4600-001" },
    { name: "PRT Douro · Baião", cp: "4640-001" },
    { name: "PRT Norte · Santo Tirso", cp: "4780-001" },
    { name: "PRT Norte · Trofa", cp: "4785-001" },
  ],

  // ───── Braga (PT-03) ─────
  "PT-03": [
    // 1) Braga capital
    { name: "Braga Capital · Centro/Sé", cp: "4700-001" },
    { name: "Braga Capital · São Vicente", cp: "4700-301" },
    { name: "Braga Capital · São Víctor", cp: "4710-001" },
    { name: "Braga Capital · Maximinos", cp: "4700-225" },
    { name: "Braga Capital · Real/Dume/Semelhe", cp: "4700-040" },

    // 2) Área metropolitana
    { name: "BR Á. Metro Cercano · Vila Verde", cp: "4730-001" },
    { name: "BR Á. Metro Cercano · Amares", cp: "4720-001" },
    { name: "BR Á. Metro Cercano · Póvoa de Lanhoso", cp: "4830-001" },

    // 3) Resto distrito Braga
    { name: "BR Cávado · Barcelos", cp: "4750-001" },
    { name: "BR Cávado · Esposende", cp: "4740-001" },
    { name: "BR Ave · Guimarães", cp: "4800-001" },
    { name: "BR Ave · Vizela", cp: "4815-001" },
    { name: "BR Ave · Fafe", cp: "4820-001" },
    { name: "BR Ave · Vila Nova de Famalicão", cp: "4760-001" },
    { name: "BR Minho-Lima · Cabeceiras de Basto", cp: "4860-001" },
    { name: "BR Minho-Lima · Celorico de Basto", cp: "4890-001" },
    { name: "BR Minho-Lima · Terras de Bouro", cp: "4840-001" },
  ],

  // ───── Viana do Castelo (PT-16) ─────
  "PT-16": [
    { name: "Viana do Castelo Capital · Centro", cp: "4900-001" },
    { name: "Viana do Castelo Capital · Monserrate", cp: "4900-300" },
    { name: "Viana do Castelo Capital · Darque", cp: "4935-001" },

    { name: "VC Á. Metro Cercano · Areosa", cp: "4900-021" },
    { name: "VC Á. Metro Cercano · Carreço", cp: "4900-021" },

    { name: "VC Litoral · Caminha", cp: "4910-001" },
    { name: "VC Litoral · Vila Praia de Âncora (Caminha)", cp: "4910-001" },
    { name: "VC Litoral · Esposende (limítrofe)", cp: "4740-001" },
    { name: "VC Vale do Lima · Ponte de Lima", cp: "4990-001" },
    { name: "VC Vale do Lima · Ponte da Barca", cp: "4980-001" },
    { name: "VC Vale do Lima · Arcos de Valdevez", cp: "4970-001" },
    { name: "VC Norte/Fronteira · Valença", cp: "4930-001" },
    { name: "VC Norte/Fronteira · Vila Nova de Cerveira", cp: "4920-001" },
    { name: "VC Norte/Fronteira · Monção", cp: "4950-001" },
    { name: "VC Norte/Fronteira · Melgaço", cp: "4960-001" },
  ],

  // ───── Vila Real (PT-17) ─────
  "PT-17": [
    { name: "Vila Real Capital · Centro", cp: "5000-001" },
    { name: "Vila Real Capital · Mateus", cp: "5000-291" },
    { name: "Vila Real Capital · Folhadela", cp: "5000-460" },

    { name: "VR Á. Metro Cercano · Sabrosa", cp: "5060-001" },
    { name: "VR Á. Metro Cercano · Santa Marta de Penaguião", cp: "5030-001" },

    { name: "VR Alto Tâmega · Chaves", cp: "5400-001" },
    { name: "VR Alto Tâmega · Boticas", cp: "5460-001" },
    { name: "VR Alto Tâmega · Montalegre", cp: "5470-001" },
    { name: "VR Alto Tâmega · Valpaços", cp: "5430-001" },
    { name: "VR Douro · Peso da Régua", cp: "5050-001" },
    { name: "VR Douro · Mesão Frio", cp: "5040-001" },
    { name: "VR Douro · Murça", cp: "5090-001" },
    { name: "VR Douro · Alijó", cp: "5070-001" },
    { name: "VR Barroso · Ribeira de Pena", cp: "4870-001" },
    { name: "VR Barroso · Mondim de Basto", cp: "4880-001" },
  ],

  // ───── Bragança (PT-04) ─────
  "PT-04": [
    { name: "Bragança Capital · Centro/Sé", cp: "5300-001" },
    { name: "Bragança Capital · Santa Maria", cp: "5300-272" },

    { name: "BG Á. Metro Cercano · Izeda", cp: "5300-401" },

    { name: "BG Norte · Vinhais", cp: "5320-001" },
    { name: "BG Norte · Vimioso", cp: "5230-001" },
    { name: "BG Norte · Miranda do Douro", cp: "5210-001" },
    { name: "BG Sur · Mirandela", cp: "5370-001" },
    { name: "BG Sur · Macedo de Cavaleiros", cp: "5340-001" },
    { name: "BG Sur · Mogadouro", cp: "5200-001" },
    { name: "BG Sur · Alfândega da Fé", cp: "5350-001" },
    { name: "BG Sur · Torre de Moncorvo", cp: "5160-001" },
    { name: "BG Sur · Freixo de Espada à Cinta", cp: "5180-001" },
    { name: "BG Sur · Vila Flor", cp: "5360-001" },
  ],

  // ============================================================
  //                          CENTRO
  // ============================================================

  // ───── Aveiro (PT-01) ─────
  "PT-01": [
    { name: "Aveiro Capital · Glória/Vera Cruz", cp: "3810-001" },
    { name: "Aveiro Capital · Esgueira", cp: "3800-001" },
    { name: "Aveiro Capital · São Bernardo", cp: "3810-855" },
    { name: "Aveiro Capital · Cacia", cp: "3800-583" },

    { name: "AV Á. Metro Cercano · Ílhavo", cp: "3830-001" },
    { name: "AV Á. Metro Cercano · Vagos", cp: "3840-001" },
    { name: "AV Á. Metro Cercano · Albergaria-a-Velha", cp: "3850-001" },

    { name: "AV Norte (Entre Douro e Vouga) · Santa Maria da Feira", cp: "4520-001" },
    { name: "AV Norte (Entre Douro e Vouga) · São João da Madeira", cp: "3700-001" },
    { name: "AV Norte (Entre Douro e Vouga) · Oliveira de Azeméis", cp: "3720-001" },
    { name: "AV Norte (Entre Douro e Vouga) · Vale de Cambra", cp: "3730-001" },
    { name: "AV Norte (Entre Douro e Vouga) · Arouca", cp: "4540-001" },
    { name: "AV Norte (Entre Douro e Vouga) · Espinho", cp: "4500-001" },
    { name: "AV Sur (Baixo Vouga) · Anadia", cp: "3780-001" },
    { name: "AV Sur (Baixo Vouga) · Oliveira do Bairro", cp: "3770-001" },
    { name: "AV Sur (Baixo Vouga) · Águeda", cp: "3750-001" },
    { name: "AV Sur (Baixo Vouga) · Sever do Vouga", cp: "3740-001" },
    { name: "AV Sur (Baixo Vouga) · Estarreja", cp: "3860-001" },
    { name: "AV Sur (Baixo Vouga) · Murtosa", cp: "3870-001" },
    { name: "AV Sur (Baixo Vouga) · Ovar", cp: "3880-001" },
  ],

  // ───── Coimbra (PT-06) ─────
  "PT-06": [
    { name: "Coimbra Capital · Sé Nova/Almedina", cp: "3000-001" },
    { name: "Coimbra Capital · Santo António dos Olivais", cp: "3000-185" },
    { name: "Coimbra Capital · Santa Clara", cp: "3040-001" },
    { name: "Coimbra Capital · Eiras", cp: "3020-001" },

    { name: "CB Á. Metro Cercano · Condeixa-a-Nova", cp: "3150-001" },
    { name: "CB Á. Metro Cercano · Penacova", cp: "3360-001" },
    { name: "CB Á. Metro Cercano · Miranda do Corvo", cp: "3220-001" },

    { name: "CB Litoral · Figueira da Foz", cp: "3080-001" },
    { name: "CB Litoral · Montemor-o-Velho", cp: "3140-001" },
    { name: "CB Litoral · Cantanhede", cp: "3060-001" },
    { name: "CB Litoral · Mira", cp: "3070-001" },
    { name: "CB Interior · Lousã", cp: "3200-001" },
    { name: "CB Interior · Vila Nova de Poiares", cp: "3350-001" },
    { name: "CB Interior · Tábua", cp: "3420-001" },
    { name: "CB Interior · Arganil", cp: "3300-001" },
    { name: "CB Interior · Oliveira do Hospital", cp: "3400-001" },
    { name: "CB Interior · Pampilhosa da Serra", cp: "3320-001" },
    { name: "CB Interior · Góis", cp: "3330-001" },
  ],

  // ───── Leiria (PT-10) ─────
  "PT-10": [
    { name: "Leiria Capital · Centro", cp: "2400-001" },
    { name: "Leiria Capital · Marrazes", cp: "2415-001" },
    { name: "Leiria Capital · Pousos", cp: "2410-001" },

    { name: "LE Á. Metro Cercano · Batalha", cp: "2440-001" },
    { name: "LE Á. Metro Cercano · Porto de Mós", cp: "2480-001" },

    { name: "LE Litoral · Marinha Grande", cp: "2430-001" },
    { name: "LE Litoral · Nazaré", cp: "2450-001" },
    { name: "LE Litoral · Alcobaça", cp: "2460-001" },
    { name: "LE Litoral · Caldas da Rainha", cp: "2500-001" },
    { name: "LE Litoral · Peniche", cp: "2520-001" },
    { name: "LE Litoral · Óbidos", cp: "2510-001" },
    { name: "LE Litoral · Bombarral", cp: "2540-001" },
    { name: "LE Pinhal · Pombal", cp: "3100-001" },
    { name: "LE Pinhal · Ansião", cp: "3240-001" },
    { name: "LE Pinhal · Castanheira de Pera", cp: "3280-001" },
    { name: "LE Pinhal · Figueiró dos Vinhos", cp: "3260-001" },
    { name: "LE Pinhal · Pedrógão Grande", cp: "3270-001" },
    { name: "LE Oeste · Alvaiázere", cp: "3250-001" },
  ],

  // ───── Viseu (PT-18) ─────
  "PT-18": [
    { name: "Viseu Capital · Centro/Sé", cp: "3500-001" },
    { name: "Viseu Capital · Coração de Jesus", cp: "3510-001" },
    { name: "Viseu Capital · Repeses/São Salvador", cp: "3500-880" },

    { name: "VS Á. Metro Cercano · Tondela", cp: "3460-001" },
    { name: "VS Á. Metro Cercano · Mangualde", cp: "3530-001" },
    { name: "VS Á. Metro Cercano · Nelas", cp: "3520-001" },

    { name: "VS Dão-Lafões · Carregal do Sal", cp: "3430-001" },
    { name: "VS Dão-Lafões · Santa Comba Dão", cp: "3440-001" },
    { name: "VS Dão-Lafões · Penalva do Castelo", cp: "3550-001" },
    { name: "VS Dão-Lafões · Sátão", cp: "3560-001" },
    { name: "VS Dão-Lafões · Vouzela", cp: "3670-001" },
    { name: "VS Dão-Lafões · Oliveira de Frades", cp: "3680-001" },
    { name: "VS Douro · Lamego", cp: "5100-001" },
    { name: "VS Douro · Tarouca", cp: "3610-001" },
    { name: "VS Douro · Armamar", cp: "5110-001" },
    { name: "VS Douro · Moimenta da Beira", cp: "3620-001" },
    { name: "VS Douro · São João da Pesqueira", cp: "5130-001" },
    { name: "VS Norte · Castro Daire", cp: "3600-001" },
    { name: "VS Norte · Cinfães", cp: "4690-001" },
    { name: "VS Norte · Resende", cp: "4660-001" },
  ],

  // ───── Guarda (PT-09) ─────
  "PT-09": [
    { name: "Guarda Capital · Sé", cp: "6300-001" },
    { name: "Guarda Capital · São Vicente", cp: "6300-563" },
    { name: "Guarda Capital · São Miguel", cp: "6300-690" },

    { name: "GD Á. Metro Cercano · Manteigas", cp: "6260-001" },

    { name: "GD Beira Interior Norte · Pinhel", cp: "6400-001" },
    { name: "GD Beira Interior Norte · Almeida", cp: "6350-001" },
    { name: "GD Beira Interior Norte · Figueira de Castelo Rodrigo", cp: "6440-001" },
    { name: "GD Beira Interior Norte · Trancoso", cp: "6420-001" },
    { name: "GD Beira Interior Norte · Mêda", cp: "6430-001" },
    { name: "GD Serra da Estrela · Seia", cp: "6270-001" },
    { name: "GD Serra da Estrela · Gouveia", cp: "6290-001" },
    { name: "GD Serra da Estrela · Fornos de Algodres", cp: "6370-001" },
    { name: "GD Serra da Estrela · Celorico da Beira", cp: "6360-001" },
    { name: "GD Sur · Sabugal", cp: "6320-001" },
    { name: "GD Sur · Vila Nova de Foz Côa", cp: "5150-001" },
  ],

  // ───── Castelo Branco (PT-05) ─────
  "PT-05": [
    { name: "Castelo Branco Capital · Centro/Sé", cp: "6000-001" },
    { name: "Castelo Branco Capital · Castelo", cp: "6000-126" },

    { name: "CT Á. Metro Cercano · Idanha-a-Nova", cp: "6060-001" },

    { name: "CT Pinhal Interior · Covilhã", cp: "6200-001" },
    { name: "CT Pinhal Interior · Fundão", cp: "6230-001" },
    { name: "CT Pinhal Interior · Belmonte", cp: "6250-001" },
    { name: "CT Pinhal Interior · Sertã", cp: "6100-001" },
    { name: "CT Pinhal Interior · Oleiros", cp: "6160-001" },
    { name: "CT Pinhal Interior · Proença-a-Nova", cp: "6150-001" },
    { name: "CT Pinhal Interior · Vila de Rei", cp: "6110-001" },
    { name: "CT Pinhal Interior · Mação", cp: "6120-001" },
    { name: "CT Beira Baixa · Penamacor", cp: "6090-001" },
    { name: "CT Beira Baixa · Vila Velha de Ródão", cp: "6030-001" },
  ],

  // ============================================================
  //                  LISBOA E VALE DO TEJO
  // ============================================================

  // ───── Lisboa (PT-11) ─────
  "PT-11": [
    // 1) Lisboa capital (freguesias)
    { name: "Lisboa Capital · Santa Maria Maior (Baixa/Castelo)", cp: "1100-001" },
    { name: "Lisboa Capital · Misericórdia (Bairro Alto/Chiado)", cp: "1200-001" },
    { name: "Lisboa Capital · Estrela", cp: "1200-684" },
    { name: "Lisboa Capital · Campo de Ourique", cp: "1350-001" },
    { name: "Lisboa Capital · Alcântara", cp: "1300-001" },
    { name: "Lisboa Capital · Belém", cp: "1400-001" },
    { name: "Lisboa Capital · Ajuda", cp: "1300-602" },
    { name: "Lisboa Capital · Avenidas Novas", cp: "1050-001" },
    { name: "Lisboa Capital · Areeiro", cp: "1000-001" },
    { name: "Lisboa Capital · Arroios", cp: "1150-001" },
    { name: "Lisboa Capital · Penha de França", cp: "1170-001" },
    { name: "Lisboa Capital · Alvalade", cp: "1700-001" },
    { name: "Lisboa Capital · Lumiar", cp: "1600-001" },
    { name: "Lisboa Capital · Carnide", cp: "1600-799" },
    { name: "Lisboa Capital · São Domingos de Benfica", cp: "1500-001" },
    { name: "Lisboa Capital · Benfica", cp: "1500-602" },
    { name: "Lisboa Capital · Marvila", cp: "1900-001" },
    { name: "Lisboa Capital · Beato", cp: "1950-001" },
    { name: "Lisboa Capital · Olivais", cp: "1800-001" },
    { name: "Lisboa Capital · Parque das Nações", cp: "1990-001" },
    { name: "Lisboa Capital · Santo António", cp: "1250-001" },

    // 2) Á.M.L. Norte
    { name: "LX Á. Metro Norte · Loures", cp: "2670-001" },
    { name: "LX Á. Metro Norte · Odivelas", cp: "2675-001" },
    { name: "LX Á. Metro Norte · Mafra", cp: "2640-001" },
    { name: "LX Á. Metro Norte · Sintra", cp: "2710-001" },
    { name: "LX Á. Metro Norte · Cascais", cp: "2750-001" },
    { name: "LX Á. Metro Norte · Oeiras", cp: "2780-001" },
    { name: "LX Á. Metro Norte · Amadora", cp: "2700-001" },
    { name: "LX Á. Metro Norte · Vila Franca de Xira", cp: "2600-001" },

    // 3) Resto distrito Lisboa
    { name: "LX Oeste · Torres Vedras", cp: "2560-001" },
    { name: "LX Oeste · Lourinhã", cp: "2530-001" },
    { name: "LX Oeste · Alenquer", cp: "2580-001" },
    { name: "LX Oeste · Sobral de Monte Agraço", cp: "2590-001" },
    { name: "LX Oeste · Arruda dos Vinhos", cp: "2630-001" },
    { name: "LX Oeste · Cadaval", cp: "2550-001" },
    { name: "LX Oeste · Azambuja", cp: "2050-001" },
  ],

  // ───── Setúbal (PT-15) ─────
  "PT-15": [
    { name: "Setúbal Capital · São Sebastião", cp: "2900-001" },
    { name: "Setúbal Capital · Santa Maria da Graça", cp: "2900-150" },
    { name: "Setúbal Capital · São Julião/Nossa Senhora da Anunciada", cp: "2900-300" },
    { name: "Setúbal Capital · Sado", cp: "2910-001" },

    { name: "ST Á. Metro Norte (Margem Sul) · Almada", cp: "2800-001" },
    { name: "ST Á. Metro Norte (Margem Sul) · Seixal", cp: "2840-001" },
    { name: "ST Á. Metro Norte (Margem Sul) · Barreiro", cp: "2830-001" },
    { name: "ST Á. Metro Norte (Margem Sul) · Moita", cp: "2860-001" },
    { name: "ST Á. Metro Norte (Margem Sul) · Montijo", cp: "2870-001" },
    { name: "ST Á. Metro Norte (Margem Sul) · Alcochete", cp: "2890-001" },
    { name: "ST Á. Metro Cercano · Palmela", cp: "2950-001" },

    { name: "ST Litoral Alentejano · Sesimbra", cp: "2970-001" },
    { name: "ST Litoral Alentejano · Grândola", cp: "7570-001" },
    { name: "ST Litoral Alentejano · Sines", cp: "7520-001" },
    { name: "ST Litoral Alentejano · Santiago do Cacém", cp: "7540-001" },
    { name: "ST Litoral Alentejano · Odemira", cp: "7630-001" },
    { name: "ST Litoral Alentejano · Alcácer do Sal", cp: "7580-001" },
  ],

  // ───── Santarém (PT-14) ─────
  "PT-14": [
    { name: "Santarém Capital · Marvila", cp: "2000-001" },
    { name: "Santarém Capital · São Salvador", cp: "2000-208" },
    { name: "Santarém Capital · São Nicolau", cp: "2005-001" },

    { name: "SR Á. Metro Cercano · Almeirim", cp: "2080-001" },
    { name: "SR Á. Metro Cercano · Cartaxo", cp: "2070-001" },

    { name: "SR Lezíria do Tejo · Salvaterra de Magos", cp: "2120-001" },
    { name: "SR Lezíria do Tejo · Coruche", cp: "2100-001" },
    { name: "SR Lezíria do Tejo · Benavente", cp: "2130-001" },
    { name: "SR Lezíria do Tejo · Chamusca", cp: "2140-001" },
    { name: "SR Lezíria do Tejo · Golegã", cp: "2150-001" },
    { name: "SR Lezíria do Tejo · Alpiarça", cp: "2090-001" },
    { name: "SR Médio Tejo · Tomar", cp: "2300-001" },
    { name: "SR Médio Tejo · Torres Novas", cp: "2350-001" },
    { name: "SR Médio Tejo · Entroncamento", cp: "2330-001" },
    { name: "SR Médio Tejo · Abrantes", cp: "2200-001" },
    { name: "SR Médio Tejo · Ferreira do Zêzere", cp: "2240-001" },
    { name: "SR Médio Tejo · Sardoal", cp: "2230-001" },
    { name: "SR Médio Tejo · Constância", cp: "2250-001" },
    { name: "SR Médio Tejo · Vila Nova da Barquinha", cp: "2260-001" },
    { name: "SR Médio Tejo · Ourém", cp: "2490-001" },
    { name: "SR Médio Tejo · Alcanena", cp: "2380-001" },
    { name: "SR Médio Tejo · Rio Maior", cp: "2040-001" },
  ],

  // ============================================================
  //                          ALENTEJO
  // ============================================================

  // ───── Évora (PT-07) ─────
  "PT-07": [
    { name: "Évora Capital · Sé/São Pedro", cp: "7000-001" },
    { name: "Évora Capital · Santo Antão", cp: "7000-202" },
    { name: "Évora Capital · Bacelo/Senhora da Saúde", cp: "7005-001" },
    { name: "Évora Capital · Malagueira/Horta das Figueiras", cp: "7000-535" },

    { name: "EV Á. Metro Cercano · Arraiolos", cp: "7040-001" },
    { name: "EV Á. Metro Cercano · Reguengos de Monsaraz", cp: "7200-001" },

    { name: "EV Alentejo Central · Estremoz", cp: "7100-001" },
    { name: "EV Alentejo Central · Borba", cp: "7150-001" },
    { name: "EV Alentejo Central · Vila Viçosa", cp: "7160-001" },
    { name: "EV Alentejo Central · Redondo", cp: "7170-001" },
    { name: "EV Alentejo Central · Alandroal", cp: "7250-001" },
    { name: "EV Alentejo Central · Mourão", cp: "7240-001" },
    { name: "EV Alentejo Central · Portel", cp: "7220-001" },
    { name: "EV Alentejo Central · Viana do Alentejo", cp: "7090-001" },
    { name: "EV Alentejo Central · Mora", cp: "7490-001" },
    { name: "EV Alentejo Central · Vendas Novas", cp: "7080-001" },
    { name: "EV Alentejo Central · Montemor-o-Novo", cp: "7050-001" },
  ],

  // ───── Beja (PT-02) ─────
  "PT-02": [
    { name: "Beja Capital · Santiago Maior/São João Baptista", cp: "7800-001" },
    { name: "Beja Capital · Salvador/Santa Maria da Feira", cp: "7800-150" },

    { name: "BJ Á. Metro Cercano · Ferreira do Alentejo", cp: "7900-001" },
    { name: "BJ Á. Metro Cercano · Cuba", cp: "7940-001" },

    { name: "BJ Baixo Alentejo · Aljustrel", cp: "7600-001" },
    { name: "BJ Baixo Alentejo · Castro Verde", cp: "7780-001" },
    { name: "BJ Baixo Alentejo · Ourique", cp: "7670-001" },
    { name: "BJ Baixo Alentejo · Mértola", cp: "7750-001" },
    { name: "BJ Baixo Alentejo · Almodôvar", cp: "7700-001" },
    { name: "BJ Baixo Alentejo · Vidigueira", cp: "7960-001" },
    { name: "BJ Baixo Alentejo · Alvito", cp: "7920-001" },
    { name: "BJ Baixo Alentejo · Serpa", cp: "7830-001" },
    { name: "BJ Baixo Alentejo · Moura", cp: "7860-001" },
    { name: "BJ Baixo Alentejo · Barrancos", cp: "7230-001" },
  ],

  // ───── Portalegre (PT-12) ─────
  "PT-12": [
    { name: "Portalegre Capital · Sé", cp: "7300-001" },
    { name: "Portalegre Capital · São Lourenço", cp: "7300-200" },
    { name: "Portalegre Capital · Reguengo", cp: "7300-415" },

    { name: "PG Á. Metro Cercano · Castelo de Vide", cp: "7320-001" },
    { name: "PG Á. Metro Cercano · Marvão", cp: "7330-001" },

    { name: "PG Alto Alentejo · Elvas", cp: "7350-001" },
    { name: "PG Alto Alentejo · Campo Maior", cp: "7370-001" },
    { name: "PG Alto Alentejo · Arronches", cp: "7340-001" },
    { name: "PG Alto Alentejo · Monforte", cp: "7450-001" },
    { name: "PG Alto Alentejo · Nisa", cp: "6050-001" },
    { name: "PG Alto Alentejo · Ponte de Sor", cp: "7400-001" },
    { name: "PG Alto Alentejo · Avis", cp: "7480-001" },
    { name: "PG Alto Alentejo · Sousel", cp: "7470-001" },
    { name: "PG Alto Alentejo · Crato", cp: "7430-001" },
    { name: "PG Alto Alentejo · Alter do Chão", cp: "7440-001" },
    { name: "PG Alto Alentejo · Gavião", cp: "6040-001" },
    { name: "PG Alto Alentejo · Fronteira", cp: "7460-001" },
  ],

  // ============================================================
  //                          ALGARVE
  // ============================================================

  // ───── Faro (PT-08) ─────
  "PT-08": [
    { name: "Faro Capital · Sé", cp: "8000-001" },
    { name: "Faro Capital · São Pedro", cp: "8000-100" },
    { name: "Faro Capital · Montenegro", cp: "8005-001" },
    { name: "Faro Capital · Conceição/Estoi", cp: "8005-455" },

    { name: "FR Á. Metro Cercano · Loulé", cp: "8100-001" },
    { name: "FR Á. Metro Cercano · São Brás de Alportel", cp: "8150-001" },
    { name: "FR Á. Metro Cercano · Olhão", cp: "8700-001" },

    { name: "FR Sotavento · Tavira", cp: "8800-001" },
    { name: "FR Sotavento · Vila Real de Santo António", cp: "8900-001" },
    { name: "FR Sotavento · Castro Marim", cp: "8950-001" },
    { name: "FR Sotavento · Alcoutim", cp: "8970-001" },
    { name: "FR Barlavento · Albufeira", cp: "8200-001" },
    { name: "FR Barlavento · Silves", cp: "8300-001" },
    { name: "FR Barlavento · Lagoa", cp: "8400-001" },
    { name: "FR Barlavento · Portimão", cp: "8500-001" },
    { name: "FR Barlavento · Lagos", cp: "8600-001" },
    { name: "FR Barlavento · Vila do Bispo", cp: "8650-001" },
    { name: "FR Barlavento · Aljezur", cp: "8670-001" },
    { name: "FR Barlavento · Monchique", cp: "8550-001" },
  ],

  // ============================================================
  //                  REGIONES AUTÓNOMAS
  // ============================================================

  // ───── Açores (PT-20) ─────
  "PT-20": [
    // São Miguel
    { name: "AÇ São Miguel · Ponta Delgada", cp: "9500-001" },
    { name: "AÇ São Miguel · Ribeira Grande", cp: "9600-001" },
    { name: "AÇ São Miguel · Lagoa", cp: "9560-001" },
    { name: "AÇ São Miguel · Vila Franca do Campo", cp: "9680-001" },
    { name: "AÇ São Miguel · Nordeste", cp: "9630-001" },
    { name: "AÇ São Miguel · Povoação", cp: "9650-001" },
    // Terceira
    { name: "AÇ Terceira · Angra do Heroísmo", cp: "9700-001" },
    { name: "AÇ Terceira · Praia da Vitória", cp: "9760-001" },
    // Faial
    { name: "AÇ Faial · Horta", cp: "9900-001" },
    // Pico
    { name: "AÇ Pico · Madalena", cp: "9950-001" },
    { name: "AÇ Pico · São Roque do Pico", cp: "9940-001" },
    { name: "AÇ Pico · Lajes do Pico", cp: "9930-001" },
    // São Jorge
    { name: "AÇ São Jorge · Velas", cp: "9800-001" },
    { name: "AÇ São Jorge · Calheta", cp: "9850-001" },
    // Graciosa, Santa Maria, Flores, Corvo
    { name: "AÇ Graciosa · Santa Cruz da Graciosa", cp: "9880-001" },
    { name: "AÇ Santa Maria · Vila do Porto", cp: "9580-001" },
    { name: "AÇ Flores · Santa Cruz das Flores", cp: "9970-001" },
    { name: "AÇ Flores · Lajes das Flores", cp: "9960-001" },
    { name: "AÇ Corvo · Corvo", cp: "9980-001" },
  ],

  // ───── Madeira (PT-30) ─────
  "PT-30": [
    // Funchal capital + área
    { name: "MD Funchal Capital · Sé", cp: "9000-001" },
    { name: "MD Funchal Capital · Santa Maria Maior", cp: "9060-001" },
    { name: "MD Funchal Capital · São Pedro", cp: "9000-200" },
    { name: "MD Funchal Capital · Santo António", cp: "9020-001" },
    { name: "MD Funchal Capital · São Martinho", cp: "9000-280" },
    { name: "MD Funchal Capital · Monte", cp: "9050-001" },
    // Resto Madeira
    { name: "MD Resto Madeira · Câmara de Lobos", cp: "9300-001" },
    { name: "MD Resto Madeira · Ribeira Brava", cp: "9350-001" },
    { name: "MD Resto Madeira · Ponta do Sol", cp: "9360-001" },
    { name: "MD Resto Madeira · Calheta", cp: "9370-001" },
    { name: "MD Resto Madeira · Porto Moniz", cp: "9270-001" },
    { name: "MD Resto Madeira · São Vicente", cp: "9240-001" },
    { name: "MD Resto Madeira · Santana", cp: "9230-001" },
    { name: "MD Resto Madeira · Machico", cp: "9200-001" },
    { name: "MD Resto Madeira · Santa Cruz", cp: "9100-001" },
    // Porto Santo
    { name: "MD Porto Santo · Vila Baleira", cp: "9400-001" },
  ],
};

// ============================================================
// PREFIX_GROUPING (estructura jerárquica)
// ============================================================

const PREFIX_GROUPING_PT: Record<string, LocalityGrouping> = {
  // Porto
  "Porto Capital": { level1: "Porto (capital)" },
  "PRT Á. Metro Norte": { level1: "Grande Porto", level2: "Norte" },
  "PRT Á. Metro Sul": { level1: "Grande Porto", level2: "Sul" },
  "PRT Á. Metro Este": { level1: "Grande Porto", level2: "Este" },
  "PRT Á. Metro Oeste": { level1: "Grande Porto", level2: "Oeste" },
  "PRT Tâmega": { level1: "Resto distrito Porto", level2: "Tâmega" },
  "PRT Sousa": { level1: "Resto distrito Porto", level2: "Sousa" },
  "PRT Douro": { level1: "Resto distrito Porto", level2: "Douro" },
  "PRT Norte": { level1: "Resto distrito Porto", level2: "Norte" },

  // Braga
  "Braga Capital": { level1: "Braga (capital)" },
  "BR Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "BR Cávado": { level1: "Resto distrito Braga", level2: "Cávado" },
  "BR Ave": { level1: "Resto distrito Braga", level2: "Ave" },
  "BR Minho-Lima": { level1: "Resto distrito Braga", level2: "Minho-Lima" },

  // Viana do Castelo
  "Viana do Castelo Capital": { level1: "Viana do Castelo (capital)" },
  "VC Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "VC Litoral": { level1: "Resto distrito", level2: "Litoral" },
  "VC Vale do Lima": { level1: "Resto distrito", level2: "Vale do Lima" },
  "VC Norte/Fronteira": { level1: "Resto distrito", level2: "Norte / Fronteira" },

  // Vila Real
  "Vila Real Capital": { level1: "Vila Real (capital)" },
  "VR Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "VR Alto Tâmega": { level1: "Resto distrito", level2: "Alto Tâmega" },
  "VR Douro": { level1: "Resto distrito", level2: "Douro" },
  "VR Barroso": { level1: "Resto distrito", level2: "Barroso" },

  // Bragança
  "Bragança Capital": { level1: "Bragança (capital)" },
  "BG Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "BG Norte": { level1: "Resto distrito", level2: "Norte (Terra Fria)" },
  "BG Sur": { level1: "Resto distrito", level2: "Sur (Terra Quente)" },

  // Aveiro
  "Aveiro Capital": { level1: "Aveiro (capital)" },
  "AV Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "AV Norte (Entre Douro e Vouga)": { level1: "Resto distrito", level2: "Entre Douro e Vouga" },
  "AV Sur (Baixo Vouga)": { level1: "Resto distrito", level2: "Baixo Vouga" },

  // Coimbra
  "Coimbra Capital": { level1: "Coimbra (capital)" },
  "CB Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "CB Litoral": { level1: "Resto distrito", level2: "Litoral / Baixo Mondego" },
  "CB Interior": { level1: "Resto distrito", level2: "Interior / Pinhal" },

  // Leiria
  "Leiria Capital": { level1: "Leiria (capital)" },
  "LE Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "LE Litoral": { level1: "Resto distrito", level2: "Oeste / Litoral" },
  "LE Pinhal": { level1: "Resto distrito", level2: "Pinhal Interior" },
  "LE Oeste": { level1: "Resto distrito", level2: "Pinhal (otros)" },

  // Viseu
  "Viseu Capital": { level1: "Viseu (capital)" },
  "VS Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "VS Dão-Lafões": { level1: "Resto distrito", level2: "Dão-Lafões" },
  "VS Douro": { level1: "Resto distrito", level2: "Douro Sul" },
  "VS Norte": { level1: "Resto distrito", level2: "Norte / Tâmega" },

  // Guarda
  "Guarda Capital": { level1: "Guarda (capital)" },
  "GD Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "GD Beira Interior Norte": { level1: "Resto distrito", level2: "Beira Interior Norte" },
  "GD Serra da Estrela": { level1: "Resto distrito", level2: "Serra da Estrela" },
  "GD Sur": { level1: "Resto distrito", level2: "Sur" },

  // Castelo Branco
  "Castelo Branco Capital": { level1: "Castelo Branco (capital)" },
  "CT Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "CT Pinhal Interior": { level1: "Resto distrito", level2: "Pinhal Interior Sul" },
  "CT Beira Baixa": { level1: "Resto distrito", level2: "Beira Baixa" },

  // Lisboa
  "Lisboa Capital": { level1: "Lisboa (capital)" },
  "LX Á. Metro Norte": { level1: "Área Metropolitana de Lisboa", level2: "Norte" },
  "LX Oeste": { level1: "Resto distrito Lisboa", level2: "Oeste / Lezíria" },

  // Setúbal
  "Setúbal Capital": { level1: "Setúbal (capital)" },
  "ST Á. Metro Norte (Margem Sul)": { level1: "Área Metropolitana de Lisboa (Margem Sul)", level2: "Margem Sul" },
  "ST Á. Metro Cercano": { level1: "Área Metropolitana de Lisboa (Margem Sul)", level2: "Cinturón cercano" },
  "ST Litoral Alentejano": { level1: "Resto distrito Setúbal", level2: "Litoral Alentejano" },

  // Santarém
  "Santarém Capital": { level1: "Santarém (capital)" },
  "SR Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "SR Lezíria do Tejo": { level1: "Resto distrito", level2: "Lezíria do Tejo" },
  "SR Médio Tejo": { level1: "Resto distrito", level2: "Médio Tejo" },

  // Évora
  "Évora Capital": { level1: "Évora (capital)" },
  "EV Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "EV Alentejo Central": { level1: "Resto distrito", level2: "Alentejo Central" },

  // Beja
  "Beja Capital": { level1: "Beja (capital)" },
  "BJ Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "BJ Baixo Alentejo": { level1: "Resto distrito", level2: "Baixo Alentejo" },

  // Portalegre
  "Portalegre Capital": { level1: "Portalegre (capital)" },
  "PG Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "PG Alto Alentejo": { level1: "Resto distrito", level2: "Alto Alentejo" },

  // Faro
  "Faro Capital": { level1: "Faro (capital)" },
  "FR Á. Metro Cercano": { level1: "Área metropolitana", level2: "Cinturón cercano" },
  "FR Sotavento": { level1: "Resto distrito Algarve", level2: "Sotavento" },
  "FR Barlavento": { level1: "Resto distrito Algarve", level2: "Barlavento" },

  // Açores
  "AÇ São Miguel": { level1: "Açores", level2: "São Miguel" },
  "AÇ Terceira": { level1: "Açores", level2: "Terceira" },
  "AÇ Faial": { level1: "Açores", level2: "Faial" },
  "AÇ Pico": { level1: "Açores", level2: "Pico" },
  "AÇ São Jorge": { level1: "Açores", level2: "São Jorge" },
  "AÇ Graciosa": { level1: "Açores", level2: "Graciosa" },
  "AÇ Santa Maria": { level1: "Açores", level2: "Santa Maria" },
  "AÇ Flores": { level1: "Açores", level2: "Flores" },
  "AÇ Corvo": { level1: "Açores", level2: "Corvo" },

  // Madeira
  "MD Funchal Capital": { level1: "Madeira", level2: "Funchal (capital)" },
  "MD Resto Madeira": { level1: "Madeira", level2: "Resto Madeira" },
  "MD Porto Santo": { level1: "Madeira", level2: "Porto Santo" },
};

// ============================================================
// API pública (idéntica a spain-localidades)
// ============================================================

export const localidadesByDistrito = (code: string): Localidad[] =>
  LOCALIDADES_BY_DISTRITO_PT[code] ?? [];

/** Construye los grupos jerárquicos de un distrito a partir de los prefijos. */
export const getGroupedLocalidadesPT = (distritoCode: string): LocalityGroup[] => {
  const items = LOCALIDADES_BY_DISTRITO_PT[distritoCode] ?? [];
  const byLevel1 = new Map<string, Map<string | null, Localidad[]>>();

  for (const loc of items) {
    let grouping: LocalityGrouping | undefined;
    // Intentar prefijos progresivamente más largos (3 → 2 → 1 segmento)
    if (loc.name.includes(" · ")) {
      const parts = loc.name.split(" · ");
      for (let i = parts.length - 1; i >= 1; i--) {
        const prefix = parts.slice(0, i).join(" · ");
        if (PREFIX_GROUPING_PT[prefix]) {
          grouping = PREFIX_GROUPING_PT[prefix];
          break;
        }
      }
    }

    if (!grouping) {
      grouping = { level1: "Otros" };
    }

    if (!byLevel1.has(grouping.level1)) byLevel1.set(grouping.level1, new Map());
    const lvl2map = byLevel1.get(grouping.level1)!;
    const lvl2key = grouping.level2 ?? null;
    if (!lvl2map.has(lvl2key)) lvl2map.set(lvl2key, []);
    lvl2map.get(lvl2key)!.push(loc);
  }

  const result: LocalityGroup[] = [];
  for (const [level1, lvl2map] of byLevel1.entries()) {
    const subgroups: LocalitySubgroup[] = [];
    let allLocalidades: Localidad[] = [];
    for (const [level2, locs] of lvl2map.entries()) {
      subgroups.push({
        key: level2 ? `${level1}::${level2}` : level1,
        level2: level2,
        localidades: locs,
      });
      allLocalidades = allLocalidades.concat(locs);
    }
    const hasSubgroups = subgroups.some((s) => s.level2 !== null);
    result.push({
      key: level1,
      level1,
      hasSubgroups,
      subgroups,
      localidades: allLocalidades,
    });
  }

  return result;
};

export const localidadKeyPT = (distritoCode: string, name: string) =>
  `${distritoCode}::${name}`;
