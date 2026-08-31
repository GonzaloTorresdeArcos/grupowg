-- ============================================================================
-- EER-4B · T-V1…T-V7 · ctr_validar_claim
-- Todo sintetico. La transaccion SIEMPRE termina abortada (RAISE final):
-- cero efecto sobre los 20 claims reales.
-- ============================================================================
DO $t$
DECLARE
  L text := E'\n';
  GONZALO uuid := 'f2840a10-d660-4adc-8854-11f947423fb9'; -- contractual_validator + management
  MGMT2   uuid := '2b4fd0d1-5496-4c5d-86e8-c352091589a1'; -- management real (sin contractual_validator)
  NOMGMT  uuid := '9f52ce21-0530-496d-af35-bd1b04595b75'; -- solo rol user
  DOC     uuid;
  CARGA   uuid;
  c_norm uuid; c_prop uuid; c_hr uuid; c_hr2 uuid;
  r jsonb; e text; st text; n int;
BEGIN
  SELECT id INTO DOC FROM public.ctr_documento LIMIT 1;

  -- carga sintetica cuyo actor es gonzalo (para T-V2)
  INSERT INTO public.ctr_carga (origen, loaded_by_id, loaded_by_nombre, estado, notas)
  VALUES ('manual', GONZALO, 'test', 'ok', 'EER-4B sintetico rollback') RETURNING id INTO CARGA;

  INSERT INTO public.ctr_claim (doc_id, categoria, enunciado, estado, extraido_por)
  VALUES (DOC,'alcance','TEST normal','PENDING','sistema') RETURNING id INTO c_norm;
  INSERT INTO public.ctr_claim (doc_id, categoria, enunciado, estado, extraido_por, carga_id)
  VALUES (DOC,'alcance','TEST proponente gonzalo','PENDING','sistema',CARGA) RETURNING id INTO c_prop;
  INSERT INTO public.ctr_claim (doc_id, categoria, enunciado, estado, extraido_por)
  VALUES (DOC,'pago','TEST high-risk por categoria','PENDING','sistema') RETURNING id INTO c_hr;
  INSERT INTO public.ctr_claim (doc_id, categoria, enunciado, estado, extraido_por)
  VALUES (DOC,'penalizacion','TEST high-risk 2','PENDING','sistema') RETURNING id INTO c_hr2;

  ------------------------------------------------------------------ T-V1
  PERFORM set_config('request.jwt.claims','',true);
  BEGIN
    r := public.ctr_validar_claim(c_norm,'VALIDATE','motivo','ev');
    L := L||'T-V1 FAIL · sin sesion no dio error'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V1 PASS · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V2
  PERFORM set_config('request.jwt.claims', json_build_object('sub',GONZALO,'role','authenticated')::text, true);
  BEGIN
    r := public.ctr_validar_claim(c_prop,'VALIDATE','motivo','ev');
    L := L||'T-V2 FAIL · proponente pudo validar'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V2 PASS · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V3
  BEGIN
    r := public.ctr_validar_claim(c_norm,'VALIDATE','El texto dice literalmente X en la clausula 4','doc c7298a40 cl.4','12');
    SELECT estado INTO st FROM public.ctr_claim WHERE id=c_norm;
    SELECT count(*) INTO n FROM public.ctr_acto_gobierno WHERE objeto_id=c_norm;
    L := L||format('T-V3 %s · estado=%s actos=%s accion=%s rol=%s',
         CASE WHEN st='VALIDATED' AND n=1 THEN 'PASS' ELSE 'FAIL' END, st, n, r->>'accion', r->>'actor_rol')||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V3 FAIL · '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V4
  BEGIN
    r := public.ctr_validar_claim(c_hr,'VALIDATE','Primera aprobacion high-risk','doc c7298a40 cl.9');
    SELECT estado INTO st FROM public.ctr_claim WHERE id=c_hr;
    L := L||format('T-V4a %s · high_risk=%s estado=%s accion=%s',
         CASE WHEN st='PENDING' AND (r->>'high_risk')='true' AND r->>'accion'='validacion_primer_aprobador'
              THEN 'PASS' ELSE 'FAIL' END, r->>'high_risk', st, r->>'accion')||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V4a FAIL · '||SQLERRM||E'\n'; END;
  BEGIN
    r := public.ctr_validar_claim(c_hr,'VALIDATE','Intento de auto-ratificacion','doc c7298a40 cl.9');
    L := L||'T-V4b FAIL · mismo uid ratifico'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V4b PASS · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V5c (actor distinto SIN management)
  PERFORM set_config('request.jwt.claims', json_build_object('sub',NOMGMT,'role','authenticated')::text, true);
  BEGIN
    r := public.ctr_validar_claim(c_hr,'VALIDATE','Ratifico sin rol','ev');
    L := L||'T-V5c FAIL · sin management ratifico'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V5c PASS · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V5a (actor distinto CON management)
  PERFORM set_config('request.jwt.claims', json_build_object('sub',MGMT2,'role','authenticated')::text, true);
  BEGIN
    r := public.ctr_validar_claim(c_hr,'VALIDATE','Ratifico: contrastado con el articulado','doc c7298a40 cl.9','3');
    SELECT estado INTO st FROM public.ctr_claim WHERE id=c_hr;
    SELECT count(*) INTO n FROM public.ctr_acto_gobierno WHERE objeto_id=c_hr;
    L := L||format('T-V5a %s · estado=%s actos=%s accion=%s',
         CASE WHEN st='VALIDATED' AND n=2 THEN 'PASS' ELSE 'FAIL' END, st, n, r->>'accion')||E'\n';
    FOR e IN SELECT format('       acto: %s | actor=%s | rol=%s | ts=%s | motivo=%s',
                    accion, actor_id, actor_rol, ts, motivo)
               FROM public.ctr_acto_gobierno WHERE objeto_id=c_hr ORDER BY ts LOOP
      L := L||e||E'\n';
    END LOOP;
  EXCEPTION WHEN OTHERS THEN L := L||'T-V5a FAIL · '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V5d (ratificacion REJECT y reinicio)
  PERFORM set_config('request.jwt.claims', json_build_object('sub',GONZALO,'role','authenticated')::text, true);
  r := public.ctr_validar_claim(c_hr2,'VALIDATE','Primera aprobacion','doc 452fb3d5 cl.7');
  PERFORM set_config('request.jwt.claims', json_build_object('sub',MGMT2,'role','authenticated')::text, true);
  BEGIN
    r := public.ctr_validar_claim(c_hr2,'REJECT','No ratifico: el articulado no lo sostiene','doc 452fb3d5 cl.7');
    SELECT estado INTO st FROM public.ctr_claim WHERE id=c_hr2;
    L := L||format('T-V5d1 %s · estado=%s accion=%s',
         CASE WHEN st='PENDING' AND r->>'accion'='ratificacion_denegada' THEN 'PASS' ELSE 'FAIL' END,
         st, r->>'accion')||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V5d1 FAIL · '||SQLERRM||E'\n'; END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',GONZALO,'role','authenticated')::text, true);
  BEGIN
    r := public.ctr_validar_claim(c_hr2,'VALIDATE','Reinicio del circuito','doc 452fb3d5 cl.7');
    SELECT estado INTO st FROM public.ctr_claim WHERE id=c_hr2;
    L := L||format('T-V5d2 %s · fase=%s accion=%s estado=%s (exige recomenzar)',
         CASE WHEN (r->>'fase')='1' AND r->>'accion'='validacion_primer_aprobador' AND st='PENDING'
              THEN 'PASS' ELSE 'FAIL' END, r->>'fase', r->>'accion', st)||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V5d2 FAIL · '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V6
  BEGIN
    UPDATE public.ctr_claim SET estado='VALIDATED' WHERE id=c_hr2;
    L := L||'T-V6 FAIL · UPDATE directo permitido'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V6 PASS · EXCEPTION: '||SQLERRM||E'\n'; END;

  ------------------------------------------------------------------ T-V7
  BEGIN
    r := public.ctr_validar_claim(c_prop,'VALIDATE','   ','ev');
    L := L||'T-V7 FAIL · motivo vacio aceptado'||E'\n';
  EXCEPTION WHEN OTHERS THEN L := L||'T-V7 PASS · EXCEPTION: '||SQLERRM||E'\n'; END;


  ------------------------------------------------------------------ T-V8 (RED TEAM: GUC spoofing en sesion real authenticated)
  PERFORM set_config('request.jwt.claims', json_build_object('sub',GONZALO,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM set_config('ctr.validar','on',true);
    UPDATE public.ctr_claim SET estado='VALIDATED' WHERE id=c_prop;
    L := L||'T-V8 FAIL - GUC spoof + UPDATE directo PASO (BYPASS)'||E'\n';
  EXCEPTION WHEN OTHERS THEN
    L := L||format('T-V8 PASS - rol efectivo=%s guc=%s EXCEPTION: %s',
         current_user, current_setting('ctr.validar',true), SQLERRM)||E'\n';
  END;
  EXECUTE 'RESET ROLE';

  ------------------------------------------------------------------ claims reales intactos
  SELECT count(*) INTO n FROM public.ctr_claim WHERE estado='VALIDATED' AND enunciado NOT LIKE 'TEST%';
  L := L||format('REALES · VALIDATED(no test)=%s', n)||E'\n';

  RAISE EXCEPTION E'ROLLBACK INTENCIONADO — RESULTADOS:%', L;
END $t$;
