-- =====================================================================
-- I1 POSTFLIGHT A–J (solo lectura salvo la tx I de rollback rehearsal)
--   psql -X -f scripts/i1-postflight.sql
-- =====================================================================
\pset pager off

\echo '=== A · ESQUEMA ctr_* ==='
SELECT 'tabla' AS clase, c.relname AS objeto FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ctr!_%' ESCAPE '!'
UNION ALL SELECT 'indice', c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='i' AND c.relname LIKE 'ctr!_%' ESCAPE '!'
UNION ALL SELECT 'indice', i.indexname FROM pg_indexes i
 WHERE i.schemaname='public' AND i.tablename LIKE 'ctr!_%' ESCAPE '!' AND i.indexname LIKE 'ux!_%' ESCAPE '!'
UNION ALL SELECT 'funcion', p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'ctr!_%' ESCAPE '!'
UNION ALL SELECT 'trigger', t.tgname||' ON '||c.relname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname LIKE 'ctr!_%' ESCAPE '!'
ORDER BY 1,2;

\echo '=== B · CONTEOS ctr_* ==='
SELECT 'ctr_carga' t, count(*) FROM public.ctr_carga
UNION ALL SELECT 'ctr_business_line', count(*) FROM public.ctr_business_line
UNION ALL SELECT 'ctr_vertical', count(*) FROM public.ctr_vertical
UNION ALL SELECT 'ctr_actividad', count(*) FROM public.ctr_actividad
UNION ALL SELECT 'ctr_sociedad_wg', count(*) FROM public.ctr_sociedad_wg
UNION ALL SELECT 'ctr_territorio', count(*) FROM public.ctr_territorio
UNION ALL SELECT 'ctr_contraparte_legal', count(*) FROM public.ctr_contraparte_legal
UNION ALL SELECT 'ctr_cliente', count(*) FROM public.ctr_cliente
UNION ALL SELECT 'ctr_documento', count(*) FROM public.ctr_documento
UNION ALL SELECT 'ctr_programa', count(*) FROM public.ctr_programa
UNION ALL SELECT 'ctr_programa_parte', count(*) FROM public.ctr_programa_parte
UNION ALL SELECT 'ctr_programa_servicio', count(*) FROM public.ctr_programa_servicio
UNION ALL SELECT 'ctr_contrato', count(*) FROM public.ctr_contrato
UNION ALL SELECT 'ctr_contrato_alcance', count(*) FROM public.ctr_contrato_alcance
UNION ALL SELECT 'ctr_contrato_relacion', count(*) FROM public.ctr_contrato_relacion
UNION ALL SELECT 'ctr_instrumento_documento', count(*) FROM public.ctr_instrumento_documento
UNION ALL SELECT 'ctr_acto_gobierno', count(*) FROM public.ctr_acto_gobierno
UNION ALL SELECT 'ctr_row_audit', count(*) FROM public.ctr_row_audit
UNION ALL SELECT 'ctr_solicitud_promocion', count(*) FROM public.ctr_solicitud_promocion
UNION ALL SELECT 'ctr_alias_identidad', count(*) FROM public.ctr_alias_identidad
UNION ALL SELECT 'ctr_alias_set_version', count(*) FROM public.ctr_alias_set_version
UNION ALL SELECT 'ctr_alias_set_item', count(*) FROM public.ctr_alias_set_item
UNION ALL SELECT 'ctr_censo_programas_version', count(*) FROM public.ctr_censo_programas_version
UNION ALL SELECT 'ctr_censo_programas_item', count(*) FROM public.ctr_censo_programas_item
UNION ALL SELECT 'ctr_resolucion_contexto', count(*) FROM public.ctr_resolucion_contexto
UNION ALL SELECT 'ctr_resolucion_ot_programa', count(*) FROM public.ctr_resolucion_ot_programa
ORDER BY 1;

\echo '=== C · GOBIERNO (actos reales / CONTRACTUAL_VALIDATED) ==='
SELECT (SELECT count(*) FROM public.ctr_acto_gobierno) AS actos,
       (SELECT count(*) FROM public.ctr_documento WHERE estado_evidencia='CONTRACTUAL_VALIDATED') AS docs_cv,
       (SELECT count(*) FROM public.ctr_contrato WHERE estado_evidencia='CONTRACTUAL_VALIDATED') AS contratos_cv,
       (SELECT count(*) FROM public.ctr_programa_parte WHERE estado_evidencia='CONTRACTUAL_VALIDATED') AS partes_cv;

\echo '=== D · FH-3 identidad contractual ==='
SELECT identidad_contractual, coalesce(metodo,'(sin metodo)') AS metodo, count(*)
  FROM public.ctr_resolucion_ot_programa WHERE vigente GROUP BY 1,2 ORDER BY 3 DESC;
SELECT count(*) AS violaciones_regla
  FROM public.ctr_resolucion_ot_programa
 WHERE identidad_contractual='establecida'
   AND (metodo IS NULL OR metodo NOT IN ('EXPLICIT_OT_FIELD','CONTRACTUAL_MAPPING'));

\echo '=== E · DISTRIBUCION por cliente ==='
SELECT c.nombre_display AS cliente, count(*) total,
       count(*) FILTER (WHERE r.resultado='determinista') deterministas,
       count(*) FILTER (WHERE r.resultado='ambiguous') ambiguas,
       count(*) FILTER (WHERE r.resultado='cliente_sin_programa') cliente_sin_programa,
       count(*) FILTER (WHERE r.identidad_contractual='establecida') identidad_establecida
  FROM public.ctr_resolucion_ot_programa r
  JOIN public.ctr_alias_set_item a ON a.sistema_origen='erp_cliente'
   AND upper(btrim(a.valor_origen))=upper(btrim(coalesce(r.cliente_wg_origen,'')))
  JOIN public.ctr_cliente c ON c.id=a.cliente_id
 WHERE r.vigente GROUP BY 1
UNION ALL
SELECT 'SIN CLIENTE', count(*),0,0,0,count(*) FILTER (WHERE identidad_contractual='establecida')
  FROM public.ctr_resolucion_ot_programa WHERE vigente AND resultado='sin_cliente'
ORDER BY 2 DESC;

\echo '=== F · LINAJE (carga_id nulo/invalido) + foto reproducible ==='
SELECT (SELECT count(*) FROM public.ctr_alias_identidad WHERE carga_id IS NULL) AS alias_sin_carga,
       (SELECT count(*) FROM public.ctr_resolucion_ot_programa WHERE carga_id IS NULL) AS resol_sin_carga,
       (SELECT count(*) FROM public.ctr_alias_set_item i LEFT JOIN public.ctr_carga c ON c.id=i.carga_id WHERE c.id IS NULL) AS items_carga_invalida;
SELECT v.hash_contenido AS almacenado,
       md5(string_agg(s, E'\n' ORDER BY s)) AS recalculado
  FROM public.ctr_alias_set_version v
  JOIN LATERAL (SELECT i.sistema_origen||'|'||i.valor_origen||'|'||i.cliente_id::text||'|'||
                       coalesce(i.programa_id::text,'')||'|'||i.gobernado::text AS s
                  FROM public.ctr_alias_set_item i WHERE i.version_id=v.id) q ON true
 GROUP BY v.hash_contenido;

\echo '=== G · SEGURIDAD: escritura de anon/authenticated/authenticator en ctr_* ==='
SELECT c.relname AS tabla, r.rolname AS rol,
       has_table_privilege(r.rolname, c.oid, 'INSERT') AS ins,
       has_table_privilege(r.rolname, c.oid, 'UPDATE') AS upd,
       has_table_privilege(r.rolname, c.oid, 'DELETE') AS del,
       has_table_privilege(r.rolname, c.oid, 'SELECT') AS sel
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator')) r
 WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ctr!_%' ESCAPE '!'
 ORDER BY 1,2;

\echo '=== H · ops_* ZERO DIFF ==='
SELECT md5(string_agg(h,'|' ORDER BY h)) AS hash_conjunto, count(*) AS n
FROM (SELECT md5(regexp_replace(pg_get_functiondef(p.oid),'\s+',' ','g')) h
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND (p.proname LIKE 'ops!_%' ESCAPE '!' OR p.proname IN ('is_management','has_role'))) s;
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ops!_%' ESCAPE '!') AS tablas,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('v','m') AND c.relname LIKE 'ops!_%' ESCAPE '!') AS vistas,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname LIKE 'ops!_%' ESCAPE '!') AS triggers,
  (SELECT count(*) FROM public.ops_cliente_contrato_alias) AS alias_fuente,
  (SELECT count(DISTINCT num_ot) FROM public.ops_fact_ot) AS ots;
