-- =====================================================================
-- I1 · M-02 · prueba del gobierno FH-2 (todo dentro de una tx con ROLLBACK)
--
-- Casos:
--   1. Promoción válida OPERATIONALLY_AGREED -> CONTRACTUAL_EXTRACTED_...
--      deja acto de gobierno + cambio de estado.
--   2. UPDATE directo que ELEVA el rango  -> EXCEPTION (candado FH-2).
--   3. Degradación directa                 -> permitida + fila en ctr_row_audit.
--   4. ctr_acto_bootstrap sin actor         -> EXCEPTION.
--   5. Aprobar la propia solicitud          -> EXCEPTION (4-ojos).
--   6. INSERT naciendo en CONTRACTUAL_VALIDATED -> EXCEPTION.
--
-- Ejecución administrada (rol con SET ROLE authenticated). No deja rastro.
-- =====================================================================
BEGIN;

DO $$
DECLARE
  v_mgmt uuid; v_otro uuid; v_doc uuid; v_estado text;
  v_actos int; v_audit int; v_sol uuid; v_err text; v_ok int := 0;
BEGIN
  SELECT user_id INTO v_mgmt FROM public.user_roles WHERE role='management' LIMIT 1;
  SELECT ur.user_id INTO v_otro FROM public.user_roles ur
   WHERE NOT EXISTS (SELECT 1 FROM public.user_roles m WHERE m.user_id=ur.user_id AND m.role='management')
   LIMIT 1;
  IF v_mgmt IS NULL OR v_otro IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: faltan usuarios (management=% / sin rol=%)', v_mgmt, v_otro;
  END IF;

  SELECT id INTO v_doc FROM public.ctr_documento
   WHERE estado_evidencia='OPERATIONALLY_AGREED' ORDER BY fichero LIMIT 1;

  -- (1) promoción válida vía función, con sesión management ---------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mgmt, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.ctr_promover_evidencia('documento', v_doc, 'OPERATIONALLY_AGREED',
    'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION', 'prueba I1 M-02', 'test de gobierno');
  RESET ROLE;
  SELECT estado_evidencia INTO v_estado FROM public.ctr_documento WHERE id=v_doc;
  SELECT count(*) INTO v_actos FROM public.ctr_acto_gobierno WHERE objeto_id=v_doc AND accion='promocion';
  IF v_estado <> 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION' OR v_actos < 1 THEN
    RAISE EXCEPTION 'FAIL 1 · promoción válida: estado=% actos=%', v_estado, v_actos;
  END IF;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 1 · promoción OA -> CE con acto de gobierno';

  -- (2) UPDATE directo elevando el rango -> EXCEPTION ----------------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mgmt, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.ctr_documento SET estado_evidencia='CONTRACTUAL_VALIDATED' WHERE id=v_doc;
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 2 · un UPDATE directo ha elevado el estado';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM; RESET ROLE;
    IF v_err ILIKE '%FAIL 2%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%CANDADO%' AND v_err NOT ILIKE '%permission denied%' AND v_err NOT ILIKE '%denegado%' THEN
      RAISE EXCEPTION 'FAIL 2 · error inesperado: %', v_err;
    END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 2 · UPDATE directo elevando bloqueado (%)', left(v_err, 60);

  -- (3) degradación directa -> permitida y auditada ------------------------
  SELECT count(*) INTO v_audit FROM public.ctr_row_audit WHERE fila_id=v_doc;
  UPDATE public.ctr_documento SET estado_evidencia='OPERATIONALLY_AGREED' WHERE id=v_doc;
  IF (SELECT count(*) FROM public.ctr_row_audit WHERE fila_id=v_doc) <= v_audit THEN
    RAISE EXCEPTION 'FAIL 3 · la degradación no ha quedado auditada';
  END IF;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 3 · degradación permitida y auditada en ctr_row_audit';

  -- (4) bootstrap sin actor -> EXCEPTION -----------------------------------
  BEGIN
    PERFORM public.ctr_acto_bootstrap('documento', v_doc, 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION',
      NULL, '2026-08-30'::date, 'evidencia', 'fuente');
    RAISE EXCEPTION 'FAIL 4 · bootstrap sin actor histórico ha sido aceptado';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err ILIKE '%FAIL 4%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%obligatorios%' THEN RAISE EXCEPTION 'FAIL 4 · error inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 4 · bootstrap exige actor/fecha/evidencia/fuente';

  -- (5) aprobar la propia solicitud -> EXCEPTION ---------------------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_mgmt, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.ctr_proponer_promocion('documento', v_doc, 'OPERATIONALLY_AGREED',
    'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION', 'evidencia de prueba', NULL) INTO v_sol;
  BEGIN
    PERFORM public.ctr_aprobar_promocion(v_sol);
    RESET ROLE;
    RAISE EXCEPTION 'FAIL 5 · el proponente ha podido aprobar su propia solicitud';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM; RESET ROLE;
    IF v_err ILIKE '%FAIL 5%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%4-ojos%' THEN RAISE EXCEPTION 'FAIL 5 · error inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 5 · 4-ojos: proponente <> aprobador';

  -- (6) alta directa en CONTRACTUAL_VALIDATED -> EXCEPTION ------------------
  BEGIN
    INSERT INTO public.ctr_documento (fichero, hash, tipo_documental, firmado_verificado,
      estado_evidencia, ocr_estado)
    VALUES ('__test__.pdf','__hash_test__','contrato','si','CONTRACTUAL_VALIDATED','texto_nativo');
    RAISE EXCEPTION 'FAIL 6 · se ha permitido nacer en CONTRACTUAL_VALIDATED';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err ILIKE '%FAIL 6%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%FH-2 bootstrap%' THEN RAISE EXCEPTION 'FAIL 6 · error inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 6 · ninguna fila nace en CONTRACTUAL_VALIDATED';

  RAISE NOTICE '== M-02 GOBIERNO: % / 6 casos PASS ==', v_ok;
END $$;

ROLLBACK;
