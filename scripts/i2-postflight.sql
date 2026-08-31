\pset pager off
\echo '=== A · INVENTARIO ops_* (debe ser 20/1/12) + HASH 44 FUNCIONES ==='
SELECT
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ops!_%' ESCAPE '!') tablas,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m') AND c.relname LIKE 'ops!_%' ESCAPE '!') vistas,
 (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname LIKE 'ops!_%' ESCAPE '!') triggers,
 (SELECT count(*) FROM public.ops_cliente_contrato_alias) alias;
SELECT md5(string_agg(h,'|' ORDER BY h)) hash_conjunto, count(*) n FROM (
 SELECT md5(regexp_replace(pg_get_functiondef(p.oid),'\s+',' ','g')) h FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname LIKE 'ops!_%' ESCAPE '!' OR p.proname IN ('is_management','has_role'))) s;

\echo '=== B · NUEVOS OBJETOS I2 ==='
SELECT c.relname, c.relrowsecurity rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
 ('ctr_claim','ctr_regla_definicion','ctr_regla_version','ctr_regla_aplicabilidad_scope','ctr_regla_aplicabilidad_predicado','ctr_aplicabilidad','ctr_precedencia','ctr_gobierno_config','ctr_alias_propuesta','ctr_correspondencia_operativa','ctr_mapa_contractual_version','ctr_mapa_contractual_item')
 ORDER BY 1;

\echo '=== C · CONTEOS I2 ==='
SELECT 'ctr_claim' t,count(*) FROM public.ctr_claim
UNION ALL SELECT 'ctr_regla_definicion',count(*) FROM public.ctr_regla_definicion
UNION ALL SELECT 'ctr_regla_version',count(*) FROM public.ctr_regla_version
UNION ALL SELECT 'ctr_regla_aplicabilidad_scope',count(*) FROM public.ctr_regla_aplicabilidad_scope
UNION ALL SELECT 'ctr_regla_aplicabilidad_predicado',count(*) FROM public.ctr_regla_aplicabilidad_predicado
UNION ALL SELECT 'ctr_aplicabilidad',count(*) FROM public.ctr_aplicabilidad
UNION ALL SELECT 'ctr_precedencia',count(*) FROM public.ctr_precedencia
UNION ALL SELECT 'ctr_gobierno_config',count(*) FROM public.ctr_gobierno_config
UNION ALL SELECT 'ctr_alias_propuesta',count(*) FROM public.ctr_alias_propuesta
UNION ALL SELECT 'ctr_correspondencia_operativa',count(*) FROM public.ctr_correspondencia_operativa
UNION ALL SELECT 'ctr_mapa_contractual_version',count(*) FROM public.ctr_mapa_contractual_version
UNION ALL SELECT 'ctr_mapa_contractual_item',count(*) FROM public.ctr_mapa_contractual_item
UNION ALL SELECT 'ctr_programa_servicio',count(*) FROM public.ctr_programa_servicio ORDER BY 1;

\echo '=== D · CLAIMS por estado (VALIDATED debe ser 0) ==='
SELECT estado, count(*) FROM public.ctr_claim GROUP BY 1 ORDER BY 1;

\echo '=== E · READINESS (ninguna APPLICABLE / NOT_APPLICABLE) ==='
SELECT estado, reason_code, count(*) FROM public.ctr_aplicabilidad GROUP BY 1,2 ORDER BY 3 DESC;

\echo '=== F · BASELINE K · i1-v1 INTACTO (125752 | 94e571b86dcd3cbb1b62480503f5929d) ==='
SELECT count(*) n, md5(string_agg(r.fingerprint,'|' ORDER BY r.fingerprint)) md5_fp
  FROM public.ctr_resolucion_ot_programa r JOIN public.ctr_resolucion_contexto c ON c.id=r.resolution_context_id
 WHERE c.algoritmo_version='i1-v1';

\echo '=== G · VIGENTES: distribucion resultado/metodo ==='
SELECT r.resultado, coalesce(r.metodo,'(null)') metodo, count(*) FROM public.ctr_resolucion_ot_programa r WHERE r.vigente GROUP BY 1,2 ORDER BY 3 DESC;
SELECT count(*) total_vigentes, count(DISTINCT num_ot) ots_distintas,
       count(*) FILTER (WHERE identidad_contractual='establecida') identidad_establecida
  FROM public.ctr_resolucion_ot_programa WHERE vigente;

\echo '=== H · SUPERSEDE COHERENTE ==='
SELECT count(*) FILTER (WHERE NOT vigente AND superseded_by_id IS NULL) cerradas_sin_enlace,
       count(*) FILTER (WHERE NOT vigente AND superseded_at IS NULL) cerradas_sin_fecha,
       count(*) FILTER (WHERE vigente AND superseded_by_id IS NOT NULL) vigentes_enlazadas
  FROM public.ctr_resolucion_ot_programa;
SELECT count(*) AS ots_con_mas_de_una_vigente FROM (
  SELECT num_ot FROM public.ctr_resolucion_ot_programa WHERE vigente GROUP BY 1 HAVING count(*)>1) q;

\echo '=== I · FH-3: identidad establecida solo con metodo valido ==='
SELECT count(*) violaciones FROM public.ctr_resolucion_ot_programa
 WHERE identidad_contractual='establecida' AND (metodo IS NULL OR metodo NOT IN ('EXPLICIT_OT_FIELD','CONTRACTUAL_MAPPING'));

\echo '=== J · LINAJE: toda fila I2 con carga_id ==='
SELECT (SELECT count(*) FROM public.ctr_claim WHERE carga_id IS NULL) claim,
       (SELECT count(*) FROM public.ctr_regla_version WHERE carga_id IS NULL) regla_version,
       (SELECT count(*) FROM public.ctr_correspondencia_operativa WHERE carga_id IS NULL) correspondencia,
       (SELECT count(*) FROM public.ctr_mapa_contractual_item WHERE carga_id IS NULL) mapa_item,
       (SELECT count(*) FROM public.ctr_resolucion_ot_programa r JOIN public.ctr_resolucion_contexto c ON c.id=r.resolution_context_id
         WHERE c.algoritmo_version='i2-v1' AND r.carga_id IS NULL) resoluciones_i2;

\echo '=== K · SEGURIDAD: escritura anon/authenticated en tablas I2 ==='
SELECT c.relname tabla, r.rolname rol,
       has_table_privilege(r.rolname,c.oid,'SELECT') sel, has_table_privilege(r.rolname,c.oid,'INSERT') ins,
       has_table_privilege(r.rolname,c.oid,'UPDATE') upd, has_table_privilege(r.rolname,c.oid,'DELETE') del
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator')) r
 WHERE n.nspname='public' AND c.relname IN
 ('ctr_claim','ctr_regla_definicion','ctr_regla_version','ctr_regla_aplicabilidad_scope','ctr_regla_aplicabilidad_predicado','ctr_aplicabilidad','ctr_precedencia','ctr_gobierno_config','ctr_alias_propuesta','ctr_correspondencia_operativa','ctr_mapa_contractual_version','ctr_mapa_contractual_item')
 ORDER BY 1,2;
