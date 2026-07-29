
CREATE OR REPLACE FUNCTION public.ops_delegacion_ficha(
  p_delegacion text,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false AND delegacion = p_delegacion
  ),
  periodo AS (
    SELECT * FROM base
    WHERE situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR fecha_cierre >= p_from)
      AND (p_to IS NULL OR fecha_cierre <= p_to)
  ),
  tecnicos AS (
    SELECT p.tecnico,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja) AS bajas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo p WHERE p.tecnico IS NOT NULL
    GROUP BY p.tecnico ORDER BY cerradas DESC
  ),
  por_gama AS (
    SELECT COALESCE(NULLIF(gama_real,''),'—') AS gama,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja) AS bajas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo GROUP BY 1 ORDER BY cerradas DESC LIMIT 10
  ),
  por_marca AS (
    SELECT COALESCE(NULLIF(marca,''),'—') AS marca,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja) AS bajas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas
    FROM periodo WHERE marca IS NOT NULL AND marca <> '' AND marca <> 'SIN MARCA'
    GROUP BY 1 ORDER BY cerradas DESC LIMIT 10
  ),
  por_cliente AS (
    SELECT COALESCE(NULLIF(cliente_wg,''),'—') AS cliente,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja) AS bajas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas
    FROM periodo GROUP BY 1 ORDER BY cerradas DESC LIMIT 10
  ),
  por_provincia AS (
    SELECT COALESCE(NULLIF(provincia,''),'—') AS provincia,
      COUNT(*) AS cerradas
    FROM periodo GROUP BY 1 ORDER BY cerradas DESC LIMIT 10
  ),
  abiertas_prov AS (
    SELECT COALESCE(NULLIF(provincia,''),'—') AS provincia,
      COUNT(*) AS abiertas,
      COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) AS abiertas_30
    FROM base WHERE situacion = 'Abierto' GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) > 0
    ORDER BY abiertas_30 DESC LIMIT 10
  ),
  evo AS (
    SELECT date_trunc('month', fecha_cierre)::date AS mes,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM base WHERE situacion IN ('Cerrado','Baja')
      AND fecha_cierre >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY 1 ORDER BY 1
  )
  SELECT jsonb_build_object(
    'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(tecnicos)) FROM tecnicos), '[]'::jsonb),
    'por_gama', COALESCE((SELECT jsonb_agg(row_to_json(por_gama)) FROM por_gama), '[]'::jsonb),
    'por_marca', COALESCE((SELECT jsonb_agg(row_to_json(por_marca)) FROM por_marca), '[]'::jsonb),
    'por_cliente', COALESCE((SELECT jsonb_agg(row_to_json(por_cliente)) FROM por_cliente), '[]'::jsonb),
    'por_provincia', COALESCE((SELECT jsonb_agg(row_to_json(por_provincia)) FROM por_provincia), '[]'::jsonb),
    'abiertas_prov', COALESCE((SELECT jsonb_agg(row_to_json(abiertas_prov)) FROM abiertas_prov), '[]'::jsonb),
    'evolucion', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $function$;

GRANT EXECUTE ON FUNCTION public.ops_delegacion_ficha(text, date, date) TO authenticated;
