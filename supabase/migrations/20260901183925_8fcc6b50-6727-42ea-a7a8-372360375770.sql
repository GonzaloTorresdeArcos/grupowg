DROP FUNCTION IF EXISTS public.ctr_portfolio_resumen();
DROP FUNCTION IF EXISTS public.ctr_portfolio_no_resueltas();

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
  WITH res AS (
    SELECT r.num_ot, r.programa_id, r.resultado, r.cliente_wg_origen
      FROM public.ctr_resolucion_ot_programa r
     WHERE r.vigente
  ),
  det AS (
    SELECT r.num_ot, p.vertical_id
      FROM res r
      JOIN public.ctr_programa p ON p.id = r.programa_id
     WHERE r.resultado = 'determinista'
  ),
  ots AS (
    SELECT d.vertical_id,
           count(*)::bigint AS n_ots,
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_no_cero,
           count(*) FILTER (WHERE f.fact_cli = 0)::bigint                              AS n_cero,
           count(*) FILTER (WHERE f.fact_cli IS NULL)::bigint                          AS n_nulo
      FROM det d
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = d.num_ot
     GROUP BY d.vertical_id
  ),
  alias AS (
    SELECT a.valor_origen, a.cliente_id, bool_or(a.gobernado) AS gobernado
      FROM public.ctr_alias_identidad a
     WHERE a.sistema_origen = 'erp_cliente'
     GROUP BY a.valor_origen, a.cliente_id
  ),
  cli_vert AS (
    SELECT p.cliente_id,
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN min(p.vertical_id) END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  ),
  amb AS (
    SELECT cv.vertical_id,
           count(*)::bigint AS n,
           count(*) FILTER (WHERE al.gobernado)::bigint     AS n_gob,
           count(*) FILTER (WHERE NOT al.gobernado)::bigint AS n_no_gob
      FROM res r
      JOIN alias al ON al.valor_origen = r.cliente_wg_origen
      JOIN cli_vert cv ON cv.cliente_id = al.cliente_id
     WHERE r.resultado = 'ambiguous' AND cv.vertical_id IS NOT NULL
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
    SELECT r.resultado AS codigo,
           count(*)::bigint AS n_ots,
           count(*) FILTER (WHERE r.resultado = 'ambiguous')::bigint AS n_ident,
           count(*) FILTER (WHERE r.resultado = 'ambiguous' AND al.gobernado)::bigint AS n_gob,
           count(*) FILTER (WHERE r.resultado = 'ambiguous' AND al.valor_origen IS NOT NULL AND NOT al.gobernado)::bigint AS n_no_gob,
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_no_cero,
           count(*) FILTER (WHERE f.fact_cli = 0)::bigint     AS n_cero,
           count(*) FILTER (WHERE f.fact_cli IS NULL)::bigint AS n_nulo
      FROM res r
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
      LEFT JOIN alias al ON al.valor_origen = r.cliente_wg_origen
     WHERE r.resultado IN ('ambiguous', 'sin_cliente')
     GROUP BY r.resultado
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
  WITH res AS (
    SELECT r.num_ot, r.resultado, r.cliente_wg_origen
      FROM public.ctr_resolucion_ot_programa r
     WHERE r.vigente AND r.resultado IN ('ambiguous', 'sin_cliente')
  ),
  alias AS (
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
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN min(p.vertical_id) END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  )
  SELECT CASE
           WHEN al.cliente_id IS NULL THEN 'identidad_no_establecida'
           WHEN al.gobernado THEN 'identidad_gobernada_sin_programa'
           ELSE 'cliente_operativo_reconocido_sin_programa'
         END,
         res.cliente_wg_origen,
         c.nombre_display,
         COALESCE(al.gobernado, false),
         al.metodo,
         v.codigo,
         v.nombre,
         COALESCE(cv.n_prog, 0),
         count(*)::bigint
    FROM res
    LEFT JOIN alias al ON al.valor_origen = res.cliente_wg_origen
    LEFT JOIN public.ctr_cliente c ON c.id = al.cliente_id
    LEFT JOIN cli_vert cv ON cv.cliente_id = al.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = cv.vertical_id
   GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
   ORDER BY 9 DESC;
END;
$function$;