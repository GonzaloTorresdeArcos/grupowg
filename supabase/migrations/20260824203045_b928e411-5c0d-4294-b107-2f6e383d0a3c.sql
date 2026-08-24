CREATE OR REPLACE FUNCTION public.ops_panorama(
  p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date,
  p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text,
  p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text,
  p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text,
  p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text,
  p_meses int DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_meses int := GREATEST(1, LEAST(COALESCE(p_meses, 12), 24));
  v jsonb;
BEGIN
  WITH filtrada AS (
    SELECT f.* FROM public.ops_fact_ot f
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
  balance AS (
    SELECT
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_creacion IS NOT NULL AND fecha_creacion < v_from
          AND (fecha_cierre IS NULL OR fecha_cierre >= v_from)) AS backlog_ini,
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_creacion BETWEEN v_from AND v_to) AS entrantes,
      (SELECT COUNT(*) FROM filtrada
        WHERE situacion = 'Cerrado' AND fecha_cierre BETWEEN v_from AND v_to) AS reparadas,
      (SELECT COUNT(*) FROM filtrada
        WHERE situacion = 'Baja' AND fecha_cierre BETWEEN v_from AND v_to) AS bajas,
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_to
          AND (fecha_cierre IS NULL OR fecha_cierre > v_to)) AS backlog_fin,
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_cierre BETWEEN v_from AND v_to AND fecha_creacion IS NULL) AS sin_fecha_creacion
  ),
  etapas AS (
    SELECT COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      ROUND(AVG((CURRENT_DATE - fecha_creacion))::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) AS n30,
      COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 60) AS n60
    FROM filtrada WHERE situacion = 'Abierto'
    GROUP BY 1
  ),
  meses AS (
    SELECT (date_trunc('month', v_to::timestamp) - (make_interval(months => g)))::date AS m_ini
    FROM generate_series(0, v_meses - 1) g
  ),
  serie AS (
    SELECT
      m.m_ini AS mes,
      (SELECT COUNT(*) FROM filtrada f
        WHERE f.fecha_creacion IS NOT NULL
          AND f.fecha_creacion <= (m.m_ini + interval '1 month - 1 day')::date
          AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.m_ini + interval '1 month - 1 day')::date)
      ) AS backlog,
      (SELECT COUNT(*) FILTER (WHERE f.kpi_20d)::numeric / NULLIF(COUNT(*),0)
         FROM filtrada f
        WHERE f.situacion IN ('Cerrado','Baja')
          AND f.fecha_cierre >= m.m_ini
          AND f.fecha_cierre < (m.m_ini + interval '1 month')::date
      ) AS pct_sla20
    FROM meses m
  )
  SELECT jsonb_build_object(
    'balance', (SELECT row_to_json(b) FROM balance b),
    'etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM etapas ORDER BY n DESC) e), '[]'::jsonb),
    'serie', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (SELECT * FROM serie ORDER BY mes) s), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

REVOKE ALL ON FUNCTION public.ops_panorama(date,date,text,text,text,text,text,text,text,text,text,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ops_panorama(date,date,text,text,text,text,text,text,text,text,text,int) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_panorama(date,date,text,text,text,text,text,text,text,text,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_panorama(date,date,text,text,text,text,text,text,text,text,text,int) TO service_role;