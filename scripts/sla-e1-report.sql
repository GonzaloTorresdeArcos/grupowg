-- SLA-E1.0A · BATCH 1 · ALCAMPO + PROFESSIONAL · informe reproducible (solo lectura)
-- Requiere rol management. Ejecuta dentro de una transaccion que siempre revierte.
-- Correcciones UAT incorporadas: territorio por OT, festivos autonomicos, filtro de
-- poblacion NULL-safe, universos separados, ALC-03 como escenario de Management.
\pset pager off
\pset format unaligned
\pset fieldsep '|'
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT user_id::text FROM public.user_roles WHERE role='management' LIMIT 1),
                    'role','authenticated')::text, true);

\echo '=== E1.0A-1) MAPPING DE TERRITORIO POR OT ==='
SELECT caso, esperado, public.ops_territorio_ot(cp,prov) obtenido,
       (public.ops_territorio_ot(cp,prov)=esperado) ok
FROM (VALUES
 ('CP portugues',            '1000-100', NULL,                     'PT'),
 ('CP espanol Barcelona',    '08001',    'BARCELONA',              'ES-CT'),
 ('CP truncado 2 digitos',   '08',       'BARCELONA',              'ES-CT'),
 ('CP Tenerife',             '38001',    'SANTA CRUZ DE TENERIFE', 'ES-CN'),
 ('sin CP, con provincia',   NULL,       'MADRID',                 'ES-MD'),
 ('sin evidencia util',      'XX',       '',                       'UNRESOLVED')
) v(caso,cp,prov,esperado);

\echo '=== G) QA CALENDARIO · DIAS LABORABLES (territorio de la OT) ==='
SELECT caso, esperado, public.ops_add_working_days(inicio,n,terr) obtenido,
       (public.ops_add_working_days(inicio,n,terr) IS NOT DISTINCT FROM esperado) ok
FROM (VALUES
 ('lunes +1 ES-MD',                   DATE '2026-06-01',1,'ES-MD',DATE '2026-06-02'),
 ('viernes +1 ES-MD',                 DATE '2026-06-05',1,'ES-MD',DATE '2026-06-08'),
 ('sabado +1 ES-MD',                  DATE '2026-06-06',1,'ES-MD',DATE '2026-06-08'),
 ('vispera festivo +1 ES-MD',         DATE '2026-04-02',1,'ES-MD',DATE '2026-04-06'),
 ('T+4 cruza finde ES-MD',            DATE '2026-06-04',4,'ES-MD',DATE '2026-06-10'),
 ('T+4 cruza festivo ES-MD',          DATE '2026-04-01',4,'ES-MD',DATE '2026-04-08'),
 ('T+5 cruza 1 mayo ES-MD (+2 may)',  DATE '2025-04-28',5,'ES-MD',DATE '2025-05-07'),
 ('T+5 cruza 1 mayo PT',              DATE '2025-04-28',5,'PT',   DATE '2025-05-06'),
 ('festivo autonomico CT (24 jun)',   DATE '2025-06-23',1,'ES-CT',DATE '2025-06-25'),
 ('mismo dia sin festivo en MD',      DATE '2025-06-23',1,'ES-MD',DATE '2025-06-24'),
 ('T+4 cruza 1 y 6 enero ES-MD',      DATE '2025-12-31',4,'ES-MD',DATE '2026-01-08'),
 ('territorio no resuelto => NULL',   DATE '2025-06-06',1,'UNRESOLVED', NULL)
) v(caso,inicio,n,terr,esperado);

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

\echo '=== F) COBERTURA DE CALENDARIO POR TERRITORIO ==='
SELECT t.terr, c.* FROM (SELECT DISTINCT territorio terr FROM public.ops_calendario_laboral) t
CROSS JOIN LATERAL public.ctr_calendario_cobertura(t.terr) c ORDER BY 1;

\echo '=== F) FUENTES DEL CALENDARIO ==='
SELECT ambito, pais, version_carga, count(*) dias, min(fecha), max(fecha), min(fuente)
FROM public.ops_calendario_laboral GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo '=== H-M) RESULTADO POR KPI · ESCENARIO A (baja = cierre/resolucion) ==='
SELECT x->>'kpi' kpi, x->>'regla_version_num' v, x->>'modo' modo, x->>'cliente' cli,
       x->>'deadline' deadline, x->>'claim_estado' claim,
       x->>'mapping_status_start' map_start, x->>'mapping_status_end' map_end,
       u->>'programme_resolved' programme_resolved, u->>'poblacion_anulado_aviso' anulado,
       u->>'programme_service' programme_service, u->>'poblacion_fuera_de_alcance' fuera_alcance,
       u->>'poblacion_excluida_baja' excluida_baja, u->>'candidate_kpi' candidate_kpi,
       u->>'excluded_from_candidate' excluded_from_candidate,
       u->>'evaluable' evaluable, u->>'not_evaluable_within_candidate' not_evaluable_in_candidate,
       u->>'met' met, u->>'missed' missed, u->>'temporal_adherence_pct' adherencia_pct,
       u->>'completitud_start' compl_start, u->>'completitud_end' compl_end,
       x->>'evaluation_ready' evaluation_ready,
       x->>'temporal_result_available' temporal_result_available,
       x->>'contractual_temporal_result_available' contractual_result_available,
       x->>'scenario_result_available' scenario_result_available,
       x->>'publication_ready' publication_ready, x->>'next_blocker' next_blocker,
       x->>'remaining_blockers' remaining_blockers
FROM (SELECT j x, j->'universos_y_resultado' u FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) j) t;

\echo '=== H-M) RESULTADO POR KPI · ESCENARIO B (baja excluida) ==='
SELECT x->>'kpi' kpi, u->>'poblacion_excluida_baja' excluida_baja, u->>'candidate_kpi' candidate_kpi,
       u->>'evaluable' evaluable, u->>'met' met, u->>'missed' missed,
       u->>'temporal_adherence_pct' adherencia_pct
FROM (SELECT j x, j->'universos_y_resultado' u FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('B')) j) t;

\echo '=== N) NOT_EVALUABLE POR CAUSA (escenario A) ==='
SELECT x->>'kpi', jsonb_pretty(x->'universos_y_resultado'->'motivos_no_evaluable')
FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) x;

\echo '=== O) ANOMALIAS DE DATOS ==='
SELECT x->>'kpi' kpi, u->>'anomalia_end_previo_start' end_previo_start,
       u->>'anomalia_fecha_futura' fechas_futuras,
       u->>'anomalia_territorio_no_resuelto' territorio_no_resuelto,
       u->>'duplicados_num_ot' duplicados,
       u->'rango_start'->>'min' start_min, u->'rango_start'->>'max' start_max
FROM (SELECT j x, j->'universos_y_resultado' u FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) j) t;

\echo '=== O) DISTRIBUCION TERRITORIAL DE LA POBLACION POR KPI ==='
SELECT x->>'kpi', jsonb_pretty(x->'universos_y_resultado'->'territorios')
FROM jsonb_array_elements(public.ctr_sla_batch1_resumen('A')) x;

\echo '=== QA) SEMANTICA MET / MISSED / NOT_EVALUABLE (ALC-02) ==='
WITH t AS (SELECT * FROM public.ctr_sla_temporal_ot('7b1e0004-0000-4000-8000-000000000002','A') WHERE poblacion='servicio')
SELECT 'END = deadline'   caso, count(*) n, array_agg(DISTINCT temporal_result) resultado FROM t WHERE end_date = deadline_date
UNION ALL SELECT 'END = deadline+1', count(*), array_agg(DISTINCT temporal_result) FROM t WHERE end_date = deadline_date + 1
UNION ALL SELECT 'END < deadline',   count(*), array_agg(DISTINCT temporal_result) FROM t WHERE end_date < deadline_date
UNION ALL SELECT 'END ausente',      count(*), array_agg(DISTINCT temporal_result) FROM t WHERE end_date IS NULL
UNION ALL SELECT 'END < START',      count(*), array_agg(DISTINCT temporal_result) FROM t WHERE end_date < start_date;

\echo '=== QA) DEADLINES EN FINDE/FESTIVO Y ORDEN TEMPORAL ==='
SELECT rd.codigo,
  count(*) FILTER (WHERE t.temporal_result<>'NOT_EVALUABLE' AND extract(isodow FROM t.deadline_date)>5) deadline_finde,
  count(*) FILTER (WHERE t.temporal_result<>'NOT_EVALUABLE' AND t.calendar_type<>'NATURAL'
                     AND EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                                  WHERE c.fecha=t.deadline_date AND NOT c.laborable
                                    AND (c.territorio=t.territorio_ot
                                         OR (t.territorio_ot LIKE 'ES-%' AND c.territorio='ES')))) deadline_festivo,
  count(*) FILTER (WHERE t.deadline_date<=t.start_date) deadline_no_posterior
FROM public.ctr_regla_definicion rd JOIN public.ctr_regla_version rv ON rv.regla_id=rd.id
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id,'A') t
WHERE rv.id IN ('7a1e0004-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000002',
                '7c1e0004-0000-4000-8000-000000000003','7c1e0004-0000-4000-8000-000000000004',
                '7b1e0004-0000-4000-8000-000000000002','7c1e0004-0000-4000-8000-000000000023')
GROUP BY 1 ORDER BY 1;

\echo '=== QA) DATA LEAKAGE ENTRE CLIENTES ==='
SELECT rv.id::text regla_version, string_agg(DISTINCT o.cliente_wg,', ') clientes
FROM public.ctr_regla_version rv
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id,'A') t
JOIN public.ops_fact_ot o ON o.num_ot=t.num_ot
WHERE rv.id IN ('7a1e0004-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000002',
                '7c1e0004-0000-4000-8000-000000000023')
GROUP BY 1;

\echo '=== QA) CONTRASTE HELPER vs EVALUADOR (territorio de la OT) ==='
SELECT 'MAK-02 T+4 WD' kpi, count(*) n,
       count(*) FILTER (WHERE deadline_date=public.ops_add_working_days(start_date,4,territorio_ot)) coinciden
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7a1e0004-0000-4000-8000-000000000002','A')
       WHERE start_date IS NOT NULL AND territorio_ot<>'UNRESOLVED' LIMIT 300) a
UNION ALL SELECT 'MET-02 T+4 WD', count(*),
       count(*) FILTER (WHERE deadline_date=public.ops_add_working_days(start_date,4,territorio_ot))
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7c1e0004-0000-4000-8000-000000000004','A')
       WHERE start_date IS NOT NULL AND territorio_ot<>'UNRESOLVED' LIMIT 300) d
UNION ALL SELECT 'ALC-02 T+5 WD', count(*),
       count(*) FILTER (WHERE deadline_date=public.ops_add_working_days(start_date,5,territorio_ot))
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7b1e0004-0000-4000-8000-000000000002','A')
       WHERE start_date IS NOT NULL AND territorio_ot<>'UNRESOLVED' LIMIT 300) b
UNION ALL SELECT 'ALC-03 T+21 CD (escenario)', count(*),
       count(*) FILTER (WHERE deadline_date=public.ops_add_calendar_days(start_date,21))
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7c1e0004-0000-4000-8000-000000000023','A')
       WHERE start_date IS NOT NULL LIMIT 300) c;

\echo '=== P) LEGACY sla_cierre_dlab (solo diagnostico, NO usado en el KPI) ==='
SELECT cliente_wg, count(*) n, count(sla_cierre_dlab) con_valor, round(avg(sla_cierre_dlab),2) media
FROM public.ops_fact_ot WHERE cliente_wg IN ('MAKRO','METRO MARKETS GMBH','ALCAMPO') GROUP BY 1 ORDER BY 1;

ROLLBACK;
