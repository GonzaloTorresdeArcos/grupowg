DROP FUNCTION IF EXISTS public.ctr_portfolio_resumen();

CREATE FUNCTION public.ctr_portfolio_resumen()
RETURNS TABLE(
  vertical_codigo text, vertical_nombre text,
  n_programas integer, n_clientes integer,
  n_ots bigint,
  n_ots_cliente_identificado bigint,
  n_instrumentos integer, n_claims integer, claims_validated integer, claims_pending integer,
  n_reglas integer, n_aplicabilidad integer,
  n_ots_importe_no_cero bigint, n_ots_importe_cero bigint, n_ots_importe_nulo bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    SELECT a.valor_origen, a.cliente_id
      FROM public.ctr_alias_identidad a
     WHERE a.sistema_origen = 'erp_cliente'
  ),
  cli_vert AS (
    SELECT p.cliente_id,
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN min(p.vertical_id) END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  ),
  amb AS (
    SELECT cv.vertical_id, count(*)::bigint AS n
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
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_no_cero,
           count(*) FILTER (WHERE f.fact_cli = 0)::bigint     AS n_cero,
           count(*) FILTER (WHERE f.fact_cli IS NULL)::bigint AS n_nulo
      FROM res r
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
     WHERE r.resultado IN ('ambiguous', 'sin_cliente')
     GROUP BY r.resultado
  )
  SELECT v.codigo, v.nombre,
         COALESCE(pg.n_programas, 0), COALESCE(pg.n_clientes, 0),
         COALESCE(o.n_ots, 0), COALESCE(ab.n, 0),
         COALESCE(i.n_instrumentos, 0),
         COALESCE(cl.n_claims, 0), COALESCE(cl.validated, 0), COALESCE(cl.pending, 0),
         COALESCE(rg.n_reglas, 0), COALESCE(ap.n_aplicabilidad, 0),
         COALESCE(o.n_no_cero, 0), COALESCE(o.n_cero, 0), COALESCE(o.n_nulo, 0)
    FROM public.ctr_vertical v
    LEFT JOIN progs  pg ON pg.vertical_id = v.id
    LEFT JOIN ots    o  ON o.vertical_id  = v.id
    LEFT JOIN amb    ab ON ab.vertical_id = v.id
    LEFT JOIN instr  i  ON i.vertical_id  = v.id
    LEFT JOIN claims cl ON cl.vertical_id = v.id
    LEFT JOIN reglas rg ON rg.vertical_id = v.id
    LEFT JOIN aplic  ap ON ap.vertical_id = v.id
  UNION ALL
  SELECT 'SIN_RESOLVER', s.codigo, 0, 0, s.n_ots, s.n_ident, 0, 0, 0, 0, 0, 0,
         s.n_no_cero, s.n_cero, s.n_nulo
    FROM sin_resolver s;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ctr_portfolio_resumen() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.ctr_portfolio_no_resueltas();

CREATE FUNCTION public.ctr_portfolio_no_resueltas()
RETURNS TABLE(
  clase text,
  cliente_wg_origen text,
  cliente_nombre text,
  vertical_codigo text,
  vertical_nombre text,
  n_programas_candidatos integer,
  n_ots bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    SELECT a.valor_origen, a.cliente_id
      FROM public.ctr_alias_identidad a
     WHERE a.sistema_origen = 'erp_cliente'
  ),
  cli_vert AS (
    SELECT p.cliente_id,
           count(*)::int AS n_prog,
           CASE WHEN count(DISTINCT p.vertical_id) = 1 THEN min(p.vertical_id) END AS vertical_id
      FROM public.ctr_programa p
     GROUP BY p.cliente_id
  )
  SELECT CASE WHEN al.cliente_id IS NOT NULL
              THEN 'cliente_identificado_sin_programa'
              ELSE 'identidad_no_establecida' END,
         res.cliente_wg_origen,
         c.nombre_display,
         v.codigo,
         v.nombre,
         COALESCE(cv.n_prog, 0),
         count(*)::bigint
    FROM res
    LEFT JOIN alias al ON al.valor_origen = res.cliente_wg_origen
    LEFT JOIN public.ctr_cliente c ON c.id = al.cliente_id
    LEFT JOIN cli_vert cv ON cv.cliente_id = al.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = cv.vertical_id
   GROUP BY 1, 2, 3, 4, 5, 6
   ORDER BY 7 DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ctr_portfolio_no_resueltas() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ctr_programa_ficha(p_programa uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_out jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  WITH cab AS (
    SELECT p.id, p.nombre AS programa_nombre, p.estado AS programa_estado,
           p.territorio, p.effective_from, p.effective_to,
           c.nombre_display AS cliente, v.codigo AS vertical_codigo, v.nombre AS vertical_nombre
      FROM public.ctr_programa p
      LEFT JOIN public.ctr_cliente  c ON c.id = p.cliente_id
      LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
     WHERE p.id = p_programa
  ),
  instr AS (
    SELECT jsonb_agg(jsonb_build_object(
             'contrato_id', k.id, 'titulo', k.titulo,
             'tipo_instrumento', k.tipo_instrumento, 'fecha_firma', k.fecha_firma,
             'effective_from', k.effective_from, 'effective_to', k.effective_to,
             'estado_evidencia', k.estado_evidencia,
             'sociedad_wg', s.razon_social, 'contraparte', cp.razon_social,
             'alcance_nota', a.alcance_nota
           ) ORDER BY k.fecha_firma NULLS LAST) AS lista
      FROM public.ctr_contrato_alcance a
      JOIN public.ctr_contrato k ON k.id = a.contrato_id
      LEFT JOIN public.ctr_sociedad_wg       s  ON s.id  = k.sociedad_wg_id
      LEFT JOIN public.ctr_contraparte_legal cp ON cp.id = k.contraparte_id
     WHERE a.programa_id = p_programa
  ),
  resueltas AS (
    SELECT f.*
      FROM public.ctr_resolucion_ot_programa r
      JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
     WHERE r.vigente AND r.programa_id = p_programa
  ),
  ots AS (
    SELECT * FROM resueltas WHERE coalesce(incidencia, '') <> 'ANULADO AVISO'
  ),
  pobl AS (
    SELECT (SELECT count(*) FROM resueltas)::bigint AS resuelta,
           (SELECT count(*) FROM resueltas WHERE coalesce(incidencia,'') = 'ANULADO AVISO')::bigint AS anulados
  ),
  serv AS (
    SELECT count(*)::bigint AS ots,
           count(*) FILTER (WHERE fecha_cierre IS NOT NULL)::bigint AS cerradas,
           count(*) FILTER (WHERE fecha_cierre IS NULL)::bigint     AS abiertas,
           avg(dias_cierre) FILTER (WHERE fecha_cierre IS NOT NULL) AS dias_cierre_medio,
           avg(CASE WHEN kpi_20d THEN 1.0 ELSE 0.0 END) FILTER (WHERE kpi_20d IS NOT NULL) AS pct_kpi_20d,
           avg(CASE WHEN kpi_30d THEN 1.0 ELSE 0.0 END) FILTER (WHERE kpi_30d IS NOT NULL) AS pct_kpi_30d,
           avg(CASE WHEN fecha_primer_contacto IS NOT NULL THEN 1.0 ELSE 0.0 END) AS compl_contacto,
           avg(CASE WHEN fecha_primera_visita  IS NOT NULL THEN 1.0 ELSE 0.0 END) AS compl_visita,
           count(*) FILTER (WHERE fact_cli IS NOT NULL AND fact_cli <> 0)::bigint AS imp_no_cero,
           count(*) FILTER (WHERE fact_cli = 0)::bigint     AS imp_cero,
           count(*) FILTER (WHERE fact_cli IS NULL)::bigint AS imp_nulo
      FROM ots
  ),
  aging AS (
    SELECT
      count(*) FILTER (WHERE d <= 20)::bigint            AS b_0_20,
      count(*) FILTER (WHERE d > 20 AND d <= 30)::bigint AS b_21_30,
      count(*) FILTER (WHERE d > 30 AND d <= 60)::bigint AS b_31_60,
      count(*) FILTER (WHERE d > 60 AND d <= 90)::bigint AS b_61_90,
      count(*) FILTER (WHERE d > 90)::bigint             AS b_90_mas,
      count(*) FILTER (WHERE d IS NULL)::bigint          AS sin_fecha
      FROM (
        SELECT (public.ops_as_of('ot') - fecha_creacion) AS d
          FROM ots WHERE fecha_cierre IS NULL
      ) x
  )
  SELECT jsonb_build_object(
    'programa', CASE WHEN cab.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', cab.id, 'nombre', cab.programa_nombre, 'estado', cab.programa_estado,
        'territorio', to_jsonb(cab.territorio),
        'effective_from', cab.effective_from, 'effective_to', cab.effective_to,
        'cliente', cab.cliente,
        'vertical_codigo', cab.vertical_codigo, 'vertical_nombre', cab.vertical_nombre
      ) END,
    'instrumentos', COALESCE(instr.lista, '[]'::jsonb),
    'poblacion', jsonb_build_object(
        'resuelta',  pobl.resuelta,
        'servicio',  serv.ots,
        'excluidas_anulado_aviso', pobl.anulados
      ),
    'servicio', jsonb_build_object(
        'ots', serv.ots, 'cerradas', serv.cerradas, 'abiertas', serv.abiertas,
        'dias_cierre_medio', serv.dias_cierre_medio,
        'pct_kpi_20d', serv.pct_kpi_20d, 'pct_kpi_30d', serv.pct_kpi_30d,
        'completitud_primer_contacto', serv.compl_contacto,
        'completitud_primera_visita',  serv.compl_visita,
        'aging', jsonb_build_object(
          'b_0_20', aging.b_0_20, 'b_21_30', aging.b_21_30, 'b_31_60', aging.b_31_60,
          'b_61_90', aging.b_61_90, 'b_90_mas', aging.b_90_mas, 'sin_fecha', aging.sin_fecha
        )
      ),
    'economia', jsonb_build_object(
        'n_ots_importe_no_cero', serv.imp_no_cero,
        'n_ots_importe_cero',    serv.imp_cero,
        'n_ots_importe_nulo',    serv.imp_nulo,
        'fuente_cargada',        (serv.ots > 0)
      ),
    'as_of_operativo', (SELECT max(l.data_as_of_date) FROM public.ops_carga_log l WHERE l.dominio = 'ot')
  )
  INTO v_out
  FROM serv, aging, pobl
  LEFT JOIN cab ON true
  LEFT JOIN instr ON true;

  RETURN v_out;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ctr_programa_ficha(uuid) TO authenticated, service_role;