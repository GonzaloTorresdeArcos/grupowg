CREATE OR REPLACE FUNCTION public.ctr_sla_evaluabilidad(p_regla_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_rv record; v_prog uuid; v_par jsonb; v_b text[] := ARRAY[]::text[];
  v_ini record; v_fin record; v_cov record; v_min date; v_max date; v_claim text;
  v_pub text[] := ARRAY[]::text[]; v_shadow boolean; v_modo text; v_escenario boolean;
  v_terrs jsonb := '[]'::jsonb; v_unres bigint := 0; v_t text; v_cobs jsonb := '[]'::jsonb;
  v_calc_ok boolean; v_horas boolean := false;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN
    RETURN jsonb_build_object('evaluation_ready', false, 'temporal_result_available', false,
                              'contractual_temporal_result_available', false,
                              'scenario_result_available', false,
                              'publication_ready', false, 'next_blocker', 'regla_version_inexistente',
                              'remaining_blockers', jsonb_build_array('regla_version_inexistente'));
  END IF;
  v_par := v_rv.parametros;
  v_shadow := coalesce((v_par->>'shadow')::boolean, false);
  v_modo := coalesce(v_par->>'modo','CONTRACTUAL');
  v_escenario := (v_modo = 'MANAGEMENT_ASSUMPTION_SCENARIO');

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN v_b := v_b || 'programa_no_resuelto'::text; END IF;

  SELECT c.estado INTO v_claim FROM public.ctr_claim c WHERE c.id = v_rv.claim_id;
  IF v_claim IS DISTINCT FROM 'VALIDATED' THEN v_pub := v_pub || 'claim_pending'::text; END IF;

  IF v_prog IS NOT NULL THEN
    SELECT * INTO v_ini FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'start_event' AND m.estado = 'APPROVED';
    SELECT * INTO v_fin FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'end_event' AND m.estado = 'APPROVED';
    IF v_ini IS NULL THEN v_b := v_b || 'start_mapping_ausente'::text;
    ELSIF v_ini.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('start_mapping_' || lower(v_ini.grado))::text; END IF;
    IF v_fin IS NULL THEN v_b := v_b || 'end_mapping_ausente'::text;
    ELSIF v_fin.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('end_mapping_' || lower(v_fin.grado))::text; END IF;
  END IF;

  -- unidad contractual expresada en HORAS pero evidencia con granularidad de fecha
  v_horas := coalesce(v_par->>'literal_umbral','') ILIKE '%hora%';
  IF v_horas AND (coalesce(v_ini.granularidad,'date') = 'date' OR coalesce(v_fin.granularidad,'date') = 'date') THEN
    v_b := v_b || 'unidad_contractual_horas_no_observable_en_granularidad_date'::text;
  END IF;

  IF coalesce(v_par->>'poblacion_grado','') IN ('PROXY','NOT_AVAILABLE') OR v_shadow THEN
    v_b := v_b || 'poblacion_no_gobernada_proxy'::text;
  END IF;
  IF coalesce((v_par->>'baja_sin_gobernar')::boolean,false) THEN
    v_pub := v_pub || 'tratamiento_baja_no_gobernado'::text;
  END IF;

  IF v_escenario THEN
    IF coalesce(v_par->>'unidad_documental','') = 'SIN_CALIFICAR' THEN
      v_b := v_b || 'unidad_contractual_sin_calificar'::text;
    END IF;
    IF coalesce((v_par->>'start_contractual_explicito')::boolean, true) IS FALSE THEN
      v_b := v_b || 'start_no_explicito_en_instrumento'::text;
    END IF;
    IF coalesce((v_par->>'end_contractual_explicito')::boolean, true) IS FALSE THEN
      v_b := v_b || 'end_no_explicito_en_instrumento'::text;
    END IF;
  END IF;

  IF v_prog IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb), coalesce(max(u), 0)
      INTO v_terrs, v_unres
      FROM (
        SELECT public.ops_territorio_ot(o.codigo_postal, o.provincia) AS t,
               count(*) FILTER (WHERE public.ops_territorio_ot(o.codigo_postal, o.provincia) = 'UNRESOLVED') OVER () AS u
          FROM public.ops_fact_ot o
         WHERE o.num_ot IN (SELECT r.num_ot FROM public.ctr_resolucion_ot_programa r
                             WHERE r.programa_id = v_prog AND r.vigente)
         GROUP BY 1
      ) z;
  END IF;

  IF v_rv.calendario_requerido THEN
    IF v_par->>'calendar_type' IS NULL THEN
      v_b := v_b || 'calendario_no_declarado'::text;
    ELSE
      SELECT min(o.fecha_creacion), max(o.fecha_creacion) INTO v_min, v_max
        FROM public.ops_fact_ot o
       WHERE v_prog IS NOT NULL
         AND o.num_ot IN (SELECT r.num_ot FROM public.ctr_resolucion_ot_programa r
                           WHERE r.programa_id = v_prog AND r.vigente);
      FOR v_t IN SELECT x FROM jsonb_array_elements_text(v_terrs) x WHERE x <> 'UNRESOLVED' LOOP
        SELECT * INTO v_cov FROM public.ctr_calendario_cobertura(v_t);
        IF v_cov IS NULL THEN
          v_b := v_b || ('calendario_no_cargado:' || v_t)::text;
        ELSE
          v_cobs := v_cobs || jsonb_build_array(to_jsonb(v_cov));
          IF v_min IS NOT NULL AND (v_cov.desde > v_min OR v_cov.hasta < v_max + 60) THEN
            v_b := v_b || ('calendario_cobertura_parcial:' || v_t)::text;
          END IF;
        END IF;
      END LOOP;
      IF v_unres > 0 THEN
        v_b := v_b || ('territorio_no_resuelto_en_poblacion:' || v_unres::text)::text;
      END IF;
    END IF;
  END IF;

  v_calc_ok := (v_prog IS NOT NULL AND v_ini IS NOT NULL AND v_fin IS NOT NULL
                AND v_ini.grado NOT IN ('PROXY','NOT_AVAILABLE')
                AND v_fin.grado NOT IN ('PROXY','NOT_AVAILABLE')
                AND NOT EXISTS (SELECT 1 FROM unnest(v_b) b WHERE b LIKE 'calendario_no_cargado%' OR b = 'calendario_no_declarado'));

  RETURN jsonb_build_object(
    'regla_version_id', p_regla_version,
    'programa_id', v_prog,
    'claim_id', v_rv.claim_id,
    'claim_estado', v_claim,
    'modo', v_modo,
    'unidad_contractual_en_horas', v_horas,
    'granularidad_evidencia', coalesce(v_ini.granularidad,'?') || '/' || coalesce(v_fin.granularidad,'?'),
    'evaluation_ready', (array_length(v_b,1) IS NULL),
    'temporal_result_available', v_calc_ok,
    'contractual_temporal_result_available', (v_calc_ok AND NOT v_escenario),
    'scenario_result_available', (v_calc_ok AND v_escenario),
    'publication_ready', (array_length(v_b,1) IS NULL AND array_length(v_pub,1) IS NULL AND NOT v_escenario),
    'shadow', v_shadow,
    'next_blocker', coalesce(v_b[1], v_pub[1]),
    'remaining_blockers', to_jsonb(v_b || v_pub),
    'blockers_evaluacion', to_jsonb(v_b),
    'blockers_publicacion', to_jsonb(v_pub),
    'mapping_start', to_jsonb(v_ini),
    'mapping_end', to_jsonb(v_fin),
    'territorios_poblacion', v_terrs,
    'territorio_no_resuelto_ots', v_unres,
    'calendario', v_cobs);
END $fn$;