CREATE OR REPLACE FUNCTION public.ctr_aplicabilidad_readiness(p_regla_version uuid, p_programa uuid)
RETURNS TABLE(estado text, reason_code text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_regla uuid; v_claim uuid; v_claim_estado text; v_cal boolean;
  v_scope record; v_pred record;
  v_reasons text[] := ARRAY[]::text[];
  v_conflicto int := 0; v_prec int := 0;
  v_incluye boolean := false; v_falta boolean := false;
BEGIN
  SELECT rv.regla_id, rv.claim_id, rv.calendario_requerido
    INTO v_regla, v_claim, v_cal
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

  FOR v_pred IN SELECT * FROM public.ctr_regla_aplicabilidad_predicado p
                 WHERE p.scope_id = v_scope.id ORDER BY coalesce(p.orden, 0) LOOP
    IF v_pred.dimension = 'programa' THEN
      IF v_pred.incluir AND ((v_pred.operador = 'igual'    AND v_pred.valor #>> '{}' = p_programa::text)
                          OR (v_pred.operador = 'en_lista' AND v_pred.valor ? p_programa::text)) THEN
        v_incluye := true;
      END IF;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                      WHERE co.estado = 'APPROVED' AND co.determinista
                        AND co.dimension = v_pred.dimension
                        AND (co.programa_id IS NULL OR co.programa_id = p_programa)) THEN
        v_falta := true;
        v_reasons := v_reasons || ('dato_ausente_' || v_pred.dimension)::text;
      END IF;
    END IF;
  END LOOP;

  SELECT c.estado INTO v_claim_estado FROM public.ctr_claim c WHERE c.id = v_claim;
  IF v_claim_estado IS DISTINCT FROM 'VALIDATED' THEN
    v_reasons := array_prepend('claim_pending'::text, v_reasons);
  END IF;
  IF v_cal THEN
    v_reasons := v_reasons || 'calendario_no_cargado'::text;
  END IF;

  IF array_length(v_reasons, 1) IS NOT NULL OR v_falta THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, array_to_string(v_reasons, '+'); RETURN;
  END IF;

  IF v_incluye THEN
    RETURN QUERY SELECT 'APPLICABLE'::text, 'scope_evidenciado'::text;
  ELSE
    RETURN QUERY SELECT 'NOT_APPLICABLE'::text, 'programa_fuera_de_scope_con_datos_completos'::text;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.ctr_aplicabilidad_readiness(uuid, uuid) FROM PUBLIC, anon, authenticator;
GRANT EXECUTE ON FUNCTION public.ctr_aplicabilidad_readiness(uuid, uuid) TO authenticated;