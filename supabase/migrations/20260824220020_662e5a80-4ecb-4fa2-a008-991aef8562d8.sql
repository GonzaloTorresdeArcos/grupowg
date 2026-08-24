CREATE OR REPLACE FUNCTION public.ops_supply_filtrada(
  p_delegacion text, p_cliente text, p_gama text, p_familia text, p_marca text,
  p_provincia text, p_sat text, p_tecnico text, p_canal text
) RETURNS SETOF public.ops_fact_ot
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
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
$$;
REVOKE ALL ON FUNCTION public.ops_supply_filtrada(text,text,text,text,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_supply_filtrada(text,text,text,text,text,text,text,text,text) TO authenticated, service_role, postgres;

CREATE OR REPLACE FUNCTION public.ops_supply(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL,
  p_familia text DEFAULT NULL, p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL,
  p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_prev_from date DEFAULT NULL, p_prev_to date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_len int; v_pfrom date; v_pto date;
  v_dem jsonb; v_dem_prev jsonb; v_pte jsonb; v_conv jsonb; v_conv_prev jsonb;
  v_expo jsonb; v_cadena jsonb; v_pte_prev bigint;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_pfrom := COALESCE(p_prev_from, (v_from - v_len)::date);
  v_pto := COALESCE(p_prev_to, (v_from - 1)::date);

  WITH per AS (
    SELECT * FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE fecha_creacion BETWEEN v_from AND v_to
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
  FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  WHERE fecha_creacion BETWEEN v_pfrom AND v_pto;

  SELECT count(*) INTO v_pte_prev
  FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  WHERE upper(COALESCE(estado,'')) = 'PTE. PIEZAS'
    AND fecha_creacion IS NOT NULL AND fecha_creacion <= v_pto
    AND (fecha_cierre IS NULL OR fecha_cierre > v_pto);

  WITH base AS (
    SELECT * FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  ),
  pte AS (SELECT b.*, (CURRENT_DATE - b.fecha_creacion)::int edad FROM base b
          WHERE b.situacion = 'Abierto' AND upper(COALESCE(b.estado,'')) = 'PTE. PIEZAS'),
  d(dim, entidad, n, edad_media, n30) AS (
    SELECT 'cliente', COALESCE(cliente_wg,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
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
  ab AS (SELECT count(*) n FROM base WHERE situacion = 'Abierto')
  SELECT jsonb_build_object(
    'n', r.n, 'n_prev', v_pte_prev, 'edad_media', r.em, 'n30', r.n30,
    'abiertas_total', (SELECT n FROM ab),
    'buckets', (SELECT j FROM bk),
    'por_cliente',    COALESCE((SELECT j FROM agg WHERE dim='cliente'), '[]'::jsonb),
    'por_gama',       COALESCE((SELECT j FROM agg WHERE dim='gama'), '[]'::jsonb),
    'por_delegacion', COALESCE((SELECT j FROM agg WHERE dim='delegacion'), '[]'::jsonb),
    'por_sat',        COALESCE((SELECT j FROM agg WHERE dim='sat'), '[]'::jsonb),
    'por_provincia',  COALESCE((SELECT j FROM agg WHERE dim='provincia'), '[]'::jsonb)
  ) INTO v_pte FROM res r;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_from AND v_to GROUP BY 1) t;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv_prev FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_pfrom AND v_pto GROUP BY 1) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('cliente_wg', c, 'n', n, 'n30', n30) ORDER BY n DESC), '[]'::jsonb)
    INTO v_expo FROM (
      SELECT COALESCE(cliente_wg,'(sin dato)') c, count(*) n,
             count(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) n30
      FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
      WHERE situacion = 'Abierto' AND upper(COALESCE(estado,'')) = 'PTE. PIEZAS' GROUP BY 1) t;

  SELECT jsonb_build_object(
    'solicitudes', (SELECT count(*) FROM public.ops_pieza_solicitud),
    'expediciones', (SELECT count(*) FROM public.ops_expedicion),
    'stock_filas', (SELECT count(*) FROM public.ops_stock_snapshot),
    'ots_con_pieza_periodo', (SELECT count(*) FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal) WHERE tiene_piezas IS TRUE AND fecha_creacion BETWEEN v_from AND v_to),
    'ots_con_pieza_trazadas', (SELECT count(DISTINCT f.num_ot) FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal) f JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot WHERE f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to),
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
    'rango', jsonb_build_object('from', v_from, 'to', v_to, 'prev_from', v_pfrom, 'prev_to', v_pto),
    'pieza_demanda', COALESCE(v_dem, '{}'::jsonb),
    'pieza_demanda_prev', COALESCE(v_dem_prev, '{}'::jsonb),
    'pte_piezas_actual', COALESCE(v_pte, '{}'::jsonb),
    'conversion', COALESCE(v_conv, '{}'::jsonb),
    'conversion_prev', COALESCE(v_conv_prev, '{}'::jsonb),
    'exposicion_pieza', COALESCE(v_expo, '[]'::jsonb),
    'cadena', COALESCE(v_cadena, '{}'::jsonb)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ops_supply(date,date,text,text,text,text,text,text,text,text,text,date,date) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_supply(date,date,text,text,text,text,text,text,text,text,text,date,date) TO authenticated, service_role, postgres;

-- Expedición: métricas del período (usadas por /operaciones/logistica)
CREATE OR REPLACE FUNCTION public.ops_logistica(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_prev_from date DEFAULT NULL, p_prev_to date DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH r AS (SELECT COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date) f,
                    COALESCE(p_to, CURRENT_DATE) t),
  rr AS (SELECT f, t, COALESCE(p_prev_from, (f - ((t - f) + 1))::date) pf,
                COALESCE(p_prev_to, (f - 1)::date) pt FROM r),
  cur AS (SELECT e.* FROM public.ops_expedicion e, rr WHERE e.fecha_expedicion::date BETWEEN rr.f AND rr.t),
  prv AS (SELECT e.* FROM public.ops_expedicion e, rr WHERE e.fecha_expedicion::date BETWEEN rr.pf AND rr.pt)
  SELECT jsonb_build_object(
    'total_filas', (SELECT count(*) FROM public.ops_expedicion),
    'periodo', (SELECT jsonb_build_object(
        'n', count(*),
        'entregadas', count(*) FILTER (WHERE estado_expedicion = 'entregada'),
        'incidencias', count(*) FILTER (WHERE estado_expedicion = 'incidencia' OR incidencia IS NOT NULL),
        'otd_n', count(*) FILTER (WHERE fecha_entrega_real IS NOT NULL AND fecha_entrega_prevista IS NOT NULL),
        'otd_ok', count(*) FILTER (WHERE fecha_entrega_real IS NOT NULL AND fecha_entrega_prevista IS NOT NULL AND fecha_entrega_real <= fecha_entrega_prevista),
        'lead_n', count(*) FILTER (WHERE fecha_entrega_real IS NOT NULL AND fecha_expedicion IS NOT NULL),
        'lead_medio', round(avg(EXTRACT(epoch FROM fecha_entrega_real - fecha_expedicion)/86400)::numeric,1),
        'coste_n', count(coste_envio), 'coste_medio', round(avg(coste_envio)::numeric,2)
      ) FROM cur),
    'periodo_prev', (SELECT jsonb_build_object(
        'n', count(*),
        'otd_n', count(*) FILTER (WHERE fecha_entrega_real IS NOT NULL AND fecha_entrega_prevista IS NOT NULL),
        'otd_ok', count(*) FILTER (WHERE fecha_entrega_real IS NOT NULL AND fecha_entrega_prevista IS NOT NULL AND fecha_entrega_real <= fecha_entrega_prevista),
        'coste_medio', round(avg(coste_envio)::numeric,2)
      ) FROM prv),
    'por_transportista', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(transportista,'(sin dato)'), 'n', count(*),
          'incidencias', count(*) FILTER (WHERE estado_expedicion='incidencia' OR incidencia IS NOT NULL),
          'coste_medio', round(avg(coste_envio)::numeric,2)) x FROM cur GROUP BY transportista) s),
    'por_destino', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(destino_tipo,'(sin dato)'), 'n', count(*),
          'coste_medio', round(avg(coste_envio)::numeric,2)) x FROM cur GROUP BY destino_tipo) s)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.ops_logistica(date,date,date,date) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_logistica(date,date,date,date) TO authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';