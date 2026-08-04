CREATE OR REPLACE FUNCTION public.ops_sla(
  p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date,
  p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text,
  p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text,
  p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text,
  p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_len int;
  v_prev_from date;
  v_prev_to date;
  v_snap_prev date;
  v jsonb;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_prev_from := (v_from - v_len)::date;
  v_prev_to := (v_from - 1)::date;
  v_snap_prev := (CURRENT_DATE - v_len)::date;

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
  ab AS (
    SELECT f.*, (CURRENT_DATE - f.fecha_creacion)::int AS edad
    FROM filtrada f WHERE f.situacion = 'Abierto'
  ),
  periodo AS (
    SELECT * FROM filtrada WHERE situacion IN ('Cerrado','Baja')
      AND fecha_cierre BETWEEN v_from AND v_to
  ),
  periodo_prev AS (
    SELECT * FROM filtrada WHERE situacion IN ('Cerrado','Baja')
      AND fecha_cierre BETWEEN v_prev_from AND v_prev_to
  ),
  tramos AS (
    SELECT COUNT(*) FILTER (WHERE dias_cierre <= 10) AS t0_10,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 11 AND 20) AS t11_20,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 21 AND 30) AS t21_30,
      COUNT(*) FILTER (WHERE dias_cierre > 30) AS t_30_plus,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE kpi_20d) AS n_sla20,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo
  ),
  sla_prev AS (
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo_prev
  ),
  flujo AS (
    SELECT
      (SELECT COUNT(*) FROM filtrada WHERE fecha_creacion BETWEEN v_from AND v_to) AS creadas,
      (SELECT COUNT(*) FROM filtrada WHERE fecha_creacion BETWEEN v_prev_from AND v_prev_to) AS creadas_prev,
      (SELECT COUNT(*) FROM periodo) AS cerradas,
      (SELECT COUNT(*) FROM periodo_prev) AS cerradas_prev
  ),
  snap AS (
    SELECT COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      COUNT(*) FILTER (WHERE edad > 60) AS n60,
      COUNT(*) FILTER (WHERE estado IS NULL OR estado = '') AS sin_estado
    FROM ab
  ),
  snap_prev AS (
    SELECT COUNT(*) AS abiertas,
      ROUND(AVG(v_snap_prev - fecha_creacion)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE (v_snap_prev - fecha_creacion) > 30) AS n30,
      COUNT(*) FILTER (WHERE (v_snap_prev - fecha_creacion) > 60) AS n60
    FROM filtrada
    WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_snap_prev
      AND (fecha_cierre IS NULL OR fecha_cierre > v_snap_prev)
  ),
  bucket_rows AS (
    SELECT CASE
        WHEN GREATEST(edad,0) <= 5 THEN '0-5'
        WHEN edad BETWEEN 6 AND 10 THEN '6-10'
        WHEN edad BETWEEN 11 AND 20 THEN '11-20'
        WHEN edad BETWEEN 21 AND 30 THEN '21-30'
        WHEN edad BETWEEN 31 AND 45 THEN '31-45'
        WHEN edad BETWEEN 46 AND 60 THEN '46-60'
        ELSE '>60' END AS bucket,
      COALESCE(NULLIF(estado,''),'(sin estado)') AS est
    FROM ab
  ),
  buckets AS (
    SELECT b.bucket, COUNT(*) AS total,
      (SELECT s.est FROM (
          SELECT br2.est, COUNT(*) AS cn FROM bucket_rows br2 WHERE br2.bucket = b.bucket
          GROUP BY br2.est ORDER BY cn DESC, br2.est LIMIT 1
        ) s) AS estado_pred,
      (SELECT s.cn FROM (
          SELECT br2.est, COUNT(*) AS cn FROM bucket_rows br2 WHERE br2.bucket = b.bucket
          GROUP BY br2.est ORDER BY cn DESC, br2.est LIMIT 1
        ) s) AS estado_pred_n
    FROM bucket_rows b GROUP BY b.bucket
  ),
  etapas AS (
    SELECT COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      COUNT(*) FILTER (WHERE edad > 60) AS n60
    FROM ab GROUP BY 1
  ),
  del_base AS (
    SELECT ab.*, COALESCE(NULLIF(ab.delegacion,''),'Red SAT externa') AS dele FROM ab
  ),
  deleg AS (
    SELECT dele,
      COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      COUNT(*) FILTER (WHERE edad > 60) AS n60
    FROM del_base GROUP BY dele
  ),
  deleg_ot AS (
    SELECT DISTINCT ON (dele) dele, num_ot, edad
    FROM del_base ORDER BY dele, edad DESC, num_ot
  ),
  deleg_etapa AS (
    SELECT DISTINCT ON (dele) dele, estado_dom, n_dom FROM (
      SELECT dele, COALESCE(NULLIF(estado,''),'(sin estado)') AS estado_dom, COUNT(*) AS n_dom
      FROM del_base WHERE edad > 30 GROUP BY 1,2
    ) s ORDER BY dele, n_dom DESC, estado_dom
  ),
  deleg_sla AS (
    SELECT COALESCE(NULLIF(delegacion,''),'Red SAT externa') AS dele,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo GROUP BY 1
  ),
  deleg_final AS (
    SELECT d.dele AS delegacion, d.abiertas, d.edad_media, d.n30, d.n60,
      o.edad AS dias_mas_antigua, o.num_ot AS ot_mas_antigua,
      e.estado_dom, e.n_dom,
      COALESCE(s.cerradas, 0) AS cerradas, s.pct_sla20
    FROM deleg d
    LEFT JOIN deleg_ot o ON o.dele = d.dele
    LEFT JOIN deleg_etapa e ON e.dele = d.dele
    LEFT JOIN deleg_sla s ON s.dele = d.dele
  ),
  tec AS (
    SELECT tecnico,
      MAX(delegacion) AS delegacion,
      COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM ab WHERE tecnico IS NOT NULL GROUP BY tecnico
  ),
  tec_sla AS (
    SELECT tecnico,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo WHERE tecnico IS NOT NULL GROUP BY tecnico
  ),
  tecnicos AS (
    SELECT t.tecnico, t.delegacion, t.abiertas, t.edad_media, t.n30,
      COALESCE(s.cerradas,0) AS cerradas, s.pct_sla20
    FROM tec t LEFT JOIN tec_sla s ON s.tecnico = t.tecnico
    ORDER BY t.n30 DESC, t.abiertas DESC
    LIMIT 100
  ),
  tec_etapas AS (
    SELECT tecnico, COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM ab WHERE tecnico IS NOT NULL
    GROUP BY 1,2
  ),
  cli AS (
    SELECT cliente_wg AS cliente,
      COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      MAX(edad) AS dias_mas_antigua
    FROM ab WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  cli_sla AS (
    SELECT cliente_wg AS cliente, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  cli_prev AS (
    SELECT cliente_wg AS cliente, COUNT(*) AS cerradas_prev,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS sla_prev
    FROM periodo_prev WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  clientes AS (
    SELECT c.cliente, c.abiertas, c.edad_media, c.n30, c.dias_mas_antigua,
      COALESCE(s.cerradas,0) AS cerradas, COALESCE(p.cerradas_prev,0) AS cerradas_prev,
      s.pct_sla20, p.sla_prev
    FROM cli c
    LEFT JOIN cli_sla s ON s.cliente = c.cliente
    LEFT JOIN cli_prev p ON p.cliente = c.cliente
    ORDER BY c.n30 DESC, c.abiertas DESC
    LIMIT 30
  ),
  prod AS (
    SELECT dim, valor,
      COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM (
      SELECT 'gama'::text AS dim, gama_real AS valor, edad FROM ab WHERE gama_real IS NOT NULL AND gama_real <> ''
      UNION ALL
      SELECT 'familia', familia, edad FROM ab WHERE familia IS NOT NULL AND familia <> ''
      UNION ALL
      SELECT 'marca', marca, edad FROM ab WHERE marca IS NOT NULL AND marca <> '' AND marca <> 'SIN MARCA'
    ) x GROUP BY dim, valor
    HAVING COUNT(*) >= 5
  ),
  meses AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '11 months', date_trunc('month', CURRENT_DATE), '1 month')::date AS mes
  ),
  evo AS (
    SELECT m.mes,
      COUNT(f.id) AS abiertas,
      ROUND(AVG(((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion)::numeric,1) AS edad_media,
      COUNT(f.id) FILTER (WHERE (((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion) > 30) AS n30
    FROM meses m
    LEFT JOIN filtrada f ON f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY m.mes
  ),
  meses6 AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month')::date AS mes
  ),
  evo_deleg AS (
    SELECT COALESCE(NULLIF(f.delegacion,''),'Red SAT externa') AS delegacion, m.mes,
      COUNT(f.id) AS abiertas,
      ROUND(AVG(((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion)::numeric,1) AS edad_media
    FROM meses6 m
    LEFT JOIN filtrada f ON f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY 1, m.mes
  ),
  meses4 AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '3 months', date_trunc('month', CURRENT_DATE), '1 month')::date AS mes
  ),
  top_tecs AS (
    SELECT tecnico, COUNT(*) AS n FROM ab WHERE tecnico IS NOT NULL
    GROUP BY tecnico ORDER BY n DESC LIMIT 50
  ),
  evo_tec AS (
    SELECT tt.tecnico, m.mes, COUNT(f.id) AS abiertas
    FROM meses4 m
    CROSS JOIN top_tecs tt
    LEFT JOIN filtrada f ON f.tecnico = tt.tecnico
      AND f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY tt.tecnico, m.mes
  ),
  cal AS (
    SELECT
      COUNT(*) FILTER (WHERE estado IS NULL OR estado = '') AS sin_estado,
      COUNT(*) FILTER (WHERE edad < 0) AS edad_negativa,
      (SELECT COUNT(*) FROM filtrada
        WHERE situacion IN ('Cerrado','Baja')
          AND fecha_cierre IS NOT NULL AND fecha_creacion IS NOT NULL
          AND fecha_cierre < fecha_creacion) AS cierre_prev_apertura,
      COUNT(*) FILTER (WHERE tipo_recurso = 'Tecnico propio' AND (delegacion IS NULL OR delegacion = '')) AS propios_sin_delegacion,
      COUNT(*) FILTER (WHERE tipo_recurso = 'Tecnico propio' AND tecnico IS NULL) AS propios_sin_tecnico,
      COUNT(*) FILTER (WHERE tipo_recurso = 'SAT externo' AND (delegacion IS NULL OR delegacion = '')) AS red_sat_sin_delegacion
    FROM ab
  ),
  dup AS (
    SELECT COUNT(*) AS n FROM (
      SELECT num_ot FROM ab GROUP BY num_ot HAVING COUNT(*) > 1
    ) s
  ),
  abiertas_list AS (
    SELECT num_ot, cliente_wg, familia, provincia, tecnico, sat, delegacion,
      COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      fecha_creacion, edad AS dias_abierta
    FROM ab ORDER BY fecha_creacion ASC NULLS LAST LIMIT 500
  ),
  prov_30 AS (
    SELECT provincia, COUNT(*) AS n FROM ab
    WHERE provincia IS NOT NULL AND edad > 30
    GROUP BY provincia ORDER BY n DESC LIMIT 20
  ),
  sat_30 AS (
    SELECT sat, COUNT(*) AS n FROM ab
    WHERE sat IS NOT NULL AND edad > 30
    GROUP BY sat ORDER BY n DESC LIMIT 20
  )
  SELECT jsonb_build_object(
    'tramos', (SELECT row_to_json(tramos) FROM tramos),
    'sla_prev', (SELECT row_to_json(sla_prev) FROM sla_prev),
    'flujo', (SELECT row_to_json(flujo) FROM flujo),
    'snapshot', (SELECT row_to_json(snap) FROM snap),
    'snapshot_prev', (SELECT row_to_json(snap_prev) FROM snap_prev),
    'buckets', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM buckets) e), '[]'::jsonb),
    'etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM etapas ORDER BY n DESC) e), '[]'::jsonb),
    'delegaciones', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM deleg_final ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM tecnicos ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'tec_etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM tec_etapas e), '[]'::jsonb),
    'clientes', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM clientes ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'producto', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM prod ORDER BY dim, n30 DESC) e), '[]'::jsonb),
    'evo', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo ORDER BY mes) e), '[]'::jsonb),
    'evo_deleg', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_deleg ORDER BY delegacion, mes) e), '[]'::jsonb),
    'evo_tec', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_tec ORDER BY tecnico, mes) e), '[]'::jsonb),
    'calidad', (SELECT row_to_json(cal)::jsonb FROM cal) || jsonb_build_object('duplicados_abiertas', (SELECT n FROM dup)),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM abiertas_list e), '[]'::jsonb),
    'prov_30', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM prov_30 ORDER BY n DESC) e), '[]'::jsonb),
    'sat_30', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM sat_30 ORDER BY n DESC) e), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;