import { readinessRegla, resumenReadiness, universosPorCliente, type MedidasDataQuality } from "@/lib/ops-data-quality";
import { FIXTURES_REGISTRY } from "@/lib/ops-contractual-fixtures";

const clientes_erp = [
 ["VESTEL",38768,0.9093,0.9555,0.9738],["CARREFOUR",28995,0.957,0.958,0.9745],
 ["CECOTEC INNOVACIONES, S.L.U.",10274,0.8082,0.8929,0.935],["ALCAMPO",9603,0.8269,0.9265,0.965],
 ["ELECTRO DEPOT ESPAÑA S.L.U",6153,0.9046,0.9394,0.9569],["NEUMESSE, S.L.",4849,0.8728,0.9305,0.9623],
 ["MAKRO",4432,0.8353,0.9106,0.9628],["ASSURANT EUROPE INSURANCE NV",4130,0.9913,0.9668,0.9814],
 ["ASSURANT GENERAL INSURANCE LIMITED",3704,0.8337,0.9506,0.9522],["PC COMPONENTES, S.L.",1646,0.8718,0.8463,0.8566],
 ["ELECTRODOMESTICOS SAUBER ESPAÑA, S.L.",1560,0.8712,0.9212,0.9788],["METRO MARKETS GMBH",1242,0.8092,0.8889,0.8784],
 ["BRIGHTWAY INNOVATION INTELLIGENT TECHNOLOGY (SUZHOU) CO. LTD.",494,0.9798,0.8036,0.9393],
 ["CARREFOUR WINIA",1,0.95,0.95,0.95],
].map(([c,o,a,b,d]:any)=>({cliente_wg:c,ots:o,cob_primer_contacto:a,cob_primera_visita:b,cob_cierre:d}));

const aliases = [
 ["ALCAMPO","ALCAMPO / AUCHAN"],["ASSURANT EUROPE INSURANCE NV","ASSURANT"],["ASSURANT GENERAL INSURANCE LIMITED","ASSURANT"],
 ["CARREFOUR","CARREFOUR"],["CARREFOUR WINIA","CARREFOUR"],["CARREFOUR BRANDT","CARREFOUR"],
 ["CECOTEC INNOVACIONES, S.L.U.","CECOTEC"],["ELECTRO DEPOT ESPAÑA S.L.U","ELECTRO DEPOT"],
 ["MAKRO","METRO / MAKRO"],["METRO MARKETS GMBH","METRO / MAKRO"],
 ["BRIGHTWAY INNOVATION INTELLIGENT TECHNOLOGY (SUZHOU) CO. LTD.","NAVEE / BRIGHTWAY"],
 ["PC COMPONENTES, S.L.","PC COMPONENTES"],["VESTEL HOLLAND B.V. SUCURSAL EN ESPAÑA","VESTEL"],["VESTEL","VESTEL"],
 ["ELECTRODOMESTICOS SAUBER ESPAÑA, S.L.","SAUBER"],
].map(([r,c]:any)=>({cliente_wg_real:r,cliente_contractual:c,programa:null}));

const med: MedidasDataQuality = {
  generado_en: new Date().toISOString(),
  fact_ot:{filas:125752,min_fecha_creacion:"2025-01-02",max_fecha_creacion:"2026-07-21",ultima_importacion:"2026-07-26T18:32:37Z",ultima_actualizacion:"2026-07-27T17:17:22Z"},
  campos_fact_ot:{num_ot:1,cliente_wg:0.9998,situacion:1,estado:1,fecha_creacion:1,fecha_cierre:0.964,fecha_primer_contacto:0.8993,fecha_primera_visita:0.9412,gama_real:1,familia:0.997,subfamilia:0.997,marca:1,tipo_recurso:1,tecnico:0.5208,sat:0.9904,delegacion:0.4774,canal:0.9274,codigo_postal:1,importe_mo:0.9987,importe_desplazamiento:1,fact_cli:1,fact_sat:1},
  campos_ausentes_fact_ot:["motivo_cierre","motivo_baja","imputabilidad","exclusion_sla","motivo_exclusion","fecha_asignacion","fecha_llegada","fecha_inicio_intervencion","fecha_fin_intervencion","fecha_solicitud_pieza","fecha_disponibilidad_pieza","fecha_expedicion","fecha_entrega","visita_id","secuencia_visita","ot_anterior","reclamacion","programa","contrato_version","business_line","tipologia_servicio","fase","calendario_laboral"],
  rrhh:{filas:112,meses:4,ultimo_mes:"2026-04-01"},
  coste_mensual:{filas:470,meses:18,ultimo_mes:"2026-06-01"},
  geo:{filas_cp_geo:2438,ots_domicilio:59495,ots_domicilio_geocodificables:37368,pct_geocodificable:0.6281},
  tablas:{ops_visitas:false,ops_historial_estados:false,ops_repuestos:false,ops_reclamaciones:false,ops_csat:false,ops_sla_registry:true,ops_calendario_laboral:true,ops_cliente_contrato_alias:true},
  registry_reglas:36,
  calendario_laboral:{},
  clientes_erp,
} as any;

const uni = universosPorCliente(med, aliases as any, FIXTURES_REGISTRY);
for (const [k,v] of uni!) console.log(k, v.universo_total, "alias:"+v.valoresPorAlias, "patron:"+v.valoresPorPatron, JSON.stringify(v.cobertura));
const ctx = { universos: uni };
const ev = FIXTURES_REGISTRY.map((r) => readinessRegla(r, med, ctx));
const causas = new Map<string, number>();
for (const e of ev) for (const b of e.bloqueos) causas.set(`${b.tipo}:${b.clave}`, (causas.get(`${b.tipo}:${b.clave}`) ?? 0) + 1);
console.log("MEDIBILIDAD", JSON.stringify(resumenReadiness(FIXTURES_REGISTRY, med, ctx).porMedibilidad));
console.log("CAUSAS", [...causas].sort((a,b)=>b[1]-a[1]));
console.log("BLOQUEO FASE", ev.filter(e=>e.bloqueos.some(b=>b.clave==="fase")).length, "/", ev.length);
console.log("SIN UNIVERSO", ev.filter(e=>e.universoCliente==null).map(e=>e.regla.cliente));
