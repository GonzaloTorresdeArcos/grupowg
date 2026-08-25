DROP FUNCTION IF EXISTS public.ops_delegaciones(date, date, text, text, text);

CREATE OR REPLACE FUNCTION public.ops_delegaciones(
  p_from date DEFAULT NULL::date,
  p_to date DEFAULT NULL::date,
  p_cliente text DEFAULT NULL::text,
  p_gama text DEFAULT NULL::text,
  p_familia text DEFAULT NULL::text,
  p_marca text DEFAULT NULL::text,
  p_provincia text DEFAULT NULL::text,
  p_sat text DEFAULT NULL::text,
  p_tecnico text DEFAULT NULL::text,
  p_canal text DEFAULT NULL::text,
  p_delegacion text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
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
      AND (p_marca IS NULL OR marca = p_marca)
      AND (p_provincia IS NULL OR provincia = p_provincia)
      AND (p_sat IS NULL OR sat = p_sat)
      AND (p_tecnico IS NULL OR tecnico = p_tecnico)
      AND (p_canal IS NULL OR canal = p_canal)
      AND (p_delegacion IS NULL OR delegacion = p_delegacion)
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