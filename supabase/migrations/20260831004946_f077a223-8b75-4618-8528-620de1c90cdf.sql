-- =====================================================================
-- I2 · N-01 · OBJETOS (100% aditivo; no toca ops_* ni objetos I1)
-- =====================================================================

-- ---------- ctr_claim ------------------------------------------------
CREATE TABLE public.ctr_claim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  doc_id uuid NOT NULL REFERENCES public.ctr_documento(id),
  contrato_id uuid REFERENCES public.ctr_contrato(id),
  programa_id uuid REFERENCES public.ctr_programa(id),
  categoria text NOT NULL CHECK (categoria IN ('sla','tarifa','pago','alcance','identidad','mapeo','vigencia','penalizacion','otro')),
  enunciado text NOT NULL,
  valor_estructurado jsonb,
  ref_pagina text,
  estado text NOT NULL DEFAULT 'PENDING' CHECK (estado IN ('VALIDATED','PENDING','CONFLICTING','NOT_FOUND','SUPERSEDED')),
  extraido_por text,
  notas text
);

CREATE OR REPLACE FUNCTION public.ctr_trg_claim_no_validated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estado = 'VALIDATED' THEN
    RAISE EXCEPTION 'ctr_claim: VALIDATED solo por funcion gobernada (I3); INSERT/UPDATE directo prohibido';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER ctr_claim_no_validated
BEFORE INSERT OR UPDATE ON public.ctr_claim
FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_claim_no_validated();

-- ---------- reglas ---------------------------------------------------
CREATE TABLE public.ctr_regla_definicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  categoria text NOT NULL
);

CREATE TABLE public.ctr_regla_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  regla_id uuid NOT NULL REFERENCES public.ctr_regla_definicion(id),
  version int NOT NULL,
  parametros jsonb NOT NULL,
  unidad text NOT NULL CHECK (unidad IN ('dias_laborables','dias_naturales','horas','porcentaje','eur','otro')),
  calendario_requerido boolean NOT NULL DEFAULT false,
  fase text,
  claim_id uuid NOT NULL REFERENCES public.ctr_claim(id),
  UNIQUE (regla_id, version)
);

CREATE OR REPLACE FUNCTION public.ctr_trg_regla_version_inmutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'ctr_regla_version es inmutable: nueva version en lugar de UPDATE/DELETE';
END $$;

CREATE TRIGGER ctr_regla_version_inmutable
BEFORE UPDATE OR DELETE ON public.ctr_regla_version
FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_regla_version_inmutable();

CREATE TABLE public.ctr_regla_aplicabilidad_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  regla_version_id uuid NOT NULL REFERENCES public.ctr_regla_version(id),
  version int NOT NULL,
  effective_from date,
  effective_to date,
  estado_gobernanza text NOT NULL DEFAULT 'PROPOSED' CHECK (estado_gobernanza IN ('PROPOSED','APPROVED','SUPERSEDED')),
  claim_id uuid REFERENCES public.ctr_claim(id),
  notas text,
  UNIQUE (regla_version_id, version)
);

CREATE TABLE public.ctr_regla_aplicabilidad_predicado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  scope_id uuid NOT NULL REFERENCES public.ctr_regla_aplicabilidad_scope(id),
  dimension text NOT NULL CHECK (dimension IN ('programa','instrumento','gama','familia','marca','modelo','actividad','tipologia_servicio','preventa_postventa','modo_intervencion','geografia','canal','estado_ot','otro_gobernado')),
  operador text NOT NULL CHECK (operador IN ('igual','en_lista','distinto','rango','existe')),
  valor jsonb NOT NULL,
  incluir boolean NOT NULL DEFAULT true,
  orden int,
  fuente_evidencia text
);

CREATE TABLE public.ctr_aplicabilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  regla_version_id uuid NOT NULL REFERENCES public.ctr_regla_version(id),
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  scope_version int NOT NULL,
  estado text NOT NULL CHECK (estado IN ('APPLICABLE','NOT_APPLICABLE','AMBIGUOUS','CONFLICTING','INSUFFICIENT_EVIDENCE','OUT_OF_VIGENCY')),
  reason_code text NOT NULL,
  evaluado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (regla_version_id, programa_id, scope_version)
);

CREATE TABLE public.ctr_precedencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  prevalece_tipo text NOT NULL CHECK (prevalece_tipo IN ('regla_version','instrumento')),
  prevalece_id uuid NOT NULL,
  cede_tipo text NOT NULL CHECK (cede_tipo IN ('regla_version','instrumento')),
  cede_id uuid NOT NULL,
  base text NOT NULL CHECK (base IN ('EXPLICIT_DOCUMENT','AMENDMENT','INCORPORATION','TEMPORAL_INTRA_LINAJE','HUMAN_VALIDATED','OTRA_EVIDENCIADA')),
  claim_id uuid NOT NULL REFERENCES public.ctr_claim(id),
  alcance_nota text NOT NULL,
  effective_from date,
  effective_to date,
  estado_gobernanza text NOT NULL DEFAULT 'PROPOSED' CHECK (estado_gobernanza IN ('PROPOSED','APPROVED','SUPERSEDED')),
  actor_id uuid,
  actor_nombre text,
  CHECK (prevalece_id <> cede_id)
);

-- ---------- gobierno / identidad ------------------------------------
CREATE TABLE public.ctr_gobierno_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parametro text NOT NULL UNIQUE,
  valor jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  vigente boolean NOT NULL DEFAULT true,
  actor_nombre text,
  ts timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ctr_gobierno_config (parametro, valor, actor_nombre)
VALUES ('alias_revision_reforzada',
        '{"min_ots":1000,"cliente_nuevo":true,"remap":true,"modificacion_gobernado":true}'::jsonb,
        'GO I2 Direccion 31-08-2026');

CREATE TABLE public.ctr_alias_propuesta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  literal_erp text NOT NULL,
  sistema_origen text NOT NULL DEFAULT 'erp_cliente',
  cliente_destino_id uuid REFERENCES public.ctr_cliente(id),
  tipo_operacion text NOT NULL CHECK (tipo_operacion IN ('alta','remap_cliente','modificacion','baja')),
  evidencia_fuente text NOT NULL,
  evidencia_ref text,
  n_ots_estimado int,
  propuesto_por_nombre text,
  estado text NOT NULL DEFAULT 'PROPOSED' CHECK (estado IN ('PROPOSED','APPROVED','REJECTED','SUPERSEDED')),
  revision_reforzada boolean NOT NULL DEFAULT false,
  revisado_por_nombre text,
  motivo_decision text
);

CREATE TABLE public.ctr_correspondencia_operativa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  dimension text NOT NULL CHECK (dimension IN ('gama','actividad','canal','marca','campo_ot')),
  campo_erp text NOT NULL,
  valor_literal text NOT NULL,
  concepto_contractual text NOT NULL,
  programa_id uuid REFERENCES public.ctr_programa(id),
  tipo_soporte text NOT NULL CHECK (tipo_soporte IN ('maestro_gobernado','diccionario_erp','procedimiento_documentado','configuracion_historica_gobernada','definicion_campo_fuente','atestacion_operativa_responsable')),
  evidencia_ref text NOT NULL,
  estado text NOT NULL DEFAULT 'PROPOSED' CHECK (estado IN ('PROPOSED','APPROVED','REJECTED','SUPERSEDED')),
  determinista boolean NOT NULL,
  effective_from date,
  effective_to date,
  aprobado_por_nombre text
);

CREATE TABLE public.ctr_mapa_contractual_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  hash_contenido text NOT NULL UNIQUE,
  nota text
);

CREATE TABLE public.ctr_mapa_contractual_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  version_id uuid NOT NULL REFERENCES public.ctr_mapa_contractual_version(id),
  cliente_id uuid NOT NULL REFERENCES public.ctr_cliente(id),
  dimension text NOT NULL,
  valor_literal text NOT NULL,
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  claim_id uuid NOT NULL REFERENCES public.ctr_claim(id),
  correspondencia_id uuid NOT NULL REFERENCES public.ctr_correspondencia_operativa(id),
  effective_from date,
  effective_to date,
  nota text,
  UNIQUE (version_id, cliente_id, dimension, valor_literal)
);

-- ---------- helper readiness (nunca NOT_APPLICABLE por dato ausente) --
CREATE OR REPLACE FUNCTION public.ctr_aplicabilidad_readiness(p_regla_version uuid, p_programa uuid)
RETURNS TABLE(estado text, reason_code text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_regla uuid; v_claim uuid; v_claim_estado text; v_cal boolean;
  v_scope record; v_pred record;
  v_reasons text[] := '{}';
  v_conflicto int := 0; v_prec int := 0;
  v_incluye boolean := false; v_falta boolean := false;
BEGIN
  SELECT rv.regla_id, rv.claim_id, rv.calendario_requerido
    INTO v_regla, v_claim, v_cal
    FROM public.ctr_regla_version rv WHERE rv.id = p_regla_version;
  IF v_regla IS NULL THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, 'regla_version_inexistente'::text; RETURN;
  END IF;

  -- (1) CONFLICTO: otra version de la misma regla alcanza el mismo programa
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

  -- (2) scope vigente mas reciente
  SELECT * INTO v_scope FROM public.ctr_regla_aplicabilidad_scope s
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza <> 'SUPERSEDED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_scope IS NULL THEN
    RETURN QUERY SELECT 'INSUFFICIENT_EVIDENCE'::text, 'scope_ausente'::text; RETURN;
  END IF;
  IF v_scope.effective_to IS NOT NULL AND v_scope.effective_to < current_date THEN
    RETURN QUERY SELECT 'OUT_OF_VIGENCY'::text, 'scope_fuera_de_vigencia'::text; RETURN;
  END IF;

  -- (3) predicados: dimension programa decide alcance; el resto exige
  --     correspondencia gobernada APPROVED, si no -> INSUFFICIENT_EVIDENCE
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
        v_reasons := v_reasons || ('dato_ausente_' || v_pred.dimension);
      END IF;
    END IF;
  END LOOP;

  -- (4) claim de la regla
  SELECT c.estado INTO v_claim_estado FROM public.ctr_claim c WHERE c.id = v_claim;
  IF v_claim_estado IS DISTINCT FROM 'VALIDATED' THEN
    v_reasons := array_prepend('claim_pending', v_reasons);
  END IF;
  IF v_cal THEN
    v_reasons := v_reasons || 'calendario_no_cargado';
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

-- ---------- RLS / ACL patron ctr_* -----------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ctr_claim','ctr_regla_definicion','ctr_regla_version',
    'ctr_regla_aplicabilidad_scope','ctr_regla_aplicabilidad_predicado',
    'ctr_aplicabilidad','ctr_precedencia','ctr_gobierno_config',
    'ctr_alias_propuesta','ctr_correspondencia_operativa',
    'ctr_mapa_contractual_version','ctr_mapa_contractual_item'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticator', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY mgmt_select ON public.%I FOR SELECT TO authenticated USING (public.is_management(auth.uid()))', t);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.ctr_aplicabilidad_readiness(uuid, uuid) FROM PUBLIC, anon, authenticator;
GRANT EXECUTE ON FUNCTION public.ctr_aplicabilidad_readiness(uuid, uuid) TO authenticated;