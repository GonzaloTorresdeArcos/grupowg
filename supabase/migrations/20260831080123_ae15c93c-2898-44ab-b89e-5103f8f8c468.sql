CREATE OR REPLACE FUNCTION public.ctr_validar_claim(
  p_claim_id uuid,
  p_decision text,
  p_motivo text,
  p_evidencia_ref text,
  p_ref_pagina text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid          uuid;
  v_claim        public.ctr_claim%ROWTYPE;
  v_cfg          jsonb;
  v_high         boolean;
  v_primera      public.ctr_acto_gobierno%ROWTYPE;
  v_fase         int;
  v_nombre       text;
  v_rol          text;
  v_accion       text;
  v_estado_nuevo text;
  v_evid         text;
  v_prop         boolean;
  v_now          timestamptz;
BEGIN
  -- (g1) sesion
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no autorizado: se requiere sesion autenticada';
  END IF;

  -- (g2) parametros
  IF p_decision IS NULL OR p_decision NOT IN ('VALIDATE','REJECT','KEEP_PENDING') THEN
    RAISE EXCEPTION 'decision invalida: use VALIDATE | REJECT | KEEP_PENDING';
  END IF;
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'motivo obligatorio: no puede estar vacio';
  END IF;
  v_evid := btrim(coalesce(p_evidencia_ref,''));
  IF v_evid = '' THEN
    RAISE EXCEPTION 'evidencia_ref obligatoria';
  END IF;
  v_evid := v_evid || coalesce(' pag ' || nullif(btrim(coalesce(p_ref_pagina,'')), ''), '');

  -- (g3) claim
  SELECT * INTO v_claim FROM public.ctr_claim WHERE id = p_claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim inexistente: %', p_claim_id;
  END IF;
  IF v_claim.estado NOT IN ('PENDING','CONFLICTING') THEN
    RAISE EXCEPTION 'claim en estado % no es validable', v_claim.estado;
  END IF;

  -- (g4) segregacion proponente
  SELECT EXISTS (
    SELECT 1 FROM public.ctr_carga c
     WHERE c.id = v_claim.carga_id AND c.loaded_by_id = v_uid
  ) OR EXISTS (
    SELECT 1 FROM public.profiles pr
     WHERE pr.user_id = v_uid
       AND v_claim.extraido_por IS NOT NULL
       AND btrim(lower(v_claim.extraido_por)) IN (
             btrim(lower(coalesce(pr.display_name,''))),
             btrim(lower(coalesce(pr.email,'')))
           )
  ) OR (v_claim.extraido_por = v_uid::text)
  INTO v_prop;
  IF v_prop THEN
    RAISE EXCEPTION 'proponente no puede validar';
  END IF;

  -- (g5) clasificacion high-risk (sellada, no rebajable)
  SELECT valor INTO v_cfg
    FROM public.ctr_gobierno_config
   WHERE parametro = 'claims_high_risk_v1' AND vigente
   ORDER BY version DESC LIMIT 1;
  v_high := coalesce(
      (v_cfg -> 'claim_ids') ? p_claim_id::text
   OR (v_cfg -> 'categorias_auto') ? v_claim.categoria, false);

  -- (g6) primera aprobacion high-risk pendiente de ratificacion
  SELECT * INTO v_primera
    FROM public.ctr_acto_gobierno a
   WHERE a.objeto_tipo = 'claim' AND a.objeto_id = p_claim_id
     AND a.accion IN ('validacion_primer_aprobador','rechazo_primer_aprobador')
     AND NOT EXISTS (
       SELECT 1 FROM public.ctr_acto_gobierno b
        WHERE b.objeto_tipo = 'claim' AND b.objeto_id = p_claim_id
          AND b.accion IN ('ratificacion_segundo_aprobador','ratificacion_denegada')
          AND (b.ts, b.creado_en) > (a.ts, a.creado_en))
   ORDER BY a.ts DESC, a.creado_en DESC
   LIMIT 1;
  v_fase := CASE WHEN v_primera.id IS NULL THEN 1 ELSE 2 END;

  SELECT coalesce(nullif(btrim(coalesce(pr.display_name,'')),''), nullif(pr.email,''))
    INTO v_nombre FROM public.profiles pr WHERE pr.user_id = v_uid;
  v_nombre := coalesce(v_nombre, v_uid::text);

  IF v_fase = 1 THEN
    v_rol := 'contractual_validator';
    IF NOT public.has_role(v_uid, 'contractual_validator'::public.app_role) THEN
      RAISE EXCEPTION 'no autorizado: se requiere rol contractual_validator';
    END IF;

    IF p_decision = 'KEEP_PENDING' THEN
      v_accion := 'solicitud_evidencia'; v_estado_nuevo := NULL;
    ELSIF v_high THEN
      v_accion := CASE WHEN p_decision = 'VALIDATE'
                       THEN 'validacion_primer_aprobador'
                       ELSE 'rechazo_primer_aprobador' END;
      v_estado_nuevo := NULL;
    ELSIF p_decision = 'VALIDATE' THEN
      v_accion := 'validacion'; v_estado_nuevo := 'VALIDATED';
    ELSE
      v_accion := 'rechazo'; v_estado_nuevo := 'NOT_FOUND';
    END IF;
  ELSE
    v_rol := 'management';
    IF v_primera.actor_id = v_uid THEN
      RAISE EXCEPTION 'mismo actor no computa como dos ojos';
    END IF;
    IF NOT public.has_role(v_uid, 'management'::public.app_role) THEN
      RAISE EXCEPTION 'no autorizado: la ratificacion requiere rol management';
    END IF;

    IF p_decision = 'KEEP_PENDING' THEN
      v_accion := 'ratificacion_aplazada'; v_estado_nuevo := NULL;
    ELSIF p_decision = 'VALIDATE' THEN
      v_accion := 'ratificacion_segundo_aprobador';
      v_estado_nuevo := CASE WHEN v_primera.accion = 'validacion_primer_aprobador'
                             THEN 'VALIDATED' ELSE 'NOT_FOUND' END;
    ELSE
      v_accion := 'ratificacion_denegada'; v_estado_nuevo := NULL;
    END IF;
  END IF;

  IF v_estado_nuevo IS NOT NULL THEN
    PERFORM set_config('ctr.validar','on',true);
    UPDATE public.ctr_claim SET estado = v_estado_nuevo WHERE id = p_claim_id;
    PERFORM set_config('ctr.validar','off',true);
  END IF;

  -- reloj monotonico: garantiza orden estricto entre actos del mismo claim
  v_now := clock_timestamp();
  INSERT INTO public.ctr_acto_gobierno (
    objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
    actor_id, actor_nombre, actor_rol, motivo, evidencia_revisada, ts, creado_en)
  VALUES ('claim', p_claim_id, v_accion, v_claim.estado,
          coalesce(v_estado_nuevo, v_claim.estado),
          v_uid, v_nombre, v_rol, p_motivo, v_evid, v_now, v_now);

  RETURN jsonb_build_object(
    'claim_id', p_claim_id, 'fase', v_fase, 'high_risk', v_high,
    'accion', v_accion, 'estado_anterior', v_claim.estado,
    'estado_final', coalesce(v_estado_nuevo, v_claim.estado),
    'actor_id', v_uid, 'actor_rol', v_rol);
END $fn$;

REVOKE ALL ON FUNCTION public.ctr_validar_claim(uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_validar_claim(uuid,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_validar_claim(uuid,text,text,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
