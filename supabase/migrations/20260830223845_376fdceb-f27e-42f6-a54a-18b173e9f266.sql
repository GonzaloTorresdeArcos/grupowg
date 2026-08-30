-- =====================================================================
-- I1 · M-02b AJUSTE (sin reasignación de owner: no permitida en el entorno)
-- =====================================================================

-- Actor: nombre desde public.profiles (no se toca el esquema auth).
CREATE OR REPLACE FUNCTION public.ctr_actor_actual(OUT p_id uuid, OUT p_nombre text, OUT p_rol text)
RETURNS record
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  p_id := auth.uid();
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'no autorizado: sesión sin usuario';
  END IF;
  IF NOT public.is_management(p_id) THEN
    RAISE EXCEPTION 'no autorizado: se requiere rol management';
  END IF;
  SELECT coalesce(pr.display_name, pr.email) INTO p_nombre
    FROM public.profiles pr WHERE pr.user_id = p_id LIMIT 1;
  SELECT string_agg(r.role::text, ',' ORDER BY r.role::text) INTO p_rol
    FROM public.user_roles r WHERE r.user_id = p_id;
  p_nombre := coalesce(p_nombre, p_id::text);
  p_rol := coalesce(p_rol, 'desconocido');
END;
$$;
REVOKE ALL ON FUNCTION public.ctr_actor_actual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_actor_actual() FROM anon;
REVOKE ALL ON FUNCTION public.ctr_actor_actual() FROM authenticator;

-- CANDADO dinámico: solo el owner efectivo de ctr_promover_evidencia puede ELEVAR.
CREATE OR REPLACE FUNCTION public.ctr_trg_estado_evidencia_candado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old int := public.ctr_rango_evidencia(OLD.estado_evidencia);
  v_new int := public.ctr_rango_evidencia(NEW.estado_evidencia);
  v_owner text;
BEGIN
  SELECT pg_catalog.pg_get_userbyid(p.proowner) INTO v_owner
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'ctr_promover_evidencia'
   LIMIT 1;

  IF NEW.estado_evidencia IS DISTINCT FROM OLD.estado_evidencia THEN
    IF v_new > v_old AND current_user <> coalesce(v_owner, 'ctr_gobierno_owner') THEN
      RAISE EXCEPTION 'CANDADO FH-2: la elevación de estado_evidencia (% -> %) en % solo puede realizarse mediante las funciones de gobierno ctr_*',
        OLD.estado_evidencia, NEW.estado_evidencia, TG_TABLE_NAME;
    END IF;
    INSERT INTO public.ctr_row_audit (tabla, fila_id, campo, valor_old, valor_new, actor_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'estado_evidencia', OLD.estado_evidencia, NEW.estado_evidencia, auth.uid());
  END IF;
  IF to_jsonb(NEW) ? 'doc_id' AND (to_jsonb(NEW)->>'doc_id') IS DISTINCT FROM (to_jsonb(OLD)->>'doc_id') THEN
    INSERT INTO public.ctr_row_audit (tabla, fila_id, campo, valor_old, valor_new, actor_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'doc_id', to_jsonb(OLD)->>'doc_id', to_jsonb(NEW)->>'doc_id', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

GRANT SELECT ON public.profiles TO ctr_gobierno_owner;
GRANT SELECT ON public.user_roles TO ctr_gobierno_owner;
GRANT SELECT, UPDATE ON public.ctr_documento TO ctr_gobierno_owner;
GRANT SELECT, UPDATE ON public.ctr_contrato TO ctr_gobierno_owner;
GRANT SELECT, INSERT, UPDATE ON public.ctr_solicitud_promocion TO ctr_gobierno_owner;
GRANT SELECT, INSERT ON public.ctr_acto_gobierno TO ctr_gobierno_owner;
GRANT SELECT, INSERT ON public.ctr_row_audit TO ctr_gobierno_owner;
GRANT SELECT ON public.ctr_instrumento_documento TO ctr_gobierno_owner;