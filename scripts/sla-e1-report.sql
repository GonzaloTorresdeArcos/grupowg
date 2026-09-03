-- SLA-E1 · BATCH 1 · ALCAMPO + PROFESSIONAL · informe reproducible (solo lectura)
-- Requiere rol management. Ejecuta dentro de una transaccion que siempre revierte.
\pset pager off
\pset format unaligned
\pset fieldsep '|'
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT user_id::text FROM public.user_roles WHERE role='management' LIMIT 1),
                    'role','authenticated')::text, true);

\echo '=== G) QA CALENDARIO · DIAS LABORABLES ==='
SELECT caso, esperado, public.ops_add_working_days(inicio,n,'ES') obtenido,
       (public.ops_add_working_days(inicio,n,'ES')=esperado) ok
FROM (VALUES
 ('lunes +1',                    DATE '2026-06-01',1,DATE '2026-06-02'),
 ('viernes +1',                  DATE '2026-06-05',1,DATE '2026-06-08'),
 ('sabado +1',                   DATE '2026-06-06',1,DATE '2026-06-08'),
 ('vispera festivo +1',          DATE '2026-04-02',1,DATE '2026-04-06'),
 ('T+4 cruza finde',             DATE '2026-06-04',4,DATE '2026-06-10'),
 ('T+4 cruza festivo',           DATE '2026-04-01',4,DATE '2026-04-08'),
 ('T+5 cruza festivo (1 mayo)',  DATE '2026-04-28',5,DATE '2026-05-06'),
 ('T+5 cruza Semana Santa',      DATE '2026-03-31',5,DATE '2026-04-08')
) v(caso,inicio,n,esperado);

\echo '=== G) QA CALENDARIO · DIAS NATURALES (T+21) ==='
SELECT caso, esperado, public.ops_add_calendar_days(inicio,21) obtenido,
       (public.ops_add_calendar_days(inicio,21)=esperado) ok
FROM (VALUES
 ('cruza fin de semana', DATE '2026-06-01', DATE '2026-06-22'),
 ('cruza festivo 1 mayo',DATE '2026-04-20', DATE '2026-05-11'),
 ('cambio de mes',       DATE '2026-01-20', DATE '2026-02-10'),
 ('cambio de anio',      DATE '2025-12-20', DATE '2026-01-10'),
 ('febrero bisiesto',    DATE '2024-02-15', DATE '2024-03-07')
) v(caso,inicio,esperado);

\echo '=== F) COBERTURA DE CALENDARIO ==='
SELECT 'ES' t,* FROM public.ctr_calendario_cobertura('ES')
UNION ALL SELECT 'PT',* FROM public.ctr_calendario_cobertura('PT');

\echo '=== H-M) RESULTADO POR KPI · ESCENARIO A (baja = cierre) ==='
SELECT x->>'kpi' kpi, x->>'cliente' cli, x->>'programa' prog, x->>'deadline' deadline,
       x->>'claim_estado' claim, x->>'mapping_status_start' map_start, x->>'mapping_status_end' map_end,
       u->>'poblacion_programa_resuelta' poblacion, u->>'poblacion_anulado_aviso' anulado,
       u->>'poblacion_fuera_de_alcance' fuera_alcance, u->>'poblacion_servicio' servicio,
       u->>'evaluables' evaluables, u->>'no_evaluables' no_evaluables,
       u->>'met' met, u->>'missed' missed, u->>'temporal_adherence_pct' adherencia_pct,
       u->>'completitud_start' compl_start, u->>'completitud_end' compl_end,
       x->>'evaluation_ready' evaluation_ready, x->>'temporal_result_available' result_available,
       x->>'publication_ready' publication_ready, x->>'next_blocker' next_blocker,
       x->>'remaining_blockers' remaining_blockers
FROM (SELECT j x, j->'universos_y_resultado' u FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) j) t;

\echo '=== N) NOT_EVALUABLE POR CAUSA ==='
SELECT x->>'kpi', jsonb_pretty(x->'universos_y_resultado'->'motivos_no_evaluable')
FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) x;

\echo '=== O) ANOMALIAS DE DATOS ==='
SELECT x->>'kpi' kpi, u->>'anomalia_end_previo_start' end_previo_start,
       u->>'anomalia_fecha_futura' fechas_futuras, u->>'duplicados_num_ot' duplicados,
       u->'rango_start'->>'min' start_min, u->'rango_start'->>'max' start_max
FROM (SELECT j x, j->'universos_y_resultado' u FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) j) t;

\echo '=== M) ALC-03 · ESCENARIO B (baja excluida) ==='
SELECT jsonb_pretty(public.ctr_sla_temporal_resumen('7b1e0004-0000-4000-8000-000000000003','B')->'universos_y_resultado');
\echo '=== L) ALC-02 · ESCENARIO B (baja excluida) ==='
SELECT jsonb_pretty(public.ctr_sla_temporal_resumen('7b1e0004-0000-4000-8000-000000000002','B')->'universos_y_resultado');

\echo '=== QA) DEADLINES EN FINDE/FESTIVO Y ORDEN TEMPORAL ==='
SELECT rd.codigo,
  count(*) FILTER (WHERE t.temporal_result<>'NOT_EVALUABLE' AND extract(isodow FROM t.deadline_date)>5) deadline_finde,
  count(*) FILTER (WHERE t.temporal_result<>'NOT_EVALUABLE' AND t.calendar_type<>'NATURAL'
                     AND EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                                  WHERE c.territorio='ES' AND c.fecha=t.deadline_date AND NOT c.laborable)) deadline_festivo,
  count(*) FILTER (WHERE t.deadline_date<=t.start_date) deadline_no_posterior
FROM public.ctr_regla_definicion rd JOIN public.ctr_regla_version rv ON rv.regla_id=rd.id
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id,'A') t
WHERE rv.id IN ('7a1e0004-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000002',
                '7a1e0004-0000-4000-8000-000000000003','7a1e0004-0000-4000-8000-000000000004',
                '7b1e0004-0000-4000-8000-000000000002','7b1e0004-0000-4000-8000-000000000003')
GROUP BY 1 ORDER BY 1;

\echo '=== QA) DATA LEAKAGE ENTRE CLIENTES ==='
SELECT rv.id::text regla_version, string_agg(DISTINCT o.cliente_wg,', ') clientes
FROM public.ctr_regla_version rv
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id,'A') t
JOIN public.ops_fact_ot o ON o.num_ot=t.num_ot
WHERE rv.id IN ('7a1e0004-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000002',
                '7b1e0004-0000-4000-8000-000000000003')
GROUP BY 1;

\echo '=== QA) CONTRASTE HELPER vs EVALUADOR ==='
SELECT 'MAK-02 T+4 WD' kpi, count(*) n, count(*) FILTER (WHERE deadline_date=public.ops_add_working_days(start_date,4,'ES')) coinciden
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7a1e0004-0000-4000-8000-000000000002','A') WHERE start_date IS NOT NULL LIMIT 300) a
UNION ALL SELECT 'ALC-02 T+5 WD', count(*), count(*) FILTER (WHERE deadline_date=public.ops_add_working_days(start_date,5,'ES'))
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7b1e0004-0000-4000-8000-000000000002','A') WHERE start_date IS NOT NULL LIMIT 300) b
UNION ALL SELECT 'ALC-03 T+21 CD', count(*), count(*) FILTER (WHERE deadline_date=public.ops_add_calendar_days(start_date,21))
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7b1e0004-0000-4000-8000-000000000003','A') WHERE start_date IS NOT NULL LIMIT 300) c;

\echo '=== P) LEGACY sla_cierre_dlab (solo diagnostico, NO usado en el KPI) ==='
SELECT cliente_wg, count(*) n, count(sla_cierre_dlab) con_valor, round(avg(sla_cierre_dlab),2) media
FROM public.ops_fact_ot WHERE cliente_wg IN ('MAKRO','METRO MARKETS GMBH','ALCAMPO') GROUP BY 1 ORDER BY 1;

ROLLBACK;
