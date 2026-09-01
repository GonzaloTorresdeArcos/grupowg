CREATE OR REPLACE FUNCTION public.ctr_portfolio_arbol()
RETURNS TABLE (
  vertical_codigo text,
  vertical_nombre text,
  cliente_id uuid,
  cliente_nombre text,
  programa_id uuid,
  programa_nombre text,
  programa_estado text,
  effective_from date,
  effective_to date,
  n_ots bigint,
  n_ots_importe_informado bigint,
  n_instrumentos integer,
  n_claims integer,
  claims_validated integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  RETURN QUERY
  WITH ots AS (
    SELECT r.programa_id,
           count(*)::bigint AS n_ots,
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_imp
      FROM public.ctr_resolucion_ot_programa r
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
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
  SELECT v.codigo,
         v.nombre,
         cl.id,
         cl.nombre_display,
         p.id,
         p.nombre,
         p.estado,
         p.effective_from,
         p.effective_to,
         COALESCE(o.n_ots, 0),
         COALESCE(o.n_imp, 0),
         COALESCE(i.n, 0),
         COALESCE(cm.n, 0),
         COALESCE(cm.validated, 0)
    FROM public.ctr_programa p
    LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
    LEFT JOIN public.ctr_cliente  cl ON cl.id = p.cliente_id
    LEFT JOIN ots    o  ON o.programa_id  = p.id
    LEFT JOIN instr  i  ON i.programa_id  = p.id
    LEFT JOIN claims cm ON cm.programa_id = p.id
   ORDER BY v.codigo NULLS LAST, cl.nombre_display NULLS LAST, p.nombre;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ctr_portfolio_arbol() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_portfolio_arbol() FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_arbol() TO authenticated;