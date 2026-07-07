#!/usr/bin/env node
/**
 * Genera public/cp-coords-es.json y public/cp-coords-pt.json (v2, coordenada robusta).
 * ES: coord por CP = fila de mayor 'accuracy' más cercana al centroide del vecindario
 *     (prefijo de 3 díg). Evita puntos fantasma del promedio ruidoso de GeoNames.
 * PT: prefijo de 4 díg, coord = mediana de sus filas.
 * Nombre = 'place' (ES) / concelho adm2 (PT), limpiado. Fuente: GeoNames (mirror symerio).
 * Formato: { munis: string[], cps: { [cp]: [lat, lng, muniIdx] } }
 */
import fs from "node:fs";
const SRC = {
  ES: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/ES.txt",
  PT: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/PT.txt",
};
async function load(cc) {
  const local = `${cc}.txt`, tmp = `/tmp/${cc}.txt`;
  let text;
  if (fs.existsSync(local)) text = fs.readFileSync(local, "utf8");
  else if (fs.existsSync(tmp)) text = fs.readFileSync(tmp, "utf8");
  else text = await (await fetch(SRC[cc])).text();
  const rows = [];
  for (const line of text.split("\n")) {
    const p = line.replace(/\r$/, "").split("\t");
    if (p.length < 12) continue;
    const lat = parseFloat(p[9]), lng = parseFloat(p[10]), acc = parseInt(p[11], 10) || 0;
    if (Number.isFinite(lat) && Number.isFinite(lng)) rows.push({ cp: p[1], place: p[2], adm2: p[5], lat, lng, acc });
  }
  return rows;
}
const R2 = Math.PI / 180;
function distKm(a, b) { const la = ((a[0] + b[0]) / 2) * R2; return 6371 * Math.hypot((b[1] - a[1]) * R2 * Math.cos(la), (b[0] - a[0]) * R2); }
const ART = new Set(["El","La","Los","Las","Els","Es","Sa","A","O","As","Os","L'","O'"]);
function clean(name) { name = (name || "").trim(); const i = name.lastIndexOf(", "); if (i >= 0) { const b = name.slice(0, i), a = name.slice(i + 2); if (ART.has(a) || a.endsWith("'")) name = a.endsWith("'") ? a + b : a + " " + b; } return name; }
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
function pack(unitMap) { const munis = [], idx = new Map(), cps = {}; for (const [k, u] of unitMap) { let mi = idx.get(u.muni); if (mi === undefined) { mi = munis.length; munis.push(u.muni); idx.set(u.muni, mi); } cps[k] = [r4(u.lat), r4(u.lng), mi]; } return { munis, cps }; }

function robustES(rows) {
  const byCp = new Map();
  for (const r of rows) { if (!byCp.has(r.cp)) byCp.set(r.cp, []); byCp.get(r.cp).push(r); }
  const prov = new Map();
  for (const [cp, rs] of byCp) { const b = rs.reduce((x, y) => (y.acc > x.acc ? y : x)); prov.set(cp, [b.lat, b.lng]); }
  const hood = new Map();
  for (const [cp, c] of prov) { const k = cp.slice(0, 3); if (!hood.has(k)) hood.set(k, []); hood.get(k).push(c); }
  for (const [k, v] of hood) hood.set(k, [v.reduce((a, x) => a + x[0], 0) / v.length, v.reduce((a, x) => a + x[1], 0) / v.length]);
  const out = new Map();
  for (const [cp, rs] of byCp) {
    const mx = Math.max(...rs.map((r) => r.acc));
    const cands = rs.filter((r) => r.acc === mx);
    const h = hood.get(cp.slice(0, 3));
    const b = cands.reduce((x, y) => (distKm([y.lat, y.lng], h) < distKm([x.lat, x.lng], h) ? y : x));
    out.set(cp, { lat: b.lat, lng: b.lng, muni: clean(b.place) });
  }
  return out;
}
function robustPT(rows) {
  const byPref = new Map();
  for (const r of rows) { const pref = r.cp.slice(0, 4); if (!/^\d{4}$/.test(pref)) continue; if (!byPref.has(pref)) byPref.set(pref, []); byPref.get(pref).push(r); }
  const out = new Map();
  for (const [pref, rs] of byPref) {
    const lat = median(rs.map((r) => r.lat)), lng = median(rs.map((r) => r.lng));
    const c = new Map(); for (const r of rs) { const n = clean(r.adm2 || r.place); if (n) c.set(n, (c.get(n) || 0) + 1); }
    let muni = "", bc = -1; for (const [k, v] of c) if (v > bc) { bc = v; muni = k; }
    out.set(pref, { lat, lng, muni });
  }
  return out;
}
(async () => {
  const es = pack(robustES(await load("ES")));
  const pt = pack(robustPT(await load("PT")));
  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/cp-coords-es.json", JSON.stringify(es));
  fs.writeFileSync("public/cp-coords-pt.json", JSON.stringify(pt));
  console.log(`ES: ${Object.keys(es.cps).length} CP · ${es.munis.length} localidades`);
  console.log(`PT: ${Object.keys(pt.cps).length} prefijos · ${pt.munis.length} concelhos`);
})();
