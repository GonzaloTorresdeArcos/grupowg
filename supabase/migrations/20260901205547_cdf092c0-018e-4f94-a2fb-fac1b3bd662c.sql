-- PRV-A1.2.2 · RUNTIME PERFORMANCE HOTFIX
-- Solo rendimiento. Semántica, universos, cifras y ACL sin cambios.

-- Índice justificado por EXPLAIN: el contador económico del árbol pasa de un
-- seq scan de ops_fact_ot (10.787 páginas) a un index only scan (2.433).
CREATE INDEX IF NOT EXISTS ix_ops_fact_ot_num_ot_importe
  ON public.ops_fact_ot (num_ot)
  WHERE fact_cli IS NOT NULL AND fact_cli <> 0;

CREATE OR REPLACE FUNCTION public.ctr_portfolio_arbol()
 RETURNS TABLE(vertical_codigo text, vertical_nombre text, cliente_id uuid, cliente_nombre text, programa_id uuid, programa_nombre text, programa_estado text, effective_from date, effective_to date, n_ots bigint, n_ots_importe_informado bigint, n_instrumentos integer, n_claims integer, claims_validated integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  RETURN QUERY
  WITH ots AS (
    SELECT r.programa_id,
           count(*)::bigint AS n_ots,
           count(f.num_ot)::bigint AS n_imp
      FROM public.ctr_resolucion_ot_programa r
      LEFT JOIN (SELECT f0.num_ot FROM public.ops_fact_ot f0
                  WHERE f0.fact_cli IS NOT NULL AND f0.fact_cli <> 0) f
        ON f.num_ot = r.num_ot
     WHERE r.vigente AND r.resultado = 'determinista' AND r.programa_id IS NOT NULL
     GROUP BY r.programa_id
  ),
  instr AS (
    SELECT a.programa_id, count(DISTINCT a.contrato_id)::int AS n
      FROM public.ctr_contrato_alcance a GROUP BY a.programa_id
  ),
  claims AS (
    SELECT c.programa_id,
           count(*)::int AS n,
           count(*) FILTER (WHERE c.estado = 'VALIDATED')::int AS validated
      FROM public.ctr_claim c WHERE c.programa_id IS NOT NULL GROUP BY c.programa_id
  )
  SELECT v.codigo, v.nombre, cl.id, cl.nombre_display, p.id, p.nombre, p.estado,
         p.effective_from, p.effective_to,
         COALESCE(o.n_ots, 0), COALESCE(o.n_imp, 0),
         COALESCE(i.n, 0), COALESCE(cm.n, 0), COALESCE(cm.validated, 0)
    FROM public.ctr_programa p
    LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
    LEFT JOIN public.ctr_cliente  cl ON cl.id = p.cliente_id
    LEFT JOIN ots    o  ON o.programa_id  = p.id
    LEFT JOIN instr  i  ON i.programa_id  = p.id
    LEFT JOIN claims cm ON cm.programa_id = p.id
   ORDER BY v.codigo NULLS LAST, cl.nombre_display NULLS LAST, p.nombre;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ctr_portfolio_no_resueltas()
 RETURNS TABLE(clase text, cliente_wg_origen text, cliente_nombre text, alias_gobernado boolean, alias_metodo text, vertical_codigo text, vertical_nombre text, n_programas_candidatos integer, n_ots bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  RETURN QUERY
  WITH alias AS (
    SELECT a.valor_origen,
           min(a.cliente_id::text)::uuid AS cliente_id,
           bool_or(a.gobernado) AS gobernado,
           min(a.metodo) AS metodo
      FROM public.ctr_alias_identidad a
     WHERE a.sistema_origen = 'erp_cliente'
     GROUP BY a.valor_origen
  ),
  cli_vert AS (
    SELECT p.cliente_id,
           count(*)::int AS n_prog,
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN (array_agg(DISTINCT p.vertical_id))[1] END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  ),
  agg AS (
    SELECT r.cliente_wg_origen, count(*)::bigint AS n_ots
      FROM public.ctr_resolucion_ot_programa r
     WHERE r.vigente AND r.resultado IN ('ambiguous', 'sin_cliente')
     GROUP BY r.cliente_wg_origen
  )
  SELECT CASE
           WHEN al.cliente_id IS NULL THEN 'identidad_no_establecida'
           WHEN al.gobernado THEN 'identidad_gobernada_sin_programa'
           ELSE 'cliente_operativo_reconocido_sin_programa'
         END,
         agg.cliente_wg_origen,
         c.nombre_display,
         COALESCE(al.gobernado, false),
         al.metodo,
         v.codigo,
         v.nombre,
         COALESCE(cv.n_prog, 0),
         sum(agg.n_ots)::bigint
    FROM agg
    LEFT JOIN alias al ON al.valor_origen = agg.cliente_wg_origen
    LEFT JOIN public.ctr_cliente c ON c.id = al.cliente_id
    LEFT JOIN cli_vert cv ON cv.cliente_id = al.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = cv.vertical_id
   GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
   ORDER BY 9 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ctr_portfolio_resumen()
 RETURNS TABLE(vertical_codigo text, vertical_nombre text, n_programas integer, n_clientes integer, n_ots bigint, n_ots_cliente_identificado bigint, n_ots_alias_gobernado bigint, n_ots_alias_no_gobernado bigint, n_instrumentos integer, n_claims integer, claims_validated integer, claims_pending integer, claims_por_categoria jsonb, n_reglas integer, n_aplicabilidad integer, n_ots_importe_no_cero bigint, n_ots_importe_cero bigint, n_ots_importe_nulo bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  RETURN QUERY
  -- UNA sola pasada base: resolución vigente x economía. Antes se unía dos
  -- veces contra ops_fact_ot (deterministas y no resueltas por separado).
  WITH base AS MATERIALIZED (
    SELECT r.programa_id, r.resultado, r.cliente_wg_origen,
           CASE WHEN f.fact_cli IS NULL THEN 0
                WHEN f.fact_cli = 0    THEN 1
                ELSE 2 END AS eco
      FROM public.ctr_resolucion_ot_programa r
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
     WHERE r.vigente
  ),
  ots AS (
    SELECT p.vertical_id,
           count(*)::bigint AS n_ots,
           count(*) FILTER (WHERE b.eco = 2)::bigint AS n_no_cero,
           count(*) FILTER (WHERE b.eco = 1)::bigint AS n_cero,
           count(*) FILTER (WHERE b.eco = 0)::bigint AS n_nulo
      FROM base b
      JOIN public.ctr_programa p ON p.id = b.programa_id
     WHERE b.resultado = 'determinista'
     GROUP BY p.vertical_id
  ),
  alias AS (
    SELECT a.valor_origen, a.cliente_id, bool_or(a.gobernado) AS gobernado
      FROM public.ctr_alias_identidad a
     WHERE a.sistema_origen = 'erp_cliente'
     GROUP BY a.valor_origen, a.cliente_id
  ),
  cli_vert AS (
    SELECT p.cliente_id,
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN (array_agg(DISTINCT p.vertical_id))[1] END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  ),
  amb AS (
    SELECT cv.vertical_id,
           count(*)::bigint AS n,
           count(*) FILTER (WHERE al.gobernado)::bigint     AS n_gob,
           count(*) FILTER (WHERE NOT al.gobernado)::bigint AS n_no_gob
      FROM base b
      JOIN alias al ON al.valor_origen = b.cliente_wg_origen
      JOIN cli_vert cv ON cv.cliente_id = al.cliente_id
     WHERE b.resultado = 'ambiguous' AND cv.vertical_id IS NOT NULL
     GROUP BY cv.vertical_id
  ),
  progs AS (
    SELECT p.vertical_id, count(*)::int AS n_programas,
           count(DISTINCT p.cliente_id)::int AS n_clientes
      FROM public.ctr_programa p GROUP BY p.vertical_id
  ),
  instr AS (
    SELECT p.vertical_id, count(DISTINCT a.contrato_id)::int AS n_instrumentos
      FROM public.ctr_contrato_alcance a
      JOIN public.ctr_programa p ON p.id = a.programa_id
     GROUP BY p.vertical_id
  ),
  claims AS (
    SELECT p.vertical_id,
           count(*)::int AS n_claims,
           count(*) FILTER (WHERE c.estado = 'VALIDATED')::int AS validated,
           count(*) FILTER (WHERE c.estado IS DISTINCT FROM 'VALIDATED')::int AS pending
      FROM public.ctr_claim c
      JOIN public.ctr_programa p ON p.id = c.programa_id
     GROUP BY p.vertical_id
  ),
  claims_cat AS (
    SELECT x.vertical_id, jsonb_object_agg(x.categoria, x.n) AS por_categoria
      FROM (
        SELECT p.vertical_id, c.categoria, count(*)::int AS n
          FROM public.ctr_claim c
          JOIN public.ctr_programa p ON p.id = c.programa_id
         GROUP BY p.vertical_id, c.categoria
      ) x
     GROUP BY x.vertical_id
  ),
  reglas AS (
    SELECT p.vertical_id, count(DISTINCT rv.id)::int AS n_reglas
      FROM public.ctr_regla_version rv
      JOIN public.ctr_claim c ON c.id = rv.claim_id
      JOIN public.ctr_programa p ON p.id = c.programa_id
     GROUP BY p.vertical_id
  ),
  aplic AS (
    SELECT p.vertical_id, count(*)::int AS n_aplicabilidad
      FROM public.ctr_aplicabilidad ap
      JOIN public.ctr_programa p ON p.id = ap.programa_id
     GROUP BY p.vertical_id
  ),
  sin_resolver AS (
    SELECT b.resultado AS codigo,
           count(*)::bigint AS n_ots,
           count(*) FILTER (WHERE b.resultado = 'ambiguous')::bigint AS n_ident,
           count(*) FILTER (WHERE b.resultado = 'ambiguous' AND al.gobernado)::bigint AS n_gob,
           count(*) FILTER (WHERE b.resultado = 'ambiguous' AND al.valor_origen IS NOT NULL AND NOT al.gobernado)::bigint AS n_no_gob,
           count(*) FILTER (WHERE b.eco = 2)::bigint AS n_no_cero,
           count(*) FILTER (WHERE b.eco = 1)::bigint AS n_cero,
           count(*) FILTER (WHERE b.eco = 0)::bigint AS n_nulo
      FROM base b
      LEFT JOIN alias al ON al.valor_origen = b.cliente_wg_origen
     WHERE b.resultado IN ('ambiguous', 'sin_cliente')
     GROUP BY b.resultado
  )
  SELECT v.codigo, v.nombre,
         COALESCE(pg.n_programas, 0), COALESCE(pg.n_clientes, 0),
         COALESCE(o.n_ots, 0), COALESCE(ab.n, 0),
         COALESCE(ab.n_gob, 0), COALESCE(ab.n_no_gob, 0),
         COALESCE(i.n_instrumentos, 0),
         COALESCE(cl.n_claims, 0), COALESCE(cl.validated, 0), COALESCE(cl.pending, 0),
         COALESCE(cc.por_categoria, '{}'::jsonb),
         COALESCE(rg.n_reglas, 0), COALESCE(ap.n_aplicabilidad, 0),
         COALESCE(o.n_no_cero, 0), COALESCE(o.n_cero, 0), COALESCE(o.n_nulo, 0)
    FROM public.ctr_vertical v
    LEFT JOIN progs  pg ON pg.vertical_id = v.id
    LEFT JOIN ots    o  ON o.vertical_id  = v.id
    LEFT JOIN amb    ab ON ab.vertical_id = v.id
    LEFT JOIN instr  i  ON i.vertical_id  = v.id
    LEFT JOIN claims cl ON cl.vertical_id = v.id
    LEFT JOIN claims_cat cc ON cc.vertical_id = v.id
    LEFT JOIN reglas rg ON rg.vertical_id = v.id
    LEFT JOIN aplic  ap ON ap.vertical_id = v.id
  UNION ALL
  SELECT 'SIN_RESOLVER', s.codigo, 0, 0, s.n_ots, s.n_ident, s.n_gob, s.n_no_gob,
         0, 0, 0, 0, '{}'::jsonb, 0, 0,
         s.n_no_cero, s.n_cero, s.n_nulo
    FROM sin_resolver s;
END;
$function$;

REVOKE ALL ON FUNCTION public.ctr_portfolio_arbol() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_portfolio_no_resueltas() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_portfolio_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_arbol() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_no_resueltas() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_resumen() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';