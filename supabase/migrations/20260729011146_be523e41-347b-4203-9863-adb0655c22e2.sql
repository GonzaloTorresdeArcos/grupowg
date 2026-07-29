
DROP FUNCTION IF EXISTS public.ops_tecnicos_scorecard(date,date,text,text,text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.ops_tecnicos_scorecard(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_canal text DEFAULT NULL::text)
 RETURNS TABLE(tecnico text, delegacion text, grupo text, gama_principal text, activo boolean, motivo_inactivo text, cerradas bigint, cerradas_prev bigint, delta_pct numeric, pct_bajas numeric, pct_bajas_esp numeric, pct_nff numeric, pct_nff_esp numeric, dias_medio numeric, pct_sla20 numeric, mix_top text, score integer, abiertas_total bigint, abiertas_30 bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_prev_from date;
  v_prev_to date;
BEGIN
  v_prev_from := (v_from - (v_to - v_from + 1))::date;
  v_prev_to := (v_from - 1)::date;
  RETURN QUERY
  WITH base AS (
    SELECT f.* FROM public.ops_fact_ot f
    WHERE f.es_anulado = false AND f.tecnico IS NOT NULL
      AND f.tipo_recurso = 'Tecnico propio'
      AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR f.gama_real = p_gama)
      AND (p_familia IS NULL OR f.familia = p_familia)
      AND (p_marca IS NULL OR f.marca = p_marca)
      AND (p_provincia IS NULL OR f.provincia = p_provincia)
      AND (p_sat IS NULL OR f.sat = p_sat)
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  periodo AS (
    SELECT * FROM base b WHERE b.situacion IN ('Cerrado','Baja') AND b.fecha_cierre BETWEEN v_from AND v_to
  ),
  prev AS (
    SELECT b.tecnico AS tec, COUNT(*) AS n FROM base b
    WHERE b.situacion IN ('Cerrado','Baja') AND b.fecha_cierre BETWEEN v_prev_from AND v_prev_to
    GROUP BY b.tecnico
  ),
  abier AS (
    SELECT b.tecnico AS tec,
      COUNT(*) AS ab_tot,
      COUNT(*) FILTER (WHERE (CURRENT_DATE - b.fecha_creacion) > 30) AS ab_30
    FROM base b WHERE b.situacion = 'Abierto' GROUP BY b.tecnico
  ),
  bench_map AS (
    SELECT bm.familia AS fam, bm.cliente_wg AS cli, AVG(bm.pct_bajas) AS pb, AVG(bm.pct_nff) AS pn
    FROM public.ops_benchmark bm GROUP BY bm.familia, bm.cliente_wg
  ),
  tec_agg AS (
    SELECT p.tecnico AS tec,
      COALESCE(MAX(p.delegacion), '') AS dele,
      COUNT(*) AS cerr,
      COUNT(*) FILTER (WHERE p.es_baja)::numeric / COUNT(*) AS pb,
      COUNT(*) FILTER (WHERE p.es_nff)::numeric / COUNT(*) AS pn,
      COALESCE(AVG(p.dias_cierre) FILTER (WHERE p.dias_cierre > 0), 0) AS dm,
      COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / COUNT(*) AS sla
    FROM periodo p GROUP BY p.tecnico
  ),
  tec_esp AS (
    SELECT p.tecnico AS tec, AVG(COALESCE(bm.pb,0)) AS pb_esp, AVG(COALESCE(bm.pn,0)) AS pn_esp
    FROM periodo p LEFT JOIN bench_map bm ON bm.fam = p.familia AND bm.cli = p.cliente_wg
    GROUP BY p.tecnico
  ),
  tec_mix AS (
    SELECT s.tec, string_agg(s.fam, ', ' ORDER BY s.n DESC) AS mix
    FROM (
      SELECT p.tecnico AS tec, p.familia AS fam, COUNT(*) AS n,
        ROW_NUMBER() OVER (PARTITION BY p.tecnico ORDER BY COUNT(*) DESC) AS rn
      FROM periodo p WHERE p.familia IS NOT NULL GROUP BY p.tecnico, p.familia
    ) s WHERE s.rn <= 3 GROUP BY s.tec
  ),
  merged AS (
    SELECT ta.tec, ta.dele,
      CASE WHEN ta.dele = 'Central San Agustin' THEN 'Central' ELSE 'Delegaciones' END AS grp,
      t.gama_principal AS gama_principal,
      COALESCE(t.activo, true) AS act, t.motivo_inactivo AS motivo,
      ta.cerr, COALESCE(pv.n, 0) AS cerr_prev,
      CASE WHEN COALESCE(pv.n,0) > 0 THEN (ta.cerr - pv.n)::numeric / pv.n ELSE NULL END AS dlt,
      ta.pb, COALESCE(te.pb_esp, 0) AS pb_esp,
      ta.pn, COALESCE(te.pn_esp, 0) AS pn_esp,
      ta.dm, ta.sla, COALESCE(tm.mix, '') AS mix,
      COALESCE(ab.ab_tot, 0) AS ab_tot, COALESCE(ab.ab_30, 0) AS ab_30
    FROM tec_agg ta
    LEFT JOIN prev pv ON pv.tec = ta.tec
    LEFT JOIN tec_esp te ON te.tec = ta.tec
    LEFT JOIN tec_mix tm ON tm.tec = ta.tec
    LEFT JOIN abier ab ON ab.tec = ta.tec
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = ta.tec
  ),
  ranked AS (
    SELECT m.*,
      PERCENT_RANK() OVER (PARTITION BY m.grp ORDER BY m.cerr) AS pr_cerr,
      PERCENT_RANK() OVER (PARTITION BY m.grp ORDER BY m.dm DESC) AS pr_dias,
      CASE WHEN (m.pb_esp + m.pn_esp) > 0
        THEN GREATEST(0, LEAST(1, 1 - ((m.pb + m.pn) - (m.pb_esp + m.pn_esp)) / GREATEST(0.01, (m.pb_esp + m.pn_esp))))
        ELSE 0.5 END AS calidad
    FROM merged m WHERE m.act
  )
  SELECT r.tec, r.dele, r.grp, r.gama_principal, r.act, r.motivo,
    r.cerr, r.cerr_prev, r.dlt, r.pb, r.pb_esp, r.pn, r.pn_esp, r.dm, r.sla, r.mix,
    ROUND((r.pr_cerr * 30 + r.sla * 30 + r.calidad * 30 + r.pr_dias * 10))::integer,
    r.ab_tot, r.ab_30
  FROM ranked r
  UNION ALL
  SELECT m.tec, m.dele, m.grp, m.gama_principal, m.act, m.motivo,
    m.cerr, m.cerr_prev, m.dlt, m.pb, m.pb_esp, m.pn, m.pn_esp, m.dm, m.sla, m.mix, NULL::integer,
    m.ab_tot, m.ab_30
  FROM merged m WHERE NOT m.act
  ORDER BY 5 DESC, 17 DESC NULLS LAST;
END; $function$;


CREATE OR REPLACE FUNCTION public.ops_tecnico_ficha(p_tecnico text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
  bajas_marca AS (
    SELECT COALESCE(NULLIF(marca,''),'—') AS marca,
      COUNT(*) FILTER (WHERE es_baja) AS bajas,
      COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE es_baja)::numeric / NULLIF(COUNT(*),0) AS pct_bajas
    FROM base WHERE situacion IN ('Cerrado','Baja')
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE es_baja) > 0
    ORDER BY bajas DESC LIMIT 10
  ),
  abiertas AS (
    SELECT num_ot, cliente_wg, familia, provincia, fecha_creacion,
      (CURRENT_DATE - fecha_creacion) AS dias_abierta
    FROM base WHERE situacion='Abierto'
    ORDER BY fecha_creacion ASC NULLS LAST LIMIT 100
  ),
  abiertas_prov AS (
    SELECT COALESCE(NULLIF(provincia,''),'—') AS provincia,
      COUNT(*) AS n_total,
      COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) AS n_30
    FROM base WHERE situacion='Abierto'
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE (CURRENT_DATE - fecha_creacion) > 30) > 0
    ORDER BY n_30 DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'evolucion', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo), '[]'::jsonb),
    'canal', COALESCE((SELECT jsonb_agg(row_to_json(canal)) FROM canal), '[]'::jsonb),
    'mix', COALESCE((SELECT jsonb_agg(row_to_json(mix)) FROM mix), '[]'::jsonb),
    'bajas_marca', COALESCE((SELECT jsonb_agg(row_to_json(bajas_marca)) FROM bajas_marca), '[]'::jsonb),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(abiertas)) FROM abiertas), '[]'::jsonb),
    'abiertas_prov', COALESCE((SELECT jsonb_agg(row_to_json(abiertas_prov)) FROM abiertas_prov), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $function$;
