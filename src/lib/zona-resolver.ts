/**
 * Resolvedor CP → Zona operativa WG (cobertura COMPLETA).
 * Índice exacto CP→zona sobre ZONAS_ES / ZONAS_PT; si un CP no está listado,
 * cae en la zona más cercana de su provincia (0 huérfanos).
 */
import { ZONAS_ES } from "./zonas-es";
import { ZONAS_PT } from "./zonas-pt";
import { PROVINCIAS } from "./spain-provinces";
import { DISTRITOS_PT } from "./portugal-distritos";

export interface ZonaMatch {
  pais: "ES" | "PT";
  provinciaCode: string;
  provinciaName: string;
  level1: string;
  level2: string;
  cabecera: string;
  cabeceraCP: string;
  card: string;
  exact: boolean;
  aproximado: boolean;
}
export interface ZonaExpandida {
  level1: string; level2: string; cabecera: string; card: string; cps: string[];
}

const expand3 = (prov: string, r: string): string[] => {
  const out: string[] = [];
  for (const part of r.split(",")) {
    const dash = part.indexOf("-");
    if (dash >= 0) {
      const a = parseInt(part.slice(0, dash), 10), b = parseInt(part.slice(dash + 1), 10);
      for (let i = a; i <= b; i++) out.push(prov + String(i).padStart(3, "0"));
    } else out.push(prov + part);
  }
  return out;
};
const expand4 = (r: string): string[] => {
  const out: string[] = [];
  for (const part of r.split(",")) {
    const dash = part.indexOf("-");
    if (dash >= 0) {
      const a = parseInt(part.slice(0, dash), 10), b = parseInt(part.slice(dash + 1), 10);
      for (let i = a; i <= b; i++) out.push(String(i).padStart(4, "0"));
    } else out.push(part);
  }
  return out;
};

let esIndex: Map<string, { prov: string; zi: number }> | null = null;
const esZones: Record<string, ZonaExpandida[]> = {};
const ensureES = () => {
  if (esIndex) return;
  esIndex = new Map();
  for (const prov in ZONAS_ES) {
    const exp: ZonaExpandida[] = [];
    ZONAS_ES[prov].forEach((z, zi) => {
      const cps = expand3(prov, z.r);
      exp.push({ level1: z.g, level2: z.c, cabecera: z.c, card: z.d, cps });
      for (const cp of cps) esIndex!.set(cp, { prov, zi });
    });
    esZones[prov] = exp;
  }
};

let ptIndex: Map<string, { dist: string; zi: number }> | null = null;
const ptZones: Record<string, ZonaExpandida[]> = {};
const ensurePT = () => {
  if (ptIndex) return;
  ptIndex = new Map();
  for (const dist in ZONAS_PT) {
    const exp: ZonaExpandida[] = [];
    ZONAS_PT[dist].forEach((z, zi) => {
      const prefixes = expand4(z.r);
      exp.push({ level1: z.g, level2: z.c, cabecera: z.c, card: z.d, cps: prefixes });
      for (const pref of prefixes) ptIndex!.set(pref, { dist, zi });
    });
    ptZones[dist] = exp;
  }
};

const mk = (pais: "ES" | "PT", code: string, name: string, z: ZonaExpandida, cp: string, exact: boolean): ZonaMatch => ({
  pais, provinciaCode: code, provinciaName: name,
  level1: z.level1, level2: z.level2, cabecera: z.cabecera, cabeceraCP: cp, card: z.card,
  exact, aproximado: !exact,
});

export function resolveZonaES(cp: string): ZonaMatch | null {
  if (!/^\d{5}$/.test(cp)) return null;
  ensureES();
  const prov = cp.slice(0, 2);
  const p = PROVINCIAS.find((x) => x.code === prov);
  if (!p) return null;
  const zs = esZones[prov];
  if (!zs || !zs.length) return null;
  const hit = esIndex!.get(cp);
  if (hit) return mk("ES", prov, p.name, esZones[hit.prov][hit.zi], cp, true);
  const target = parseInt(cp, 10);
  let best: ZonaExpandida | null = null, bestCP = "", bd = Infinity;
  for (const z of zs) for (const c of z.cps) {
    const d = Math.abs(parseInt(c, 10) - target);
    if (d < bd) { bd = d; best = z; bestCP = c; }
  }
  return best ? mk("ES", prov, p.name, best, bestCP, false) : null;
}

export function resolveZonaPT(cp: string, distritoCode?: string): ZonaMatch | null {
  const m = cp.match(/^(\d{4})(-\d{3})?$/);
  if (!m) return null;
  ensurePT();
  const pref = m[1];
  const hit = ptIndex!.get(pref);
  if (hit && (!distritoCode || hit.dist === distritoCode)) {
    const d = DISTRITOS_PT.find((x) => x.code === hit.dist);
    if (d) return mk("PT", hit.dist, d.name, ptZones[hit.dist][hit.zi], pref, true);
  }
  const target = parseInt(pref, 10);
  const dists = distritoCode ? [distritoCode] : Object.keys(ptZones);
  let best: ZonaExpandida | null = null, bestDist = "", bestPref = "", bd = Infinity;
  for (const dist of dists) for (const z of ptZones[dist] ?? []) for (const c of z.cps) {
    const d = Math.abs(parseInt(c, 10) - target);
    if (d < bd) { bd = d; best = z; bestDist = dist; bestPref = c; }
  }
  if (!best) return null;
  const dd = DISTRITOS_PT.find((x) => x.code === bestDist);
  return mk("PT", bestDist, dd?.name ?? bestDist, best, bestPref, bd === 0);
}

export function resolveZona(pais: "ES" | "PT", cp: string, provincia?: string): ZonaMatch | null {
  return pais === "ES" ? resolveZonaES(cp) : resolveZonaPT(cp, provincia);
}

export function getZonasES(provCode: string): ZonaExpandida[] { ensureES(); return esZones[provCode] ?? []; }
export function getZonasPT(distCode: string): ZonaExpandida[] { ensurePT(); return ptZones[distCode] ?? []; }
