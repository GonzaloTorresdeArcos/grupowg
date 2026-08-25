CREATE OR REPLACE FUNCTION public.ops_alertas(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_prev_from date := (v_from - (v_to - v_from + 1))::date;
  v_prev_to date := (v_from - 1)::date;
  v jsonb;
BEGIN
  WITH filtrada AS (
    SELECT f.* FROM public.ops_fact_ot f
    WHERE f.es_anulado=false
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
  caidas_raw AS (
    SELECT f.tecnico,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to) AS n_now,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) AS n_prev
    FROM filtrada f
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = f.tecnico
    WHERE f.situacion IN ('Cerrado','Baja') AND f.tecnico IS NOT NULL AND COALESCE(t.activo, true)
    GROUP BY f.tecnico
    HAVING COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) >= 10
       AND COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to), 0) < 0.6
  ),
  caidas AS (
    SELECT tecnico, n_now, n_prev
    FROM caidas_raw
    ORDER BY (n_now::numeric / NULLIF(n_prev,0)) ASC
    LIMIT 10
  ),
  calidad AS (
    SELECT b.tecnico, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) AS pct_bajas,
      AVG(bm.pct_bajas)/100.0 AS pct_bajas_esp,
      COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) AS pct_nff,
      AVG(bm.pct_nff)/100.0 AS pct_nff_esp
    FROM filtrada b
    LEFT JOIN public.ops_benchmark bm ON bm.familia = b.familia AND bm.cliente_wg = b.cliente_wg
    WHERE b.situacion IN ('Cerrado','Baja') AND b.tecnico IS NOT NULL
      AND b.fecha_cierre BETWEEN v_from AND v_to
    GROUP BY b.tecnico
    HAVING COUNT(*) >= 20
       AND (COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_bajas)/100.0, 0)
         OR COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_nff)/100.0, 0))
    LIMIT 10
  ),
  provincias AS (
    SELECT provincia, COUNT(*) AS abiertas_30
    FROM filtrada
    WHERE situacion='Abierto' AND provincia IS NOT NULL AND (v_asof - fecha_creacion) > 30
    GROUP BY provincia ORDER BY abiertas_30 DESC LIMIT 8
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'caidas', COALESCE((SELECT jsonb_agg(row_to_json(caidas)) FROM caidas), '[]'::jsonb),
    'calidad', COALESCE((SELECT jsonb_agg(row_to_json(calidad)) FROM calidad), '[]'::jsonb),
    'provincias', COALESCE((SELECT jsonb_agg(row_to_json(provincias)) FROM provincias), '[]'::jsonb)
  ) INTO v; RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_delegaciones(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false AND delegacion IS NOT NULL AND delegacion <> ''
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_real = p_gama)
      AND (p_familia IS NULL OR familia = p_familia)
  ),
  periodo AS (
    SELECT * FROM base
    WHERE situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR fecha_cierre >= p_from)
      AND (p_to IS NULL OR fecha_cierre <= p_to)
  ),
  kpis AS (
    SELECT delegacion, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20,
      AVG(dias_cierre) FILTER (WHERE dias_cierre > 0) AS dias_medio,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas,
      COUNT(*) FILTER (WHERE es_nff)::numeric / NULLIF(COUNT(*),0) AS pct_nff,
      COUNT(DISTINCT tecnico) FILTER (WHERE tecnico IS NOT NULL) AS tecnicos
    FROM periodo GROUP BY delegacion
  ),
  abiertas AS (
    SELECT delegacion, COUNT(*) AS abiertas,
      COUNT(*) FILTER (WHERE (public.ops_as_of('ot') - fecha_creacion) > 30) AS abiertas_30
    FROM base WHERE situacion='Abierto' GROUP BY delegacion
  ),
  evo AS (
    SELECT delegacion, date_trunc('month', fecha_cierre)::date AS mes, COUNT(*) AS cerradas
    FROM base WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre >= (public.ops_as_of('ot') - INTERVAL '12 months')
    GROUP BY 1,2 ORDER BY 1,2
  ),
  tecs AS (
    SELECT p.delegacion, p.tecnico, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo p WHERE p.tecnico IS NOT NULL GROUP BY 1,2 ORDER BY 1, cerradas DESC
  )
  SELECT jsonb_build_object(
    'kpis', COALESCE((SELECT jsonb_agg(to_jsonb(k) || jsonb_build_object(
        'abiertas', COALESCE(a.abiertas, 0),
        'abiertas_30', COALESCE(a.abiertas_30, 0)))
      FROM kpis k LEFT JOIN abiertas a ON a.delegacion = k.delegacion), '[]'::jsonb),
    'evo', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo), '[]'::jsonb),
    'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(tecs)) FROM tecs), '[]'::jsonb)
  ) INTO v; RETURN v;
END;
$function$;

NOTIFY pgrst, 'reload schema';