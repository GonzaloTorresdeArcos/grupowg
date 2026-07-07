#!/usr/bin/env node
/**
 * Coverage audit: parses spain-localidades.ts and portugal-localidades.ts
 * literal data, plus PREFIX_GROUPING maps, to produce docs/coverage-audit.md.
 *
 * Node puro. Sin dependencias.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const readFile = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ─── Parse localidades: extract Record entries "CODE": [ {name, cp} ... ] ───
function parseLocalidades(src) {
  const out = {}; // code -> [{name,cp}]
  // Match a block: "CODE": [ ... ],  (top-level in the record)
  const re = /"(PT-\d{2}|\d{2})"\s*:\s*\[([\s\S]*?)\n\s{2}\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const code = m[1];
    const body = m[2];
    const items = [];
    const itemRe = /\{\s*name:\s*"([^"]+)"\s*,\s*cp:\s*"([^"]+)"\s*\}/g;
    let im;
    while ((im = itemRe.exec(body)) !== null) {
      items.push({ name: im[1], cp: im[2] });
    }
    if (items.length) out[code] = items;
  }
  return out;
}

// ─── Parse PREFIX_GROUPING map to compute L1/L2 for each locality ───
function parsePrefixGrouping(src, varName) {
  const start = src.indexOf(`const ${varName}`);
  if (start < 0) return {};
  const open = src.indexOf("{", start);
  // find matching close brace
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return {};
  const body = src.slice(open + 1, end);
  const out = {};
  const re = /"([^"]+)"\s*:\s*\{\s*level1:\s*"([^"]+)"(?:\s*,\s*level2:\s*"([^"]+)")?\s*\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out[m[1]] = { level1: m[2], level2: m[3] || null };
  }
  return out;
}

function groupFor(name, mapping) {
  const idx = name.indexOf(" · ");
  if (idx < 0) return { level1: "Localidades", level2: null };
  const prefix = name.slice(0, idx);
  if (mapping[prefix]) return mapping[prefix];
  // PT can have multi-segment prefix: try progressively shorter
  const parts = name.split(" · ");
  for (let i = parts.length - 1; i >= 1; i--) {
    const pfx = parts.slice(0, i).join(" · ");
    if (mapping[pfx]) return mapping[pfx];
  }
  return { level1: prefix, level2: null };
}

function auditRegion(code, items, mapping, opts) {
  const l1set = new Set();
  const l2set = new Set();
  const cpSet = new Set();
  const cross = [];
  for (const it of items) {
    const g = groupFor(it.name, mapping);
    l1set.add(g.level1);
    if (g.level2) l2set.add(`${g.level1}::${g.level2}`);
    cpSet.add(it.cp);
    if (opts.pais === "ES") {
      const cpProv = it.cp.slice(0, 2);
      if (cpProv !== code) cross.push({ name: it.name, cp: it.cp, listedIn: code, cpProv });
    }
  }
  return {
    code,
    localidades: items.length,
    l1: l1set.size,
    l2: l2set.size,
    cps: cpSet.size,
    flat: l2set.size === 0,
    thin: l1set.size < 3,
    cross,
  };
}

const esSrc = readFile("src/lib/spain-localidades.ts");
const ptSrc = readFile("src/lib/portugal-localidades.ts");
const esData = parseLocalidades(esSrc);
const ptData = parseLocalidades(ptSrc);
const esMap = parsePrefixGrouping(esSrc, "PREFIX_GROUPING");
const ptMap = parsePrefixGrouping(ptSrc, "PREFIX_GROUPING_PT");

// Load province/district names
const provSrc = readFile("src/lib/spain-provinces.ts");
const distSrc = readFile("src/lib/portugal-distritos.ts");
const nameOf = {};
{
  const re = /code:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(provSrc)) !== null) nameOf[m[1]] = m[2];
  while ((m = re.exec(distSrc)) !== null) nameOf[m[1]] = m[2];
}

const esRows = Object.keys(esData).sort().map((c) =>
  auditRegion(c, esData[c], esMap, { pais: "ES" }),
);
const ptRows = Object.keys(ptData).sort().map((c) =>
  auditRegion(c, ptData[c], ptMap, { pais: "PT" }),
);

const totalES = esRows.reduce(
  (a, r) => ({ loc: a.loc + r.localidades, l1: a.l1 + r.l1, l2: a.l2 + r.l2, cps: a.cps + r.cps }),
  { loc: 0, l1: 0, l2: 0, cps: 0 },
);
const totalPT = ptRows.reduce(
  (a, r) => ({ loc: a.loc + r.localidades, l1: a.l1 + r.l1, l2: a.l2 + r.l2, cps: a.cps + r.cps }),
  { loc: 0, l1: 0, l2: 0, cps: 0 },
);

const provCount = Object.keys(esData).length;
const distCount = Object.keys(ptData).length;

const flat = [...esRows, ...ptRows].filter((r) => r.flat || r.thin);
const cross = esRows.flatMap((r) => r.cross);
const thinnest = [...esRows, ...ptRows].sort((a, b) => a.l1 - b.l1).slice(0, 10);

const md = [];
md.push("# Auditoría de cobertura WG");
md.push("");
md.push(`> Generado por \`scripts/coverage-audit.mjs\` el ${new Date().toISOString()}`);
md.push("");
md.push("## Resumen");
md.push("");
md.push(`- **España**: ${provCount} provincias · ${totalES.loc} localidades · ${totalES.l1} zonas L1 · ${totalES.l2} subzonas L2 · ${totalES.cps} CPs distintos`);
md.push(`- **Portugal**: ${distCount} distritos · ${totalPT.loc} localidades · ${totalPT.l1} zonas L1 · ${totalPT.l2} subzonas L2 · ${totalPT.cps} CPs distintos`);
md.push(`- **Flags**: ${flat.length} regiones con estructura plana o <3 zonas · ${cross.length} CPs transfronterizos (ES)`);
md.push("");
md.push("## España (por provincia)");
md.push("");
md.push("| Código | Provincia | Localidades | L1 | L2 | CPs | Flags |");
md.push("|---|---|---:|---:|---:|---:|---|");
for (const r of esRows) {
  const flags = [r.flat ? "plana" : null, r.thin ? "<3 zonas" : null].filter(Boolean).join(", ") || "—";
  md.push(`| ${r.code} | ${nameOf[r.code] ?? "?"} | ${r.localidades} | ${r.l1} | ${r.l2} | ${r.cps} | ${flags} |`);
}
md.push("");
md.push("## Portugal (por distrito)");
md.push("");
md.push("| Código | Distrito | Localidades | L1 | L2 | CPs | Flags |");
md.push("|---|---|---:|---:|---:|---:|---|");
for (const r of ptRows) {
  const flags = [r.flat ? "plana" : null, r.thin ? "<3 zonas" : null].filter(Boolean).join(", ") || "—";
  md.push(`| ${r.code} | ${nameOf[r.code] ?? "?"} | ${r.localidades} | ${r.l1} | ${r.l2} | ${r.cps} | ${flags} |`);
}
md.push("");
md.push("## Flags");
md.push("");
md.push("### Regiones más delgadas (menor nº de zonas L1)");
md.push("");
md.push("| Código | Nombre | L1 | L2 | Localidades |");
md.push("|---|---|---:|---:|---:|");
for (const r of thinnest) md.push(`| ${r.code} | ${nameOf[r.code] ?? "?"} | ${r.l1} | ${r.l2} | ${r.localidades} |`);
md.push("");
md.push("### CPs transfronterizos (ES)");
md.push("");
md.push("Cabeceras listadas en una provincia cuyo CP pertenece a otra (por convenio operativo).");
md.push("");
if (cross.length === 0) {
  md.push("_Ninguno._");
} else {
  md.push("| Listado en | Prov. real (CP) | CP | Localidad |");
  md.push("|---|---|---|---|");
  for (const c of cross) {
    md.push(`| ${c.listedIn} ${nameOf[c.listedIn] ?? ""} | ${c.cpProv} ${nameOf[c.cpProv] ?? ""} | ${c.cp} | ${c.name} |`);
  }
}
md.push("");

const outPath = path.join(ROOT, "docs/coverage-audit.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md.join("\n"));

console.log("== Coverage audit ==");
console.log(`ES: ${provCount} provincias · ${totalES.loc} localidades · ${totalES.l1} L1 · ${totalES.l2} L2 · ${totalES.cps} CPs`);
console.log(`PT: ${distCount} distritos · ${totalPT.loc} localidades · ${totalPT.l1} L1 · ${totalPT.l2} L2 · ${totalPT.cps} CPs`);
console.log(`Flags: ${flat.length} regiones planas/<3 zonas · ${cross.length} CPs transfronterizos (ES)`);
if (flat.length) {
  console.log("\nPlanas / <3 zonas:");
  for (const r of flat) console.log(`  ${r.code} ${nameOf[r.code] ?? ""}: L1=${r.l1} L2=${r.l2}`);
}
if (cross.length) {
  console.log("\nCPs transfronterizos:");
  for (const c of cross) console.log(`  ${c.listedIn}→${c.cpProv}  ${c.cp}  ${c.name}`);
}
console.log(`\nEscrito: docs/coverage-audit.md`);
