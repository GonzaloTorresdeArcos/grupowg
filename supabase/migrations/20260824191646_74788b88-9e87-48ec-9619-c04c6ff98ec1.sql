DROP FUNCTION IF EXISTS public.ops_equipos(date, date, text, text);

CREATE FUNCTION public.ops_equipos(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_cliente text DEFAULT NULL::text, p_familia text DEFAULT NULL::text)
 RETURNS TABLE(equipo text, ambito text, tecnicos_activos bigint, cerradas bigint, pct_sla20 numeric, pct_bajas numeric, pct_bajas_esp numeric, pct_nff numeric, pct_nff_esp numeric, dias_medio numeric, coste_medio numeric, despl_medio numeric, abiertas bigint, abiertas_30 bigint, tipo_entidad text, nombre_display text, gama_atendida text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT f.*,
      CASE
        WHEN f.delegacion = 'Central San Agustin' THEN COALESCE(t.gama_principal, 'Central (sin gama)')
        ELSE f.delegacion
      END AS eq,
      CASE WHEN f.delegacion = 'Central San Agustin' THEN 'Central San Agustín' ELSE 'Delegación territorial' END AS amb,
      CASE WHEN f.delegacion = 'Central San Agustin' THEN 'equipo_central' ELSE 'delegacion' END AS tipo_ent,
      t.activo AS tec_activo
    FROM public.ops_fact_ot f
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = f.tecnico
    WHERE f.es_anulado = false
      AND f.tipo_recurso = 'Tecnico propio'
      AND f.delegacion IS NOT NULL AND f.delegacion <> ''
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_familia IS NULL OR f.familia = p_familia)
  ),
  bench AS (
    SELECT bm.familia AS fam, bm.cliente_wg AS cli, AVG(bm.pct_bajas) AS pb, AVG(bm.pct_nff) AS pn
    FROM public.ops_benchmark bm GROUP BY 1,2
  ),
  periodo AS (
    SELECT b.*, be.pb AS pb_esp, be.pn AS pn_esp FROM base b
    LEFT JOIN bench be ON be.fam = b.familia AND be.cli = b.cliente_wg
    WHERE b.situacion IN ('Cerrado','Baja')
      AND (p_from IS NULL OR b.fecha_cierre >= p_from)
      AND (p_to IS NULL OR b.fecha_cierre <= p_to)
  ),
  abier AS (
    SELECT b.eq, COUNT(*) AS ab, COUNT(*) FILTER (WHERE (CURRENT_DATE - b.fecha_creacion) > 30) AS ab30
    FROM base b WHERE b.situacion = 'Abierto' GROUP BY b.eq
  )
  SELECT p.eq, MAX(p.amb),
    COUNT(DISTINCT p.tecnico) FILTER (WHERE p.tec_activo),
    COUNT(*),
    COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0),
    COUNT(*) FILTER (WHERE p.es_baja)::numeric / NULLIF(COUNT(*),0),
    AVG(COALESCE(p.pb_esp,0)),
    COUNT(*) FILTER (WHERE p.es_nff)::numeric / NULLIF(COUNT(*),0),
    AVG(COALESCE(p.pn_esp,0)),
    AVG(p.dias_cierre) FILTER (WHERE p.dias_cierre > 0),
    AVG(p.fact_sat) FILTER (WHERE p.fact_sat IS NOT NULL),
    AVG(p.importe_desplazamiento) FILTER (WHERE p.importe_desplazamiento IS NOT NULL),
    COALESCE(MAX(a.ab),0), COALESCE(MAX(a.ab30),0),
    MAX(p.tipo_ent),
    CASE WHEN MAX(p.tipo_ent) = 'equipo_central' THEN
      CASE
        WHEN p.eq = 'Central (sin gama)' THEN 'Equipo sin gama asignada (Central)'
        ELSE 'Equipo ' || replace(replace(p.eq, 'Gama ', ''), 'Marron', 'Marrón') || ' (Central)'
      END
    ELSE p.eq END,
    CASE WHEN MAX(p.tipo_ent) = 'equipo_central' AND p.eq <> 'Central (sin gama)'
      THEN replace(replace(p.eq, 'Gama ', ''), 'Marron', 'Marrón') END
  FROM periodo p LEFT JOIN abier a ON a.eq = p.eq
  GROUP BY p.eq
  ORDER BY 4 DESC;
$function$;

REVOKE ALL ON FUNCTION public.ops_equipos(date, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_equipos(date, date, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';