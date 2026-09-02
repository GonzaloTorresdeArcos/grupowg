-- ============================================================================
-- SLA-E1 · PROFESSIONAL BATCH 1 · parte 2/2 · motor de evaluacion temporal
-- Autorizacion: GO Direccion 02-09-2026 (E). Solo lectura, reutilizable.
-- ============================================================================

-- (1) HELPER CANONICO · add_working_days ------------------------------------
CREATE OR REPLACE FUNCTION public.ops_add_working_days(p_start date, p_n integer, p_territorio text)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE d date; i int := 0; guard int := 0;
BEGIN
  IF p_start IS NULL OR p_n IS NULL OR p_n < 0 THEN RETURN NULL; END IF;
  d := p_start;
  WHILE i < p_n LOOP
    guard := guard + 1;
    IF guard > 3650 THEN RAISE EXCEPTION 'ops_add_working_days: rango excedido'; END IF;
    d := d + 1;
    IF extract(isodow FROM d) <= 5
       AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                        WHERE c.territorio = p_territorio AND c.fecha = d AND NOT c.laborable) THEN
      i := i + 1;
    END IF;
  END LOOP;
  RETURN d;
END $$;

REVOKE ALL ON FUNCTION public.ops_add_working_days(date,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) TO authenticated, service_role;

-- (2) COBERTURA DE CALENDARIO ------------------------------------------------
CREATE OR REPLACE FUNCTION public.ctr_calendario_cobertura(p_territorio text)
RETURNS TABLE(territorio text, dias_festivos integer, desde date, hasta date, version_carga text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.territorio, count(*)::int, min(c.fecha), max(c.fecha), max(c.version_carga)
    FROM public.ops_calendario_laboral c
   WHERE c.territorio = p_territorio AND NOT c.laborable
   GROUP BY c.territorio
$$;

REVOKE ALL ON FUNCTION public.ctr_calendario_cobertura(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text) TO authenticated, service_role;

-- (3) EVALUABILIDAD GOBERNADA -----------------------------------------------
CREATE OR REPLACE FUNCTION public.ctr_sla_evaluabilidad(p_regla_version uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rv record; v_prog uuid; v_par jsonb; v_b text[] := ARRAY[]::text[];
  v_ini record; v_fin record; v_cov record; v_min date; v_max date; v_claim text;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RETURN jsonb_build_object('evaluation_ready', false, 'next_blocker', 'regla_version_inexistente', 'remaining_blockers', jsonb_build_array('regla_version_inexistente')); END IF;
  v_par := v_rv.parametros;

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN v_b := v_b || 'programa_no_resuelto'; END IF;

  SELECT c.estado INTO v_claim FROM public.ctr_claim c WHERE c.id = v_rv.claim_id;
  IF v_claim IS DISTINCT FROM 'VALIDATED' THEN v_b := v_b || 'claim_pending'; END IF;

  IF v_prog IS NOT NULL THEN
    SELECT * INTO v_ini FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'start_event' AND m.estado = 'APPROVED';
    SELECT * INTO v_fin FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'end_event' AND m.estado = 'APPROVED';
    IF v_ini IS NULL THEN v_b := v_b || 'start_mapping_ausente';
    ELSIF v_ini.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('start_mapping_' || lower(v_ini.grado)); END IF;
    IF v_fin IS NULL THEN v_b := v_b || 'end_mapping_ausente';
    ELSIF v_fin.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('end_mapping_' || lower(v_fin.grado)); END IF;
  END IF;

  IF v_rv.calendario_requerido THEN
    IF v_par->>'territorio' IS NULL THEN
      v_b := v_b || 'calendario_territorio_no_declarado';
    ELSE
      SELECT * INTO v_cov FROM public.ctr_calendario_cobertura(v_par->>'territorio');
      IF v_cov IS NULL THEN
        v_b := v_b || 'calendario_no_cargado';
      ELSIF v_prog IS NOT NULL THEN
        SELECT min(o.fecha_creacion), max(o.fecha_creacion) INTO v_min, v_max
          FROM public.ops_fact_ot o
         WHERE o.cliente_wg IN (SELECT co.valor_literal FROM public.ctr_correspondencia_operativa co
                                 WHERE co.dimension = 'campo_ot' AND co.campo_erp = 'cliente_wg'
                                   AND co.programa_id = v_prog AND co.estado = 'APPROVED' AND co.determinista);
        IF v_min IS NOT NULL AND (v_cov.desde > v_min OR v_cov.hasta < v_max + 60) THEN
          v_b := v_b || 'calendario_cobertura_parcial';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'regla_version_id', p_regla_version,
    'programa_id', v_prog,
    'claim_id', v_rv.claim_id,
    'claim_estado', v_claim,
    'evaluation_ready', (array_length(v_b,1) IS NULL),
    'next_blocker', v_b[1],
    'remaining_blockers', to_jsonb(v_b),
    'mapping_start', to_jsonb(v_ini),
    'mapping_end', to_jsonb(v_fin),
    'calendario', to_jsonb(v_cov));
END $$;

REVOKE ALL ON FUNCTION public.ctr_sla_evaluabilidad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid) TO authenticated, service_role;

-- (4) EVALUADOR TEMPORAL POR OT (parametrizado, sin logica de cliente) -------
CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_ot(p_regla_version uuid)
RETURNS TABLE(
  programa_id uuid, claim_id uuid, regla_version_id uuid, num_ot text,
  poblacion text, start_date date, deadline_date date, end_date date,
  temporal_result text, reason_not_evaluable text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rv record; v_par jsonb; v_prog uuid; v_ini record; v_fin record;
  v_terr text; v_n int; v_asof date;
  v_cols text[] := ARRAY['fecha_creacion','fecha_primer_contacto','fecha_primera_visita'];
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  v_par := v_rv.parametros;
  v_terr := coalesce(v_par->>'territorio','ES');
  v_n := (v_par->>'deadline_dias')::int;
  IF v_n IS NULL OR v_n < 1 THEN RAISE EXCEPTION 'deadline_dias no representado'; END IF;
  IF v_par->>'deadline_unidad' IS DISTINCT FROM 'dias_laborables' THEN
    RAISE EXCEPTION 'unidad de deadline no soportada: %', v_par->>'deadline_unidad';
  END IF;

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN RAISE EXCEPTION 'programa no resuelto para la regla'; END IF;

  SELECT * INTO v_ini FROM public.ctr_mapping_evento_temporal m
   WHERE m.programa_id = v_prog AND m.evento = v_par->>'start_event' AND m.estado = 'APPROVED';
  SELECT * INTO v_fin FROM public.ctr_mapping_evento_temporal m
   WHERE m.programa_id = v_prog AND m.evento = v_par->>'end_event' AND m.estado = 'APPROVED';
  IF v_ini IS NULL OR v_fin IS NULL THEN RAISE EXCEPTION 'mapping de evento START/END no gobernado'; END IF;
  IF v_ini.grado IN ('PROXY','NOT_AVAILABLE') OR v_fin.grado IN ('PROXY','NOT_AVAILABLE') THEN
    RAISE EXCEPTION 'mapping PROXY/NOT_AVAILABLE: no se evalua como contractual';
  END IF;
  IF NOT (v_ini.campo_erp = ANY(v_cols)) OR NOT (v_fin.campo_erp = ANY(v_cols)) THEN
    RAISE EXCEPTION 'campo_erp no permitido';
  END IF;

  SELECT public.ops_as_of() INTO v_asof;

  RETURN QUERY EXECUTE format($q$
    WITH base AS (
      SELECT o.num_ot::text AS num_ot,
             o.%1$I::date AS s_date,
             o.%2$I::date AS e_date,
             (o.incidencia = 'ANULADO AVISO') AS anulado
        FROM public.ops_fact_ot o
       WHERE o.cliente_wg IN (SELECT co.valor_literal FROM public.ctr_correspondencia_operativa co
                               WHERE co.dimension = 'campo_ot' AND co.campo_erp = 'cliente_wg'
                                 AND co.programa_id = %3$L::uuid AND co.estado = 'APPROVED' AND co.determinista)
    ), rango AS (
      SELECT coalesce(min(s_date), current_date) AS d0,
             coalesce(max(s_date), current_date) + 120 AS d1 FROM base
    ), wd AS (
      SELECT d::date AS fecha, row_number() OVER (ORDER BY d) AS rn
        FROM rango, generate_series(rango.d0, rango.d1, interval '1 day') d
       WHERE extract(isodow FROM d) <= 5
         AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                          WHERE c.territorio = %4$L AND c.fecha = d::date AND NOT c.laborable)
    ), calc AS (
      SELECT b.*,
             (SELECT w2.fecha FROM wd w2
               WHERE w2.rn = (SELECT max(w1.rn) FROM wd w1 WHERE w1.fecha <= b.s_date) + %5$s) AS dl
        FROM base b
    )
    SELECT %3$L::uuid, %6$L::uuid, %7$L::uuid, c.num_ot,
           CASE WHEN c.anulado THEN 'anulado' ELSE 'servicio' END,
           c.s_date, c.dl, c.e_date,
           CASE
             WHEN c.anulado THEN 'NOT_EVALUABLE'
             WHEN c.s_date IS NULL OR c.dl IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date < c.s_date THEN 'NOT_EVALUABLE'
             WHEN c.s_date > %8$L::date OR c.e_date > %8$L::date THEN 'NOT_EVALUABLE'
             WHEN c.e_date <= c.dl THEN 'MET'
             ELSE 'MISSED'
           END,
           CASE
             WHEN c.anulado THEN 'aviso_anulado_excluido'
             WHEN c.s_date IS NULL THEN 'start_missing'
             WHEN c.dl IS NULL THEN 'calendario_fuera_de_cobertura'
             WHEN c.e_date IS NULL THEN 'end_missing'
             WHEN c.e_date < c.s_date THEN 'end_previo_a_start'
             WHEN c.s_date > %8$L::date OR c.e_date > %8$L::date THEN 'fecha_futura'
             ELSE NULL
           END
      FROM calc c
    $q$, v_ini.campo_erp, v_fin.campo_erp, v_prog, v_terr, v_n, v_rv.claim_id, p_regla_version, v_asof);
END $$;

REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid) TO authenticated, service_role;

-- (5) RESUMEN POR KPI --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_resumen(p_regla_version uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rv record; v_def record; v_cl record; v_prog record; v_cliente text; v_vert text;
  v_r jsonb; v_ev jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  SELECT * INTO v_def FROM public.ctr_regla_definicion WHERE id = v_rv.regla_id;
  SELECT * INTO v_cl  FROM public.ctr_claim WHERE id = v_rv.claim_id;
  SELECT p.*, c.nombre_display AS cli, v.nombre AS vert INTO v_prog
    FROM public.ctr_programa p
    JOIN public.ctr_cliente c ON c.id = p.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
   WHERE p.id = v_cl.programa_id;

  v_ev := public.ctr_sla_evaluabilidad(p_regla_version);

  SELECT jsonb_build_object(
    'poblacion_programa_resuelta', count(*),
    'poblacion_anulado_aviso', count(*) FILTER (WHERE poblacion = 'anulado'),
    'poblacion_servicio', count(*) FILTER (WHERE poblacion = 'servicio'),
    'candidata_kpi', count(*) FILTER (WHERE poblacion = 'servicio'),
    'evaluables', count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')),
    'no_evaluables', count(*) FILTER (WHERE temporal_result = 'NOT_EVALUABLE'),
    'met', count(*) FILTER (WHERE temporal_result = 'MET'),
    'missed', count(*) FILTER (WHERE temporal_result = 'MISSED'),
    'pct_met_sobre_evaluables', CASE WHEN count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE temporal_result = 'MET')
                   / count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')), 2) END,
    'completitud_start', round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND start_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'completitud_end',   round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND end_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'motivos_no_evaluable', (SELECT jsonb_object_agg(k, n) FROM (
        SELECT reason_not_evaluable k, count(*) n FROM public.ctr_sla_temporal_ot(p_regla_version)
         WHERE reason_not_evaluable IS NOT NULL GROUP BY 1) z),
    'rango_start', jsonb_build_object('min', min(start_date), 'max', max(start_date))
  ) INTO v_r
  FROM public.ctr_sla_temporal_ot(p_regla_version);

  RETURN jsonb_build_object(
    'vertical', v_prog.vert, 'cliente', v_prog.cli, 'programa', v_prog.nombre, 'programa_id', v_prog.id,
    'kpi', v_def.codigo, 'kpi_nombre', v_def.nombre,
    'claim_id', v_cl.id, 'claim_estado', v_cl.estado,
    'literal_contractual', v_cl.enunciado,
    'normalizacion_wg', v_rv.parametros->>'normalizacion',
    'start_event', v_rv.parametros->>'start_event',
    'end_event', v_rv.parametros->>'end_event',
    'pipeline_start', v_rv.parametros->>'pipeline_start',
    'front_office', v_rv.parametros->>'front_office',
    'deadline', (v_rv.parametros->>'deadline_dias') || ' dias laborables (dia de inicio no cuenta)',
    'calendar_type', v_rv.parametros->>'calendar_type',
    'as_of', public.ops_as_of(),
    'evaluabilidad', v_ev,
    'universos_y_resultado', v_r,
    'etiqueta', 'Resultado temporal antes de aplicacion de causas no imputables 80/20',
    'publicable', (v_ev->>'evaluation_ready')::boolean);
END $$;

REVOKE ALL ON FUNCTION public.ctr_sla_temporal_resumen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid) TO authenticated, service_role;

-- (6) READINESS · el calendario deja de asumirse vacio -----------------------
CREATE OR REPLACE FUNCTION public.ctr_aplicabilidad_readiness(p_regla_version uuid, p_programa uuid)
 RETURNS TABLE(estado text, reason_code text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_regla uuid; v_claim uuid; v_claim_estado text; v_cal boolean; v_par jsonb; v_terr text; v_cov record;
  v_scope record; v_pred record; v_ass record;
  v_reasons text[] := ARRAY[]::text[];
  v_conflicto int := 0; v_prec int := 0;
  v_incluye boolean := false; v_falta boolean := false;
  v_res boolean; v_dim text; v_vals text[]; v_val text; v_ok int;
BEGIN
  SELECT rv.regla_id, rv.claim_id, rv.calendario_requerido, rv.parametros
    INTO v_regla, v_claim, v_cal, v_par
    FROM public.ctr_regla_version rv WHERE rv.id = p_regla_version;
  IF v_regla IS NULL THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, 'regla_version_inexistente'::text; RETURN;
  END IF;

  SELECT count(*) INTO v_conflicto
    FROM public.ctr_regla_version rv2
    JOIN public.ctr_regla_aplicabilidad_scope s2 ON s2.regla_version_id = rv2.id
                                                AND s2.estado_gobernanza <> 'SUPERSEDED'
   WHERE rv2.regla_id = v_regla AND rv2.id <> p_regla_version
     AND EXISTS (SELECT 1 FROM public.ctr_regla_aplicabilidad_predicado p
                  WHERE p.scope_id = s2.id AND p.dimension = 'programa' AND p.incluir
                    AND ((p.operador = 'igual'    AND p.valor #>> '{}' = p_programa::text)
                      OR (p.operador = 'en_lista' AND p.valor ? p_programa::text)));

  IF v_conflicto > 0 THEN
    SELECT count(*) INTO v_prec
      FROM public.ctr_precedencia pr
     WHERE pr.prevalece_tipo = 'regla_version' AND pr.cede_tipo = 'regla_version'
       AND pr.estado_gobernanza <> 'SUPERSEDED'
       AND (pr.prevalece_id = p_regla_version OR pr.cede_id = p_regla_version);
    IF v_prec = 0 THEN
      RETURN QUERY SELECT 'CONFLICTING'::text, 'conflicto_sin_precedencia_evidenciada'::text; RETURN;
    END IF;
  END IF;

  SELECT * INTO v_scope FROM public.ctr_regla_aplicabilidad_scope s
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza <> 'SUPERSEDED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_scope IS NULL THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, 'scope_ausente'::text; RETURN;
  END IF;
  IF v_scope.effective_to IS NOT NULL AND v_scope.effective_to < current_date THEN
    RETURN QUERY SELECT 'OUT_OF_VIGENCY'::text, 'scope_fuera_de_vigencia'::text; RETURN;
  END IF;

  SELECT * INTO v_ass FROM public.ctr_regla_requisitos_assessment a
   WHERE a.regla_version_id = p_regla_version AND a.vigente LIMIT 1;
  IF v_ass IS NULL THEN
    v_falta := true;
    v_reasons := v_reasons || 'requisitos_no_revisados'::text;
  ELSIF v_ass.estado_revision = 'REVIEWED_WITH_DIMENSIONS' THEN
    FOR v_dim IN SELECT d.dimension FROM public.ctr_regla_dimension_requerida d
                  WHERE d.assessment_id = v_ass.id ORDER BY d.dimension LOOP
      IF NOT EXISTS (SELECT 1 FROM public.ctr_regla_aplicabilidad_predicado p
                      WHERE p.scope_id = v_scope.id AND p.dimension = v_dim) THEN
        v_falta := true;
        v_reasons := v_reasons || ('dimension_requerida_sin_predicado_' || v_dim)::text;
      END IF;
    END LOOP;
  END IF;

  FOR v_pred IN SELECT * FROM public.ctr_regla_aplicabilidad_predicado p
                 WHERE p.scope_id = v_scope.id ORDER BY coalesce(p.orden, 0) LOOP
    IF v_pred.dimension = 'programa' THEN
      IF v_pred.incluir AND ((v_pred.operador = 'igual'    AND v_pred.valor #>> '{}' = p_programa::text)
                          OR (v_pred.operador = 'en_lista' AND v_pred.valor ? p_programa::text)) THEN
        v_incluye := true;
      END IF;
      CONTINUE;
    END IF;

    v_dim := v_pred.dimension;
    SELECT c.resolver_defined INTO v_res
      FROM public.ctr_dimension_catalogo c WHERE c.dimension = v_dim;
    IF v_res IS DISTINCT FROM true THEN
      v_falta := true;
      IF NOT (v_reasons @> ARRAY[('dimension_sin_resolver_' || v_dim)::text]) THEN
        v_reasons := v_reasons || ('dimension_sin_resolver_' || v_dim)::text;
      END IF;
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                    WHERE co.dimension = v_dim
                      AND (co.programa_id IS NULL OR co.programa_id = p_programa)) THEN
      v_falta := true;
      IF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co WHERE co.dimension = v_dim) THEN
        IF NOT (v_reasons @> ARRAY[('mapping_otro_programa_' || v_dim)::text]) THEN
          v_reasons := v_reasons || ('mapping_otro_programa_' || v_dim)::text;
        END IF;
      ELSE
        IF NOT (v_reasons @> ARRAY[('mapping_ausente_' || v_dim)::text]) THEN
          v_reasons := v_reasons || ('mapping_ausente_' || v_dim)::text;
        END IF;
      END IF;
      CONTINUE;
    END IF;

    IF v_pred.operador = 'en_lista' THEN
      v_vals := ARRAY(SELECT jsonb_array_elements_text(v_pred.valor));
    ELSIF v_pred.operador IN ('igual','distinto') THEN
      v_vals := ARRAY[v_pred.valor #>> '{}'];
    ELSE
      v_vals := ARRAY[NULL::text];
    END IF;

    FOREACH v_val IN ARRAY v_vals LOOP
      SELECT count(*) INTO v_ok FROM public.ctr_correspondencia_operativa co
       WHERE co.dimension = v_dim
         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
         AND co.estado = 'APPROVED' AND co.determinista
         AND (co.effective_from IS NULL OR co.effective_from <= current_date)
         AND (co.effective_to   IS NULL OR co.effective_to   >= current_date)
         AND (v_val IS NULL OR co.valor_literal = v_val);

      IF v_ok = 0 THEN
        v_falta := true;
        IF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                    WHERE co.dimension = v_dim
                      AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                      AND co.estado = 'APPROVED' AND co.determinista
                      AND (v_val IS NULL OR co.valor_literal = v_val)
                      AND ((co.effective_to IS NOT NULL AND co.effective_to < current_date)
                        OR (co.effective_from IS NOT NULL AND co.effective_from > current_date))) THEN
          IF NOT (v_reasons @> ARRAY[('mapping_expirado_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_expirado_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado = 'APPROVED' AND NOT co.determinista
                         AND (v_val IS NULL OR co.valor_literal = v_val)) THEN
          IF NOT (v_reasons @> ARRAY[('mapping_no_determinista_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_no_determinista_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado <> 'APPROVED'
                         AND (v_val IS NULL OR co.valor_literal = v_val)) THEN
          IF NOT (v_reasons @> ARRAY[('mapping_pendiente_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_pendiente_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado = 'APPROVED' AND co.determinista) THEN
          IF NOT (v_reasons @> ARRAY[('valor_no_mapeado_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('valor_no_mapeado_' || v_pred.dimension)::text;
          END IF;
        ELSE
          IF NOT (v_reasons @> ARRAY[('mapping_ausente_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_ausente_' || v_pred.dimension)::text;
          END IF;
        END IF;
      ELSE
        SELECT count(DISTINCT co.concepto_contractual) INTO v_ok
          FROM public.ctr_correspondencia_operativa co
         WHERE co.dimension = v_dim
           AND (co.programa_id IS NULL OR co.programa_id = p_programa)
           AND co.estado = 'APPROVED'
           AND (v_val IS NULL OR co.valor_literal = v_val);
        IF v_ok > 1 THEN
          v_falta := true;
          IF NOT (v_reasons @> ARRAY[('mapping_ambiguo_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_ambiguo_' || v_pred.dimension)::text;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  SELECT c.estado INTO v_claim_estado FROM public.ctr_claim c WHERE c.id = v_claim;
  IF v_claim_estado IS DISTINCT FROM 'VALIDATED' THEN
    v_reasons := array_prepend('claim_pending'::text, v_reasons);
  END IF;

  -- Calendario: se comprueba la cobertura real del calendario declarado por la
  -- regla. Una regla que no declara territorio/calendar_type sigue bloqueada.
  IF v_cal THEN
    v_terr := v_par->>'territorio';
    IF v_terr IS NULL OR (v_par->>'calendar_type') IS NULL THEN
      v_reasons := v_reasons || 'calendario_no_cargado'::text;
    ELSE
      SELECT * INTO v_cov FROM public.ctr_calendario_cobertura(v_terr);
      IF v_cov IS NULL THEN
        v_reasons := v_reasons || 'calendario_no_cargado'::text;
      END IF;
    END IF;
  END IF;

  IF array_length(v_reasons, 1) IS NOT NULL OR v_falta THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, array_to_string(v_reasons, '+'); RETURN;
  END IF;

  IF v_incluye THEN
    RETURN QUERY SELECT 'APPLICABLE'::text, 'scope_evidenciado'::text;
  ELSE
    RETURN QUERY SELECT 'NOT_APPLICABLE'::text, 'programa_fuera_de_scope_con_datos_completos'::text;
  END IF;
END $function$;

-- (7) APLICABILIDAD registrada para las 4 reglas nuevas ----------------------
INSERT INTO public.ctr_aplicabilidad (carga_id, regla_version_id, programa_id, scope_version, estado, reason_code)
SELECT '7a1e0001-0000-4000-8000-000000000001', v.rv::uuid, v.pg::uuid, 1, r.estado, r.reason_code
FROM (VALUES
  ('7a1e0004-0000-4000-8000-000000000001','cb6419c5-6170-4d05-bee4-66554ade6729'),
  ('7a1e0004-0000-4000-8000-000000000002','cb6419c5-6170-4d05-bee4-66554ade6729'),
  ('7a1e0004-0000-4000-8000-000000000003','c04eb914-1ef1-4d53-b04f-5deb2256071c'),
  ('7a1e0004-0000-4000-8000-000000000004','c04eb914-1ef1-4d53-b04f-5deb2256071c')
) AS v(rv,pg)
CROSS JOIN LATERAL public.ctr_aplicabilidad_readiness(v.rv::uuid, v.pg::uuid) r;

NOTIFY pgrst, 'reload schema';
