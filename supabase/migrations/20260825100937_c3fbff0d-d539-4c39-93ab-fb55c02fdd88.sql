-- Delegaciones: patrón _impl + wrapper SECURITY DEFINER con guardia is_management.
-- Motivo (UAT-2): bajo rol `authenticated` la política RLS de ops_fact_ot se
-- reevaluaba por fila y la CTE `base` materializaba filas anchas (SELECT *),
-- 6.862 ms por llamada; con dos llamadas simultáneas (actual + previo) se roza
-- el statement_timeout de 8 s del rol. Misma definición de cada KPI.

CREATE OR REPLACE FUNCTION public.ops_delegaciones_impl(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL, p_marca text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL,
  p_canal text DEFAULT NULL, p_delegacion text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE PARALLEL SAFE
SET search_path TO 'public'
AS $function$
DECLARE v jsonb; v_asof date;
BEGIN
  -- ops_as_of es STABLE pero se evaluaba dentro de filtros sobre una CTE
  -- materializada (una ejecución por fila). Se resuelve una sola vez.
  v_asof := public.ops_as_of('ot');

  WITH base AS (
    -- Solo las columnas usadas por los KPI (antes SELECT *: width 326).
    SELECT delegacion, situacion, fecha_cierre, fecha_creacion, kpi_20d,
           dias_cierre, es_baja, es_nff, tecnico
    FROM public.ops_fact_ot
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
      COUNT(*) FILTER (WHERE (v_asof - fecha_creacion) > 30) AS abiertas_30
    FROM base WHERE situacion='Abierto' GROUP BY delegacion
  ),
  evo AS (
    SELECT delegacion, date_trunc('month', fecha_cierre)::date AS mes, COUNT(*) AS cerradas
    FROM base
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre >= (v_asof - INTERVAL '12 months')
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

REVOKE ALL ON FUNCTION public.ops_delegaciones_impl(date,date,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ops_delegaciones(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL, p_marca text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL,
  p_canal text DEFAULT NULL, p_delegacion text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN public.ops_delegaciones_impl(p_from, p_to, p_cliente, p_gama, p_familia,
    p_marca, p_provincia, p_sat, p_tecnico, p_canal, p_delegacion);
END;
$function$;

REVOKE ALL ON FUNCTION public.ops_delegaciones(date,date,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_delegaciones(date,date,text,text,text,text,text,text,text,text,text) TO authenticated;

-- Regla: todo cambio de firma o de exposición de una RPC va seguido de NOTIFY.
NOTIFY pgrst, 'reload schema';