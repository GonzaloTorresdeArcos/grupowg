/**
 * Dispersión y cobertura territorial — lógica pura (Iteración 6, FASE A).
 *
 * Fuentes y confianza del dato:
 *  - REAL: provincia, municipio y flag capital de ops_fact_ot (ERP); km mensuales (pendientes de fuente: llegan a 0) de
 *    ops_coste_mensual (nivel técnico/mes); conteos de cierres/backlog.
 *  - APROXIMADO: distancia haversine en línea recta desde la base de la delegación
 *    (ops_bases) al CP del aviso (ops_cp_geo). Nunca es ruta ni km reales por OT.
 *  - NO DISPONIBLE con los campos actuales: zonas L1/L2, tiempos de viaje, rutas,
 *    radios de servicio aprobados, coordenadas por OT más allá del CP.
 *
 * Principios: dispersión ≠ volumen; nunca penalizar sin considerar territorio;
 * absolutos + normalizados juntos; umbrales provisionales centralizados y visibles.
 */

// -----------------------------------------------------------------------------
// CP — normalización, validación y casación CP ↔ provincia (prefijo 2 dígitos)
// -----------------------------------------------------------------------------
export function normalizaCp(cp: string | null | undefined): string | null {
  if (!cp) return null;
  const digits = cp.replace(/\D/g, "");
  if (digits.length < 4 || digits.length > 5) return null;
  return digits.padStart(5, "0");
}

export const esCpValido = (cp: string | null | undefined): boolean => normalizaCp(cp) !== null;

/** Prefijo de CP (2 dígitos) por provincia — España península, islas y Ciudades Autónomas. */
export const PREFIJO_PROVINCIA: Record<string, string> = {
  "ÁLAVA": "01", ALBACETE: "02", ALICANTE: "03", "ALMERÍA": "04", "ÁVILA": "05",
  BADAJOZ: "06", "ISLAS BALEARES": "07", BARCELONA: "08", BURGOS: "09", "CÁCERES": "10",
  "CÁDIZ": "11", "CASTELLÓN": "12", "CIUDAD REAL": "13", "CÓRDOBA": "14", "LA CORUÑA": "15",
  CUENCA: "16", GERONA: "17", GRANADA: "18", GUADALAJARA: "19", "GUIPÚZCOA": "20",
  HUELVA: "21", HUESCA: "22", "JAÉN": "23", "LEÓN": "24", LLEIDA: "25",
  "LA RIOJA": "26", LUGO: "27", MADRID: "28", "MÁLAGA": "29", MURCIA: "30",
  NAVARRA: "31", OURENSE: "32", ASTURIAS: "33", PALENCIA: "34", "LAS PALMAS": "35",
  PONTEVEDRA: "36", SALAMANCA: "37", "SANTA CRUZ DE TENERIFE": "38", CANTABRIA: "39", SEGOVIA: "40",
  SEVILLA: "41", SORIA: "42", TARRAGONA: "43", TERUEL: "44", TOLEDO: "45",
  VALENCIA: "46", VALLADOLID: "47", VIZCAYA: "48", ZAMORA: "49", ZARAGOZA: "50",
  CEUTA: "51", MELILLA: "52",
};

/**
 * true si el prefijo del CP casa con la provincia declarada.
 * null cuando no se puede determinar (CP inválido o provincia desconocida).
 * Un `false` NO es necesariamente un error: puede ser una excepción operativa de
 * cobertura (CP servido desde la provincia vecina).
 */
export function casaCpProvincia(cpNorm: string | null, provincia: string | null | undefined): boolean | null {
  if (!cpNorm || !/^\d{5}$/.test(cpNorm) || !provincia) return null;
  const pref = PREFIJO_PROVINCIA[provincia.trim().toUpperCase()];
  if (!pref) return null;
  return cpNorm.slice(0, 2) === pref;
}

// -----------------------------------------------------------------------------
// Estadística básica
// -----------------------------------------------------------------------------
export function mediana(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

export function pctCompleto(parte: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return parte / total;
}

// -----------------------------------------------------------------------------
// Payload SQL de ops_dispersion
// -----------------------------------------------------------------------------
export type DispBase = { delegacion: string; lat: number; lng: number; nota: string | null };

export type DispKpis = {
  cerradas: number;
  abiertas: number;
  abiertas30: number;
  con_provincia: number;
  con_municipio: number;
  cp_valido: number;
  geocodificadas: number;
  capital_si: number;
  capital_no: number;
  provincias_servidas: number;
  municipios_servidos: number;
  cps_servidos: number;
  salidas_km: number;
  km_mediana: number | null;
  km_media: number | null;
  km_reales_total: number;
  km_reales_tecnicos: number;
};

export type DispProvincia = {
  provincia: string;
  cerradas: number;
  abiertas: number;
  abiertas30: number;
  sla20: number | null;
  pct_bajas: number | null;
  municipios: number;
  cps: number;
  recursos: number;
  ots_por_recurso: number | null;
  pct_fuera_capital: number | null;
  km_mediana: number | null;
  salidas_km: number;
  top1: string | null;
  top1_n: number | null;
  cuota_top1: number | null;
  cuota_top3: number | null;
  top1_n30: number | null;
  n30_asignado: number | null;
};

export type DispMunicipio = {
  provincia: string;
  municipio: string;
  cerradas: number;
  abiertas: number;
  abiertas30: number;
  sla20: number | null;
  cps: number;
  recursos: number;
  pct_fuera_capital: number | null;
  top1: string | null;
  cuota_top1: number | null;
};

export type DispTecnico = {
  tecnico: string;
  delegacion: string | null;
  cerradas: number;
  abiertas: number;
  abiertas30: number;
  sla20: number | null;
  pct_bajas: number | null;
  municipios: number;
  cps: number;
  provincias: number;
  pct_fuera_capital: number | null;
  km_mediana: number | null;
  salidas_km: number;
  km_reales: number | null;
  km_reales_meses: number | null;
};

export type DispSat = {
  sat: string;
  cerradas: number;
  abiertas: number;
  abiertas30: number;
  sla20: number | null;
  pct_bajas: number | null;
  provincias: number;
  municipios: number;
  cps: number;
  pct_fuera_capital: number | null;
};

export type DispCalidad = {
  total: number;
  sin_provincia: number;
  sin_municipio: number;
  cp_invalido: number;
  cp_no_geocodificado: number;
  cp_no_casa: number;
  propio_sin_tecnico: number;
  sat_sin_nombre: number;
  sin_geo_propio: number;
  sin_geo_sat: number;
};

/** Gama agregada (solo en `ops_dispersion_resumen`). */
export type DispGama = {
  gama: string;
  cerradas: number;
  sla20: number | null;
  pct_bajas: number | null;
  provincias: number;
  municipios: number;
  pct_fuera_capital: number | null;
  km_mediana: number | null;
  salidas_km: number;
};

/** Tramo de distancia estimada base→CP (solo en `ops_dispersion_resumen`). */
export type DispKmBucket = { bucket: string; n: number; km_mediana: number | null };

/**
 * Payload de dispersión.
 * `municipios` solo viene en la RPC histórica `ops_dispersion` (@deprecated);
 * el resumen lo sustituye por `municipios_total` y la carga paginada de
 * `ops_dispersion_detalle`.
 */
export type DispPayload = {
  periodo: { from: string | null; to: string | null };
  kpis: DispKpis;
  provincias: DispProvincia[];
  municipios?: DispMunicipio[];
  municipios_total?: number;
  gamas?: DispGama[];
  km_buckets?: DispKmBucket[];
  tecnicos: DispTecnico[];
  sats: DispSat[];
  sats_truncado?: boolean;
  calidad: DispCalidad;
  bases: DispBase[];
};

/** Página de detalle territorial de una provincia o de un técnico. */
export type DispDetalle = {
  entidad: "provincia" | "tecnico";
  clave: string;
  total: number;
  limit: number;
  offset: number;
  municipios: DispMunicipio[];
  cps: Array<{ cp: string; municipio: string | null; cerradas: number; lat: number | null; lng: number | null }>;
};


// -----------------------------------------------------------------------------
// Umbrales PROVISIONALES — centralizados, configurables, documentados en pantalla
// -----------------------------------------------------------------------------
export const UMBRALES_DISPERSION = {
  /** Mínimo de cierres para clasificar un territorio/entidad (protección de muestra). */
  MUESTRA_MIN: 20,
  /** Mínimo de cierres asignados para evaluar dependencia de cobertura. */
  MUESTRA_MIN_DEPENDENCIA: 30,
  /** Cuota del recurso principal ≥ → dependencia alta. */
  TOP1_ALTA: 0.6,
  /** Cuota del recurso principal ≥ → dependencia moderada. */
  TOP1_MODERADA: 0.4,
  /** Cuota conjunta top-3 ≥ → concentración alta. */
  TOP3_ALTA: 0.9,
  /** % de abiertas >30d ≥ (con mínimo absoluto) → envejecimiento grave del territorio. */
  BACKLOG30_CRIT_PCT: 0.3,
  BACKLOG30_CRIT_MIN: 20,
  /** Cuota del backlog +30d concentrada en el recurso principal ≥ → punto único de fallo activo. */
  TOP1_BACKLOG_CRIT: 0.5,
  /** Municipios cubiertos por un técnico ≥ factor × mediana de su delegación → dispersión alta/moderada. */
  MUNICIPIOS_FACTOR_ALTA: 2,
  MUNICIPIOS_FACTOR_MODERADA: 1.5,
  MUNICIPIOS_MIN_ALTA: 15,
  MUNICIPIOS_MIN_MODERADA: 10,
  /** Provincias cubiertas por un SAT ≥ factor × mediana de la red SAT → alcance excesivo. */
  SAT_PROV_FACTOR_ALTA: 2,
  /** % de actividad fuera de capital (flag real del ERP). */
  FUERA_CAPITAL_ALTA: 0.6,
  FUERA_CAPITAL_MODERADA: 0.5,
} as const;

export type NivelCobertura =
  | "baja"
  | "moderada"
  | "alta"
  | "riesgo_critico_cobertura"
  | "informacion_insuficiente";

export const LABEL_NIVEL: Record<NivelCobertura, string> = {
  baja: "Baja",
  moderada: "Moderada",
  alta: "Alta",
  riesgo_critico_cobertura: "Riesgo crítico",
  informacion_insuficiente: "Info. insuficiente",
};

/** Orden de atención operativa: riesgo crítico y envejecimiento primero. */
export const PESO_NIVEL: Record<NivelCobertura, number> = {
  riesgo_critico_cobertura: 0,
  alta: 1,
  moderada: 2,
  informacion_insuficiente: 3,
  baja: 4,
};

// -----------------------------------------------------------------------------
// Clasificación de territorios (provincia / municipio)
// -----------------------------------------------------------------------------
export type ClasificacionTerritorioInput = {
  cerradas: number;
  cuotaTop1: number | null;
  cuotaTop3: number | null;
  abiertas: number;
  abiertas30: number;
  pctFueraCapital: number | null;
  /** Cuota del backlog +30d asignado que acumula el recurso principal (0-1). */
  top1BacklogShare: number | null;
};

export function clasificarTerritorio(t: ClasificacionTerritorioInput): { nivel: NivelCobertura; regla: string } {
  const U = UMBRALES_DISPERSION;
  if (t.cerradas < U.MUESTRA_MIN) {
    return {
      nivel: "informacion_insuficiente",
      regla: `Muestra insuficiente: ${t.cerradas} cierres < ${U.MUESTRA_MIN} (umbral provisional).`,
    };
  }
  const pctAb30 = t.abiertas > 0 ? t.abiertas30 / t.abiertas : null;
  if (pctAb30 != null && pctAb30 >= U.BACKLOG30_CRIT_PCT && t.abiertas30 >= U.BACKLOG30_CRIT_MIN) {
    return {
      nivel: "riesgo_critico_cobertura",
      regla: `Envejecimiento grave: ${(pctAb30 * 100).toFixed(0)}% de sus abiertas supera 30 días (≥ ${(U.BACKLOG30_CRIT_PCT * 100).toFixed(0)}% con mínimo ${U.BACKLOG30_CRIT_MIN}).`,
    };
  }
  if (
    t.cuotaTop1 != null && t.cuotaTop1 >= U.TOP1_ALTA &&
    t.top1BacklogShare != null && t.top1BacklogShare >= U.TOP1_BACKLOG_CRIT
  ) {
    return {
      nivel: "riesgo_critico_cobertura",
      regla: `Punto único de fallo activo: el recurso principal concentra el ${(t.cuotaTop1 * 100).toFixed(0)}% de cierres y el ${(t.top1BacklogShare * 100).toFixed(0)}% del backlog +30d.`,
    };
  }
  if (t.cuotaTop1 != null && t.cuotaTop1 >= U.TOP1_ALTA) {
    return {
      nivel: "alta",
      regla: `Dependencia alta: un único recurso cubre el ${(t.cuotaTop1 * 100).toFixed(0)}% de los cierres (≥ ${(U.TOP1_ALTA * 100).toFixed(0)}%).`,
    };
  }
  if (t.cuotaTop3 != null && t.cuotaTop3 >= U.TOP3_ALTA) {
    return {
      nivel: "alta",
      regla: `Concentración alta: el top-3 de recursos cubre el ${(t.cuotaTop3 * 100).toFixed(0)}% de los cierres (≥ ${(U.TOP3_ALTA * 100).toFixed(0)}%).`,
    };
  }
  if (t.pctFueraCapital != null && t.pctFueraCapital >= U.FUERA_CAPITAL_ALTA) {
    return {
      nivel: "alta",
      regla: `Actividad muy dispersa: ${(t.pctFueraCapital * 100).toFixed(0)}% fuera de capital (≥ ${(U.FUERA_CAPITAL_ALTA * 100).toFixed(0)}%, dato real del flag capital).`,
    };
  }
  if (t.cuotaTop1 != null && t.cuotaTop1 >= U.TOP1_MODERADA) {
    return {
      nivel: "moderada",
      regla: `Dependencia moderada: recurso principal con el ${(t.cuotaTop1 * 100).toFixed(0)}% de los cierres (≥ ${(U.TOP1_MODERADA * 100).toFixed(0)}%).`,
    };
  }
  if (t.pctFueraCapital != null && t.pctFueraCapital >= U.FUERA_CAPITAL_MODERADA) {
    return {
      nivel: "moderada",
      regla: `Dispersión territorial moderada: ${(t.pctFueraCapital * 100).toFixed(0)}% fuera de capital.`,
    };
  }
  return { nivel: "baja", regla: "Cobertura equilibrada según los umbrales provisionales." };
}

/** Cuota del backlog +30d asignado que acumula el recurso principal de una provincia. */
export function top1BacklogShare(r: Pick<DispProvincia, "top1_n30" | "n30_asignado">): number | null {
  if (r.top1_n30 == null || !r.n30_asignado || r.n30_asignado <= 0) return null;
  return r.top1_n30 / r.n30_asignado;
}

// -----------------------------------------------------------------------------
// Clasificación de técnicos (dispersión relativa a su delegación)
// -----------------------------------------------------------------------------
export type ClasificacionTecnicoInput = {
  cerradas: number;
  municipios: number;
  medianaMunicipiosDeleg: number | null;
};

export function clasificarTecnico(t: ClasificacionTecnicoInput): { nivel: NivelCobertura; regla: string } {
  const U = UMBRALES_DISPERSION;
  if (t.cerradas < U.MUESTRA_MIN || t.medianaMunicipiosDeleg == null || t.medianaMunicipiosDeleg <= 0) {
    return {
      nivel: "informacion_insuficiente",
      regla: t.cerradas < U.MUESTRA_MIN
        ? `Muestra insuficiente: ${t.cerradas} cierres < ${U.MUESTRA_MIN} (umbral provisional).`
        : "Sin mediana de municipios comparable en su delegación.",
    };
  }
  const factor = t.municipios / t.medianaMunicipiosDeleg;
  if (t.municipios >= U.MUNICIPIOS_MIN_ALTA && factor >= U.MUNICIPIOS_FACTOR_ALTA) {
    return {
      nivel: "alta",
      regla: `Cubre ${t.municipios} municipios, ${factor.toFixed(1)}× la mediana de su delegación (${t.medianaMunicipiosDeleg.toFixed(0)}).`,
    };
  }
  if (t.municipios >= U.MUNICIPIOS_MIN_MODERADA && factor >= U.MUNICIPIOS_FACTOR_MODERADA) {
    return {
      nivel: "moderada",
      regla: `Cubre ${t.municipios} municipios, ${factor.toFixed(1)}× la mediana de su delegación (${t.medianaMunicipiosDeleg.toFixed(0)}).`,
    };
  }
  return { nivel: "baja", regla: "Extensión territorial en línea con su delegación." };
}

// -----------------------------------------------------------------------------
// Clasificación de SATs (alcance geográfico relativo a la red SAT)
// -----------------------------------------------------------------------------
export function clasificarSat(s: { cerradas: number; provincias: number }, medianaProvinciasRed: number | null): { nivel: NivelCobertura; regla: string } {
  const U = UMBRALES_DISPERSION;
  if (s.cerradas < U.MUESTRA_MIN || medianaProvinciasRed == null || medianaProvinciasRed <= 0) {
    return {
      nivel: "informacion_insuficiente",
      regla: s.cerradas < U.MUESTRA_MIN
        ? `Muestra insuficiente: ${s.cerradas} cierres < ${U.MUESTRA_MIN} (umbral provisional).`
        : "Sin mediana de alcance comparable en la red SAT.",
    };
  }
  if (s.provincias >= U.SAT_PROV_FACTOR_ALTA * medianaProvinciasRed) {
    return {
      nivel: "alta",
      regla: `Alcance geográfico excesivo: opera en ${s.provincias} provincias frente a una mediana de ${medianaProvinciasRed.toFixed(0)} en la red SAT.`,
    };
  }
  return { nivel: "baja", regla: "Alcance en línea con la red SAT." };
}

// -----------------------------------------------------------------------------
// Dependencia de cobertura — puntos únicos de fallo por provincia
// (con protección de muestra: alta concentración con demanda muy baja NO es problema)
// -----------------------------------------------------------------------------
export type PuntoUnicoFallo = {
  provincia: string;
  recurso: string;
  cuotaTop1: number;
  cuotaTop3: number | null;
  cerradas: number;
  backlogShare: number | null;
  regla: string;
};

export function detectarPuntosUnicosFallo(rows: DispProvincia[]): PuntoUnicoFallo[] {
  const U = UMBRALES_DISPERSION;
  return rows
    .filter((r) => r.top1 != null && r.cuota_top1 != null && r.cerradas >= U.MUESTRA_MIN_DEPENDENCIA && r.cuota_top1 >= U.TOP1_ALTA)
    .map((r) => {
      const share = top1BacklogShare(r);
      return {
        provincia: r.provincia,
        recurso: r.top1!,
        cuotaTop1: r.cuota_top1!,
        cuotaTop3: r.cuota_top3,
        cerradas: r.cerradas,
        backlogShare: share,
        regla:
          share != null && share >= U.TOP1_BACKLOG_CRIT
            ? `Punto único de fallo ACTIVO: ${(r.cuota_top1! * 100).toFixed(0)}% de cierres y ${(share * 100).toFixed(0)}% del backlog +30d en un único recurso.`
            : `Dependencia estructural: ${(r.cuota_top1! * 100).toFixed(0)}% de los cierres en un único recurso (≥ ${(U.TOP1_ALTA * 100).toFixed(0)}%, muestra ≥ ${U.MUESTRA_MIN_DEPENDENCIA}).`,
      };
    })
    .sort((a, b) => b.cuotaTop1 - a.cuotaTop1);
}

// -----------------------------------------------------------------------------
// Observación factual por territorio (columna "observación" de la tabla)
// -----------------------------------------------------------------------------
export function observacionTerritorio(r: DispProvincia): string | null {
  const share = top1BacklogShare(r);
  const pctAb30 = r.abiertas > 0 ? r.abiertas30 / r.abiertas : null;
  if (r.cuota_top1 != null && r.cuota_top1 >= UMBRALES_DISPERSION.TOP1_ALTA && share != null && share >= UMBRALES_DISPERSION.TOP1_BACKLOG_CRIT) {
    return `Dependencia de ${r.top1} (${(r.cuota_top1 * 100).toFixed(0)}% de cierres), que acumula el ${(share * 100).toFixed(0)}% del backlog +30d.`;
  }
  if (pctAb30 != null && pctAb30 >= UMBRALES_DISPERSION.BACKLOG30_CRIT_PCT && r.abiertas30 >= UMBRALES_DISPERSION.BACKLOG30_CRIT_MIN) {
    return `Envejecimiento grave: ${(pctAb30 * 100).toFixed(0)}% de sus abiertas supera 30 días.`;
  }
  if (r.cuota_top1 != null && r.cuota_top1 >= UMBRALES_DISPERSION.TOP1_ALTA) {
    return `El ${(r.cuota_top1 * 100).toFixed(0)}% de los cierres depende de un único recurso (${r.top1}).`;
  }
  if (r.pct_fuera_capital != null && r.pct_fuera_capital >= UMBRALES_DISPERSION.FUERA_CAPITAL_ALTA) {
    return `Actividad muy dispersa: ${(r.pct_fuera_capital * 100).toFixed(0)}% fuera de capital (dato real).`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Calidad de datos — avisos visibles
// -----------------------------------------------------------------------------
export type AvisoCalidad = { mensaje: string; severidad: "info" | "aviso" };

export function validarCalidadDisp(c: DispCalidad): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];
  const pct = (n: number) => (c.total > 0 ? ` (${((n / c.total) * 100).toFixed(1)}%)` : "");
  if (c.sin_provincia > 0) {
    avisos.push({
      severidad: "aviso",
      mensaje: `${c.sin_provincia.toLocaleString("es-ES")} OTs sin provincia${pct(c.sin_provincia)} — excluidas del análisis territorial.`,
    });
  }
  if (c.sin_geo_sat > 0) {
    avisos.push({
      severidad: "info",
      mensaje: `La red SAT externa concentra la mayor parte de las OTs sin geografía (${c.sin_geo_sat.toLocaleString("es-ES")}) — esperado por la menor calidad de registro de la red, no un error.`,
    });
  }
  if (c.sin_geo_propio > 0) {
    avisos.push({
      severidad: "aviso",
      mensaje: `${c.sin_geo_propio.toLocaleString("es-ES")} OTs de plantilla propia sin provincia — revisable, la plantilla debería registrar geografía completa.`,
    });
  }
  if (c.sin_municipio > 0) {
    avisos.push({ severidad: "info", mensaje: `${c.sin_municipio.toLocaleString("es-ES")} OTs con provincia pero sin municipio${pct(c.sin_municipio)}.` });
  }
  if (c.cp_invalido > 0) {
    avisos.push({ severidad: "aviso", mensaje: `${c.cp_invalido.toLocaleString("es-ES")} OTs con código postal de formato inválido (no normalizable a 5 dígitos).` });
  }
  if (c.cp_no_geocodificado > 0) {
    avisos.push({
      severidad: "info",
      mensaje: `${c.cp_no_geocodificado.toLocaleString("es-ES")} OTs con CP válido no presente en ops_cp_geo — la distancia aproximada no se calcula para ellas.`,
    });
  }
  if (c.cp_no_casa > 0) {
    avisos.push({
      severidad: "info",
      mensaje: `${c.cp_no_casa.toLocaleString("es-ES")} OTs cuyo CP no casa con la provincia declarada (prefijo de 2 dígitos) — se tratan como excepción operativa de cobertura (servicio desde provincia vecina), no como error.`,
    });
  }
  if (c.propio_sin_tecnico > 0) {
    avisos.push({ severidad: "aviso", mensaje: `${c.propio_sin_tecnico.toLocaleString("es-ES")} OTs de tipo "Técnico propio" sin técnico asignado.` });
  }
  if (c.sat_sin_nombre > 0) {
    avisos.push({ severidad: "aviso", mensaje: `${c.sat_sin_nombre.toLocaleString("es-ES")} OTs de tipo "SAT externo" sin SAT identificado.` });
  }
  return avisos;
}

// -----------------------------------------------------------------------------
// Hallazgos automáticos — máx 5, HECHO / HIPÓTESIS / ACCIÓN, con confianza del dato
// -----------------------------------------------------------------------------
export type ConfianzaDato = "real" | "aproximado";

export type HallazgoDisp = {
  hecho: string;
  hipotesis: string;
  accion: string;
  benchmark: string;
  confianza: ConfianzaDato;
};

export function generarHallazgos(input: {
  kpis: DispKpis;
  provincias: DispProvincia[];
  tecnicos: DispTecnico[];
  sats: DispSat[];
  medianasMunicipiosDeleg: Map<string, number>;
}): HallazgoDisp[] {
  const { kpis, provincias, tecnicos, sats, medianasMunicipiosDeleg } = input;
  const out: HallazgoDisp[] = [];
  const U = UMBRALES_DISPERSION;

  // 1. Punto único de fallo más severo
  const puf = detectarPuntosUnicosFallo(provincias)[0];
  if (puf) {
    out.push({
      hecho: `El ${(puf.cuotaTop1 * 100).toFixed(0)}% de los cierres de ${puf.provincia} depende de un único recurso (${puf.recurso}).`,
      hipotesis: puf.backlogShare != null && puf.backlogShare >= U.TOP1_BACKLOG_CRIT
        ? `El recurso también acumula el ${(puf.backlogShare * 100).toFixed(0)}% del backlog +30d de la provincia — la dependencia ya se traduce en envejecimiento.`
        : "Si ese recurso se cae (baja, saturación, conflicto), la provincia pierde la mayor parte de su capacidad de servicio.",
      accion: "Evaluar un segundo recurso de refuerzo o reparto territorial antes de que la dependencia se materialice en SLA.",
      benchmark: `Umbral provisional: dependencia alta ≥ ${(U.TOP1_ALTA * 100).toFixed(0)}% con muestra ≥ ${U.MUESTRA_MIN_DEPENDENCIA} cierres.`,
      confianza: "real",
    });
  }

  // 2. Provincia que concentra el envejecimiento
  const total30 = provincias.reduce((a, r) => a + r.abiertas30, 0);
  const topBacklog = provincias
    .filter((r) => r.abiertas30 >= U.BACKLOG30_CRIT_MIN)
    .sort((a, b) => b.abiertas30 - a.abiertas30)[0];
  if (topBacklog && total30 > 0 && topBacklog.abiertas30 / total30 >= 0.2) {
    out.push({
      hecho: `${topBacklog.provincia} concentra el ${((topBacklog.abiertas30 / total30) * 100).toFixed(0)}% de las OTs de más de 30 días (${topBacklog.abiertas30.toLocaleString("es-ES")} OTs).`,
      hipotesis: "La concentración territorial del envejecimiento suele responder a capacidad, dependencia de recurso o dispersión de la demanda — no necesariamente a rendimiento del técnico.",
      accion: "Revisar etapa de flujo de esas OTs en la sección SLA y la dependencia de cobertura antes de actuar sobre personas.",
      benchmark: `Total de OTs +30d en el período: ${total30.toLocaleString("es-ES")}.`,
      confianza: "real",
    });
  }

  // 3. Técnico más disperso respecto a su delegación
  let tecDisp: { t: DispTecnico; factor: number; med: number } | null = null;
  for (const t of tecnicos) {
    const med = t.delegacion ? medianasMunicipiosDeleg.get(t.delegacion) ?? null : null;
    if (med == null || med <= 0 || t.cerradas < U.MUESTRA_MIN) continue;
    const factor = t.municipios / med;
    if (t.municipios >= U.MUNICIPIOS_MIN_ALTA && factor >= U.MUNICIPIOS_FACTOR_ALTA && (!tecDisp || factor > tecDisp.factor)) {
      tecDisp = { t, factor, med };
    }
  }
  if (tecDisp) {
    out.push({
      hecho: `${tecDisp.t.tecnico} cubrió ${tecDisp.t.municipios} municipios en el período frente a una mediana de ${tecDisp.med.toFixed(0)} en su delegación (${tecDisp.factor.toFixed(1)}×).`,
      hipotesis: "Una extensión territorial muy superior a la de sus pares puede explicar menor productividad o peor SLA sin implicar peor trabajo.",
      accion: "Contrastar con sus km registrados y la agrupación de citas antes de evaluar rendimiento o incentivos.",
      benchmark: `Mediana de municipios por técnico en ${tecDisp.t.delegacion ?? "su delegación"}: ${tecDisp.med.toFixed(0)} (umbral provisional: ${U.MUNICIPIOS_FACTOR_ALTA}× con mínimo ${U.MUNICIPIOS_MIN_ALTA}).`,
      confianza: tecDisp.t.km_reales != null ? "real" : "aproximado",
    });
  }

  // 4. SAT con alcance geográfico excesivo
  const satsMuestra = sats.filter((s) => s.cerradas >= U.MUESTRA_MIN);
  const medProv = mediana(satsMuestra.map((s) => s.provincias));
  const satAmplio = medProv != null
    ? satsMuestra.filter((s) => s.provincias >= U.SAT_PROV_FACTOR_ALTA * medProv).sort((a, b) => b.provincias - a.provincias)[0]
    : undefined;
  if (satAmplio && medProv != null) {
    out.push({
      hecho: `El SAT ${satAmplio.sat} opera en ${satAmplio.provincias} provincias frente a una mediana de ${medProv.toFixed(0)} en la red SAT.`,
      hipotesis: "Un alcance tan amplio diluye la densidad de servicio y puede degradar tiempos de respuesta lejos de su base.",
      accion: "Revisar su SLA por provincia y valorar redistribución de avisos lejanos a SATs locales.",
      benchmark: `Mediana de alcance de la red SAT (SATs con ≥ ${U.MUESTRA_MIN} cierres): ${medProv.toFixed(0)} provincias.`,
      confianza: "real",
    });
  }

  // 5. Estructura de la demanda fuera de capital o limitación del dato
  const capTotal = kpis.capital_si + kpis.capital_no;
  const pctFuera = capTotal > 0 ? kpis.capital_no / capTotal : null;
  if (pctFuera != null && pctFuera >= U.FUERA_CAPITAL_ALTA) {
    out.push({
      hecho: `El ${(pctFuera * 100).toFixed(0)}% de la demanda del período se produce fuera de capitales de provincia.`,
      hipotesis: "La dispersión es estructural de la cartera, no un desvío puntual — la red debe estar dimensionada para territorio, no para ciudad.",
      accion: "Usar la tabla territorial para verificar que cada provincia dispersa tiene recursos suficientes y no depende de desplazamientos largos puntuales.",
      benchmark: "Dato real del flag capital del ERP (23% de OTs históricas en capital).",
      confianza: "real",
    });
  }
  if (kpis.cerradas > 0 && kpis.geocodificadas / kpis.cerradas < 0.75) {
    out.push({
      hecho: `Solo el ${((kpis.geocodificadas / kpis.cerradas) * 100).toFixed(0)}% de las cerradas del período es geocodificable contra ops_cp_geo.`,
      hipotesis: "La distancia aproximada y parte del análisis territorial subestiman la realidad, sobre todo en la red SAT.",
      accion: "Completar la tabla de coordenadas de CP y depurar los CPs de formato inválido antes de usar la dispersión como criterio de red.",
      benchmark: "Objetivo de calidad provisional: ≥ 75% geocodificable.",
      confianza: "aproximado",
    });
  }

  return out.slice(0, 5);
}
