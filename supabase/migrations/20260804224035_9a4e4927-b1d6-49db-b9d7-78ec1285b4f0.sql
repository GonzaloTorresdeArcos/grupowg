CREATE OR REPLACE FUNCTION public.ops_dispersion(
  p_from date DEFAULT NULL::date,
  p_to date DEFAULT NULL::date,
  p_delegacion text DEFAULT NULL::text,
  p_gama text DEFAULT NULL::text,
  p_familia text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
WITH prov_pref AS (
  SELECT * FROM (VALUES
    ('MADRID','28'),('BARCELONA','08'),('VALENCIA','46'),('LAS PALMAS','35'),('SANTA CRUZ DE TENERIFE','38'),
    ('ALICANTE','03'),('MURCIA','30'),('SEVILLA','41'),('ISLAS BALEARES','07'),('CÁDIZ','11'),('MÁLAGA','29'),
    ('ASTURIAS','33'),('LA CORUÑA','15'),('TOLEDO','45'),('PONTEVEDRA','36'),('JAÉN','23'),('CÓRDOBA','14'),
    ('CIUDAD REAL','13'),('ZARAGOZA','50'),('GRANADA','18'),('ALMERÍA','04'),('VIZCAYA','48'),('GUADALAJARA','19'),
    ('BADAJOZ','06'),('TARRAGONA','43'),('CANTABRIA','39'),('NAVARRA','31'),('HUELVA','21'),('GUIPÚZCOA','20'),
    ('CÁCERES','10'),('CASTELLÓN','12'),('GERONA','17'),('VALLADOLID','47'),('LUGO','27'),('ALBACETE','02'),
    ('LEÓN','24'),('SALAMANCA','37'),('BURGOS','09'),('CUENCA','16'),('OURENSE','32'),('LA RIOJA','26'),
    ('LLEIDA','25'),('ÁVILA','05'),('HUESCA','22'),('SEGOVIA','40'),('PALENCIA','34'),('ÁLAVA','01'),
    ('TERUEL','44'),('ZAMORA','49'),('SORIA','42'),('MELILLA','52'),('CEUTA','51')
  ) AS v(provincia, pref)
),
-- Cerradas del período: se materializan UNA vez (antes se recomputaban en cada agregado).
-- geo_ok: el CP normalizado existe en ops_cp_geo (equivale a CP válido de 5 dígitos geocodificado).
cerr AS MATERIALIZED (
  SELECT f.tecnico, f.sat, f.tipo_recurso, f.canal, f.delegacion, f.provincia, f.municipio,
    lpad(regexp_replace(COALESCE(f.codigo_postal, ''), '\D', '', 'g'), 5, '0') AS cp_norm,
    f.capital, f.kpi_20d, f.es_baja,
    (g.cp IS NOT NULL) AS geo_ok
  FROM public.ops_fact_ot f
  LEFT JOIN public.ops_cp_geo g
    ON g.cp = lpad(regexp_replace(COALESCE(f.codigo_postal, ''), '\D', '', 'g'), 5, '0')
  WHERE f.es_anulado = false AND f.incidencia <> 'ANULADO AVISO'
    AND f.situacion IN ('Cerrado','Baja')
    AND (p_from IS NULL OR f.fecha_cierre >= p_from)
    AND (p_to IS NULL OR f.fecha_cierre <= p_to)
    AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
    AND (p_gama IS NULL OR f.gama_real = p_gama)
    AND (p_familia IS NULL OR f.familia = p_familia)
),
ab AS MATERIALIZED (
  SELECT f.tecnico, f.sat, f.tipo_recurso, f.delegacion, f.provincia, f.municipio,
    lpad(regexp_replace(COALESCE(f.codigo_postal, ''), '\D', '', 'g'), 5, '0') AS cp_norm,
    f.capital, GREATEST(0, current_date - f.fecha_creacion) AS edad,
    (g.cp IS NOT NULL) AS geo_ok
  FROM public.ops_fact_ot f
  LEFT JOIN public.ops_cp_geo g
    ON g.cp = lpad(regexp_replace(COALESCE(f.codigo_postal, ''), '\D', '', 'g'), 5, '0')
  WHERE f.es_anulado = false AND f.incidencia <> 'ANULADO AVISO'
    AND f.situacion = 'Abierto'
    AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
    AND (p_gama IS NULL OR f.gama_real = p_gama)
    AND (p_familia IS NULL OR f.familia = p_familia)
),
-- Aproximación geográfica en línea recta: solo plantilla propia, canal Domicilio, CP geocodificado
salidas AS MATERIALIZED (
  SELECT c.provincia, c.municipio, c.tecnico, c.delegacion,
    2 * 6371 * asin(sqrt(
      power(sin(radians(g.lat - b.lat)/2), 2) +
      cos(radians(b.lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - b.lng)/2), 2)
    )) AS km_ida
  FROM cerr c
  JOIN public.ops_bases b ON b.delegacion = c.delegacion
  JOIN public.ops_cp_geo g ON g.cp = c.cp_norm
  WHERE c.tipo_recurso = 'Tecnico propio' AND c.canal = 'Domicilio'
),
-- Km REALES registrados (nivel técnico/mes)
kmreal AS (
  SELECT m.tecnico, SUM(m.km) AS km_total, COUNT(*) AS meses
  FROM public.ops_coste_mensual m
  WHERE (p_from IS NULL OR m.mes >= date_trunc('month', p_from)::date)
    AND (p_to IS NULL OR m.mes <= date_trunc('month', p_to)::date)
  GROUP BY m.tecnico
),
-- KPIs en UN solo recorrido por conjunto (antes: una subconsulta por KPI sobre cerr)
kpis_c AS (
  SELECT
    count(*) AS cerradas,
    count(*) FILTER (WHERE provincia IS NOT NULL) AS con_provincia,
    count(*) FILTER (WHERE municipio IS NOT NULL) AS con_municipio,
    count(*) FILTER (WHERE cp_norm ~ '^\d{5}$') AS cp_valido,
    count(*) FILTER (WHERE geo_ok) AS geocodificadas,
    count(*) FILTER (WHERE capital = 'SI') AS capital_si,
    count(*) FILTER (WHERE capital = 'NO') AS capital_no,
    count(DISTINCT provincia) FILTER (WHERE provincia IS NOT NULL) AS provincias_servidas,
    count(DISTINCT (provincia, municipio)) FILTER (WHERE municipio IS NOT NULL) AS municipios_servidos,
    count(DISTINCT cp_norm) FILTER (WHERE cp_norm ~ '^\d{5}$') AS cps_servidos
  FROM cerr
),
kpis_a AS (
  SELECT count(*) AS abiertas, count(*) FILTER (WHERE edad > 30) AS abiertas30 FROM ab
),
kpis_s AS (
  SELECT count(*) AS salidas_km,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY km_ida)::numeric, 1) AS km_mediana,
    round(avg(km_ida)::numeric, 1) AS km_media
  FROM salidas
),
kpis_r AS (
  SELECT coalesce(sum(km_total), 0) AS km_reales_total, count(*) AS km_reales_tecnicos FROM kmreal
),
kpis AS (
  SELECT kc.cerradas, ka.abiertas, ka.abiertas30, kc.con_provincia, kc.con_municipio, kc.cp_valido,
    kc.geocodificadas, kc.capital_si, kc.capital_no, kc.provincias_servidas, kc.municipios_servidos,
    kc.cps_servidos, ks.salidas_km, ks.km_mediana, ks.km_media, kr.km_reales_total, kr.km_reales_tecnicos
  FROM kpis_c kc, kpis_a ka, kpis_s ks, kpis_r kr
),
-- Dependencia de cobertura por provincia
rec_cerr AS (
  SELECT provincia, COALESCE(NULLIF(tecnico, ''), sat) AS recurso, count(*) AS n
  FROM cerr WHERE provincia IS NOT NULL AND COALESCE(NULLIF(tecnico, ''), sat) IS NOT NULL
  GROUP BY 1, 2
),
rec_rank AS (
  SELECT provincia, recurso, n,
    row_number() OVER (PARTITION BY provincia ORDER BY n DESC, recurso) AS rn,
    sum(n) OVER (PARTITION BY provincia) AS total_asignado
  FROM rec_cerr
),
dep AS (
  SELECT provincia,
    max(recurso) FILTER (WHERE rn = 1) AS top1,
    max(n) FILTER (WHERE rn = 1) AS top1_n,
    sum(n) FILTER (WHERE rn <= 3) AS top3_n,
    max(total_asignado) AS total_asignado
  FROM rec_rank GROUP BY provincia
),
rec_ab30 AS (
  SELECT provincia, COALESCE(NULLIF(tecnico, ''), sat) AS recurso, count(*) AS n30
  FROM ab WHERE provincia IS NOT NULL AND edad > 30 AND COALESCE(NULLIF(tecnico, ''), sat) IS NOT NULL
  GROUP BY 1, 2
),
prov AS (
  SELECT c.provincia,
    count(*) AS cerradas,
    count(*) FILTER (WHERE c.kpi_20d) * 1.0 / nullif(count(*) FILTER (WHERE c.kpi_20d IS NOT NULL), 0) AS sla20,
    count(*) FILTER (WHERE c.es_baja) * 1.0 / count(*) AS pct_bajas,
    count(DISTINCT c.municipio) FILTER (WHERE c.municipio IS NOT NULL) AS municipios,
    count(DISTINCT c.cp_norm) FILTER (WHERE c.cp_norm ~ '^\d{5}$') AS cps,
    count(DISTINCT COALESCE(NULLIF(c.tecnico, ''), c.sat)) FILTER (WHERE COALESCE(NULLIF(c.tecnico, ''), c.sat) IS NOT NULL) AS recursos,
    count(*) FILTER (WHERE c.capital = 'NO') * 1.0 / nullif(count(*) FILTER (WHERE c.capital IN ('SI','NO')), 0) AS pct_fuera_capital
  FROM cerr c WHERE c.provincia IS NOT NULL GROUP BY 1
),
prov_ab AS (
  SELECT provincia, count(*) AS abiertas, count(*) FILTER (WHERE edad > 30) AS abiertas30
  FROM ab WHERE provincia IS NOT NULL GROUP BY 1
),
prov_km AS (
  SELECT provincia, count(*) AS salidas, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY km_ida)::numeric, 1) AS km_mediana
  FROM salidas GROUP BY 1
),
provincias AS (
  SELECT p.provincia, p.cerradas, coalesce(a.abiertas, 0) AS abiertas, coalesce(a.abiertas30, 0) AS abiertas30,
    p.sla20, p.pct_bajas, p.municipios, p.cps, p.recursos,
    p.cerradas * 1.0 / nullif(p.recursos, 0) AS ots_por_recurso,
    p.pct_fuera_capital, k.km_mediana, coalesce(k.salidas, 0) AS salidas_km,
    d.top1, d.top1_n, d.top1_n * 1.0 / nullif(d.total_asignado, 0) AS cuota_top1,
    d.top3_n * 1.0 / nullif(d.total_asignado, 0) AS cuota_top3,
    (SELECT r.n30 FROM rec_ab30 r WHERE r.provincia = p.provincia AND r.recurso = d.top1) AS top1_n30,
    (SELECT sum(r.n30) FROM rec_ab30 r WHERE r.provincia = p.provincia) AS n30_asignado
  FROM prov p
  LEFT JOIN prov_ab a USING (provincia)
  LEFT JOIN prov_km k USING (provincia)
  LEFT JOIN dep d USING (provincia)
  ORDER BY p.cerradas DESC
),
-- Municipios (cerradas ∪ abiertas del snapshot, pares con >= 2)
mun_c AS (
  SELECT provincia, municipio, count(*) AS cerradas,
    count(*) FILTER (WHERE kpi_20d) * 1.0 / nullif(count(*) FILTER (WHERE kpi_20d IS NOT NULL), 0) AS sla20,
    count(DISTINCT cp_norm) FILTER (WHERE cp_norm ~ '^\d{5}$') AS cps,
    count(DISTINCT COALESCE(NULLIF(tecnico, ''), sat)) FILTER (WHERE COALESCE(NULLIF(tecnico, ''), sat) IS NOT NULL) AS recursos,
    count(*) FILTER (WHERE capital = 'NO') * 1.0 / nullif(count(*) FILTER (WHERE capital IN ('SI','NO')), 0) AS pct_fuera_capital
  FROM cerr WHERE municipio IS NOT NULL GROUP BY 1, 2
),
mun_a AS (
  SELECT provincia, municipio, count(*) AS abiertas, count(*) FILTER (WHERE edad > 30) AS abiertas30
  FROM ab WHERE municipio IS NOT NULL GROUP BY 1, 2
),
mun_top AS (
  SELECT provincia, municipio, recurso, n * 1.0 / tot AS cuota FROM (
    SELECT provincia, municipio, COALESCE(NULLIF(tecnico, ''), sat) AS recurso, count(*) AS n,
      row_number() OVER (PARTITION BY provincia, municipio ORDER BY count(*) DESC, COALESCE(NULLIF(tecnico, ''), sat)) AS rn,
      sum(count(*)) OVER (PARTITION BY provincia, municipio) AS tot
    FROM cerr WHERE municipio IS NOT NULL AND COALESCE(NULLIF(tecnico, ''), sat) IS NOT NULL
    GROUP BY 1, 2, 3
  ) z WHERE rn = 1
),
municipios AS (
  SELECT coalesce(c.provincia, a.provincia) AS provincia, coalesce(c.municipio, a.municipio) AS municipio,
    coalesce(c.cerradas, 0) AS cerradas, coalesce(a.abiertas, 0) AS abiertas, coalesce(a.abiertas30, 0) AS abiertas30,
    c.sla20, c.cps, c.recursos, c.pct_fuera_capital,
    t.recurso AS top1, t.cuota AS cuota_top1
  FROM mun_c c
  FULL JOIN mun_a a USING (provincia, municipio)
  LEFT JOIN mun_top t ON t.provincia = coalesce(c.provincia, a.provincia) AND t.municipio = coalesce(c.municipio, a.municipio)
  WHERE coalesce(c.cerradas, 0) >= 2 OR coalesce(a.abiertas, 0) >= 2
  ORDER BY coalesce(c.cerradas, 0) DESC
),
-- Técnicos propios
tec AS (
  SELECT c.tecnico, max(c.delegacion) AS delegacion, count(*) AS cerradas,
    count(*) FILTER (WHERE c.kpi_20d) * 1.0 / nullif(count(*) FILTER (WHERE c.kpi_20d IS NOT NULL), 0) AS sla20,
    count(*) FILTER (WHERE c.es_baja) * 1.0 / count(*) AS pct_bajas,
    count(DISTINCT c.municipio) FILTER (WHERE c.municipio IS NOT NULL) AS municipios,
    count(DISTINCT c.cp_norm) FILTER (WHERE c.cp_norm ~ '^\d{5}$') AS cps,
    count(DISTINCT c.provincia) FILTER (WHERE c.provincia IS NOT NULL) AS provincias,
    count(*) FILTER (WHERE c.capital = 'NO') * 1.0 / nullif(count(*) FILTER (WHERE c.capital IN ('SI','NO')), 0) AS pct_fuera_capital
  FROM cerr c WHERE c.tipo_recurso = 'Tecnico propio' AND c.tecnico IS NOT NULL GROUP BY 1
),
tec_ab AS (
  SELECT tecnico, count(*) AS abiertas, count(*) FILTER (WHERE edad > 30) AS abiertas30
  FROM ab WHERE tipo_recurso = 'Tecnico propio' AND tecnico IS NOT NULL GROUP BY 1
),
tec_km AS (
  SELECT tecnico, count(*) AS salidas, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY km_ida)::numeric, 1) AS km_mediana
  FROM salidas GROUP BY 1
),
tecnicos AS (
  SELECT t.tecnico, t.delegacion, t.cerradas, coalesce(a.abiertas, 0) AS abiertas, coalesce(a.abiertas30, 0) AS abiertas30,
    t.sla20, t.pct_bajas, t.municipios, t.cps, t.provincias, t.pct_fuera_capital,
    k.km_mediana, coalesce(k.salidas, 0) AS salidas_km,
    r.km_total AS km_reales, r.meses AS km_reales_meses
  FROM tec t
  LEFT JOIN tec_ab a USING (tecnico)
  LEFT JOIN tec_km k USING (tecnico)
  LEFT JOIN kmreal r USING (tecnico)
  ORDER BY t.cerradas DESC
),
-- SATs externos
sat_c AS (
  SELECT c.sat, count(*) AS cerradas,
    count(*) FILTER (WHERE c.kpi_20d) * 1.0 / nullif(count(*) FILTER (WHERE c.kpi_20d IS NOT NULL), 0) AS sla20,
    count(*) FILTER (WHERE c.es_baja) * 1.0 / count(*) AS pct_bajas,
    count(DISTINCT c.provincia) FILTER (WHERE c.provincia IS NOT NULL) AS provincias,
    count(DISTINCT c.municipio) FILTER (WHERE c.municipio IS NOT NULL) AS municipios,
    count(DISTINCT c.cp_norm) FILTER (WHERE c.cp_norm ~ '^\d{5}$') AS cps,
    count(*) FILTER (WHERE c.capital = 'NO') * 1.0 / nullif(count(*) FILTER (WHERE c.capital IN ('SI','NO')), 0) AS pct_fuera_capital
  FROM cerr c WHERE c.tipo_recurso = 'SAT externo' AND c.sat IS NOT NULL GROUP BY 1
),
sat_a AS (
  SELECT sat, count(*) AS abiertas, count(*) FILTER (WHERE edad > 30) AS abiertas30
  FROM ab WHERE tipo_recurso = 'SAT externo' AND sat IS NOT NULL GROUP BY 1
),
sats AS (
  SELECT s.sat, s.cerradas, coalesce(a.abiertas, 0) AS abiertas, coalesce(a.abiertas30, 0) AS abiertas30,
    s.sla20, s.pct_bajas, s.provincias, s.municipios, s.cps, s.pct_fuera_capital
  FROM sat_c s LEFT JOIN sat_a a USING (sat)
  ORDER BY s.cerradas DESC
),
-- Calidad de datos geo (cerradas del período ∪ abiertas del snapshot)
uni AS (
  SELECT provincia, municipio, cp_norm, tipo_recurso, tecnico, sat, geo_ok FROM cerr
  UNION ALL
  SELECT provincia, municipio, cp_norm, tipo_recurso, tecnico, sat, geo_ok FROM ab
),
calidad AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE u.provincia IS NULL) AS sin_provincia,
    count(*) FILTER (WHERE u.provincia IS NOT NULL AND u.municipio IS NULL) AS sin_municipio,
    count(*) FILTER (WHERE NOT (u.cp_norm ~ '^\d{5}$')) AS cp_invalido,
    count(*) FILTER (WHERE u.cp_norm ~ '^\d{5}$' AND NOT u.geo_ok) AS cp_no_geocodificado,
    count(*) FILTER (WHERE u.cp_norm ~ '^\d{5}$' AND pp.pref IS NOT NULL AND substring(u.cp_norm FROM 1 FOR 2) <> pp.pref
      AND u.geo_ok) AS cp_no_casa,
    count(*) FILTER (WHERE u.tipo_recurso = 'Tecnico propio' AND u.tecnico IS NULL) AS propio_sin_tecnico,
    count(*) FILTER (WHERE u.tipo_recurso = 'SAT externo' AND u.sat IS NULL) AS sat_sin_nombre,
    count(*) FILTER (WHERE u.provincia IS NULL AND u.tipo_recurso = 'Tecnico propio') AS sin_geo_propio,
    count(*) FILTER (WHERE u.provincia IS NULL AND u.tipo_recurso = 'SAT externo') AS sin_geo_sat
  FROM uni u LEFT JOIN prov_pref pp ON pp.provincia = u.provincia
)
SELECT jsonb_build_object(
  'periodo', jsonb_build_object('from', p_from, 'to', p_to),
  'kpis', (SELECT row_to_json(kpis) FROM kpis),
  'provincias', coalesce((SELECT jsonb_agg(row_to_json(provincias)) FROM provincias), '[]'::jsonb),
  'municipios', coalesce((SELECT jsonb_agg(row_to_json(municipios)) FROM municipios), '[]'::jsonb),
  'tecnicos', coalesce((SELECT jsonb_agg(row_to_json(tecnicos)) FROM tecnicos), '[]'::jsonb),
  'sats', coalesce((SELECT jsonb_agg(row_to_json(sats)) FROM sats), '[]'::jsonb),
  'calidad', (SELECT row_to_json(calidad) FROM calidad),
  'bases', coalesce((SELECT jsonb_agg(row_to_json(b)) FROM (SELECT * FROM public.ops_bases) b), '[]'::jsonb)
)
$function$;
ALTER FUNCTION public.ops_dispersion(date, date, text, text, text) SET statement_timeout = '30s';
GRANT EXECUTE ON FUNCTION public.ops_dispersion(date, date, text, text, text) TO authenticated;