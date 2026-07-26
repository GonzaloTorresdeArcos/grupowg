-- Fix: cerradas = situacion IN ('Cerrado','Baja'). Una Baja es un cierre.

CREATE OR REPLACE FUNCTION public.ops_kpis(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false
      AND (p_delegacion IS NULL OR delegacion = p_delegacion)
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_origen = p_gama)
      AND (p_familia IS NULL OR familia = p_familia)
      AND (p_provincia IS NULL OR provincia = p_provincia)
      AND (p_sat IS NULL OR sat = p_sat)
      AND (p_tecnico IS NULL OR tecnico = p_tecnico)
      AND (p_canal IS NULL OR canal = p_canal)
  ),
  cerradas_periodo AS (
    SELECT * FROM base
    WHERE situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR fecha_cierre >= p_from)
      AND (p_to IS NULL OR fecha_cierre <= p_to)
  ),
  creadas_periodo AS (
    SELECT * FROM base
    WHERE (p_from IS NULL OR fecha_creacion >= p_from)
      AND (p_to IS NULL OR fecha_creacion <= p_to)
  ),
  abiertas AS (SELECT * FROM base WHERE situacion = 'Abierto')
  SELECT jsonb_build_object(
    'creadas', (SELECT COUNT(*) FROM creadas_periodo),
    'cerradas', (SELECT COUNT(*) FROM cerradas_periodo),
    'bajas', (SELECT COUNT(*) FROM cerradas_periodo WHERE es_baja),
    'nff', (SELECT COUNT(*) FROM cerradas_periodo WHERE es_nff),
    'pct_bajas', (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE es_baja)::numeric/COUNT(*) ELSE 0 END FROM cerradas_periodo),
    'pct_nff', (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE es_nff)::numeric/COUNT(*) ELSE 0 END FROM cerradas_periodo),
    'pct_sla20', (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE kpi_20d)::numeric/COUNT(*) ELSE 0 END FROM cerradas_periodo),
    'pct_sla30', (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE kpi_30d)::numeric/COUNT(*) ELSE 0 END FROM cerradas_periodo),
    'dias_medio', (SELECT COALESCE(AVG(dias_cierre), 0) FROM cerradas_periodo WHERE dias_cierre IS NOT NULL AND dias_cierre > 0),
    'abiertas_total', (SELECT COUNT(*) FROM abiertas),
    'abiertas_30', (SELECT COUNT(*) FROM abiertas WHERE fecha_creacion IS NOT NULL AND (CURRENT_DATE - fecha_creacion) > 30),
    'abiertas_20', (SELECT COUNT(*) FROM abiertas WHERE fecha_creacion IS NOT NULL AND (CURRENT_DATE - fecha_creacion) > 20),
    'coste_sat_total', (SELECT COALESCE(SUM(fact_sat),0) FROM cerradas_periodo),
    'coste_sat_medio', (SELECT CASE WHEN COUNT(*)>0 THEN COALESCE(SUM(fact_sat),0)/COUNT(*) ELSE 0 END FROM cerradas_periodo),
    'balance', (SELECT COUNT(*) FROM creadas_periodo) - (SELECT COUNT(*) FROM cerradas_periodo)
  ) INTO v_result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_evolucion(
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL
) RETURNS TABLE(mes date, creadas bigint, cerradas bigint, pct_sla20 numeric, pct_bajas numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH meses AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '17 months', date_trunc('month', CURRENT_DATE), '1 month')::date AS mes
  ),
  base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false
      AND (p_delegacion IS NULL OR delegacion = p_delegacion)
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_origen = p_gama)
      AND (p_familia IS NULL OR familia = p_familia)
      AND (p_provincia IS NULL OR provincia = p_provincia)
      AND (p_sat IS NULL OR sat = p_sat)
      AND (p_tecnico IS NULL OR tecnico = p_tecnico)
      AND (p_canal IS NULL OR canal = p_canal)
  )
  SELECT
    m.mes,
    (SELECT COUNT(*) FROM base WHERE date_trunc('month', fecha_creacion)::date = m.mes) AS creadas,
    (SELECT COUNT(*) FROM base WHERE situacion IN ('Cerrado','Baja') AND date_trunc('month', fecha_cierre)::date = m.mes) AS cerradas,
    (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE kpi_20d)::numeric/COUNT(*) ELSE 0 END
       FROM base WHERE situacion IN ('Cerrado','Baja') AND date_trunc('month', fecha_cierre)::date = m.mes) AS pct_sla20,
    (SELECT CASE WHEN COUNT(*)>0 THEN COUNT(*) FILTER (WHERE es_baja)::numeric/COUNT(*) ELSE 0 END
       FROM base WHERE situacion IN ('Cerrado','Baja') AND date_trunc('month', fecha_cierre)::date = m.mes) AS pct_bajas
  FROM meses m
  ORDER BY m.mes;
$$;

CREATE OR REPLACE FUNCTION public.ops_tecnicos_scorecard(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_canal text DEFAULT NULL
) RETURNS TABLE(
  tecnico text, delegacion text, grupo text, activo boolean, motivo_inactivo text,
  cerradas bigint, cerradas_prev bigint, delta_pct numeric,
  pct_bajas numeric, pct_bajas_esp numeric,
  pct_nff numeric, pct_nff_esp numeric,
  dias_medio numeric, pct_sla20 numeric,
  mix_top text, score integer
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_prev_from date := (v_from - (v_to - v_from + 1))::date;
  v_prev_to date := (v_from - 1)::date;
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT f.* FROM public.ops_fact_ot f
    WHERE es_anulado = false AND f.tecnico IS NOT NULL
      AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR f.gama_origen = p_gama)
      AND (p_familia IS NULL OR f.familia = p_familia)
      AND (p_provincia IS NULL OR f.provincia = p_provincia)
      AND (p_sat IS NULL OR f.sat = p_sat)
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  periodo AS (
    SELECT * FROM base WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_from AND v_to
  ),
  prev AS (
    SELECT tecnico, COUNT(*) AS n FROM base
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_prev_from AND v_prev_to
    GROUP BY tecnico
  ),
  bench_map AS (
    SELECT familia, cliente_wg, AVG(pct_bajas) AS pb, AVG(pct_nff) AS pn
    FROM public.ops_benchmark GROUP BY familia, cliente_wg
  ),
  tec_agg AS (
    SELECT
      p.tecnico,
      COALESCE(MAX(p.delegacion), '') AS delegacion,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE p.es_baja)::numeric / COUNT(*) AS pct_bajas,
      COUNT(*) FILTER (WHERE p.es_nff)::numeric / COUNT(*) AS pct_nff,
      COALESCE(AVG(p.dias_cierre) FILTER (WHERE p.dias_cierre > 0), 0) AS dias_medio,
      COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / COUNT(*) AS pct_sla20
    FROM periodo p GROUP BY p.tecnico
  ),
  tec_esp AS (
    SELECT p.tecnico,
      SUM(COALESCE(bm.pb,0)) / NULLIF(SUM(1),0) / 100.0 AS pct_bajas_esp,
      SUM(COALESCE(bm.pn,0)) / NULLIF(SUM(1),0) / 100.0 AS pct_nff_esp
    FROM periodo p
    LEFT JOIN bench_map bm ON bm.familia = p.familia AND bm.cliente_wg = p.cliente_wg
    GROUP BY p.tecnico
  ),
  tec_mix AS (
    SELECT tecnico, string_agg(familia, ', ' ORDER BY n DESC) AS mix_top
    FROM (
      SELECT tecnico, familia, COUNT(*) AS n,
        ROW_NUMBER() OVER (PARTITION BY tecnico ORDER BY COUNT(*) DESC) AS rn
      FROM periodo WHERE familia IS NOT NULL GROUP BY tecnico, familia
    ) s WHERE rn <= 3 GROUP BY tecnico
  ),
  merged AS (
    SELECT
      ta.tecnico, ta.delegacion,
      CASE WHEN ta.delegacion = 'Central San Agustin' THEN 'Central' ELSE 'Delegaciones' END AS grupo,
      COALESCE(t.activo, true) AS activo, t.motivo_inactivo,
      ta.cerradas, COALESCE(pv.n, 0) AS cerradas_prev,
      CASE WHEN COALESCE(pv.n,0) > 0 THEN (ta.cerradas - pv.n)::numeric / pv.n ELSE NULL END AS delta_pct,
      ta.pct_bajas, COALESCE(te.pct_bajas_esp, 0) AS pct_bajas_esp,
      ta.pct_nff, COALESCE(te.pct_nff_esp, 0) AS pct_nff_esp,
      ta.dias_medio, ta.pct_sla20,
      COALESCE(tm.mix_top, '') AS mix_top
    FROM tec_agg ta
    LEFT JOIN prev pv ON pv.tecnico = ta.tecnico
    LEFT JOIN tec_esp te ON te.tecnico = ta.tecnico
    LEFT JOIN tec_mix tm ON tm.tecnico = ta.tecnico
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = ta.tecnico
  ),
  ranked AS (
    SELECT m.*,
      PERCENT_RANK() OVER (PARTITION BY grupo ORDER BY cerradas) AS pct_cerradas,
      PERCENT_RANK() OVER (PARTITION BY grupo ORDER BY dias_medio DESC) AS pct_dias_inv,
      CASE
        WHEN (pct_bajas_esp + pct_nff_esp) > 0
        THEN GREATEST(0, LEAST(1, 1 - ((pct_bajas + pct_nff) - (pct_bajas_esp + pct_nff_esp)) / GREATEST(0.01, (pct_bajas_esp + pct_nff_esp))))
        ELSE 0.5
      END AS calidad_rel
    FROM merged m WHERE activo
  )
  SELECT
    r.tecnico, r.delegacion, r.grupo, r.activo, r.motivo_inactivo,
    r.cerradas, r.cerradas_prev, r.delta_pct,
    r.pct_bajas, r.pct_bajas_esp, r.pct_nff, r.pct_nff_esp,
    r.dias_medio, r.pct_sla20, r.mix_top,
    ROUND((r.pct_cerradas * 30 + r.pct_sla20 * 30 + r.calidad_rel * 30 + r.pct_dias_inv * 10))::integer AS score
  FROM ranked r
  UNION ALL
  SELECT
    m.tecnico, m.delegacion, m.grupo, m.activo, m.motivo_inactivo,
    m.cerradas, m.cerradas_prev, m.delta_pct,
    m.pct_bajas, m.pct_bajas_esp, m.pct_nff, m.pct_nff_esp,
    m.dias_medio, m.pct_sla20, m.mix_top,
    NULL::integer AS score
  FROM merged m WHERE NOT m.activo
  ORDER BY activo DESC NULLS LAST, score DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_tecnico_ficha(p_tecnico text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  WITH base AS (SELECT * FROM public.ops_fact_ot WHERE es_anulado = false AND tecnico = p_tecnico),
  evo AS (
    SELECT date_trunc('month', fecha_cierre)::date AS mes,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas
    FROM base WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY 1 ORDER BY 1
  ),
  canal AS (
    SELECT COALESCE(canal,'—') AS canal, COUNT(*) AS n,
      AVG(importe_desplazamiento) FILTER (WHERE importe_desplazamiento IS NOT NULL) AS desp_medio,
      AVG(dias_cierre) FILTER (WHERE dias_cierre > 0) AS dias_medio
    FROM base WHERE situacion IN ('Cerrado','Baja') GROUP BY canal
  ),
  mix AS (
    SELECT b.familia, b.cliente_wg, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) AS pct_bajas,
      AVG(bm.pct_bajas)/100.0 AS pct_bajas_esp,
      COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) AS pct_nff,
      AVG(bm.pct_nff)/100.0 AS pct_nff_esp
    FROM base b LEFT JOIN public.ops_benchmark bm
      ON bm.familia = b.familia AND bm.cliente_wg = b.cliente_wg
    WHERE b.situacion IN ('Cerrado','Baja') AND b.familia IS NOT NULL
    GROUP BY b.familia, b.cliente_wg
    ORDER BY n DESC LIMIT 10
  ),
  abiertas AS (
    SELECT num_ot, cliente_wg, familia, provincia, fecha_creacion,
      (CURRENT_DATE - fecha_creacion) AS dias_abierta
    FROM base WHERE situacion='Abierto'
    ORDER BY fecha_creacion ASC NULLS LAST LIMIT 100
  )
  SELECT jsonb_build_object(
    'evolucion', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo), '[]'::jsonb),
    'canal', COALESCE((SELECT jsonb_agg(row_to_json(canal)) FROM canal), '[]'::jsonb),
    'mix', COALESCE((SELECT jsonb_agg(row_to_json(mix)) FROM mix), '[]'::jsonb),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(abiertas)) FROM abiertas), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_alertas(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_prev_from date := (v_from - (v_to - v_from + 1))::date;
  v_prev_to date := (v_from - 1)::date;
  v jsonb;
BEGIN
  WITH caidas AS (
    SELECT f.tecnico,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to) AS n_now,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) AS n_prev
    FROM public.ops_fact_ot f
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = f.tecnico
    WHERE f.es_anulado=false AND f.situacion IN ('Cerrado','Baja') AND f.tecnico IS NOT NULL
      AND COALESCE(t.activo, true)
    GROUP BY f.tecnico
    HAVING COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) >= 10
       AND COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to), 0) < 0.6
    ORDER BY (n_now::numeric / NULLIF(n_prev,0)) ASC LIMIT 10
  ),
  calidad AS (
    SELECT b.tecnico, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) AS pct_bajas,
      AVG(bm.pct_bajas)/100.0 AS pct_bajas_esp,
      COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) AS pct_nff,
      AVG(bm.pct_nff)/100.0 AS pct_nff_esp
    FROM public.ops_fact_ot b
    LEFT JOIN public.ops_benchmark bm ON bm.familia = b.familia AND bm.cliente_wg = b.cliente_wg
    WHERE b.es_anulado=false AND b.situacion IN ('Cerrado','Baja') AND b.tecnico IS NOT NULL
      AND b.fecha_cierre BETWEEN v_from AND v_to
    GROUP BY b.tecnico
    HAVING COUNT(*) >= 20
       AND (COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_bajas)/100.0, 0)
         OR COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_nff)/100.0, 0))
    LIMIT 10
  ),
  provincias AS (
    SELECT provincia, COUNT(*) AS abiertas_30
    FROM public.ops_fact_ot
    WHERE es_anulado=false AND situacion='Abierto' AND provincia IS NOT NULL
      AND (CURRENT_DATE - fecha_creacion) > 30
    GROUP BY provincia
    ORDER BY abiertas_30 DESC LIMIT 8
  )
  SELECT jsonb_build_object(
    'caidas', COALESCE((SELECT jsonb_agg(row_to_json(caidas)) FROM caidas), '[]'::jsonb),
    'calidad', COALESCE((SELECT jsonb_agg(row_to_json(calidad)) FROM calidad), '[]'::jsonb),
    'provincias', COALESCE((SELECT jsonb_agg(row_to_json(provincias)) FROM provincias), '[]'::jsonb)
  ) INTO v; RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_delegaciones(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false AND delegacion IS NOT NULL AND delegacion <> ''
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_origen = p_gama)
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
      COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) AS abiertas_30
    FROM base WHERE situacion='Abierto' GROUP BY delegacion
  ),
  evo AS (
    SELECT delegacion, date_trunc('month', fecha_cierre)::date AS mes, COUNT(*) AS cerradas
    FROM base WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY 1,2 ORDER BY 1,2
  ),
  tecs AS (
    SELECT p.delegacion, p.tecnico, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo p WHERE p.tecnico IS NOT NULL GROUP BY 1,2 ORDER BY 1, cerradas DESC
  )
  SELECT jsonb_build_object(
    'kpis', (SELECT jsonb_agg(row_to_json(k) || jsonb_build_object(
        'abiertas', COALESCE(a.abiertas, 0),
        'abiertas_30', COALESCE(a.abiertas_30, 0)))
      FROM kpis k LEFT JOIN abiertas a ON a.delegacion = k.delegacion),
    'evo', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo), '[]'::jsonb),
    'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(tecs)) FROM tecs), '[]'::jsonb)
  ) INTO v; RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_sla(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL,
  p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false
      AND (p_delegacion IS NULL OR delegacion = p_delegacion)
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_origen = p_gama)
      AND (p_familia IS NULL OR familia = p_familia)
      AND (p_provincia IS NULL OR provincia = p_provincia)
      AND (p_sat IS NULL OR sat = p_sat)
      AND (p_tecnico IS NULL OR tecnico = p_tecnico)
      AND (p_canal IS NULL OR canal = p_canal)
  ),
  periodo AS (
    SELECT * FROM base WHERE situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR fecha_cierre >= p_from)
      AND (p_to IS NULL OR fecha_cierre <= p_to)
  ),
  tramos AS (
    SELECT
      COUNT(*) FILTER (WHERE dias_cierre <= 10) AS t0_10,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 11 AND 20) AS t11_20,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 21 AND 30) AS t21_30,
      COUNT(*) FILTER (WHERE dias_cierre > 30) AS t_30_plus,
      COUNT(*) AS total
    FROM periodo
  ),
  abiertas AS (
    SELECT num_ot, cliente_wg, familia, provincia, tecnico, sat, delegacion, fecha_creacion,
      (CURRENT_DATE - fecha_creacion) AS dias_abierta
    FROM base WHERE situacion='Abierto'
    ORDER BY fecha_creacion ASC NULLS LAST LIMIT 500
  ),
  prov_30 AS (
    SELECT provincia, COUNT(*) AS n FROM base
    WHERE situacion='Abierto' AND provincia IS NOT NULL
      AND (CURRENT_DATE - fecha_creacion) > 30
    GROUP BY provincia ORDER BY n DESC LIMIT 20
  ),
  sat_30 AS (
    SELECT sat, COUNT(*) AS n FROM base
    WHERE situacion='Abierto' AND sat IS NOT NULL
      AND (CURRENT_DATE - fecha_creacion) > 30
    GROUP BY sat ORDER BY n DESC LIMIT 20
  )
  SELECT jsonb_build_object(
    'tramos', (SELECT row_to_json(tramos) FROM tramos),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(abiertas)) FROM abiertas), '[]'::jsonb),
    'prov_30', COALESCE((SELECT jsonb_agg(row_to_json(prov_30)) FROM prov_30), '[]'::jsonb),
    'sat_30', COALESCE((SELECT jsonb_agg(row_to_json(sat_30)) FROM sat_30), '[]'::jsonb)
  ) INTO v; RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ops_sats_ranking(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL,
  p_familia text DEFAULT NULL, p_provincia text DEFAULT NULL
) RETURNS TABLE(
  sat text, cerradas bigint, abiertas bigint, pct_sla20 numeric,
  pct_bajas numeric, pct_nff numeric, dias_medio numeric,
  coste_medio numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH base AS (
    SELECT * FROM public.ops_fact_ot
    WHERE es_anulado = false AND tipo_recurso = 'SAT externo' AND sat IS NOT NULL
      AND (p_cliente IS NULL OR cliente_wg = p_cliente)
      AND (p_gama IS NULL OR gama_origen = p_gama)
      AND (p_familia IS NULL OR familia = p_familia)
      AND (p_provincia IS NULL OR provincia = p_provincia)
  ),
  periodo AS (
    SELECT * FROM base WHERE situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR fecha_cierre >= p_from)
      AND (p_to IS NULL OR fecha_cierre <= p_to)
  ),
  abiertas AS (
    SELECT sat, COUNT(*) AS n FROM base WHERE situacion='Abierto' GROUP BY sat
  )
  SELECT p.sat,
    COUNT(*) AS cerradas,
    COALESCE(a.n, 0) AS abiertas,
    COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20,
    COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas,
    COUNT(*) FILTER (WHERE es_nff)::numeric / NULLIF(COUNT(*),0) AS pct_nff,
    AVG(dias_cierre) FILTER (WHERE dias_cierre > 0) AS dias_medio,
    AVG(fact_sat) FILTER (WHERE fact_sat IS NOT NULL) AS coste_medio
  FROM periodo p LEFT JOIN abiertas a ON a.sat = p.sat
  GROUP BY p.sat, a.n
  HAVING COUNT(*) >= 30
  ORDER BY cerradas DESC;
$$;