CREATE OR REPLACE FUNCTION public.ops_dispersion_resumen(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $fn$
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
cerr AS MATERIALIZED (
  SELECT f.tecnico, f.sat, f.tipo_recurso, f.canal, f.delegacion, f.provincia, f.municipio,
    lpad(regexp_replace(COALESCE(f.codigo_postal, ''), '\D', '', 'g'), 5, '0') AS cp_norm,
    f.capital, f.kpi_20d, f.es_baja, f.gama_real,
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
    f.capital, GREATEST(0, public.ops_as_of('ot') - f.fecha_creacion) AS edad,
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
salidas AS MATERIALIZED (
  SELECT c.provincia, c.municipio, c.tecnico, c.delegacion,
    coalesce(c.gama_real, 'Sin clasificar') AS gama,
    2 * 6371 * asin(sqrt(
      power(sin(radians(g.lat - b.lat)/2), 2) +
      cos(radians(b.lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - b.lng)/2), 2)
    )) AS km_ida
  FROM cerr c
  JOIN public.ops_bases b ON b.delegacion = c.delegacion
  JOIN public.ops_cp_geo g ON g.cp = c.cp_norm
  WHERE c.tipo_recurso = 'Tecnico propio' AND c.canal = 'Domicilio'
),
kmreal AS (
  SELECT m.tecnico, SUM(m.km) AS km_total, COUNT(*) AS meses
  FROM public.ops_coste_mensual m
  WHERE (p_from IS NULL OR m.mes >= date_trunc('month', p_from)::date)
    AND (p_to IS NULL OR m.mes <= date_trunc('month', p_to)::date)
  GROUP BY m.tecnico
),
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
km_buckets AS (
  SELECT b.bucket, count(s.km_ida) AS n,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.km_ida)::numeric, 1) AS km_mediana
  FROM (VALUES ('0-10',0,10),('10-25',10,25),('25-50',25,50),('50-100',50,100),('>100',100,1000000)) AS b(bucket, lo, hi)
  LEFT JOIN salidas s ON s.km_ida >= b.lo AND s.km_ida < b.hi
  GROUP BY b.bucket, b.lo ORDER BY b.lo
),
gam_c AS (
  SELECT coalesce(gama_real, 'Sin clasificar') AS gama, count(*) AS cerradas,
    count(*) FILTER (WHERE kpi_20d) * 1.0 / nullif(count(*) FILTER (WHERE kpi_20d IS NOT NULL), 0) AS sla20,
    count(*) FILTER (WHERE es_baja) * 1.0 / count(*) AS pct_bajas,
    count(DISTINCT provincia) FILTER (WHERE provincia IS NOT NULL) AS provincias,
    count(DISTINCT (provincia, municipio)) FILTER (WHERE municipio IS NOT NULL) AS municipios,
    count(*) FILTER (WHERE capital = 'NO') * 1.0 / nullif(count(*) FILTER (WHERE capital IN ('SI','NO')), 0) AS pct_fuera_capital
  FROM cerr GROUP BY 1
),
gam_km AS (
  SELECT gama,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY km_ida)::numeric, 1) AS km_mediana,
    count(*) AS salidas
  FROM salidas GROUP BY 1
),
gamas AS (
  SELECT g.gama, g.cerradas, g.sla20, g.pct_bajas, g.provincias, g.municipios, g.pct_fuera_capital,
    k.km_mediana, coalesce(k.salidas, 0) AS salidas_km
  FROM gam_c g LEFT JOIN gam_km k USING (gama)
  ORDER BY g.cerradas DESC
),
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
  ORDER BY s.cerradas DESC, s.sat
  LIMIT 60
),
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
),
mun_tot AS (
  SELECT count(*) AS n FROM (
    SELECT provincia, municipio FROM cerr WHERE municipio IS NOT NULL GROUP BY 1,2 HAVING count(*) >= 2
    UNION
    SELECT provincia, municipio FROM ab WHERE municipio IS NOT NULL GROUP BY 1,2 HAVING count(*) >= 2
  ) z
)
SELECT jsonb_build_object(
  'periodo', jsonb_build_object('from', p_from, 'to', p_to),
  'kpis', (SELECT row_to_json(kpis) FROM kpis),
  'provincias', coalesce((SELECT jsonb_agg(row_to_json(provincias)) FROM provincias), '[]'::jsonb),
  'tecnicos', coalesce((SELECT jsonb_agg(row_to_json(tecnicos)) FROM tecnicos), '[]'::jsonb),
  'gamas', coalesce((SELECT jsonb_agg(row_to_json(gamas)) FROM gamas), '[]'::jsonb),
  'km_buckets', coalesce((SELECT jsonb_agg(row_to_json(km_buckets)) FROM km_buckets), '[]'::jsonb),
  'sats', coalesce((SELECT jsonb_agg(row_to_json(sats)) FROM sats), '[]'::jsonb),
  'sats_truncado', (SELECT count(*) > 60 FROM sat_c),
  'municipios_total', (SELECT n FROM mun_tot),
  'calidad', (SELECT row_to_json(calidad) FROM calidad),
  'bases', coalesce((SELECT jsonb_agg(row_to_json(b)) FROM (SELECT * FROM public.ops_bases) b), '[]'::jsonb)
)
$fn$;