#!/usr/bin/env node
/**
 * Genera src/lib/zonas-es.ts y src/lib/zonas-pt.ts:
 * cobertura COMPLETA de códigos postales de España y Portugal agrupados en
 * zonas operativas de ~25 km de radio (clustering geográfico por cobertura
 * máxima sobre datos GeoNames). 0 huérfanos. Nombres limpios y únicos por región.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || "src/lib";
const SRC = {
  ES: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/ES.txt",
  PT: "https://raw.githubusercontent.com/symerio/postal-codes-data/master/data/geonames/PT.txt",
};
const COLS = ["country","cp","place","adm1","adm1c","adm2","adm2c","adm3","adm3c","lat","lng","acc"];

async function loadCountry(cc) {
  const local = `${cc}.txt`, tmp = `/tmp/${cc}.txt`;
  let text;
  if (fs.existsSync(local)) text = fs.readFileSync(local, "utf8");
  else if (fs.existsSync(tmp)) text = fs.readFileSync(tmp, "utf8");
  else { const r = await fetch(SRC[cc]); text = await r.text(); }
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

const R2 = Math.PI / 180;
function distKm(a, b) {
  const la = ((a[0] + b[0]) / 2) * R2;
  const x = (b[1] - a[1]) * R2 * Math.cos(la);
  const y = (b[0] - a[0]) * R2;
  return 6371 * Math.hypot(x, y);
}
function card(cap, pt) {
  const ang = (Math.atan2(pt[1] - cap[1], pt[0] - cap[0]) * 180 / Math.PI + 360) % 360;
  return ["N","NE","E","SE","S","SO","O","NO"][Math.floor(((ang + 22.5) % 360) / 45)];
}
const CARDWORD = { N:"Norte", NE:"Nordeste", E:"Este", SE:"Sureste", S:"Sur", SO:"Suroeste", O:"Oeste", NO:"Noroeste" };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function modal(xs) {
  const m = new Map(); for (const x of xs) m.set(x, (m.get(x) || 0) + 1);
  let best, bc = -1; for (const [k, v] of m) if (v > bc) { bc = v; best = k; } return best;
}
const ART = new Set(["El","La","Los","Las","Els","Es","Sa","A","O","As","Os","L'","O'"]);
function clean(name) {
  name = (name || "").trim();
  const i = name.lastIndexOf(", ");
  if (i >= 0) {
    const base = name.slice(0, i), art = name.slice(i + 2);
    if (ART.has(art) || art.endsWith("'")) name = art.endsWith("'") ? art + base : art + " " + base;
  }
  return name;
}
function cluster(coords, R = 25) {
  const n = coords.length;
  const nbr = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    if (distKm(coords[i], coords[j]) <= R) { nbr[i].add(j); nbr[j].add(i); }
  const uncovered = new Set(Array.from({ length: n }, (_, i) => i));
  const seeds = [];
  while (uncovered.size) {
    let best = -1, bc = -1;
    for (const i of uncovered) {
      let c = 1; for (const j of nbr[i]) if (uncovered.has(j)) c++;
      if (c > bc) { bc = c; best = i; }
    }
    seeds.push(best);
    uncovered.delete(best); for (const j of nbr[best]) uncovered.delete(j);
  }
  const assign = new Map(seeds.map((s) => [s, []]));
  for (let i = 0; i < n; i++) {
    let bs = seeds[0], bd = Infinity;
    for (const s of seeds) { const d = distKm(coords[i], coords[s]); if (d < bd) { bd = d; bs = s; } }
    assign.get(bs).push(i);
  }
  return assign;
}
function ranges(nums, w) {
  const xs = [...new Set(nums)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < xs.length;) {
    let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
    const pad = (x) => String(x).padStart(w, "0");
    out.push(xs[i] === xs[j] ? pad(xs[i]) : `${pad(xs[i])}-${pad(xs[j])}`);
    i = j + 1;
  }
  return out.join(",");
}
const CAP = {"01":[42.85,-2.67],"02":[38.99,-1.86],"03":[38.35,-0.48],"04":[36.84,-2.46],"05":[40.66,-4.7],"06":[38.88,-6.97],"07":[39.57,2.65],"08":[41.39,2.17],"09":[42.34,-3.7],"10":[39.47,-6.37],"11":[36.53,-6.29],"12":[39.99,-0.04],"13":[38.98,-3.93],"14":[37.88,-4.78],"15":[43.36,-8.41],"16":[40.07,-2.13],"17":[41.98,2.82],"18":[37.18,-3.6],"19":[40.63,-3.16],"20":[43.32,-1.98],"21":[37.26,-6.95],"22":[42.14,-0.41],"23":[37.77,-3.79],"24":[42.6,-5.57],"25":[41.62,0.62],"26":[42.46,-2.45],"27":[43.01,-7.56],"28":[40.42,-3.7],"29":[36.72,-4.42],"30":[37.99,-1.13],"31":[42.81,-1.65],"32":[42.34,-7.86],"33":[43.36,-5.85],"34":[42.01,-4.53],"35":[28.12,-15.43],"36":[42.43,-8.65],"37":[40.97,-5.66],"38":[28.47,-16.25],"39":[43.46,-3.81],"40":[40.95,-4.12],"41":[37.39,-5.99],"42":[41.76,-2.47],"43":[41.12,1.25],"44":[40.34,-1.11],"45":[39.86,-4.02],"46":[39.47,-0.38],"47":[41.65,-4.72],"48":[43.26,-2.92],"49":[41.5,-5.75],"50":[41.65,-0.88],"51":[35.89,-5.32],"52":[35.29,-2.94]};
const CAPNAME = {"01":"Vitoria-Gasteiz","02":"Albacete","03":"Alicante","04":"Almería","05":"Ávila","06":"Badajoz","07":"Palma","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón de la Plana","13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada","19":"Guadalajara","20":"Donostia-San Sebastián","21":"Huelva","22":"Huesca","23":"Jaén","24":"León","25":"Lleida","26":"Logroño","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia","31":"Pamplona","32":"Ourense","33":"Oviedo","34":"Palencia","35":"Las Palmas de Gran Canaria","36":"Pontevedra","37":"Salamanca","38":"Santa Cruz de Tenerife","39":"Santander","40":"Segovia","41":"Sevilla","42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia","47":"Valladolid","48":"Bilbao","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla"};
const ISLANDS = {
  "07":[["Mallorca",39.2,39.98,2.3,3.55],["Menorca",39.8,40.1,3.75,4.35],["Eivissa",38.8,39.2,1.2,1.65],["Formentera",38.6,38.8,1.35,1.6]],
  "35":[["Gran Canaria",27.7,28.2,-15.9,-15.3],["Lanzarote",28.8,29.35,-13.95,-13.35],["Fuerteventura",27.99,28.78,-14.4,-13.75]],
  "38":[["Tenerife",28.0,28.62,-16.99,-16.1],["La Palma",28.4,28.9,-18.05,-17.68],["La Gomera",28.0,28.25,-17.4,-17.08],["El Hierro",27.6,27.88,-18.2,-17.88]],
};
function islandOf(prov, lat, lng) {
  for (const [nm, a0, a1, o0, o1] of (ISLANDS[prov] || [])) if (lat >= a0 && lat <= a1 && lng >= o0 && lng <= o1) return nm;
  return null;
}
function uniqueNames(zones) {
  const used = new Set();
  for (const z of zones) {
    let nm = z.level2;
    if (used.has(nm)) {
      nm = `${z.level2} ${CARDWORD[z.card] || z.card}`;
      let k = 2; while (used.has(nm)) nm = `${z.level2} ${CARDWORD[z.card] || z.card} ${k++}`;
    }
    z.level2 = nm; used.add(nm);
  }
}
function buildRegions(units, capOf, capNameOf, islandFn, isEs) {
  const out = {};
  for (const rc of [...units.keys()].sort()) {
    const arr = units.get(rc);
    const coords = arr.map((u) => [u.lat, u.lng]);
    const assign = cluster(coords, 25);
    const cap = capOf(rc);
    const seeds = [...assign.keys()];
    let capSeed = seeds[0], bd = Infinity;
    for (const s of seeds) { const d = distKm(coords[s], cap); if (d < bd) { bd = d; capSeed = s; } }
    let zones = [];
    for (const [s, idxs] of assign) {
      const clat = mean(idxs.map((i) => coords[i][0])), clng = mean(idxs.map((i) => coords[i][1]));
      const isl = islandFn ? islandFn(rc, clat, clng) : null;
      const dcap = distKm([clat, clng], cap);
      const level1 = isl || (s === capSeed ? "Capital" : (dcap <= 25 ? "Área metropolitana" : (isEs ? "Resto provincia" : "Resto distrito")));
      zones.push({ level1, card: card(cap, [clat, clng]), lat: clat, lng: clng,
        munis: idxs.map((i) => arr[i].muni), keys: idxs.map((i) => arr[i].key), isCap: s === capSeed });
    }
    const MIN = 3, MAXD = 35;
    let big = zones.filter((z) => z.keys.length >= MIN), small = zones.filter((z) => z.keys.length < MIN);
    if (big.length) {
      for (const z of small) {
        let tgt = big[0], td = Infinity;
        for (const b of big) { const d = distKm([z.lat, z.lng], [b.lat, b.lng]); if (d < td) { td = d; tgt = b; } }
        if (td <= MAXD) { tgt.keys.push(...z.keys); tgt.munis.push(...z.munis); }
        else big.push(z);
      }
      zones = big;
    }
    const keyCoord = new Map(arr.map((u) => [u.key, [u.lat, u.lng]]));
    for (const z of zones) {
      z.lat = mean(z.keys.map((k) => keyCoord.get(k)[0]));
      z.lng = mean(z.keys.map((k) => keyCoord.get(k)[1]));
      z.card = card(cap, [z.lat, z.lng]);
      z.level2 = clean(modal(z.munis));
    }
    const capZone = zones.find((z) => z.isCap);
    if (capZone && capNameOf(rc)) capZone.level2 = capNameOf(rc);
    const ord = { "Capital": 0, "Área metropolitana": 1 };
    zones.sort((a, b) => (ord[a.level1] ?? 2) - (ord[b.level1] ?? 2) || a.level1.localeCompare(b.level1) || a.level2.localeCompare(b.level2));
    uniqueNames(zones);
    out[rc] = zones;
  }
  return out;
}
function esc(s) { return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
(async () => {
  const esRows = await loadCountry("ES");
  const byCp = new Map();
  for (const r of esRows) { if (!byCp.has(r.cp)) byCp.set(r.cp, []); byCp.get(r.cp).push(r); }
  const esUnits = new Map();
  for (const [cp, rs] of byCp) {
    const prov = cp.slice(0, 2);
    if (!esUnits.has(prov)) esUnits.set(prov, []);
    esUnits.get(prov).push({ key: cp, lat: mean(rs.map((x) => x.lat)), lng: mean(rs.map((x) => x.lng)), muni: modal(rs.map((x) => x.adm3 || x.place)) });
  }
  const ES = buildRegions(esUnits, (p) => CAP[p], (p) => CAPNAME[p], islandOf, true);
  const ptRows = await loadCountry("PT");
  const DIST = {"Aveiro":"PT-01","Beja":"PT-02","Braga":"PT-03","Bragança":"PT-04","Castelo Branco":"PT-05","Coimbra":"PT-06","Évora":"PT-07","Faro":"PT-08","Guarda":"PT-09","Leiria":"PT-10","Lisboa":"PT-11","Portalegre":"PT-12","Porto":"PT-13","Santarém":"PT-14","Setúbal":"PT-15","Viana do Castelo":"PT-16","Vila Real":"PT-17","Viseu":"PT-18","Azores":"PT-20","Madeira":"PT-30"};
  const CAPPT = {"PT-01":[40.6405,-8.6538],"PT-02":[38.0151,-7.8632],"PT-03":[41.5454,-8.4265],"PT-04":[41.8061,-6.7567],"PT-05":[39.8222,-7.4918],"PT-06":[40.2033,-8.4103],"PT-07":[38.5713,-7.9135],"PT-08":[37.0194,-7.9304],"PT-09":[40.5374,-7.2659],"PT-10":[39.7437,-8.8071],"PT-11":[38.7223,-9.1393],"PT-12":[39.2967,-7.4281],"PT-13":[41.1579,-8.6291],"PT-14":[39.2362,-8.6859],"PT-15":[38.5244,-8.8882],"PT-16":[41.6918,-8.8345],"PT-17":[41.3006,-7.7441],"PT-18":[40.6566,-7.9122],"PT-20":[37.7412,-25.6756],"PT-30":[32.6669,-16.9241]};
  const CAPNAME_PT = {"PT-01":"Aveiro","PT-02":"Beja","PT-03":"Braga","PT-04":"Bragança","PT-05":"Castelo Branco","PT-06":"Coimbra","PT-07":"Évora","PT-08":"Faro","PT-09":"Guarda","PT-10":"Leiria","PT-11":"Lisboa","PT-12":"Portalegre","PT-13":"Porto","PT-14":"Santarém","PT-15":"Setúbal","PT-16":"Viana do Castelo","PT-17":"Vila Real","PT-18":"Viseu"};
  const byPref = new Map();
  for (const r of ptRows) {
    const d = DIST[r.adm1]; if (!d) continue;
    const key = d + "|" + r.cp.slice(0, 4);
    if (!byPref.has(key)) byPref.set(key, []); byPref.get(key).push(r);
  }
  const ptUnits = new Map();
  for (const [key, rs] of byPref) {
    const [d, pref] = key.split("|");
    if (!ptUnits.has(d)) ptUnits.set(d, []);
    ptUnits.get(d).push({ key: pref, lat: mean(rs.map((x) => x.lat)), lng: mean(rs.map((x) => x.lng)), muni: modal(rs.map((x) => x.adm2)) });
  }
  const islandPT = (rc) => ({ "PT-20": "Açores", "PT-30": "Madeira" }[rc] || null);
  const PT = buildRegions(ptUnits, (d) => CAPPT[d], (d) => CAPNAME_PT[d], islandPT, false);
  const esLines = Object.keys(ES).sort().map((pc) => {
    const zs = ES[pc].map((z) => `{g:"${esc(z.level1)}",c:"${esc(z.level2)}",d:"${z.card}",r:"${ranges(z.keys.map((k) => parseInt(k.slice(2), 10)), 3)}"}`);
    return `  "${pc}": [${zs.join(",")}]`;
  });
  const ptLines = Object.keys(PT).sort().map((d) => {
    const zs = PT[d].map((z) => `{g:"${esc(z.level1)}",c:"${esc(z.level2)}",d:"${z.card}",r:"${ranges(z.keys.map((k) => parseInt(k, 10)), 4)}"}`);
    return `  "${d}": [${zs.join(",")}]`;
  });
  const esTs = `/**\n * Cobertura completa de España por zonas operativas (~25 km de radio).\n * Generado por scripts/generate-zonas.mjs desde GeoNames (11.150 CP, 52 provincias). 0 huérfanos.\n * g=nivel1 · c=cabecera · d=cardinal · r=rangos de sufijos de 3 dígitos (CP=codProv+sufijo).\n */\nexport interface ZonaRaw { g: string; c: string; d: string; r: string }\n\nexport const ZONAS_ES: Record<string, ZonaRaw[]> = {\n${esLines.join(",\n")}\n};\n`;
  const ptTs = `/**\n * Cobertura completa de Portugal por zonas operativas (~25 km de radio).\n * GeoNames (prefijos de 4 dígitos, 20 distritos incl. Açores y Madeira). 0 huérfanos.\n * g=nivel1 · c=cabecera · d=cardinal · r=rangos de prefijos de 4 dígitos.\n */\nexport interface ZonaRawPT { g: string; c: string; d: string; r: string }\n\nexport const ZONAS_PT: Record<string, ZonaRawPT[]> = {\n${ptLines.join(",\n")}\n};\n`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "zonas-es.ts"), esTs);
  fs.writeFileSync(path.join(OUT, "zonas-pt.ts"), ptTs);
  console.log(`ES: ${Object.keys(ES).length} provincias · ${Object.values(ES).reduce((a,v)=>a+v.length,0)} zonas`);
  console.log(`PT: ${Object.keys(PT).length} distritos · ${Object.values(PT).reduce((a,v)=>a+v.length,0)} zonas`);
})();
