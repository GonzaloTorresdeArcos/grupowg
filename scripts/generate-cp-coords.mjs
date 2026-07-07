#!/usr/bin/env node
/**
 * Genera public/cp-coords-es.json y public/cp-coords-pt.json:
 * coordenadas por código postal (ES, 5 díg) / prefijo de 4 díg (PT) para la
 * calculadora de cobertura por radio. Fuente: GeoNames (mirror symerio).
 * Formato: { munis: string[], cps: { [cp]: [lat, lng, muniIdx] } }
 */
import fs from "node:fs";

const SRC = {
  ES: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/ES.txt",
  PT: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/PT.txt",
};
const COLS = ["country","cp","place","adm1","adm1c","adm2","adm2c","adm3","adm3c","lat","lng","acc"];

async function load(cc) {
  const local = `${cc}.txt`, tmp = `/tmp/${cc}.txt`;
  let text;
  if (fs.existsSync(local)) text = fs.readFileSync(local, "utf8");
  else if (fs.existsSync(tmp)) text = fs.readFileSync(tmp, "utf8");
  else text = await (await fetch(SRC[cc])).text();
  const rows = [];
  for (const line of text.split("\n")) {
    const p = line.replace(/\r$/, "").split("\t");
    if (p.length < 11) continue;
    const d = {}; COLS.forEach((c, i) => (d[c] = p[i]));
    d.lat = parseFloat(d.lat); d.lng = parseFloat(d.lng);
    if (Number.isFinite(d.lat) && Number.isFinite(d.lng)) rows.push(d);
  }
  return rows;
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function modal(xs) { const m = new Map(); for (const x of xs) { if (!x) continue; m.set(x, (m.get(x) || 0) + 1); } let b, bc = -1; for (const [k, v] of m) if (v > bc) { bc = v; b = k; } return b || ""; }
const ART = new Set(["El","La","Los","Las","Els","Es","Sa","A","O","As","Os","L'","O'"]);
function clean(name) { name = (name || "").trim(); const i = name.lastIndexOf(", "); if (i >= 0) { const base = name.slice(0, i), art = name.slice(i + 2); if (ART.has(art) || art.endsWith("'")) name = art.endsWith("'") ? art + base : art + " " + base; } return name; }
const r4 = (x) => Math.round(x * 1e4) / 1e4;

function pack(unitMap) {
  const munis = [], idx = new Map(), cps = {};
  for (const [key, u] of unitMap) {
    let mi = idx.get(u.muni);
    if (mi === undefined) { mi = munis.length; munis.push(u.muni); idx.set(u.muni, mi); }
    cps[key] = [r4(u.lat), r4(u.lng), mi];
  }
  return { munis, cps };
}

(async () => {
  const esRows = await load("ES");
  const byCp = new Map();
  for (const r of esRows) { if (!byCp.has(r.cp)) byCp.set(r.cp, []); byCp.get(r.cp).push(r); }
  const esUnits = new Map();
  for (const [cp, rs] of byCp) esUnits.set(cp, { lat: mean(rs.map((x) => x.lat)), lng: mean(rs.map((x) => x.lng)), muni: clean(modal(rs.map((x) => x.adm3 || x.place))) });
  const es = pack(esUnits);

  const ptRows = await load("PT");
  const byPref = new Map();
  for (const r of ptRows) { const pref = r.cp.slice(0, 4); if (!/^\d{4}$/.test(pref)) continue; if (!byPref.has(pref)) byPref.set(pref, []); byPref.get(pref).push(r); }
  const ptUnits = new Map();
  for (const [pref, rs] of byPref) ptUnits.set(pref, { lat: mean(rs.map((x) => x.lat)), lng: mean(rs.map((x) => x.lng)), muni: clean(modal(rs.map((x) => x.adm2 || x.adm3))) });
  const pt = pack(ptUnits);

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/cp-coords-es.json", JSON.stringify(es));
  fs.writeFileSync("public/cp-coords-pt.json", JSON.stringify(pt));
  console.log(`ES: ${Object.keys(es.cps).length} CP · ${es.munis.length} municipios`);
  console.log(`PT: ${Object.keys(pt.cps).length} prefijos · ${pt.munis.length} concelhos`);
})();
