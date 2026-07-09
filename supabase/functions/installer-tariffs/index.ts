import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// CONFIDENCIAL — no exponer. Tarifas instalador (Carrefour -10%) por provincia + volumen campaña AA.
const NATIONAL_FALLBACK = { T1: 237, T2: 289, "2X1": 349, "3X1": 498 } as const;

type Row = { n: string; vol: number; T1: number | null; T2: number | null; "2X1": number | null; "3X1": number | null };

const INSTALLER_TARIFFS: Record<string, Row> = {"01":{"n":"Álava","vol":6,"T1":356,"T2":405,"2X1":629,"3X1":1078},"02":{"n":"Albacete","vol":73,"T1":197,"T2":230,"2X1":349,"3X1":490},"03":{"n":"Alicante","vol":6,"T1":170,"T2":219,"2X1":252,"3X1":341},"04":{"n":"Almería","vol":0,"T1":170,"T2":219,"2X1":252,"3X1":341},"05":{"n":"Ávila","vol":27,"T1":200,"T2":252,"2X1":468,"3X1":691},"06":{"n":"Badajoz","vol":0,"T1":178,"T2":226,"2X1":260,"3X1":349},"07":{"n":"Baleares","vol":311,"T1":208,"T2":257,"2X1":379,"3X1":483},"08":{"n":"Barcelona","vol":191,"T1":242,"T2":289,"2X1":324,"3X1":413},"09":{"n":"Burgos","vol":11,"T1":324,"T2":379,"2X1":594,"3X1":951},"10":{"n":"Cáceres","vol":2,"T1":178,"T2":226,"2X1":260,"3X1":349},"11":{"n":"Cádiz","vol":2,"T1":170,"T2":219,"2X1":252,"3X1":341},"12":{"n":"Castellón","vol":2,"T1":185,"T2":234,"2X1":267,"3X1":341},"13":{"n":"Ciudad Real","vol":257,"T1":197,"T2":230,"2X1":349,"3X1":498},"14":{"n":"Córdoba","vol":1,"T1":170,"T2":219,"2X1":252,"3X1":341},"15":{"n":"A Coruña","vol":10,"T1":260,"T2":304,"2X1":475,"3X1":750},"16":{"n":"Cuenca","vol":33,"T1":237,"T2":289,"2X1":379,"3X1":520},"17":{"n":"Girona","vol":41,"T1":242,"T2":289,"2X1":324,"3X1":413},"18":{"n":"Granada","vol":9,"T1":170,"T2":219,"2X1":252,"3X1":341},"19":{"n":"Guadalajara","vol":38,"T1":null,"T2":null,"2X1":null,"3X1":null},"20":{"n":"Gipuzkoa","vol":19,"T1":356,"T2":405,"2X1":629,"3X1":1078},"21":{"n":"Huelva","vol":0,"T1":170,"T2":219,"2X1":252,"3X1":341},"22":{"n":"Huesca","vol":94,"T1":267,"T2":312,"2X1":438,"3X1":477},"23":{"n":"Jaén","vol":0,"T1":170,"T2":219,"2X1":252,"3X1":341},"24":{"n":"León","vol":20,"T1":267,"T2":312,"2X1":505,"3X1":803},"25":{"n":"Lleida","vol":0,"T1":252,"T2":300,"2X1":334,"3X1":423},"26":{"n":"La Rioja","vol":9,"T1":264,"T2":312,"2X1":565,"3X1":1041},"27":{"n":"Lugo","vol":1,"T1":260,"T2":304,"2X1":408,"3X1":587},"28":{"n":"Madrid","vol":2028,"T1":200,"T2":252,"2X1":260,"3X1":505},"29":{"n":"Málaga","vol":2,"T1":170,"T2":219,"2X1":252,"3X1":341},"30":{"n":"Murcia","vol":1,"T1":170,"T2":219,"2X1":252,"3X1":341},"31":{"n":"Navarra","vol":27,"T1":284,"T2":332,"2X1":520,"3X1":1041},"32":{"n":"Ourense","vol":24,"T1":260,"T2":304,"2X1":408,"3X1":587},"33":{"n":"Asturias","vol":8,"T1":260,"T2":304,"2X1":498,"3X1":1078},"34":{"n":"Palencia","vol":18,"T1":260,"T2":304,"2X1":475,"3X1":803},"35":{"n":"Las Palmas","vol":35,"T1":200,"T2":252,"2X1":334,"3X1":502},"36":{"n":"Pontevedra","vol":25,"T1":260,"T2":304,"2X1":475,"3X1":676},"37":{"n":"Salamanca","vol":41,"T1":267,"T2":312,"2X1":495,"3X1":822},"38":{"n":"S.C. Tenerife","vol":9,"T1":200,"T2":252,"2X1":334,"3X1":502},"39":{"n":"Cantabria","vol":12,"T1":319,"T2":364,"2X1":512,"3X1":825},"40":{"n":"Segovia","vol":78,"T1":267,"T2":312,"2X1":495,"3X1":822},"41":{"n":"Sevilla","vol":1,"T1":170,"T2":219,"2X1":252,"3X1":341},"43":{"n":"Tarragona","vol":31,"T1":252,"T2":300,"2X1":334,"3X1":423},"44":{"n":"Teruel","vol":3,"T1":null,"T2":null,"2X1":null,"3X1":null},"45":{"n":"Toledo","vol":223,"T1":178,"T2":245,"2X1":245,"3X1":334},"46":{"n":"Valencia","vol":5,"T1":185,"T2":234,"2X1":267,"3X1":341},"47":{"n":"Valladolid","vol":102,"T1":260,"T2":312,"2X1":480,"3X1":855},"48":{"n":"Bizkaia","vol":10,"T1":356,"T2":405,"2X1":629,"3X1":1078},"49":{"n":"Zamora","vol":11,"T1":267,"T2":312,"2X1":480,"3X1":807},"50":{"n":"Zaragoza","vol":357,"T1":222,"T2":267,"2X1":401,"3X1":457}};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { cp } = await req.json();
    const code = String(cp ?? "").replace(/\D/g, "").slice(0, 2).padStart(2, "0");
    const row = INSTALLER_TARIFFS[code];
    const pick = (k: "T1" | "T2" | "2X1" | "3X1") =>
      row && row[k] != null ? (row[k] as number) : NATIONAL_FALLBACK[k];
    const body = {
      provinceCode: code,
      provinceName: row?.n ?? "tu zona",
      hasData: !!row,
      volume: row?.vol ?? 0,
      tariffs: { T1: pick("T1"), T2: pick("T2"), "2X1": pick("2X1"), "3X1": pick("3X1") },
      desinstalacion: 30,
      material: 70,
    };
    return new Response(JSON.stringify(body), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
