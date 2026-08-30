-- =====================================================================
-- I1 · M-02 GOBIERNO FH-2 (append-only, 4-ojos, candado de evidencia)
-- =====================================================================

-- ------------------------------------------------------------- tablas
CREATE TABLE IF NOT EXISTS public.ctr_acto_gobierno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  objeto_tipo text NOT NULL CHECK (objeto_tipo IN ('documento','contrato','claim','regla_version','economia','responsabilidad','precedencia','mapeo_identidad')),
  objeto_id uuid,
  accion text NOT NULL CHECK (accion IN ('promocion','degradacion_manual','validacion','override','nombramiento','bootstrap')),
  estado_anterior text,
  estado_nuevo text,
  actor_id uuid NOT NULL,
  actor_nombre text NOT NULL,
  actor_rol text NOT NULL,
  cuatro_ojos_id uuid,
  cuatro_ojos_nombre text,
  cuatro_ojos_rol text,
  evidencia_revisada text NOT NULL,
  motivo text NOT NULL,
  fuente_procedencia text,
  solicitud_id uuid,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ctr_row_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  tabla text NOT NULL,
  fila_id uuid,
  campo text NOT NULL,
  valor_old text,
  valor_new text,
  actor_id uuid,
  actor_nombre text,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ctr_solicitud_promocion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  objeto_tipo text NOT NULL CHECK (objeto_tipo IN ('documento','contrato','claim','regla_version','economia','responsabilidad','precedencia','mapeo_identidad')),
  objeto_id uuid NOT NULL,
  estado_esperado text NOT NULL,
  estado_objetivo text NOT NULL,
  evidencia_ref text NOT NULL,
  evidencia_hash text,
  propuesto_por_id uuid NOT NULL,
  propuesto_por_nombre text,
  propuesto_por_rol text,
  propuesto_en timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta','aprobada_ejecutada','cancelada','caducada'))
);

-- --------------------------------------------------------- rango FH-2
CREATE OR REPLACE FUNCTION public.ctr_rango_evidencia(p_estado text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE p_estado
    WHEN 'UNKNOWN_PENDING_SOURCE' THEN 1
    WHEN 'PROPOSAL_ONLY' THEN 2
    WHEN 'INTERNAL_WG_TARGET' THEN 3
    WHEN 'OPERATIONALLY_AGREED' THEN 4
    WHEN 'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION' THEN 5
    WHEN 'CONTRACTUAL_VALIDATED' THEN 6
    ELSE NULL END;
$$;

-- ------------------------------------------------- triggers genéricos
CREATE OR REPLACE FUNCTION public.ctr_trg_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'APPEND-ONLY: % no admite % sobre %', TG_TABLE_NAME, TG_OP, TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS ctr_acto_gobierno_append_only ON public.ctr_acto_gobierno;
CREATE TRIGGER ctr_acto_gobierno_append_only
  BEFORE UPDATE OR DELETE ON public.ctr_acto_gobierno
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_append_only();

DROP TRIGGER IF EXISTS ctr_row_audit_append_only ON public.ctr_row_audit;
CREATE TRIGGER ctr_row_audit_append_only
  BEFORE UPDATE OR DELETE ON public.ctr_row_audit
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_append_only();

-- CANDADO: solo el owner de las funciones de gobierno puede ELEVAR el rango.
CREATE OR REPLACE FUNCTION public.ctr_trg_estado_evidencia_candado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old int := public.ctr_rango_evidencia(OLD.estado_evidencia);
  v_new int := public.ctr_rango_evidencia(NEW.estado_evidencia);
  v_owner text := 'ctr_gobierno_owner';
BEGIN
  IF NEW.estado_evidencia IS DISTINCT FROM OLD.estado_evidencia THEN
    IF v_new > v_old AND current_user <> v_owner THEN
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

-- Bloqueo de alta directa en CONTRACTUAL_VALIDATED (bootstrap FH-2).
CREATE OR REPLACE FUNCTION public.ctr_trg_no_cv_en_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.estado_evidencia = 'CONTRACTUAL_VALIDATED' THEN
    RAISE EXCEPTION 'FH-2 bootstrap: ninguna fila puede nacer en CONTRACTUAL_VALIDATED (tabla %)', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

-- --------------------------------------------- funciones de gobierno
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
  SELECT coalesce(u.email, p_id::text) INTO p_nombre FROM auth.users u WHERE u.id = p_id;
  SELECT string_agg(r.role::text, ',' ORDER BY r.role::text) INTO p_rol
    FROM public.user_roles r WHERE r.user_id = p_id;
  p_nombre := coalesce(p_nombre, p_id::text);
  p_rol := coalesce(p_rol, 'desconocido');
END;
$$;

CREATE OR REPLACE FUNCTION public.ctr_promover_evidencia(
  p_objeto_tipo text, p_objeto_id uuid, p_estado_esperado text,
  p_estado_nuevo text, p_evidencia text, p_motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor record;
  v_tabla text;
  v_estado text;
  v_acto uuid;
BEGIN
  SELECT * INTO v_actor FROM public.ctr_actor_actual();
  IF p_objeto_tipo NOT IN ('documento','contrato') THEN
    RAISE EXCEPTION 'objeto_tipo % no soportado por ctr_promover_evidencia', p_objeto_tipo;
  END IF;
  IF p_evidencia IS NULL OR p_motivo IS NULL THEN
    RAISE EXCEPTION 'evidencia y motivo son obligatorios';
  END IF;
  IF p_estado_nuevo = 'CONTRACTUAL_VALIDATED' THEN
    RAISE EXCEPTION 'alto riesgo: la promoción a CONTRACTUAL_VALIDATED exige el flujo 4-ojos (ctr_proponer_promocion / ctr_aprobar_promocion)';
  END IF;
  IF public.ctr_rango_evidencia(p_estado_nuevo) IS NULL
     OR public.ctr_rango_evidencia(p_estado_esperado) IS NULL THEN
    RAISE EXCEPTION 'estado de evidencia desconocido';
  END IF;
  IF public.ctr_rango_evidencia(p_estado_nuevo) <= public.ctr_rango_evidencia(p_estado_esperado) THEN
    RAISE EXCEPTION 'transición no permitida: % -> % no es una promoción', p_estado_esperado, p_estado_nuevo;
  END IF;

  v_tabla := CASE p_objeto_tipo WHEN 'documento' THEN 'ctr_documento' ELSE 'ctr_contrato' END;
  EXECUTE format('SELECT estado_evidencia FROM public.%I WHERE id = $1 FOR UPDATE', v_tabla)
    INTO v_estado USING p_objeto_id;
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'objeto % % no encontrado', p_objeto_tipo, p_objeto_id;
  END IF;
  IF v_estado <> p_estado_esperado THEN
    RAISE EXCEPTION 'estado actual (%) distinto del esperado (%)', v_estado, p_estado_esperado;
  END IF;

  INSERT INTO public.ctr_acto_gobierno (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
    actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo)
  VALUES (p_objeto_tipo, p_objeto_id, 'promocion', v_estado, p_estado_nuevo,
    v_actor.p_id, v_actor.p_nombre, v_actor.p_rol, p_evidencia, p_motivo)
  RETURNING id INTO v_acto;

  EXECUTE format('UPDATE public.%I SET estado_evidencia = $1 WHERE id = $2', v_tabla)
    USING p_estado_nuevo, p_objeto_id;
  RETURN v_acto;
END;
$$;

CREATE OR REPLACE FUNCTION public.ctr_proponer_promocion(
  p_objeto_tipo text, p_objeto_id uuid, p_estado_esperado text,
  p_estado_objetivo text, p_evidencia_ref text, p_evidencia_hash text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_actor record; v_id uuid;
BEGIN
  SELECT * INTO v_actor FROM public.ctr_actor_actual();
  IF p_evidencia_ref IS NULL THEN RAISE EXCEPTION 'evidencia_ref es obligatoria'; END IF;
  IF public.ctr_rango_evidencia(p_estado_objetivo) IS NULL
     OR public.ctr_rango_evidencia(p_estado_objetivo) <= public.ctr_rango_evidencia(p_estado_esperado) THEN
    RAISE EXCEPTION 'transición no permitida: % -> %', p_estado_esperado, p_estado_objetivo;
  END IF;
  INSERT INTO public.ctr_solicitud_promocion (objeto_tipo, objeto_id, estado_esperado, estado_objetivo,
    evidencia_ref, evidencia_hash, propuesto_por_id, propuesto_por_nombre, propuesto_por_rol)
  VALUES (p_objeto_tipo, p_objeto_id, p_estado_esperado, p_estado_objetivo,
    p_evidencia_ref, p_evidencia_hash, v_actor.p_id, v_actor.p_nombre, v_actor.p_rol)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ctr_aprobar_promocion(p_solicitud uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor record; v_s record; v_tabla text; v_estado text; v_acto uuid; v_firmados int;
BEGIN
  SELECT * INTO v_actor FROM public.ctr_actor_actual();
  SELECT * INTO v_s FROM public.ctr_solicitud_promocion WHERE id = p_solicitud FOR UPDATE;
  IF v_s IS NULL THEN RAISE EXCEPTION 'solicitud % no encontrada', p_solicitud; END IF;
  IF v_s.estado <> 'propuesta' THEN
    RAISE EXCEPTION 'solicitud no reutilizable: estado actual %', v_s.estado;
  END IF;
  IF v_s.propuesto_por_id = v_actor.p_id THEN
    RAISE EXCEPTION '4-ojos: el aprobador no puede ser el proponente';
  END IF;

  v_tabla := CASE v_s.objeto_tipo WHEN 'documento' THEN 'ctr_documento' WHEN 'contrato' THEN 'ctr_contrato'
                  ELSE NULL END;
  IF v_tabla IS NULL THEN RAISE EXCEPTION 'objeto_tipo % no soportado', v_s.objeto_tipo; END IF;

  EXECUTE format('SELECT estado_evidencia FROM public.%I WHERE id = $1 FOR UPDATE', v_tabla)
    INTO v_estado USING v_s.objeto_id;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'objeto % no encontrado', v_s.objeto_id; END IF;
  IF v_estado <> v_s.estado_esperado THEN
    RAISE EXCEPTION 'estado actual (%) distinto del esperado (%)', v_estado, v_s.estado_esperado;
  END IF;

  IF v_s.estado_objetivo = 'CONTRACTUAL_VALIDATED' THEN
    IF v_s.objeto_tipo = 'documento' THEN
      SELECT count(*) INTO v_firmados FROM public.ctr_documento d
       WHERE d.id = v_s.objeto_id AND d.firmado_verificado = 'si';
    ELSE
      SELECT count(*) INTO v_firmados
        FROM public.ctr_instrumento_documento idoc
        JOIN public.ctr_documento d ON d.id = idoc.doc_id
       WHERE idoc.contrato_id = v_s.objeto_id AND idoc.tipo_relacion = 'principal'
         AND d.firmado_verificado = 'si';
    END IF;
    IF coalesce(v_firmados, 0) = 0 THEN
      RAISE EXCEPTION 'CONTRACTUAL_VALIDATED exige firmado_verificado = si en el/los documentos principales';
    END IF;
  END IF;

  INSERT INTO public.ctr_acto_gobierno (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
    actor_id, actor_nombre, actor_rol, cuatro_ojos_id, cuatro_ojos_nombre, cuatro_ojos_rol,
    evidencia_revisada, motivo, solicitud_id)
  VALUES (v_s.objeto_tipo, v_s.objeto_id, 'validacion', v_estado, v_s.estado_objetivo,
    v_actor.p_id, v_actor.p_nombre, v_actor.p_rol,
    v_s.propuesto_por_id, v_s.propuesto_por_nombre, v_s.propuesto_por_rol,
    v_s.evidencia_ref, 'aprobación 4-ojos de la solicitud ' || p_solicitud::text, p_solicitud)
  RETURNING id INTO v_acto;

  EXECUTE format('UPDATE public.%I SET estado_evidencia = $1 WHERE id = $2', v_tabla)
    USING v_s.estado_objetivo, v_s.objeto_id;

  UPDATE public.ctr_solicitud_promocion SET estado = 'aprobada_ejecutada' WHERE id = p_solicitud;
  RETURN v_acto;
END;
$$;

CREATE OR REPLACE FUNCTION public.ctr_acto_bootstrap(
  p_objeto_tipo text, p_objeto_id uuid, p_estado_nuevo text,
  p_actor_historico_nombre text, p_fecha_decision date, p_evidencia text, p_fuente text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_tabla text; v_estado text; v_acto uuid;
BEGIN
  IF p_actor_historico_nombre IS NULL OR p_fecha_decision IS NULL
     OR p_evidencia IS NULL OR p_fuente IS NULL THEN
    RAISE EXCEPTION 'bootstrap: actor histórico, fecha de decisión, evidencia y fuente son obligatorios';
  END IF;
  IF p_estado_nuevo = 'CONTRACTUAL_VALIDATED' THEN
    RAISE EXCEPTION 'FH-2 bootstrap: no puede alcanzar CONTRACTUAL_VALIDATED';
  END IF;
  v_tabla := CASE p_objeto_tipo WHEN 'documento' THEN 'ctr_documento' WHEN 'contrato' THEN 'ctr_contrato' ELSE NULL END;
  IF v_tabla IS NULL THEN RAISE EXCEPTION 'objeto_tipo % no soportado', p_objeto_tipo; END IF;
  EXECUTE format('SELECT estado_evidencia FROM public.%I WHERE id = $1 FOR UPDATE', v_tabla)
    INTO v_estado USING p_objeto_id;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'objeto % no encontrado', p_objeto_id; END IF;

  INSERT INTO public.ctr_acto_gobierno (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
    actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo, fuente_procedencia)
  VALUES (p_objeto_tipo, p_objeto_id, 'bootstrap', v_estado, p_estado_nuevo,
    '00000000-0000-0000-0000-000000000000'::uuid, p_actor_historico_nombre, 'actor histórico',
    p_evidencia, 'bootstrap documental I1 · decisión de ' || p_fecha_decision::text, p_fuente)
  RETURNING id INTO v_acto;

  EXECUTE format('UPDATE public.%I SET estado_evidencia = $1 WHERE id = $2', v_tabla)
    USING p_estado_nuevo, p_objeto_id;
  RETURN v_acto;
END;
$$;

-- --------------------------------------------------------- RLS / ACL
DO $$
DECLARE t text; f text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_acto_gobierno','ctr_row_audit','ctr_solicitud_promocion'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticator', t);
    EXECUTE format('REVOKE UPDATE, DELETE ON public.%I FROM authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO service_role', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='mgmt_select') THEN
      EXECUTE format($p$CREATE POLICY mgmt_select ON public.%I FOR SELECT TO authenticated
                        USING (public.is_management(auth.uid()))$p$, t);
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO ctr_gobierno_owner', t);
  END LOOP;

  -- El owner de las funciones necesita leer los catálogos y actuar sobre portadoras.
  EXECUTE 'GRANT SELECT ON public.ctr_carga, public.ctr_business_line, public.ctr_vertical, public.ctr_actividad, public.ctr_sociedad_wg, public.ctr_territorio TO ctr_gobierno_owner';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO ctr_gobierno_owner';

  FOREACH f IN ARRAY ARRAY[
    'ctr_promover_evidencia(text,uuid,text,text,text,text)',
    'ctr_proponer_promocion(text,uuid,text,text,text,text)',
    'ctr_aprobar_promocion(uuid)',
    'ctr_actor_actual()',
    'ctr_acto_bootstrap(text,uuid,text,text,date,text,text)',
    'ctr_rango_evidencia(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM authenticator', f);
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s OWNER TO ctr_gobierno_owner', f);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'M-02 DESVIACIÓN: no se pudo asignar owner ctr_gobierno_owner a %: %', f, SQLERRM;
    END;
  END LOOP;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_promover_evidencia(text,uuid,text,text,text,text) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_proponer_promocion(text,uuid,text,text,text,text) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_aprobar_promocion(uuid) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_rango_evidencia(text) TO authenticated';
  -- ctr_actor_actual: interna, sin GRANT a roles de negocio.
  -- ctr_acto_bootstrap: solo rol de migración (se revoca en M-09).
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_acto_bootstrap(text,uuid,text,text,date,text,text) TO postgres';
END $$;