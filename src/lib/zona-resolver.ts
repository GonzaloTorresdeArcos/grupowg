/**
 * Resolvedor CP → Zona operativa WG.
 *
 * Modelo: los ficheros `spain-localidades.ts` / `portugal-localidades.ts`
 * definen "cabeceras" (1 localidad por CP representativo). Este módulo cubre
 * cualquier CP del territorio degradando con elegancia:
 *   - EXACTO: el CP coincide con una cabecera listada.
 *   - APROXIMADO: se elige la cabecera con CP numérico más cercano dentro
 *     de la MISMA provincia/distrito derivada del propio CP.
 *
 * Ejemplos esperados:
 *   resolveZonaES("28850") → Madrid · Área Metropolitana / Este (exact)
 *   resolveZonaES("04716") → Almería · Resto provincia / Poniente ampliado (aprox)
 *   resolveZonaES("22520") → Huesca (prov 22, exact en cabeceras de Huesca)
 *   resolveZonaPT("1000-001") → Lisboa capital (exact)
 *   resolveZonaPT("4700-001") → Braga capital (exact)
 */

import {
  LOCALIDADES_BY_PROVINCE,
  getGroupedLocalidades,
  type Localidad,
} from "./spain-localidades";
import {
  LOCALIDADES_BY_DISTRITO_PT,
  getGroupedLocalidadesPT,
} from "./portugal-localidades";
import { PROVINCIAS } from "./spain-provinces";
import { DISTRITOS_PT } from "./portugal-distritos";

export interface ZonaMatch {
  pais: "ES" | "PT";
  provinciaCode: string;
  provinciaName: string;
  level1: string;
  level2: string | null;
  cabecera: string;
  cabeceraCP: string;
  exact: boolean;
  aproximado: boolean;
}

const shortName = (name: string): string => {
  const idx = name.lastIndexOf(" · ");
  return idx >= 0 ? name.slice(idx + 3) : name;
};

const findGroupForLocalidad = (
  groups: ReturnType<typeof getGroupedLocalidades>,
  localidadName: string,
): { level1: string; level2: string | null } => {
  for (const g of groups) {
    for (const sg of g.subgroups) {
      if (sg.localidades.some((l) => l.name === localidadName)) {
        return { level1: g.level1, level2: sg.level2 };
      }
    }
  }
  return { level1: "Cobertura general", level2: null };
};

export function resolveZonaES(cp: string): ZonaMatch | null {
  if (!/^\d{5}$/.test(cp)) return null;
  const provCode = cp.slice(0, 2);
  const provincia = PROVINCIAS.find((p) => p.code === provCode);
  if (!provincia) return null;

  const list = LOCALIDADES_BY_PROVINCE[provCode] ?? [];
  if (list.length === 0) return null;

  const target = parseInt(cp, 10);

  // 1) Exact match within derived province
  let chosen: Localidad | undefined = list.find((l) => l.cp === cp);
  let exact = !!chosen;

  // 2) Nearest neighbour within same province
  if (!chosen) {
    let bestDiff = Infinity;
    for (const l of list) {
      const diff = Math.abs(parseInt(l.cp, 10) - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        chosen = l;
      }
    }
  }
  if (!chosen) return null;

  const groups = getGroupedLocalidades(provCode);
  const { level1, level2 } = findGroupForLocalidad(groups, chosen.name);

  return {
    pais: "ES",
    provinciaCode: provCode,
    provinciaName: provincia.name,
    level1,
    level2,
    cabecera: shortName(chosen.name),
    cabeceraCP: chosen.cp,
    exact,
    aproximado: !exact,
  };
}

const cpPT4 = (cp: string): number | null => {
  const m = cp.match(/^(\d{4})(-\d{3})?$/);
  return m ? parseInt(m[1], 10) : null;
};

const cabeceraNum = (cp: string): number => {
  const m = cp.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : NaN;
};

export function resolveZonaPT(cp: string, distritoCode?: string): ZonaMatch | null {
  const target = cpPT4(cp);
  if (target === null) return null;

  const scan = (
    dCode: string,
  ): { chosen: Localidad; exact: boolean; diff: number } | null => {
    const list = LOCALIDADES_BY_DISTRITO_PT[dCode] ?? [];
    if (!list.length) return null;
    let bestDiff = Infinity;
    let chosen: Localidad | undefined;
    let exact = false;
    for (const l of list) {
      const n = cabeceraNum(l.cp);
      if (!Number.isFinite(n)) continue;
      const diff = Math.abs(n - target);
      if (n === target) {
        chosen = l;
        exact = true;
        bestDiff = 0;
        break;
      }
      if (diff < bestDiff) {
        bestDiff = diff;
        chosen = l;
      }
    }
    return chosen ? { chosen, exact, diff: bestDiff } : null;
  };

  let dCode = distritoCode;
  let result: { chosen: Localidad; exact: boolean; diff: number } | null = null;

  if (dCode) {
    result = scan(dCode);
  } else {
    let best: { dCode: string; res: { chosen: Localidad; exact: boolean; diff: number } } | null = null;
    for (const d of DISTRITOS_PT) {
      const r = scan(d.code);
      if (!r) continue;
      if (!best || r.diff < best.res.diff) best = { dCode: d.code, res: r };
      if (r.exact) break;
    }
    if (best) {
      dCode = best.dCode;
      result = best.res;
    }
  }

  if (!dCode || !result) return null;

  const distrito = DISTRITOS_PT.find((d) => d.code === dCode);
  if (!distrito) return null;

  const groups = getGroupedLocalidadesPT(dCode);
  const { level1, level2 } = findGroupForLocalidad(groups, result.chosen.name);

  return {
    pais: "PT",
    provinciaCode: dCode,
    provinciaName: distrito.name,
    level1,
    level2,
    cabecera: shortName(result.chosen.name),
    cabeceraCP: result.chosen.cp,
    exact: result.exact,
    aproximado: !result.exact,
  };
}

export function resolveZona(
  pais: "ES" | "PT",
  cp: string,
  provincia?: string,
): ZonaMatch | null {
  if (pais === "ES") return resolveZonaES(cp);
  return resolveZonaPT(cp, provincia);
}
