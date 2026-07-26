import { supabase } from "@/integrations/supabase/client";

// Filtro común: excluir siempre 'ANULADO AVISO' de KPIs
export const excludeAnulado = <T>(q: T): T => (q as any).neq("incidencia", "ANULADO AVISO");

export type OtRow = {
  id: string;
  num_ot: string;
  fecha_creacion: string | null;
  fecha_cierre: string | null;
  cliente_wg: string | null;
  sat: string | null;
  tipo_recurso: string | null;
  tecnico: string | null;
  canal: string | null;
  delegacion: string | null;
  situacion: string | null;
  incidencia: string | null;
  familia: string | null;
  provincia: string | null;
  dias_cierre: number | null;
  kpi_20d: boolean | null;
  kpi_30d: boolean | null;
  es_baja: boolean;
  es_nff: boolean;
};

export async function fetchOperationsData() {
  const { data, error } = await supabase
    .from("ops_fact_ot")
    .select(
      "id,num_ot,fecha_creacion,fecha_cierre,cliente_wg,sat,tipo_recurso,tecnico,canal,delegacion,situacion,incidencia,familia,provincia,dias_cierre,kpi_20d,kpi_30d,es_baja,es_nff",
    )
    .neq("incidencia", "ANULADO AVISO")
    .limit(20000);
  if (error) throw error;
  return (data ?? []) as OtRow[];
}

export type Kpis = {
  totalOts: number;
  abiertas: number;
  cerradas: number;
  bajas: number;
  nff: number;
  sla20: number;
  sla30: number;
  diasCierreMedio: number;
  envejecidas20: number;
  envejecidas30: number;
};

export function computeKpis(rows: OtRow[]): Kpis {
  const total = rows.length;
  const cerradas = rows.filter((r) => r.situacion === "Cerrado");
  const abiertas = rows.filter((r) => r.situacion === "Abierto");
  const bajas = rows.filter((r) => r.es_baja).length;
  const nff = rows.filter((r) => r.es_nff).length;
  const sla20 = cerradas.filter((r) => r.kpi_20d === true).length;
  const sla30 = cerradas.filter((r) => r.kpi_30d === true).length;
  const diasCierre = cerradas.map((r) => r.dias_cierre ?? 0).filter((x) => x > 0);
  const diasMedio = diasCierre.length ? diasCierre.reduce((a, b) => a + b, 0) / diasCierre.length : 0;

  const today = new Date();
  const diffDays = (a: string | null) =>
    a ? Math.floor((today.getTime() - new Date(a).getTime()) / 86400000) : 0;
  const env20 = abiertas.filter((r) => diffDays(r.fecha_creacion) > 20).length;
  const env30 = abiertas.filter((r) => diffDays(r.fecha_creacion) > 30).length;

  return {
    totalOts: total,
    abiertas: abiertas.length,
    cerradas: cerradas.length,
    bajas,
    nff,
    sla20: cerradas.length ? sla20 / cerradas.length : 0,
    sla30: cerradas.length ? sla30 / cerradas.length : 0,
    diasCierreMedio: diasMedio,
    envejecidas20: env20,
    envejecidas30: env30,
  };
}
