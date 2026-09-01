CREATE OR REPLACE FUNCTION public.ctr_portfolio_resumen()
RETURNS TABLE (
  vertical_codigo text,
  vertical_nombre text,
  n_programas integer,
  n_clientes integer,
  n_ots bigint,
  n_instrumentos integer,
  n_claims integer,
  claims_validated integer,
  claims_pending integer,
  n_reglas integer,
  n_aplicabilidad integer,
  n_ots_importe_informado bigint
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
  WITH res AS (
    SELECT r.num_ot, r.programa_id, r.resultado
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
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_imp
      FROM det d
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = d.num_ot
     GROUP BY d.vertical_id
  ),
  progs AS (
    SELECT p.vertical_id,
           count(*)::int AS n_programas,
           count(DISTINCT p.cliente_id)::int AS n_clientes
      FROM public.ctr_programa p
     GROUP BY p.vertical_id
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
           count(*) FILTER (WHERE f.fact_cli IS NOT NULL AND f.fact_cli <> 0)::bigint AS n_imp
      FROM res r
      LEFT JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
     WHERE r.resultado IN ('ambiguous', 'sin_cliente')
     GROUP BY r.resultado
  )
  SELECT v.codigo,
         v.nombre,
         COALESCE(pg.n_programas, 0),
         COALESCE(pg.n_clientes, 0),
         COALESCE(o.n_ots, 0),
         COALESCE(i.n_instrumentos, 0),
         COALESCE(cl.n_claims, 0),
         COALESCE(cl.validated, 0),
         COALESCE(cl.pending, 0),
         COALESCE(rg.n_reglas, 0),
         COALESCE(ap.n_aplicabilidad, 0),
         COALESCE(o.n_imp, 0)
    FROM public.ctr_vertical v
    LEFT JOIN progs  pg ON pg.vertical_id = v.id
    LEFT JOIN ots    o  ON o.vertical_id  = v.id
    LEFT JOIN instr  i  ON i.vertical_id  = v.id
    LEFT JOIN claims cl ON cl.vertical_id = v.id
    LEFT JOIN reglas rg ON rg.vertical_id = v.id
    LEFT JOIN aplic  ap ON ap.vertical_id = v.id
  UNION ALL
  SELECT 'SIN_RESOLVER', s.codigo, 0, 0, s.n_ots, 0, 0, 0, 0, 0, 0, s.n_imp
    FROM sin_resolver s;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ctr_portfolio_resumen() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_portfolio_resumen() FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_resumen() TO authenticated;

CREATE OR REPLACE FUNCTION public.ctr_programa_ficha(p_programa uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_out jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  WITH cab AS (
    SELECT p.id,
           p.nombre        AS programa_nombre,
           p.estado        AS programa_estado,
           p.territorio,
           p.effective_from,
           p.effective_to,
           c.nombre_display AS cliente,
           v.codigo         AS vertical_codigo,
           v.nombre         AS vertical_nombre
      FROM public.ctr_programa p
      LEFT JOIN public.ctr_cliente  c ON c.id = p.cliente_id
      LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
     WHERE p.id = p_programa
  ),
  instr AS (
    SELECT jsonb_agg(jsonb_build_object(
             'contrato_id',      k.id,
             'titulo',           k.titulo,
             'tipo_instrumento', k.tipo_instrumento,
             'fecha_firma',      k.fecha_firma,
             'effective_from',   k.effective_from,
             'effective_to',     k.effective_to,
             'estado_evidencia', k.estado_evidencia,
             'sociedad_wg',      s.razon_social,
             'contraparte',      cp.razon_social,
             'alcance_nota',     a.alcance_nota
           ) ORDER BY k.fecha_firma NULLS LAST) AS lista
      FROM public.ctr_contrato_alcance a
      JOIN public.ctr_contrato k ON k.id = a.contrato_id
      LEFT JOIN public.ctr_sociedad_wg       s  ON s.id  = k.sociedad_wg_id
      LEFT JOIN public.ctr_contraparte_legal cp ON cp.id = k.contraparte_id
     WHERE a.programa_id = p_programa
  ),
  ots AS (
    SELECT f.*
      FROM public.ctr_resolucion_ot_programa r
      JOIN public.ops_fact_ot f ON f.num_ot = r.num_ot
     WHERE r.vigente AND r.programa_id = p_programa
       AND coalesce(f.incidencia, '') <> 'ANULADO AVISO'
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
           count(*) FILTER (WHERE fact_cli IS NOT NULL AND fact_cli <> 0)::bigint AS con_importe,
           count(*) FILTER (WHERE fact_cli IS NULL OR fact_cli = 0)::bigint       AS importe_cero
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
          FROM ots
         WHERE fecha_cierre IS NULL
      ) x
  )
  SELECT jsonb_build_object(
    'programa', CASE WHEN cab.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',              cab.id,
        'nombre',          cab.programa_nombre,
        'estado',          cab.programa_estado,
        'territorio',      to_jsonb(cab.territorio),
        'effective_from',  cab.effective_from,
        'effective_to',    cab.effective_to,
        'cliente',         cab.cliente,
        'vertical_codigo', cab.vertical_codigo,
        'vertical_nombre', cab.vertical_nombre
      ) END,
    'instrumentos', COALESCE(instr.lista, '[]'::jsonb),
    'servicio', jsonb_build_object(
        'ots',                         serv.ots,
        'cerradas',                    serv.cerradas,
        'abiertas',                    serv.abiertas,
        'dias_cierre_medio',           serv.dias_cierre_medio,
        'pct_kpi_20d',                 serv.pct_kpi_20d,
        'pct_kpi_30d',                 serv.pct_kpi_30d,
        'completitud_primer_contacto', serv.compl_contacto,
        'completitud_primera_visita',  serv.compl_visita,
        'aging', jsonb_build_object(
          'b_0_20',    aging.b_0_20,
          'b_21_30',   aging.b_21_30,
          'b_31_60',   aging.b_31_60,
          'b_61_90',   aging.b_61_90,
          'b_90_mas',  aging.b_90_mas,
          'sin_fecha', aging.sin_fecha
        )
      ),
    'economia', jsonb_build_object(
        'n_ots_con_importe',  serv.con_importe,
        'n_ots_importe_cero', serv.importe_cero
      ),
    'as_of_operativo', (SELECT max(l.data_as_of_date) FROM public.ops_carga_log l WHERE l.dominio = 'ot')
  )
  INTO v_out
  FROM serv, aging
  LEFT JOIN cab ON true
  LEFT JOIN instr ON true;

  RETURN v_out;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ctr_programa_ficha(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_programa_ficha(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_programa_ficha(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ctr_obligaciones_programa(p_programa uuid)
RETURNS TABLE (
  claim_id uuid,
  categoria text,
  enunciado text,
  valor_estructurado jsonb,
  estado text,
  doc_fichero text,
  doc_hash text,
  doc_estado_evidencia text,
  regla_version_id uuid,
  regla_codigo text,
  regla_parametros jsonb,
  regla_unidad text,
  calendario_requerido boolean,
  readiness_estado text,
  readiness_reason text
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
  SELECT c.id,
         c.categoria,
         c.enunciado,
         c.valor_estructurado,
         c.estado,
         d.fichero,
         d.hash,
         d.estado_evidencia,
         rv.id,
         rd.codigo,
         rv.parametros,
         rv.unidad,
         rv.calendario_requerido,
         rr.estado,
         rr.reason_code
    FROM public.ctr_claim c
    LEFT JOIN public.ctr_documento d ON d.id = c.doc_id
    LEFT JOIN public.ctr_regla_version rv ON rv.claim_id = c.id
    LEFT JOIN public.ctr_regla_definicion rd ON rd.id = rv.regla_id
    LEFT JOIN LATERAL public.ctr_aplicabilidad_readiness(rv.id, p_programa) rr ON rv.id IS NOT NULL
   WHERE c.programa_id = p_programa
   ORDER BY c.categoria NULLS LAST, c.creado_en;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ctr_obligaciones_programa(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_obligaciones_programa(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_obligaciones_programa(uuid) TO authenticated;