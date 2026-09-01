-- =====================================================================
-- EER D4 REPRESENTABILITY HARDENING
-- =====================================================================

-- ---------- GATE 3 · catálogo de dimensiones -------------------------
CREATE TABLE public.ctr_dimension_catalogo (
  dimension              text PRIMARY KEY,
  predicate_allowed      boolean NOT NULL,
  correspondence_allowed boolean NOT NULL,
  resolver_defined       boolean NOT NULL,
  operational_source     text,
  nota                   text,
  actor_nombre           text,
  ts                     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ctr_dimension_catalogo_resolver_coherente
    CHECK ((resolver_defined AND operational_source IS NOT NULL)
        OR (NOT resolver_defined AND operational_source IS NULL))
);

GRANT SELECT ON public.ctr_dimension_catalogo TO authenticated;
GRANT ALL    ON public.ctr_dimension_catalogo TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.ctr_dimension_catalogo FROM authenticated;
REVOKE ALL ON public.ctr_dimension_catalogo FROM anon;

ALTER TABLE public.ctr_dimension_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_select" ON public.ctr_dimension_catalogo
  FOR SELECT TO authenticated USING (public.is_management(auth.uid()));

-- ampliación ADITIVA del dominio de correspondencia operativa
ALTER TABLE public.ctr_correspondencia_operativa
  DROP CONSTRAINT ctr_correspondencia_operativa_dimension_check;
ALTER TABLE public.ctr_correspondencia_operativa
  ADD CONSTRAINT ctr_correspondencia_operativa_dimension_check
  CHECK (dimension = ANY (ARRAY[
    'gama','actividad','canal','marca','campo_ot',
    'familia','modelo','estado_ot','geografia']));

-- ---------- GATE 1+2 · assessment gobernado --------------------------
CREATE TABLE public.ctr_regla_requisitos_assessment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regla_version_id uuid NOT NULL REFERENCES public.ctr_regla_version(id),
  version          integer NOT NULL,
  estado_revision  text NOT NULL
    CHECK (estado_revision IN ('REVIEWED_ZERO','REVIEWED_WITH_DIMENSIONS')),
  actor_id         uuid NOT NULL,
  actor_nombre     text NOT NULL,
  actor_rol        text NOT NULL,
  justificacion    text NOT NULL CHECK (btrim(justificacion) <> ''),
  evidencia_ref    text,
  carga_id         uuid REFERENCES public.ctr_carga(id),
  ts               timestamptz NOT NULL DEFAULT now(),
  vigente          boolean NOT NULL DEFAULT true,
  UNIQUE (regla_version_id, version)
);
CREATE UNIQUE INDEX ux_ctr_requisitos_assessment_vigente
  ON public.ctr_regla_requisitos_assessment (regla_version_id) WHERE vigente;

GRANT SELECT ON public.ctr_regla_requisitos_assessment TO authenticated;
GRANT ALL    ON public.ctr_regla_requisitos_assessment TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.ctr_regla_requisitos_assessment FROM authenticated;
REVOKE ALL ON public.ctr_regla_requisitos_assessment FROM anon;

ALTER TABLE public.ctr_regla_requisitos_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_select" ON public.ctr_regla_requisitos_assessment
  FOR SELECT TO authenticated USING (public.is_management(auth.uid()));

CREATE TABLE public.ctr_regla_dimension_requerida (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ctr_regla_requisitos_assessment(id) ON DELETE CASCADE,
  dimension     text NOT NULL REFERENCES public.ctr_dimension_catalogo(dimension),
  justificacion text NOT NULL CHECK (btrim(justificacion) <> ''),
  claim_id      uuid REFERENCES public.ctr_claim(id),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, dimension)
);

GRANT SELECT ON public.ctr_regla_dimension_requerida TO authenticated;
GRANT ALL    ON public.ctr_regla_dimension_requerida TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.ctr_regla_dimension_requerida FROM authenticated;
REVOKE ALL ON public.ctr_regla_dimension_requerida FROM anon;

ALTER TABLE public.ctr_regla_dimension_requerida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_select" ON public.ctr_regla_dimension_requerida
  FOR SELECT TO authenticated USING (public.is_management(auth.uid()));

-- coherencia cabecera/hijas
CREATE OR REPLACE FUNCTION public.ctr_trg_requisitos_hija_coherente()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE v_estado text;
BEGIN
  SELECT estado_revision INTO v_estado
    FROM public.ctr_regla_requisitos_assessment WHERE id = NEW.assessment_id;
  IF v_estado = 'REVIEWED_ZERO' THEN
    RAISE EXCEPTION 'assessment REVIEWED_ZERO no admite dimensiones requeridas';
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER ctr_requisitos_hija_coherente
  BEFORE INSERT OR UPDATE ON public.ctr_regla_dimension_requerida
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_requisitos_hija_coherente();

CREATE OR REPLACE FUNCTION public.ctr_trg_requisitos_cabecera_coherente()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.ctr_regla_dimension_requerida d
   WHERE d.assessment_id = NEW.id;
  IF NEW.estado_revision = 'REVIEWED_WITH_DIMENSIONS' AND n < 1 THEN
    RAISE EXCEPTION 'assessment REVIEWED_WITH_DIMENSIONS requiere al menos una dimension';
  END IF;
  IF NEW.estado_revision = 'REVIEWED_ZERO' AND n > 0 THEN
    RAISE EXCEPTION 'assessment REVIEWED_ZERO no admite dimensiones requeridas';
  END IF;
  RETURN NULL;
END $fn$;

CREATE CONSTRAINT TRIGGER ctr_requisitos_cabecera_coherente
  AFTER INSERT OR UPDATE ON public.ctr_regla_requisitos_assessment
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_requisitos_cabecera_coherente();

-- acto de gobierno: nueva accion
ALTER TABLE public.ctr_acto_gobierno DROP CONSTRAINT ctr_acto_gobierno_accion_check;
ALTER TABLE public.ctr_acto_gobierno ADD CONSTRAINT ctr_acto_gobierno_accion_check
  CHECK (accion = ANY (ARRAY['promocion','degradacion_manual','validacion','override',
    'nombramiento','bootstrap','solicitud_evidencia','rechazo','validacion_primer_aprobador',
    'rechazo_primer_aprobador','ratificacion_segundo_aprobador','ratificacion_denegada',
    'ratificacion_aplazada','declaracion_requisitos']));

-- ---------- función gobernada ---------------------------------------
CREATE OR REPLACE FUNCTION public.ctr_declarar_requisitos_regla(
  p_regla_version uuid,
  p_estado        text,
  p_justificacion text,
  p_dimensiones   text[] DEFAULT NULL,
  p_evidencia_ref text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid; v_nombre text; v_rol text;
  v_ver int; v_id uuid; v_dim text; v_n int := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL OR NOT (public.is_management(v_uid)
       OR public.has_role(v_uid, 'contractual_validator')) THEN
    RAISE EXCEPTION 'no autorizado: se requiere management o contractual_validator';
  END IF;

  IF p_estado IS NULL OR p_estado NOT IN ('REVIEWED_ZERO','REVIEWED_WITH_DIMENSIONS') THEN
    RAISE EXCEPTION 'estado invalido: use REVIEWED_ZERO | REVIEWED_WITH_DIMENSIONS';
  END IF;
  IF p_justificacion IS NULL OR btrim(p_justificacion) = '' THEN
    RAISE EXCEPTION 'justificacion obligatoria';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ctr_regla_version WHERE id = p_regla_version) THEN
    RAISE EXCEPTION 'regla_version inexistente';
  END IF;
  IF p_estado = 'REVIEWED_ZERO' AND coalesce(array_length(p_dimensiones,1),0) > 0 THEN
    RAISE EXCEPTION 'REVIEWED_ZERO no admite dimensiones';
  END IF;
  IF p_estado = 'REVIEWED_WITH_DIMENSIONS' AND coalesce(array_length(p_dimensiones,1),0) = 0 THEN
    RAISE EXCEPTION 'REVIEWED_WITH_DIMENSIONS requiere al menos una dimension';
  END IF;

  SELECT coalesce(pr.display_name, pr.email) INTO v_nombre
    FROM public.profiles pr WHERE pr.user_id = v_uid LIMIT 1;
  SELECT string_agg(r.role::text, ',' ORDER BY r.role::text) INTO v_rol
    FROM public.user_roles r WHERE r.user_id = v_uid;
  v_nombre := coalesce(v_nombre, v_uid::text);
  v_rol    := coalesce(v_rol, 'desconocido');

  -- supersede no destructivo
  UPDATE public.ctr_regla_requisitos_assessment
     SET vigente = false
   WHERE regla_version_id = p_regla_version AND vigente;

  SELECT coalesce(max(version),0) + 1 INTO v_ver
    FROM public.ctr_regla_requisitos_assessment WHERE regla_version_id = p_regla_version;

  INSERT INTO public.ctr_regla_requisitos_assessment
    (regla_version_id, version, estado_revision, actor_id, actor_nombre, actor_rol,
     justificacion, evidencia_ref, vigente)
  VALUES (p_regla_version, v_ver, p_estado, v_uid, v_nombre, v_rol,
          btrim(p_justificacion), nullif(btrim(coalesce(p_evidencia_ref,'')),''), true)
  RETURNING id INTO v_id;

  IF p_estado = 'REVIEWED_WITH_DIMENSIONS' THEN
    FOREACH v_dim IN ARRAY p_dimensiones LOOP
      IF NOT EXISTS (SELECT 1 FROM public.ctr_dimension_catalogo c
                      WHERE c.dimension = v_dim AND c.predicate_allowed) THEN
        RAISE EXCEPTION 'dimension % no admitida como dimension de predicado', v_dim;
      END IF;
      INSERT INTO public.ctr_regla_dimension_requerida (assessment_id, dimension, justificacion)
      VALUES (v_id, v_dim, btrim(p_justificacion));
      v_n := v_n + 1;
    END LOOP;
  END IF;

  INSERT INTO public.ctr_acto_gobierno
    (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
     actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo)
  VALUES ('regla_version', p_regla_version, 'declaracion_requisitos',
          NULL, p_estado, v_uid, v_nombre, v_rol,
          coalesce(nullif(btrim(coalesce(p_evidencia_ref,'')),''), 'declaracion de requisitos EER D4'),
          btrim(p_justificacion));

  RETURN jsonb_build_object('assessment_id', v_id, 'version', v_ver,
                            'estado_revision', p_estado, 'dimensiones', v_n);
END $fn$;

REVOKE ALL ON FUNCTION public.ctr_declarar_requisitos_regla(uuid,text,text,text[],text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_declarar_requisitos_regla(uuid,text,text,text[],text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_declarar_requisitos_regla(uuid,text,text,text[],text) TO authenticated;

-- ---------- GATE 4+5 · helper de readiness ---------------------------
CREATE OR REPLACE FUNCTION public.ctr_aplicabilidad_readiness(p_regla_version uuid, p_programa uuid)
 RETURNS TABLE(estado text, reason_code text)
 LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_regla uuid; v_claim uuid; v_claim_estado text; v_cal boolean;
  v_scope record; v_pred record; v_ass record;
  v_reasons text[] := ARRAY[]::text[];
  v_conflicto int := 0; v_prec int := 0;
  v_incluye boolean := false; v_falta boolean := false;
  v_res boolean; v_dim text; v_vals text[]; v_val text; v_ok int;
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

  -- (1) ASSESSMENT gobernado de requisitos
  SELECT * INTO v_ass FROM public.ctr_regla_requisitos_assessment a
   WHERE a.regla_version_id = p_regla_version AND a.vigente LIMIT 1;
  IF v_ass IS NULL THEN
    v_falta := true;
    v_reasons := v_reasons || 'requisitos_no_revisados'::text;
  ELSIF v_ass.estado_revision = 'REVIEWED_WITH_DIMENSIONS' THEN
    FOR v_dim IN SELECT d.dimension FROM public.ctr_regla_dimension_requerida d
                  WHERE d.assessment_id = v_ass.id ORDER BY d.dimension LOOP
      IF NOT EXISTS (SELECT 1 FROM public.ctr_regla_aplicabilidad_predicado p
                      WHERE p.scope_id = v_scope.id AND p.dimension = v_dim) THEN
        v_falta := true;
        v_reasons := v_reasons || ('dimension_requerida_sin_predicado_' || v_dim)::text;
      END IF;
    END LOOP;
  END IF;

  -- (2) predicados
  FOR v_pred IN SELECT * FROM public.ctr_regla_aplicabilidad_predicado p
                 WHERE p.scope_id = v_scope.id ORDER BY coalesce(p.orden, 0) LOOP
    IF v_pred.dimension = 'programa' THEN
      IF v_pred.incluir AND ((v_pred.operador = 'igual'    AND v_pred.valor #>> '{}' = p_programa::text)
                          OR (v_pred.operador = 'en_lista' AND v_pred.valor ? p_programa::text)) THEN
        v_incluye := true;
      END IF;
      CONTINUE;
    END IF;

    v_dim := v_pred.dimension;
    SELECT c.resolver_defined INTO v_res
      FROM public.ctr_dimension_catalogo c WHERE c.dimension = v_dim;
    IF v_res IS DISTINCT FROM true THEN
      v_falta := true;
      IF NOT (v_reasons @> ARRAY[('dimension_sin_resolver_' || v_dim)::text]) THEN
        v_reasons := v_reasons || ('dimension_sin_resolver_' || v_dim)::text;
      END IF;
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                    WHERE co.dimension = v_dim
                      AND (co.programa_id IS NULL OR co.programa_id = p_programa)) THEN
      v_falta := true;
      IF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co WHERE co.dimension = v_dim) THEN
        IF NOT (v_reasons @> ARRAY[('mapping_otro_programa_' || v_dim)::text]) THEN
          v_reasons := v_reasons || ('mapping_otro_programa_' || v_dim)::text;
        END IF;
      ELSE
        IF NOT (v_reasons @> ARRAY[('mapping_ausente_' || v_dim)::text]) THEN
          v_reasons := v_reasons || ('mapping_ausente_' || v_dim)::text;
        END IF;
      END IF;
      CONTINUE;
    END IF;

    IF v_pred.operador = 'en_lista' THEN
      v_vals := ARRAY(SELECT jsonb_array_elements_text(v_pred.valor));
    ELSIF v_pred.operador IN ('igual','distinto') THEN
      v_vals := ARRAY[v_pred.valor #>> '{}'];
    ELSE
      v_vals := ARRAY[NULL::text];
    END IF;

    FOREACH v_val IN ARRAY v_vals LOOP
      SELECT count(*) INTO v_ok FROM public.ctr_correspondencia_operativa co
       WHERE co.dimension = v_dim
         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
         AND co.estado = 'APPROVED' AND co.determinista
         AND (co.effective_from IS NULL OR co.effective_from <= current_date)
         AND (co.effective_to   IS NULL OR co.effective_to   >= current_date)
         AND (v_val IS NULL OR co.valor_literal = v_val);

      IF v_ok = 0 THEN
        v_falta := true;
        IF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                    WHERE co.dimension = v_dim
                      AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                      AND co.estado = 'APPROVED' AND co.determinista
                      AND (v_val IS NULL OR co.valor_literal = v_val)
                      AND ((co.effective_to IS NOT NULL AND co.effective_to < current_date)
                        OR (co.effective_from IS NOT NULL AND co.effective_from > current_date))) THEN
          v_dim := v_dim; -- no-op
          IF NOT (v_reasons @> ARRAY[('mapping_expirado_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_expirado_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado = 'APPROVED' AND NOT co.determinista
                         AND (v_val IS NULL OR co.valor_literal = v_val)) THEN
          IF NOT (v_reasons @> ARRAY[('mapping_no_determinista_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_no_determinista_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado <> 'APPROVED'
                         AND (v_val IS NULL OR co.valor_literal = v_val)) THEN
          IF NOT (v_reasons @> ARRAY[('mapping_pendiente_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_pendiente_' || v_pred.dimension)::text;
          END IF;
        ELSIF EXISTS (SELECT 1 FROM public.ctr_correspondencia_operativa co
                       WHERE co.dimension = v_dim
                         AND (co.programa_id IS NULL OR co.programa_id = p_programa)
                         AND co.estado = 'APPROVED' AND co.determinista) THEN
          IF NOT (v_reasons @> ARRAY[('valor_no_mapeado_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('valor_no_mapeado_' || v_pred.dimension)::text;
          END IF;
        ELSE
          IF NOT (v_reasons @> ARRAY[('mapping_ausente_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_ausente_' || v_pred.dimension)::text;
          END IF;
        END IF;
      ELSE
        SELECT count(DISTINCT co.concepto_contractual) INTO v_ok
          FROM public.ctr_correspondencia_operativa co
         WHERE co.dimension = v_dim
           AND (co.programa_id IS NULL OR co.programa_id = p_programa)
           AND co.estado = 'APPROVED'
           AND (v_val IS NULL OR co.valor_literal = v_val);
        IF v_ok > 1 THEN
          v_falta := true;
          IF NOT (v_reasons @> ARRAY[('mapping_ambiguo_' || v_pred.dimension)::text]) THEN
            v_reasons := v_reasons || ('mapping_ambiguo_' || v_pred.dimension)::text;
          END IF;
        END IF;
      END IF;
    END LOOP;
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
END $function$;