-- ============================================================================
-- EER-4B · RED TEAM · GUC SPOOFING CHECK (T-V8)
-- Sesion REAL de aplicacion: SET LOCAL ROLE authenticated + jwt.claims del uid.
-- Toda la transaccion termina abortada (RAISE final): cero efecto real.
-- ============================================================================
DO $rt$
DECLARE
  L text := E'\n';
  GONZALO uuid := 'f2840a10-d660-4adc-8854-11f947423fb9'; -- contractual_validator + management
  CLAIM   uuid;
  v text; n int;
BEGIN
  SELECT id INTO CLAIM FROM public.ctr_claim WHERE estado='PENDING' ORDER BY id LIMIT 1;
  L := L||format('TARGET claim real PENDING = %s', CLAIM)||E'\n';

  -- catalogo (antes de bajar de rol)
  L := L||format('CATALOGO · authenticated privilegios ctr_claim: SELECT=%s INSERT=%s UPDATE=%s DELETE=%s',
        has_table_privilege('authenticated','public.ctr_claim','SELECT'),
        has_table_privilege('authenticated','public.ctr_claim','INSERT'),
        has_table_privilege('authenticated','public.ctr_claim','UPDATE'),
        has_table_privilege('authenticated','public.ctr_claim','DELETE'))||E'\n';
  FOR v IN SELECT format('CATALOGO · policy %s cmd=%s roles=%s using=%s check=%s',
                  polname, polcmd,
                  (SELECT array_agg(r.rolname) FROM pg_roles r WHERE r.oid = ANY(polroles)),
                  coalesce(pg_get_expr(polqual,polrelid),'-'),
                  coalesce(pg_get_expr(polwithcheck,polrelid),'-'))
             FROM pg_policy WHERE polrelid='public.ctr_claim'::regclass LOOP
    L := L||v||E'\n';
  END LOOP;
  SELECT format('CATALOGO · RLS enabled=%s forced=%s', relrowsecurity, relforcerowsecurity)
    INTO v FROM pg_class WHERE oid='public.ctr_claim'::regclass;
  L := L||v||E'\n';

  ------------------------------------------------------------------ sesion real
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub',GONZALO,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  L := L||format('SESION · current_user=%s session_user=%s role=%s is_superuser=%s auth.uid()=%s',
        current_user, session_user, current_setting('role',true),
        current_setting('is_superuser',true), auth.uid())||E'\n';

  ------------------------------------------------------------------ A1 RECON GUC
  BEGIN
    v := coalesce(current_setting('ctr.validar', true), '<null>');
    L := L||format('A1 RECON GUC · lectura permitida, valor=%s', v)||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'A1 RECON GUC · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ A2 GUC SET
  BEGIN
    PERFORM set_config('ctr.validar','on',true);
    L := L||format('A2 GUC SET (set_config) · PERMITIDO, valor ahora=%s',
          current_setting('ctr.validar',true))||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'A2 GUC SET (set_config) · DENEGADO: '||SQLERRM||E'\n'; END;
  BEGIN
    EXECUTE 'SET LOCAL ctr.validar = ''on''';
    L := L||format('A2b GUC SET (SET LOCAL) · PERMITIDO, valor ahora=%s',
          current_setting('ctr.validar',true))||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'A2b GUC SET (SET LOCAL) · DENEGADO: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ A3 self-check privilegios en sesion real
  L := L||format('A3 PRIV en sesion real · has_table_privilege(%s, ctr_claim, UPDATE)=%s INSERT=%s SELECT=%s',
        current_user,
        has_table_privilege(current_user,'public.ctr_claim','UPDATE'),
        has_table_privilege(current_user,'public.ctr_claim','INSERT'),
        has_table_privilege(current_user,'public.ctr_claim','SELECT'))||E'\n';

  ------------------------------------------------------------------ A4 DIRECT UPDATE control (GUC ya podria estar on)
  BEGIN
    UPDATE public.ctr_claim SET estado='VALIDATED' WHERE id=CLAIM;
    GET DIAGNOSTICS n = ROW_COUNT;
    L := L||format('A4/T-V8 UPDATE DIRECTO · *** BYPASS *** filas=%s', n)||E'\n';
  EXCEPTION WHEN OTHERS THEN
    L := L||'A4/T-V8 UPDATE DIRECTO · BLOQUEADO: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ A5 INSERT VALIDATED con GUC on
  BEGIN
    INSERT INTO public.ctr_claim (doc_id, categoria, enunciado, estado, extraido_por)
    SELECT doc_id,'alcance','REDTEAM insert','VALIDATED','redteam'
      FROM public.ctr_claim WHERE id=CLAIM;
    L := L||'A5 INSERT VALIDATED · *** BYPASS ***'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    L := L||'A5 INSERT VALIDATED · BLOQUEADO: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ A6 DELETE (frontera DML general)
  BEGIN
    DELETE FROM public.ctr_claim WHERE id=CLAIM;
    L := L||'A6 DELETE · *** BYPASS ***'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    L := L||'A6 DELETE · BLOQUEADO: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ A7 escritura de actos de gobierno
  BEGIN
    INSERT INTO public.ctr_acto_gobierno (objeto_tipo, objeto_id, accion, actor_id, actor_rol, motivo)
    VALUES ('claim', CLAIM, 'validacion', GONZALO, 'contractual_validator', 'redteam');
    L := L||'A7 INSERT acto_gobierno directo · *** BYPASS ***'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    L := L||'A7 INSERT acto_gobierno directo · BLOQUEADO: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ estado final
  SELECT count(*) INTO n FROM public.ctr_claim WHERE estado='VALIDATED';
  L := L||format('ESTADO · VALIDATED en tabla = %s', n)||E'\n';

  EXECUTE 'RESET ROLE';
  RAISE EXCEPTION E'ROLLBACK INTENCIONADO — RED TEAM:%', L;
END $rt$;
