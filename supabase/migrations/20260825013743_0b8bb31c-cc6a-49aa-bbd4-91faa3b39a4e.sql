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
    FROM base WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre >= (public.ops_as_of('ot') - INTERVAL '12 months')
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
      (public.ops_as_of('ot') - fecha_creacion) AS dias_abierta
    FROM base WHERE situacion='Abierto'
    ORDER BY fecha_creacion ASC NULLS LAST LIMIT 100
  ),
  abiertas_prov AS (
    SELECT COALESCE(NULLIF(provincia,''),'—') AS provincia,
      COUNT(*) AS n_total,
      COUNT(*) FILTER (WHERE (public.ops_as_of('ot') - fecha_creacion) > 30) AS n_30
    FROM base WHERE situacion='Abierto'
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE (public.ops_as_of('ot') - fecha_creacion) > 30) > 0
    ORDER BY n_30 DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'evolucion', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM evo e), '[]'::jsonb),
    'canal', COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM canal c), '[]'::jsonb),
    'mix', COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM mix m), '[]'::jsonb),
    'bajas_marca', COALESCE((SELECT jsonb_agg(row_to_json(bm2)) FROM bajas_marca bm2), '[]'::jsonb),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(ab)) FROM abiertas ab), '[]'::jsonb),
    'abiertas_prov', COALESCE((SELECT jsonb_agg(row_to_json(ap)) FROM abiertas_prov ap), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $function$;

NOTIFY pgrst, 'reload schema';