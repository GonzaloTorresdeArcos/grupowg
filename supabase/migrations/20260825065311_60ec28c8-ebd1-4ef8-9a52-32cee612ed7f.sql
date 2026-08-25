DO $mig$
DECLARE
  v_def text;
  v_new text;
  a1 jsonb; a2 jsonb; b1 jsonb; b2 jsonb;
BEGIN
  a1 := public.ops_sla_resumen('2026-06-01','2026-06-30');
  a2 := public.ops_sla_resumen('2025-07-01','2026-06-30');

  v_def := pg_get_functiondef('public.ops_sla_resumen(date,date,text,text,text,text,text,text,text,text,text)'::regprocedure);
  v_new := replace(v_def,
    E'  WITH filtrada AS (\n    SELECT f.* FROM public.ops_fact_ot f',
    E'  WITH filtrada AS MATERIALIZED (\n    SELECT f.id, f.num_ot, f.fecha_creacion, f.fecha_cierre, f.situacion, f.estado,\n           f.delegacion, f.tecnico, f.cliente_wg, f.gama_real, f.familia, f.marca,\n           f.kpi_20d, f.dias_cierre, f.tipo_recurso, f.provincia, f.sat\n      FROM public.ops_fact_ot f');
  IF v_new = v_def THEN
    RAISE EXCEPTION 'No se pudo localizar la CTE filtrada en ops_sla_resumen';
  END IF;
  EXECUTE v_new;

  b1 := public.ops_sla_resumen('2026-06-01','2026-06-30');
  b2 := public.ops_sla_resumen('2025-07-01','2026-06-30');
  IF a1 IS DISTINCT FROM b1 OR a2 IS DISTINCT FROM b2 THEN
    RAISE EXCEPTION 'ops_sla_resumen cambió de resultado tras la optimización';
  END IF;
END
$mig$;