CREATE OR REPLACE FUNCTION public.ops_sla_evolucion(
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL,
  p_familia text DEFAULT NULL, p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL,
  p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE PARALLEL SAFE
SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_m12 date; v_m6 date; v_m4 date; v_mtop date; v_m12_fin date; v_mtop_fin date;
  v jsonb;
BEGIN
  v_mtop := date_trunc('month', v_asof)::date;
  v_m12 := (v_mtop - INTERVAL '11 months')::date;
  v_m6  := (v_mtop - INTERVAL '5 months')::date;
  v_m4  := (v_mtop - INTERVAL '3 months')::date;
  v_m12_fin := (v_m12 + INTERVAL '1 month - 1 day')::date;
  v_mtop_fin := (v_mtop + INTERVAL '1 month - 1 day')::date;

  WITH filtrada AS MATERIALIZED (
    SELECT f.id, f.situacion, f.tecnico, f.fecha_creacion, f.fecha_cierre,
           COALESCE(NULLIF(f.delegacion,''),'Red SAT externa') AS dele
    FROM public.ops_fact_ot f
    WHERE f.es_anulado = false
      AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR f.gama_real = p_gama)
      AND (p_familia IS NULL OR f.familia = p_familia)
      AND (p_marca IS NULL OR f.marca = p_marca)
      AND (p_provincia IS NULL OR f.provincia = p_provincia)
      AND (p_sat IS NULL OR f.sat = p_sat)
      AND (p_tecnico IS NULL OR f.tecnico = p_tecnico)
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  meses AS (SELECT generate_series(v_m12, v_mtop, '1 month')::date AS mes),
  meses4 AS (SELECT generate_series(v_m4, v_mtop, '1 month')::date AS mes),
  vivas AS (
    SELECT id, dele, tecnico, fecha_creacion, fecha_cierre FROM filtrada
    WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_mtop_fin
      AND (fecha_cierre IS NULL OR fecha_cierre > v_m12_fin)
  ),
  back_rows AS MATERIALIZED (
    SELECT f.id, f.dele, f.tecnico, g.mes, (g.fin - f.fecha_creacion)::int AS edad
    FROM vivas f
    CROSS JOIN LATERAL (
      SELECT gs::date AS mes, (gs + INTERVAL '1 month - 1 day')::date AS fin
      FROM generate_series(GREATEST(date_trunc('month', f.fecha_creacion)::date, v_m12), v_mtop, '1 month') gs
    ) g
    WHERE f.fecha_creacion <= g.fin
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > g.fin)
  ),
  back_mes AS (
    SELECT mes, COUNT(*) AS abiertas, ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM back_rows GROUP BY mes
  ),
  evo AS (
    SELECT m.mes, COALESCE(b.abiertas, 0) AS abiertas, b.edad_media, COALESCE(b.n30,0) AS n30
    FROM meses m LEFT JOIN back_mes b ON b.mes = m.mes
  ),
  evo_deleg AS (
    SELECT dele AS delegacion, mes, COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media
    FROM back_rows WHERE mes >= v_m6 GROUP BY 1,2
  ),
  top_tecs AS (
    SELECT tecnico, COUNT(*) AS n FROM filtrada
    WHERE situacion = 'Abierto' AND tecnico IS NOT NULL
    GROUP BY tecnico ORDER BY n DESC, tecnico LIMIT 50
  ),
  back_tec AS (
    SELECT tecnico, mes, COUNT(*) AS abiertas FROM back_rows
    WHERE mes >= v_m4 AND tecnico IS NOT NULL GROUP BY 1,2
  ),
  evo_tec AS (
    SELECT tt.tecnico, m.mes, COALESCE(b.abiertas,0) AS abiertas
    FROM meses4 m CROSS JOIN top_tecs tt
    LEFT JOIN back_tec b ON b.tecnico = tt.tecnico AND b.mes = m.mes
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'evo', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo ORDER BY mes) e), '[]'::jsonb),
    'evo_deleg', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_deleg ORDER BY delegacion, mes) e), '[]'::jsonb),
    'evo_tec', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_tec ORDER BY tecnico, mes) e), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

REVOKE ALL ON FUNCTION public.ops_sla_evolucion(text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_sla_evolucion(text,text,text,text,text,text,text,text,text) TO authenticated, service_role;

DO $mig$
DECLARE
  v_def text; v_new text;
  a jsonb; b jsonb;
BEGIN
  a := public.ops_sla_resumen('2026-06-01','2026-06-30');
  v_def := pg_get_functiondef('public.ops_sla_resumen(date,date,text,text,text,text,text,text,text,text,text)'::regprocedure);
  v_new := v_def;
  v_new := replace(v_new, E'    ''evo'', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo ORDER BY mes) e), ''[]''::jsonb),', E'    ''evo'', ''[]''::jsonb,');
  v_new := replace(v_new, E'    ''evo_deleg'', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_deleg ORDER BY delegacion, mes) e), ''[]''::jsonb),', E'    ''evo_deleg'', ''[]''::jsonb,');
  v_new := replace(v_new, E'    ''evo_tec'', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_tec ORDER BY tecnico, mes) e), ''[]''::jsonb),', E'    ''evo_tec'', ''[]''::jsonb,');
  IF v_new = v_def THEN RAISE EXCEPTION 'No se pudieron localizar las claves evo* en ops_sla_resumen'; END IF;
  EXECUTE v_new;
  b := public.ops_sla_resumen('2026-06-01','2026-06-30');
  IF (a - 'evo' - 'evo_deleg' - 'evo_tec') IS DISTINCT FROM (b - 'evo' - 'evo_deleg' - 'evo_tec') THEN
    RAISE EXCEPTION 'ops_sla_resumen cambió resultados fuera de las series evo';
  END IF;
  IF (b->'evo_deleg') <> '[]'::jsonb THEN RAISE EXCEPTION 'evo_deleg no quedó vacío'; END IF;
  IF (a->'evo_deleg') IS DISTINCT FROM (public.ops_sla_evolucion()->'evo_deleg')
     OR (a->'evo_tec') IS DISTINCT FROM (public.ops_sla_evolucion()->'evo_tec') THEN
    RAISE EXCEPTION 'ops_sla_evolucion no reproduce las series originales';
  END IF;
END
$mig$;