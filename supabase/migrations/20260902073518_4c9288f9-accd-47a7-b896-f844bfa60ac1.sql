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
  IF v_rv IS NULL THEN
    RETURN jsonb_build_object('evaluation_ready', false, 'next_blocker', 'regla_version_inexistente',
                              'remaining_blockers', jsonb_build_array('regla_version_inexistente'));
  END IF;
  v_par := v_rv.parametros;

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN v_b := v_b || 'programa_no_resuelto'::text; END IF;

  SELECT c.estado INTO v_claim FROM public.ctr_claim c WHERE c.id = v_rv.claim_id;
  IF v_claim IS DISTINCT FROM 'VALIDATED' THEN v_b := v_b || 'claim_pending'::text; END IF;

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

  IF v_rv.calendario_requerido THEN
    IF v_par->>'territorio' IS NULL OR v_par->>'calendar_type' IS NULL THEN
      v_b := v_b || 'calendario_no_declarado'::text;
    ELSE
      SELECT * INTO v_cov FROM public.ctr_calendario_cobertura(v_par->>'territorio');
      IF v_cov IS NULL THEN
        v_b := v_b || 'calendario_no_cargado'::text;
      ELSIF v_prog IS NOT NULL THEN
        SELECT min(o.fecha_creacion), max(o.fecha_creacion) INTO v_min, v_max
          FROM public.ops_fact_ot o
         WHERE o.cliente_wg IN (SELECT co.valor_literal FROM public.ctr_correspondencia_operativa co
                                 WHERE co.dimension = 'campo_ot' AND co.campo_erp = 'cliente_wg'
                                   AND co.programa_id = v_prog AND co.estado = 'APPROVED' AND co.determinista);
        IF v_min IS NOT NULL AND (v_cov.desde > v_min OR v_cov.hasta < v_max + 60) THEN
          v_b := v_b || 'calendario_cobertura_parcial'::text;
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

NOTIFY pgrst, 'reload schema';
