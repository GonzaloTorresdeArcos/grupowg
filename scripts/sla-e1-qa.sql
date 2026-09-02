\pset pager off
BEGIN;
SELECT current_user AS rol_psql;
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT user_id::text FROM public.user_roles WHERE role='management' LIMIT 1),
                    'role','authenticated')::text, true);
-- QA calendario (helper canonico)
SELECT 'CAL' AS bloque, caso, esperado, public.ops_add_working_days(inicio,n,'ES') AS obtenido,
       (public.ops_add_working_days(inicio,n,'ES') = esperado) AS ok
FROM (VALUES
 ('lunes +T+1',            DATE '2026-06-01', 1, DATE '2026-06-02'),
 ('viernes +T+1',          DATE '2026-06-05', 1, DATE '2026-06-08'),
 ('sabado +T+1',           DATE '2026-06-06', 1, DATE '2026-06-08'),
 ('vispera festivo +T+1',  DATE '2026-04-02', 1, DATE '2026-04-06'),
 ('T+4 cruza finde',       DATE '2026-06-04', 4, DATE '2026-06-10'),
 ('T+4 cruza festivo',     DATE '2026-04-01', 4, DATE '2026-04-08'),
 ('T+1 ante 1 mayo (vie)', DATE '2026-04-30', 1, DATE '2026-05-04'),
 ('T+4 dic 2025 puente',   DATE '2025-12-04', 4, DATE '2025-12-11')
) v(caso,inicio,n,esperado);

SELECT 'COBERTURA' bloque, * FROM public.ctr_calendario_cobertura('ES')
UNION ALL SELECT 'COBERTURA', * FROM public.ctr_calendario_cobertura('PT');


\echo '--- EVALUABILIDAD ---'
SELECT rd.codigo, jsonb_pretty(public.ctr_sla_evaluabilidad(rv.id)) FROM public.ctr_regla_version rv
 JOIN public.ctr_regla_definicion rd ON rd.id=rv.regla_id WHERE rd.codigo LIKE 'R_SLA_M%' ORDER BY rd.codigo;

\echo '--- RESUMEN POR KPI ---'
SELECT jsonb_pretty(public.ctr_sla_temporal_resumen(rv.id)) FROM public.ctr_regla_version rv
 JOIN public.ctr_regla_definicion rd ON rd.id=rv.regla_id WHERE rd.codigo LIKE 'R_SLA_M%' ORDER BY rd.codigo;

\echo '--- CONTRASTE helper vs evaluador (muestra 200 OT de MAK-02) ---'
SELECT count(*) total, count(*) FILTER (WHERE deadline_date = public.ops_add_working_days(start_date,4,'ES')) coinciden
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7a1e0004-0000-4000-8000-000000000002') WHERE start_date IS NOT NULL LIMIT 200) t;

\echo '--- VALIDACIONES DE CALIDAD ---'
SELECT rd.codigo,
  count(*) FILTER (WHERE t.end_date < t.start_date) end_lt_start,
  count(*) FILTER (WHERE t.start_date > public.ops_as_of() OR t.end_date > public.ops_as_of()) fechas_futuras,
  count(*) FILTER (WHERE t.deadline_date <= t.start_date) deadline_no_posterior,
  count(*) FILTER (WHERE extract(isodow FROM t.deadline_date) > 5) deadline_en_finde,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.ops_calendario_laboral c WHERE c.territorio='ES' AND c.fecha=t.deadline_date AND NOT c.laborable)) deadline_en_festivo,
  count(*) - count(DISTINCT t.num_ot) duplicados
FROM public.ctr_regla_definicion rd
JOIN public.ctr_regla_version rv ON rv.regla_id=rd.id
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id) t
WHERE rd.codigo LIKE 'R_SLA_M%' GROUP BY rd.codigo ORDER BY rd.codigo;

\echo '--- DIAGNOSTICO vs legacy sla_cierre_dlab (solo comparativo, NO usado en el KPI) ---'
SELECT cliente_wg, count(*) n, count(sla_cierre_dlab) con_valor, round(avg(sla_cierre_dlab),2) media
FROM public.ops_fact_ot WHERE cliente_wg IN ('MAKRO','METRO MARKETS GMBH') GROUP BY 1;

ROLLBACK;
