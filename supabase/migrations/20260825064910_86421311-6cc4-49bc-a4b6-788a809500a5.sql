-- ─────────────────────────────────────────────────────────────
-- PANORAMA: resumen (sin series) + series (solo serie)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ops_panorama_resumen_impl(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v jsonb;
BEGIN
  WITH filtrada AS MATERIALIZED (
    SELECT f.fecha_creacion, f.fecha_cierre, f.situacion, f.estado
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
  balance AS (
    SELECT
      COUNT(*) FILTER (WHERE fecha_creacion IS NOT NULL AND fecha_creacion < v_from
                         AND (fecha_cierre IS NULL OR fecha_cierre >= v_from)) AS backlog_ini,
      COUNT(*) FILTER (WHERE fecha_creacion BETWEEN v_from AND v_to) AS entrantes,
      COUNT(*) FILTER (WHERE situacion = 'Cerrado' AND fecha_cierre BETWEEN v_from AND v_to) AS reparadas,
      COUNT(*) FILTER (WHERE situacion = 'Baja' AND fecha_cierre BETWEEN v_from AND v_to) AS bajas,
      COUNT(*) FILTER (WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_to
                         AND (fecha_cierre IS NULL OR fecha_cierre > v_to)) AS backlog_fin,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to AND fecha_creacion IS NULL) AS sin_fecha_creacion
    FROM filtrada
  ),
  etapas AS (
    SELECT COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      ROUND(AVG((v_asof - fecha_creacion))::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE (v_asof - fecha_creacion) > 30) AS n30,
      COUNT(*) FILTER (WHERE (v_asof - fecha_creacion) > 60) AS n60
    FROM filtrada WHERE situacion = 'Abierto'
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'balance', (SELECT row_to_json(b) FROM balance b),
    'etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM etapas ORDER BY n DESC) e), '[]'::jsonb),
    'serie', '[]'::jsonb
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_panorama_resumen(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  RETURN public.ops_panorama_resumen_impl(p_from,p_to,p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_panorama_series_impl(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL, p_meses integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_to date := COALESCE(p_to, v_asof);
  v_meses int := GREATEST(1, LEAST(COALESCE(p_meses, 12), 24));
  v jsonb;
BEGIN
  WITH filtrada AS MATERIALIZED (
    SELECT f.fecha_creacion, f.fecha_cierre, f.situacion, f.kpi_20d
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
  meses AS (
    SELECT (date_trunc('month', LEAST(v_to, v_asof)::timestamp) - (make_interval(months => g)))::date AS m_ini
    FROM generate_series(0, v_meses - 1) g
  ),
  serie AS (
    SELECT m.m_ini AS mes,
      (SELECT COUNT(*) FROM filtrada f
        WHERE f.fecha_creacion IS NOT NULL
          AND f.fecha_creacion <= (m.m_ini + interval '1 month - 1 day')::date
          AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.m_ini + interval '1 month - 1 day')::date)) AS backlog,
      (SELECT COUNT(*) FILTER (WHERE f.kpi_20d)::numeric / NULLIF(COUNT(*),0)
         FROM filtrada f
        WHERE f.situacion IN ('Cerrado','Baja')
          AND f.fecha_cierre >= m.m_ini
          AND f.fecha_cierre < (m.m_ini + interval '1 month')::date) AS pct_sla20
    FROM meses m
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'serie', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (SELECT * FROM serie ORDER BY mes) s), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_panorama_series(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL, p_meses integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  RETURN public.ops_panorama_series_impl(p_from,p_to,p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal,p_meses);
END;
$function$;

-- ─────────────────────────────────────────────────────────────
-- SUPPLY: resumen optimizado (mismos agregados) + detalle paginado
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ops_supply_resumen_impl(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_prev_from date DEFAULT NULL, p_prev_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_len int; v_pfrom date; v_pto date;
  v_dem jsonb; v_dem_prev jsonb; v_pte jsonb; v_conv jsonb; v_conv_prev jsonb;
  v_conv_gama jsonb; v_expo jsonb; v_cadena jsonb; v_pte_prev bigint;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_pfrom := COALESCE(p_prev_from, (v_from - v_len)::date);
  v_pto := COALESCE(p_prev_to, (v_from - 1)::date);

  -- 1 · Demanda de pieza del período (columnas estrechas, predicados inline)
  WITH per AS MATERIALIZED (
    SELECT f.cliente_wg, f.gama_real, f.delegacion, f.sat, f.provincia, f.tiene_piezas
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
      AND f.fecha_creacion BETWEEN v_from AND v_to
  ),
  d(dim, entidad, ots, con_pieza) AS (
    SELECT 'cliente', COALESCE(cliente_wg,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'gama', COALESCE(gama_real,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'delegacion', COALESCE(delegacion,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'sat', COALESCE(sat,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'provincia', COALESCE(provincia,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
  ),
  agg AS (
    SELECT dim, jsonb_agg(jsonb_build_object('entidad', entidad, 'ots', ots, 'con_pieza', con_pieza,
             'pct', round(con_pieza::numeric / NULLIF(ots,0), 4)) ORDER BY con_pieza DESC, ots DESC) j
    FROM d GROUP BY dim
  ),
  tot AS (SELECT count(*) n, count(*) FILTER (WHERE tiene_piezas IS TRUE) cp FROM per)
  SELECT jsonb_build_object(
    'ots', t.n, 'con_pieza', t.cp,
    'pct', CASE WHEN t.n = 0 THEN NULL ELSE round(t.cp::numeric / t.n, 4) END,
    'por_cliente',    COALESCE((SELECT j FROM agg WHERE dim='cliente'), '[]'::jsonb),
    'por_gama',       COALESCE((SELECT j FROM agg WHERE dim='gama'), '[]'::jsonb),
    'por_delegacion', COALESCE((SELECT j FROM agg WHERE dim='delegacion'), '[]'::jsonb),
    'por_sat',        COALESCE((SELECT j FROM agg WHERE dim='sat'), '[]'::jsonb),
    'por_provincia',  COALESCE((SELECT j FROM agg WHERE dim='provincia'), '[]'::jsonb)
  ) INTO v_dem FROM tot t;

  SELECT jsonb_build_object(
    'ots', count(*), 'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
    'pct', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4) END
  ) INTO v_dem_prev
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
    AND f.fecha_creacion BETWEEN v_pfrom AND v_pto;

  SELECT count(*) INTO v_pte_prev
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
    AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS'
    AND f.fecha_creacion IS NOT NULL AND f.fecha_creacion <= v_pto
    AND (f.fecha_cierre IS NULL OR f.fecha_cierre > v_pto);

  -- 2 · Pendiente de piezas hoy
  WITH pte0 AS MATERIALIZED (
    SELECT f.cliente_wg, f.gama_real, f.delegacion, f.sat, f.provincia,
           (v_asof - f.fecha_creacion)::int AS edad
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
      AND f.situacion = 'Abierto' AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS'
  ),
  pte AS (
    SELECT p.*, a.cliente_contractual
    FROM pte0 p
    LEFT JOIN public.ops_cliente_contrato_alias a
      ON a.cliente_wg_real = p.cliente_wg
     AND (a.vigencia_desde IS NULL OR a.vigencia_desde <= v_asof)
     AND (a.vigencia_hasta IS NULL OR a.vigencia_hasta >= v_asof)
  ),
  d(dim, entidad, n, edad_media, n30) AS (
    SELECT 'cliente', COALESCE(cliente_wg,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'cliente_contractual',
      COALESCE(cliente_contractual, '(sin resolver) ' || COALESCE(cliente_wg,'(sin dato)')),
      count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'gama', COALESCE(gama_real,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'delegacion', COALESCE(delegacion,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'sat', COALESCE(sat,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'provincia', COALESCE(provincia,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
  ),
  agg AS (
    SELECT dim, jsonb_agg(jsonb_build_object('entidad',entidad,'n',n,'edad_media',edad_media,'n30',n30) ORDER BY n DESC) j
    FROM d GROUP BY dim
  ),
  bk AS (
    SELECT COALESCE(jsonb_object_agg(b, n), '{}'::jsonb) j FROM (
      SELECT CASE
        WHEN GREATEST(edad,0) <= 5 THEN '0-5'
        WHEN edad BETWEEN 6 AND 10 THEN '6-10'
        WHEN edad BETWEEN 11 AND 20 THEN '11-20'
        WHEN edad BETWEEN 21 AND 30 THEN '21-30'
        WHEN edad BETWEEN 31 AND 45 THEN '31-45'
        WHEN edad BETWEEN 46 AND 60 THEN '46-60'
        ELSE '>60' END b, count(*) n FROM pte GROUP BY 1) t
  ),
  res AS (SELECT count(*) n, round(avg(edad)::numeric,1) em, count(*) FILTER (WHERE edad>30) n30 FROM pte),
  ab AS (
    SELECT count(*) n FROM public.ops_fact_ot f
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
      AND f.situacion = 'Abierto'
  )
  SELECT jsonb_build_object(
    'n', r.n, 'n_prev', v_pte_prev, 'edad_media', r.em, 'n30', r.n30,
    'abiertas_total', (SELECT n FROM ab),
    'buckets', (SELECT j FROM bk),
    'por_cliente',    COALESCE((SELECT j FROM agg WHERE dim='cliente'), '[]'::jsonb),
    'por_cliente_contractual', COALESCE((SELECT j FROM agg WHERE dim='cliente_contractual'), '[]'::jsonb),
    'por_gama',       COALESCE((SELECT j FROM agg WHERE dim='gama'), '[]'::jsonb),
    'por_delegacion', COALESCE((SELECT j FROM agg WHERE dim='delegacion'), '[]'::jsonb),
    'por_sat',        COALESCE((SELECT j FROM agg WHERE dim='sat'), '[]'::jsonb),
    'por_provincia',  COALESCE((SELECT j FROM agg WHERE dim='provincia'), '[]'::jsonb)
  ) INTO v_pte FROM res r;

  -- 3 · Conversión (cerradas del período) — una sola lectura para las 3 salidas
  WITH cer AS MATERIALIZED (
    SELECT f.tiene_piezas, f.gama_real, f.dias_cierre, f.kpi_20d, f.es_baja, f.es_nff, f.fecha_cierre
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
      AND f.situacion IN ('Cerrado','Baja')
      AND f.fecha_cierre BETWEEN LEAST(v_from, v_pfrom) AND GREATEST(v_to, v_pto)
  ),
  cur AS (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM cer WHERE fecha_cierre BETWEEN v_from AND v_to GROUP BY 1
  ),
  pre AS (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM cer WHERE fecha_cierre BETWEEN v_pfrom AND v_pto GROUP BY 1
  ),
  gam AS (
    SELECT COALESCE(gama_real,'(sin dato)') g,
      CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      count(*) n,
      round(avg(dias_cierre)::numeric,1) dm,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1) dmed,
      round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4) p20,
      round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4) pb,
      round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4) pn
    FROM cer WHERE fecha_cierre BETWEEN v_from AND v_to GROUP BY 1,2
  )
  SELECT
    COALESCE((SELECT jsonb_object_agg(k, v) FROM cur), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(k, v) FROM pre), '{}'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'gama', g, 'grupo', k, 'n', n, 'dias_medio', dm, 'dias_mediana', dmed,
        'pct_20d', p20, 'pct_bajas', pb, 'pct_nff', pn) ORDER BY g, k) FROM gam), '[]'::jsonb)
  INTO v_conv, v_conv_prev, v_conv_gama;

  -- 4 · Exposición por cliente (pte. piezas abierto)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('cliente_wg', c, 'n', n, 'n30', n30) ORDER BY n DESC), '[]'::jsonb)
    INTO v_expo FROM (
      SELECT COALESCE(f.cliente_wg,'(sin dato)') c, count(*) n,
             count(*) FILTER (WHERE (v_asof - f.fecha_creacion) > 30) n30
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
        AND f.situacion = 'Abierto' AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS' GROUP BY 1) t;

  -- 5 · Cadena (trazabilidad de piezas/expediciones)
  SELECT jsonb_build_object(
    'solicitudes', (SELECT count(*) FROM public.ops_pieza_solicitud),
    'expediciones', (SELECT count(*) FROM public.ops_expedicion),
    'stock_filas', (SELECT count(*) FROM public.ops_stock_snapshot),
    'ots_con_pieza_periodo', (
      SELECT count(*) FROM public.ops_fact_ot f
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
        AND f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to),
    'ots_con_pieza_trazadas', (
      SELECT count(DISTINCT f.num_ot) FROM public.ops_fact_ot f
      JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot
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
        AND f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to),
    'etapas', (SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT estado_pieza k, count(*) n FROM public.ops_pieza_solicitud GROUP BY 1) t),
    'expediciones_estado', (SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT estado_expedicion k, count(*) n FROM public.ops_expedicion GROUP BY 1) t),
    'lead_times', (SELECT jsonb_build_object(
      'necesidad_solicitud', jsonb_build_object('n', count(*) FILTER (WHERE fecha_necesidad IS NOT NULL AND fecha_solicitud IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric,1)),
      'solicitud_disponibilidad', jsonb_build_object('n', count(*) FILTER (WHERE fecha_solicitud IS NOT NULL AND fecha_disponibilidad IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric,1)),
      'disponibilidad_picking', jsonb_build_object('n', count(*) FILTER (WHERE fecha_disponibilidad IS NOT NULL AND fecha_picking IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric,1)),
      'picking_expedicion', jsonb_build_object('n', count(*) FILTER (WHERE fecha_picking IS NOT NULL AND fecha_expedicion IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric,1)),
      'expedicion_entrega', jsonb_build_object('n', count(*) FILTER (WHERE fecha_expedicion IS NOT NULL AND fecha_entrega IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric,1)),
      'entrega_montaje', jsonb_build_object('n', count(*) FILTER (WHERE fecha_entrega IS NOT NULL AND fecha_montaje IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric,1))
    ) FROM public.ops_pieza_solicitud)
  ) INTO v_cadena;

  RETURN jsonb_build_object(
    'as_of', v_asof,
    'rango', jsonb_build_object('from', v_from, 'to', v_to, 'prev_from', v_pfrom, 'prev_to', v_pto),
    'pieza_demanda', COALESCE(v_dem, '{}'::jsonb),
    'pieza_demanda_prev', COALESCE(v_dem_prev, '{}'::jsonb),
    'pte_piezas_actual', COALESCE(v_pte, '{}'::jsonb),
    'conversion', COALESCE(v_conv, '{}'::jsonb),
    'conversion_prev', COALESCE(v_conv_prev, '{}'::jsonb),
    'conversion_por_gama', COALESCE(v_conv_gama, '[]'::jsonb),
    'exposicion_pieza', COALESCE(v_expo, '[]'::jsonb),
    'cadena', COALESCE(v_cadena, '{}'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_supply_resumen(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_prev_from date DEFAULT NULL, p_prev_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  RETURN public.ops_supply_resumen_impl(p_from,p_to,p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal,p_prev_from,p_prev_to);
END;
$function$;

-- Detalle bajo demanda: OTs pendientes de pieza / con pieza en el período
CREATE OR REPLACE FUNCTION public.ops_supply_detalle_impl(
  p_bloque text DEFAULT 'pte_piezas', p_clave text DEFAULT NULL,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_lim int := LEAST(GREATEST(COALESCE(p_limit,50),1),500);
  v_off int := GREATEST(COALESCE(p_offset,0),0);
  v_total bigint; v_rows jsonb;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _noop_never(x int); -- no-op placeholder
  WITH base AS (
    SELECT f.num_ot, f.cliente_wg, f.gama_real, f.delegacion, f.sat, f.provincia,
           f.tecnico, f.estado, f.situacion, f.fecha_creacion, f.fecha_cierre,
           (v_asof - f.fecha_creacion)::int AS edad
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
      AND (
        (p_bloque = 'pte_piezas' AND f.situacion = 'Abierto' AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS')
        OR (p_bloque = 'demanda' AND f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to)
      )
      AND (p_clave IS NULL OR COALESCE(f.cliente_wg,'(sin dato)') = p_clave
           OR COALESCE(f.delegacion,'(sin dato)') = p_clave
           OR COALESCE(f.provincia,'(sin dato)') = p_clave
           OR COALESCE(f.sat,'(sin dato)') = p_clave
           OR COALESCE(f.gama_real,'(sin dato)') = p_clave)
  )
  SELECT count(*), COALESCE(jsonb_agg(row_to_json(t)) FILTER (WHERE t.rn > v_off AND t.rn <= v_off + v_lim), '[]'::jsonb)
  INTO v_total, v_rows
  FROM (SELECT b.*, row_number() OVER (ORDER BY edad DESC NULLS LAST, num_ot) rn FROM base b) t;

  RETURN jsonb_build_object('as_of', v_asof, 'total', v_total, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_supply_detalle(
  p_bloque text DEFAULT 'pte_piezas', p_clave text DEFAULT NULL,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  RETURN public.ops_supply_detalle_impl(p_bloque,p_clave,p_from,p_to,p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal,p_limit,p_offset);
END;
$function$;

COMMENT ON FUNCTION public.ops_supply(date,date,text,text,text,text,text,text,text,text,text,date,date) IS 'DEPRECATED: usar ops_supply_resumen / ops_supply_detalle';
COMMENT ON FUNCTION public.ops_panorama(date,date,text,text,text,text,text,text,text,text,text,integer) IS 'DEPRECATED para primer pintado: usar ops_panorama_resumen + ops_panorama_series';

REVOKE ALL ON FUNCTION public.ops_panorama_resumen_impl(date,date,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_panorama_series_impl(date,date,text,text,text,text,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_supply_resumen_impl(date,date,text,text,text,text,text,text,text,text,text,date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_supply_detalle_impl(text,text,date,date,text,text,text,text,text,text,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ops_panorama_resumen(date,date,text,text,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_panorama_series(date,date,text,text,text,text,text,text,text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_supply_resumen(date,date,text,text,text,text,text,text,text,text,text,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_supply_detalle(text,text,date,date,text,text,text,text,text,text,text,text,text,integer,integer) TO authenticated;