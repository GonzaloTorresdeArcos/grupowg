-- =====================================================================
-- I1 · M-02 · prueba del gobierno FH-2 (aborta al final: no deja rastro)
--
-- Casos:
--   1  promoción válida OPERATIONALLY_AGREED -> CONTRACTUAL_EXTRACTED_...
--   1b usuario sin rol management no puede promover
--   2a UPDATE directo de `authenticated`: RLS no expone la fila -> sin efecto
--   2b elevación directa con un rol que atraviesa RLS -> CANDADO FH-2
--   3  degradación permitida y auditada en ctr_row_audit
--   4  ctr_acto_bootstrap sin actor histórico -> EXCEPTION
--   5  el proponente no puede aprobar su propia solicitud (cuatro ojos)
--   6  ninguna fila puede nacer en CONTRACTUAL_VALIDATED
--
-- El bloque termina siempre con RAISE EXCEPTION 'ROLLBACK_TEST_RESULT: n/8'
-- para deshacer la transacción completa: la prueba no persiste nada.
-- Requiere SET ROLE (ejecutar con la herramienta SQL administrada).
-- Ejecución 2026-08-30: 8 / 8 comprobaciones PASS.
-- =====================================================================
DO $$
DECLARE
  v_mgmt uuid; v_otro uuid; v_doc uuid; v_estado text;
  v_actos int; v_audit int; v_sol uuid; v_err text; v_ok int := 0;
BEGIN
  SELECT user_id INTO v_mgmt FROM public.user_roles WHERE role='management' LIMIT 1;
  SELECT ur.user_id INTO v_otro FROM public.user_roles ur
   WHERE NOT EXISTS (SELECT 1 FROM public.user_roles m WHERE m.user_id=ur.user_id AND m.role='management') LIMIT 1;
  SELECT id INTO v_doc FROM public.ctr_documento WHERE estado_evidencia='OPERATIONALLY_AGREED' ORDER BY fichero LIMIT 1;

  -- (1) promoción válida vía función con sesión management
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgmt,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.ctr_promover_evidencia('documento', v_doc, 'OPERATIONALLY_AGREED',
    'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION', 'prueba I1 M-02', 'test de gobierno');
  RESET ROLE;
  SELECT estado_evidencia INTO v_estado FROM public.ctr_documento WHERE id=v_doc;
  SELECT count(*) INTO v_actos FROM public.ctr_acto_gobierno WHERE objeto_id=v_doc AND accion='promocion';
  IF v_estado <> 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION' OR v_actos < 1 THEN
    RAISE EXCEPTION 'FAIL 1 · estado=% actos=%', v_estado, v_actos; END IF;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 1';

  -- (1b) usuario sin rol management no puede promover
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_otro,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.ctr_promover_evidencia('documento', v_doc, 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION',
      'CONTRACTUAL_VALIDATED', 'x', 'y');
    RESET ROLE; RAISE EXCEPTION 'FAIL 1b · usuario sin management ha promovido';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM; RESET ROLE;
    IF v_err ILIKE '%FAIL 1b%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%no autorizado%' THEN RAISE EXCEPTION 'FAIL 1b · inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 1b (%)', left(v_err,50);

  -- (2a) UPDATE directo como authenticated: RLS no expone ninguna fila -> sin efecto
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgmt,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.ctr_documento SET estado_evidencia='CONTRACTUAL_VALIDATED' WHERE id=v_doc;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RESET ROLE;
  SELECT estado_evidencia INTO v_estado FROM public.ctr_documento WHERE id=v_doc;
  IF v_estado <> 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION' THEN
    RAISE EXCEPTION 'FAIL 2a · UPDATE directo de authenticated ha cambiado el estado a %', v_estado; END IF;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 2a';

  -- (2b) UPDATE directo elevando con un rol que sí atraviesa RLS -> CANDADO
  SET LOCAL ROLE service_role;
  BEGIN
    UPDATE public.ctr_documento SET estado_evidencia='CONTRACTUAL_VALIDATED' WHERE id=v_doc;
    RESET ROLE; RAISE EXCEPTION 'FAIL 2b · elevación directa aceptada';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM; RESET ROLE;
    IF v_err ILIKE '%FAIL 2b%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%CANDADO%' AND v_err NOT ILIKE '%permission denied%' THEN
      RAISE EXCEPTION 'FAIL 2b · inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 2b (%)', left(v_err,70);

  -- (3) degradación permitida y auditada
  SELECT count(*) INTO v_audit FROM public.ctr_row_audit WHERE fila_id=v_doc;
  UPDATE public.ctr_documento SET estado_evidencia='OPERATIONALLY_AGREED' WHERE id=v_doc;
  IF (SELECT count(*) FROM public.ctr_row_audit WHERE fila_id=v_doc) <= v_audit THEN
    RAISE EXCEPTION 'FAIL 3 · degradación no auditada'; END IF;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 3';

  -- (4) bootstrap sin actor
  BEGIN
    PERFORM public.ctr_acto_bootstrap('documento', v_doc, 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION',
      NULL, '2026-08-30'::date, 'evidencia', 'fuente');
    RAISE EXCEPTION 'FAIL 4 · bootstrap sin actor aceptado';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err ILIKE '%FAIL 4%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%obligatorios%' THEN RAISE EXCEPTION 'FAIL 4 · inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 4';

  -- (5) cuatro ojos
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgmt,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.ctr_proponer_promocion('documento', v_doc, 'OPERATIONALLY_AGREED',
    'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION', 'evidencia de prueba', NULL) INTO v_sol;
  BEGIN
    PERFORM public.ctr_aprobar_promocion(v_sol);
    RESET ROLE; RAISE EXCEPTION 'FAIL 5 · autoaprobación aceptada';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM; RESET ROLE;
    IF v_err ILIKE '%FAIL 5%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%4-ojos%' THEN RAISE EXCEPTION 'FAIL 5 · inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 5';

  -- (6) nadie nace CONTRACTUAL_VALIDATED
  BEGIN
    INSERT INTO public.ctr_documento (fichero, hash, tipo_documental, firmado_verificado, estado_evidencia, ocr_estado)
    VALUES ('__test__.pdf','__hash_test__','contrato','si','CONTRACTUAL_VALIDATED','texto_nativo');
    RAISE EXCEPTION 'FAIL 6 · alta en CONTRACTUAL_VALIDATED aceptada';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err ILIKE '%FAIL 6%' THEN RAISE EXCEPTION '%', v_err; END IF;
    IF v_err NOT ILIKE '%FH-2%' AND v_err NOT ILIKE '%CONTRACTUAL_VALIDATED%' THEN
      RAISE EXCEPTION 'FAIL 6 · inesperado: %', v_err; END IF;
  END;
  v_ok := v_ok + 1; RAISE NOTICE 'PASS 6';

  RAISE EXCEPTION 'ROLLBACK_TEST_RESULT: % / 8 casos PASS', v_ok;
END $$;
