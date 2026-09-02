\pset pager off
\pset format unaligned
\pset fieldsep '|'
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT user_id::text FROM public.user_roles WHERE role='management' LIMIT 1),
                    'role','authenticated')::text, true);
\echo '=== RESUMEN KPI ==='
SELECT jsonb_pretty(jsonb_agg(x ORDER BY x->>'kpi'))
FROM (SELECT public.ctr_sla_temporal_resumen(rv.id) x
        FROM public.ctr_regla_version rv JOIN public.ctr_regla_definicion rd ON rd.id=rv.regla_id
       WHERE rd.codigo LIKE 'R_SLA_M%') s;
\echo '=== CONTRASTE helper vs evaluador (MAK-02, 300 OT) ==='
SELECT count(*) total, count(*) FILTER (WHERE deadline_date = public.ops_add_working_days(start_date,4,'ES')) coinciden
FROM (SELECT * FROM public.ctr_sla_temporal_ot('7a1e0004-0000-4000-8000-000000000002') WHERE start_date IS NOT NULL LIMIT 300) t;
\echo '=== VALIDACIONES CALIDAD ==='
SELECT rd.codigo,
  count(*) FILTER (WHERE t.end_date < t.start_date) end_lt_start,
  count(*) FILTER (WHERE t.start_date > public.ops_as_of('ot') OR t.end_date > public.ops_as_of('ot')) fechas_futuras,
  count(*) FILTER (WHERE t.deadline_date <= t.start_date) deadline_no_posterior,
  count(*) FILTER (WHERE extract(isodow FROM t.deadline_date) > 5) deadline_finde,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.ops_calendario_laboral c WHERE c.territorio='ES' AND c.fecha=t.deadline_date AND NOT c.laborable)) deadline_festivo,
  count(*) - count(DISTINCT t.num_ot) duplicados
FROM public.ctr_regla_definicion rd JOIN public.ctr_regla_version rv ON rv.regla_id=rd.id
CROSS JOIN LATERAL public.ctr_sla_temporal_ot(rv.id) t
WHERE rd.codigo LIKE 'R_SLA_M%' GROUP BY 1 ORDER BY 1;
\echo '=== MUESTRA OT (MAK-01) ==='
SELECT num_ot,start_date,deadline_date,end_date,temporal_result,reason_not_evaluable
FROM public.ctr_sla_temporal_ot('7a1e0004-0000-4000-8000-000000000001') ORDER BY start_date LIMIT 8;
\echo '=== APLICABILIDAD REGISTRADA ==='
SELECT rd.codigo, a.estado, a.reason_code FROM public.ctr_aplicabilidad a
 JOIN public.ctr_regla_version rv ON rv.id=a.regla_version_id
 JOIN public.ctr_regla_definicion rd ON rd.id=rv.regla_id WHERE rd.codigo LIKE 'R_SLA_M%' ORDER BY 1;
\echo '=== LEGACY DIAGNOSTICO (no usado) ==='
SELECT cliente_wg, count(*) n, count(sla_cierre_dlab) con_valor, round(avg(sla_cierre_dlab),2) media
FROM public.ops_fact_ot WHERE cliente_wg IN ('MAKRO','METRO MARKETS GMBH') GROUP BY 1;
ROLLBACK;
