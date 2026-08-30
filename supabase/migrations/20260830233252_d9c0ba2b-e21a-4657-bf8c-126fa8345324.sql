CREATE OR REPLACE FUNCTION public.ctr_supersede_resolucion(p_num_ot text, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old uuid; v_new uuid; v_actor record;
BEGIN
  SELECT * INTO v_actor FROM public.ctr_actor_actual();

  SELECT id INTO v_old FROM public.ctr_resolucion_ot_programa
   WHERE num_ot = p_num_ot AND vigente FOR UPDATE;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'no existe resolución vigente para la OT %', p_num_ot;
  END IF;

  PERFORM set_config('ctr.supersede','on', true);

  -- 1) cerrar la vigente (libera el índice único parcial)
  UPDATE public.ctr_resolucion_ot_programa
     SET vigente = false, superseded_at = now()
   WHERE id = v_old;

  -- 2) insertar la nueva vigente enlazada
  INSERT INTO public.ctr_resolucion_ot_programa
    (carga_id, num_ot, cliente_wg_origen, metodo, programa_id, resultado, identidad_contractual,
     inputs, resolution_context_id, mapping_version, fingerprint, vigente, supersede_de_id,
     override_actor_id, override_motivo, acto_gobierno_id)
  VALUES (
    (p_payload->>'carga_id')::uuid, p_num_ot, p_payload->>'cliente_wg_origen',
    p_payload->>'metodo', (p_payload->>'programa_id')::uuid,
    p_payload->>'resultado', coalesce(p_payload->>'identidad_contractual','no_establecida'),
    coalesce(p_payload->'inputs','{}'::jsonb), (p_payload->>'resolution_context_id')::uuid,
    (p_payload->>'mapping_version')::uuid, p_payload->>'fingerprint', true, v_old,
    (p_payload->>'override_actor_id')::uuid, p_payload->>'override_motivo',
    (p_payload->>'acto_gobierno_id')::uuid)
  RETURNING id INTO v_new;

  -- 3) enlazar la sustituta en la sustituida
  UPDATE public.ctr_resolucion_ot_programa SET superseded_by_id = v_new WHERE id = v_old;

  PERFORM set_config('ctr.supersede','off', true);
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM authenticator;
GRANT EXECUTE ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) TO authenticated;