
CREATE OR REPLACE FUNCTION public.ops_costes(p_from date DEFAULT '2025-01-01'::date, p_to date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT c.tecnico, c.mes, c.coste_total, c.variable,
    CASE WHEN t.delegacion='Central San Agustin' THEN 'Madrid · '||COALESCE(t.gama_principal,'Central')
         ELSE COALESCE(t.delegacion,'—') END AS equipo
  FROM ops_coste_mensual c
  LEFT JOIN ops_tecnicos t ON t.tecnico=c.tecnico
  WHERE c.mes BETWEEN date_trunc('month',p_from) AND date_trunc('month',p_to)
),
cier AS (
  SELECT f.tecnico, date_trunc('month',f.fecha_cierre)::date AS mes, COUNT(*) AS n
  FROM ops_fact_ot f
  WHERE f.es_anulado=false AND f.situacion IN ('Cerrado','Baja')
    AND f.fecha_cierre BETWEEN date_trunc('month',p_from) AND (date_trunc('month',p_to)+interval '1 month - 1 day')
  GROUP BY 1,2
),
j AS (
  SELECT b.*, COALESCE(ci.n,0) AS cierres FROM base b LEFT JOIN cier ci ON ci.tecnico=b.tecnico AND ci.mes=b.mes
),
evo AS (
  SELECT mes, SUM(coste_total) AS coste, SUM(cierres) AS cierres,
    ROUND(SUM(coste_total)/NULLIF(SUM(cierres),0),1) AS eur_cierre
  FROM j GROUP BY mes ORDER BY mes
),
eq AS (
  SELECT equipo, COUNT(DISTINCT tecnico) AS tecnicos, SUM(coste_total) AS coste, SUM(cierres) AS cierres,
    ROUND(SUM(coste_total)/NULLIF(SUM(cierres),0),1) AS eur_cierre,
    SUM(variable) AS variable
  FROM j GROUP BY equipo ORDER BY cierres DESC
),
tec AS (
  SELECT tecnico, MAX(equipo) AS equipo, SUM(coste_total) AS coste, SUM(cierres) AS cierres,
    ROUND(SUM(coste_total)/NULLIF(SUM(cierres),0),1) AS eur_cierre
  FROM j GROUP BY tecnico ORDER BY eur_cierre ASC NULLS LAST
),
tot AS (
  SELECT SUM(coste_total) AS coste, SUM(cierres) AS cierres FROM j
),
composicion AS (
  SELECT
    COALESCE(SUM(f.fact_sat), 0) AS coste_sat,
    COALESCE(SUM(f.importe_desplazamiento), 0) AS coste_desplazamiento,
    COALESCE(SUM(f.fact_cli), 0) AS ingreso_cli,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja')) AS cerradas_totales,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja') AND f.fact_cli IS NOT NULL) AS cerradas_con_ingreso,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja') AND f.fact_sat IS NOT NULL) AS cerradas_con_coste_sat,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja') AND f.importe_desplazamiento IS NOT NULL) AS cerradas_con_desplazamiento,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja') AND f.es_baja) AS bajas,
    COUNT(*) FILTER (WHERE f.situacion IN ('Cerrado','Baja') AND f.kpi_20d) AS sla20,
    COUNT(*) AS creadas
  FROM ops_fact_ot f
  WHERE f.es_anulado = false
    AND f.fecha_cierre BETWEEN date_trunc('month',p_from) AND (date_trunc('month',p_to)+interval '1 month - 1 day')
)
SELECT jsonb_build_object(
  'kpis', (SELECT jsonb_build_object(
      'coste', tot.coste,
      'cierres', tot.cierres,
      'eur_cierre', ROUND(tot.coste/NULLIF(tot.cierres,0),1),
      'coste_sat', c.coste_sat,
      'coste_desplazamiento', c.coste_desplazamiento,
      'ingreso_cli', c.ingreso_cli,
      'cerradas_totales', c.cerradas_totales,
      'cerradas_con_ingreso', c.cerradas_con_ingreso,
      'cerradas_con_coste_sat', c.cerradas_con_coste_sat,
      'cerradas_con_desplazamiento', c.cerradas_con_desplazamiento,
      'bajas', c.bajas,
      'sla20', c.sla20
    ) FROM tot, composicion c),
  'evolucion', COALESCE((SELECT jsonb_agg(row_to_json(evo)) FROM evo),'[]'::jsonb),
  'equipos', COALESCE((SELECT jsonb_agg(row_to_json(eq)) FROM eq),'[]'::jsonb),
  'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(tec)) FROM tec),'[]'::jsonb)
);
$function$;

CREATE OR REPLACE FUNCTION public.ops_costes_entidades(
  p_from date DEFAULT NULL::date,
  p_to date DEFAULT NULL::date,
  p_vista text DEFAULT 'delegaciones'
)
RETURNS TABLE(
  entidad text,
  cerradas bigint,
  bajas bigint,
  pct_bajas numeric,
  pct_sla20 numeric,
  coste_directo numeric,
  coste_sat numeric,
  coste_desplazamiento numeric,
  ingreso_cli numeric,
  cerradas_con_ingreso bigint,
  eur_cierre numeric,
  contribucion_parcial numeric,
  tipo_coste text
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
BEGIN
  IF p_vista = 'tecnicos' THEN
    RETURN QUERY
    WITH periodo AS (
      SELECT f.* FROM ops_fact_ot f
      WHERE f.es_anulado = false
        AND f.situacion IN ('Cerrado','Baja')
        AND f.tipo_recurso = 'Tecnico propio'
        AND f.tecnico IS NOT NULL
        AND f.fecha_cierre BETWEEN v_from AND v_to
    ),
    ag AS (
      SELECT p.tecnico AS ent,
        COUNT(*) AS n_cer,
        COUNT(*) FILTER (WHERE p.es_baja) AS n_baj,
        COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0) AS sla,
        SUM(COALESCE(p.importe_desplazamiento,0)) AS desp,
        SUM(COALESCE(p.fact_cli,0)) AS ingcli,
        COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL) AS n_ing
      FROM periodo p GROUP BY p.tecnico
    ),
    nom AS (
      SELECT c.tecnico, SUM(c.coste_total) AS nomina
      FROM ops_coste_mensual c
      WHERE c.mes BETWEEN date_trunc('month',v_from) AND date_trunc('month',v_to)
      GROUP BY c.tecnico
    )
    SELECT
      a.ent,
      a.n_cer, a.n_baj,
      a.n_baj::numeric / NULLIF(a.n_cer,0),
      a.sla,
      COALESCE(n.nomina, 0),
      0::numeric,
      a.desp,
      a.ingcli,
      a.n_ing,
      ROUND((COALESCE(n.nomina,0) + a.desp) / NULLIF(a.n_cer,0), 1),
      CASE WHEN a.n_ing > 0 THEN a.ingcli - (COALESCE(n.nomina,0) + a.desp) ELSE NULL END,
      'nomina_interna'::text
    FROM ag a LEFT JOIN nom n ON n.tecnico = a.ent
    ORDER BY a.n_cer DESC;

  ELSIF p_vista = 'sats' THEN
    RETURN QUERY
    WITH periodo AS (
      SELECT f.* FROM ops_fact_ot f
      WHERE f.es_anulado = false
        AND f.situacion IN ('Cerrado','Baja')
        AND f.tipo_recurso = 'SAT externo'
        AND f.sat IS NOT NULL
        AND f.fecha_cierre BETWEEN v_from AND v_to
    )
    SELECT
      p.sat,
      COUNT(*),
      COUNT(*) FILTER (WHERE p.es_baja),
      COUNT(*) FILTER (WHERE p.es_baja)::numeric / NULLIF(COUNT(*),0),
      COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0),
      SUM(COALESCE(p.fact_sat,0)),
      SUM(COALESCE(p.fact_sat,0)),
      SUM(COALESCE(p.importe_desplazamiento,0)),
      SUM(COALESCE(p.fact_cli,0)),
      COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL),
      ROUND(SUM(COALESCE(p.fact_sat,0)) / NULLIF(COUNT(*),0), 1),
      CASE WHEN COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL) > 0
        THEN SUM(COALESCE(p.fact_cli,0)) - SUM(COALESCE(p.fact_sat,0))
        ELSE NULL END,
      'factura_sat'::text
    FROM periodo p
    GROUP BY p.sat
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC;

  ELSIF p_vista = 'clientes' THEN
    RETURN QUERY
    WITH periodo AS (
      SELECT f.* FROM ops_fact_ot f
      WHERE f.es_anulado = false
        AND f.situacion IN ('Cerrado','Baja')
        AND f.cliente_wg IS NOT NULL
        AND f.fecha_cierre BETWEEN v_from AND v_to
    )
    SELECT
      p.cliente_wg,
      COUNT(*),
      COUNT(*) FILTER (WHERE p.es_baja),
      COUNT(*) FILTER (WHERE p.es_baja)::numeric / NULLIF(COUNT(*),0),
      COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0),
      SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0)),
      SUM(COALESCE(p.fact_sat,0)),
      SUM(COALESCE(p.importe_desplazamiento,0)),
      SUM(COALESCE(p.fact_cli,0)),
      COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL),
      ROUND(SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0)) / NULLIF(COUNT(*),0), 1),
      CASE WHEN COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL) > 0
        THEN SUM(COALESCE(p.fact_cli,0)) - SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0))
        ELSE NULL END,
      'mixto'::text
    FROM periodo p
    GROUP BY p.cliente_wg
    ORDER BY COUNT(*) DESC;

  ELSIF p_vista = 'gamas' THEN
    RETURN QUERY
    WITH periodo AS (
      SELECT f.* FROM ops_fact_ot f
      WHERE f.es_anulado = false
        AND f.situacion IN ('Cerrado','Baja')
        AND f.gama_real IS NOT NULL
        AND f.fecha_cierre BETWEEN v_from AND v_to
    )
    SELECT
      p.gama_real,
      COUNT(*),
      COUNT(*) FILTER (WHERE p.es_baja),
      COUNT(*) FILTER (WHERE p.es_baja)::numeric / NULLIF(COUNT(*),0),
      COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0),
      SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0)),
      SUM(COALESCE(p.fact_sat,0)),
      SUM(COALESCE(p.importe_desplazamiento,0)),
      SUM(COALESCE(p.fact_cli,0)),
      COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL),
      ROUND(SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0)) / NULLIF(COUNT(*),0), 1),
      CASE WHEN COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL) > 0
        THEN SUM(COALESCE(p.fact_cli,0)) - SUM(COALESCE(p.fact_sat,0) + COALESCE(p.importe_desplazamiento,0))
        ELSE NULL END,
      'mixto'::text
    FROM periodo p
    GROUP BY p.gama_real
    ORDER BY COUNT(*) DESC;

  ELSE
    -- delegaciones (default). Combina nómina interna + desplazamiento.
    RETURN QUERY
    WITH periodo AS (
      SELECT f.* FROM ops_fact_ot f
      WHERE f.es_anulado = false
        AND f.situacion IN ('Cerrado','Baja')
        AND f.tipo_recurso = 'Tecnico propio'
        AND f.delegacion IS NOT NULL AND f.delegacion <> ''
        AND f.fecha_cierre BETWEEN v_from AND v_to
    ),
    ag AS (
      SELECT p.delegacion AS ent,
        COUNT(*) AS n_cer,
        COUNT(*) FILTER (WHERE p.es_baja) AS n_baj,
        COUNT(*) FILTER (WHERE p.kpi_20d)::numeric / NULLIF(COUNT(*),0) AS sla,
        SUM(COALESCE(p.importe_desplazamiento,0)) AS desp,
        SUM(COALESCE(p.fact_cli,0)) AS ingcli,
        COUNT(*) FILTER (WHERE p.fact_cli IS NOT NULL) AS n_ing
      FROM periodo p GROUP BY p.delegacion
    ),
    nom AS (
      SELECT COALESCE(t.delegacion,'—') AS dele, SUM(c.coste_total) AS nomina
      FROM ops_coste_mensual c
      LEFT JOIN ops_tecnicos t ON t.tecnico = c.tecnico
      WHERE c.mes BETWEEN date_trunc('month',v_from) AND date_trunc('month',v_to)
      GROUP BY t.delegacion
    )
    SELECT
      a.ent,
      a.n_cer, a.n_baj,
      a.n_baj::numeric / NULLIF(a.n_cer,0),
      a.sla,
      COALESCE(n.nomina, 0),
      0::numeric,
      a.desp,
      a.ingcli,
      a.n_ing,
      ROUND((COALESCE(n.nomina,0) + a.desp) / NULLIF(a.n_cer,0), 1),
      CASE WHEN a.n_ing > 0 THEN a.ingcli - (COALESCE(n.nomina,0) + a.desp) ELSE NULL END,
      'nomina_interna'::text
    FROM ag a LEFT JOIN nom n ON n.dele = a.ent
    ORDER BY a.n_cer DESC;
  END IF;
END;
$function$;
