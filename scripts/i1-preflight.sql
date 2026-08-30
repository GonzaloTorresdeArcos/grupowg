-- =====================================================================
-- I1 PREFLIGHT (bloqueante) · Master Plan I1 v1.2 FINAL
-- Solo lectura. No modifica ningún objeto.
--   psql -X -v ON_ERROR_STOP=1 -f scripts/i1-preflight.sql
-- =====================================================================
\pset pager off
\timing off

\echo '=== (a) INVENTARIO ops_* ==='
SELECT 'tabla' AS clase, c.relname AS objeto
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'ops!_%' ESCAPE '!'
UNION ALL
SELECT 'vista', c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v','m') AND c.relname LIKE 'ops!_%' ESCAPE '!'
UNION ALL
SELECT 'funcion', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ops!_%' ESCAPE '!'
UNION ALL
SELECT 'trigger', t.tgname || ' ON ' || c.relname
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal AND c.relname LIKE 'ops!_%' ESCAPE '!'
ORDER BY 1, 2;

\echo '=== (a2) CONTEO INVENTARIO ==='
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ops!_%' ESCAPE '!') AS tablas,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind IN ('v','m') AND c.relname LIKE 'ops!_%' ESCAPE '!') AS vistas,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname LIKE 'ops!_%' ESCAPE '!') AS funciones,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname LIKE 'ops!_%' ESCAPE '!') AS triggers;

\echo '=== (b) HASH CANONICO POR FUNCION ==='
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS funcion,
       md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g')) AS hash_canonico
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE 'ops!_%' ESCAPE '!' OR p.proname IN ('is_management','has_role'))
ORDER BY 1;

\echo '=== (b2) HASH AGREGADO DEL CONJUNTO ==='
SELECT md5(string_agg(h, '|' ORDER BY h)) AS hash_conjunto, count(*) AS n_funciones
FROM (
  SELECT md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g')) AS h
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND (p.proname LIKE 'ops!_%' ESCAPE '!' OR p.proname IN ('is_management','has_role'))
) s;

\echo '=== (c1) ACL FUNCIONES (proacl) ==='
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS funcion,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       coalesce(p.proacl::text, '(default)') AS proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND (p.proname LIKE 'ops!_%' ESCAPE '!' OR p.proname IN ('is_management','has_role'))
ORDER BY 1;

\echo '=== (c2) ACL / RLS TABLAS ops_* ==='
SELECT c.relname AS tabla, pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls,
       coalesce(c.relacl::text, '(default)') AS relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ops!_%' ESCAPE '!'
ORDER BY 1;

\echo '=== (c3) POLICIES ops_* ==='
SELECT tablename, policyname, cmd, roles::text, coalesce(qual,'') AS qual, coalesce(with_check,'') AS with_check
FROM pg_policies
WHERE schemaname='public' AND tablename LIKE 'ops!_%' ESCAPE '!'
ORDER BY tablename, policyname;

\echo '=== (e) FUENTES ==='
SELECT (SELECT count(*) FROM public.ops_cliente_contrato_alias) AS alias_filas,
       (SELECT count(DISTINCT num_ot) FROM public.ops_fact_ot)   AS n_ots,
       (SELECT count(*) FROM public.ops_fact_ot)                 AS filas_fact_ot;

\echo '=== (f) MIGRACIONES APLICADAS (ultimas 5) ==='
-- (omitido: schema supabase_migrations no accesible al rol de lectura del sandbox)
