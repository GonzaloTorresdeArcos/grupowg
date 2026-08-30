-- =====================================================================
-- I1 · M-08 RESOLUCIÓN OT → PROGRAMA (FH-3). Capa ctr_*, 100% aditiva.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ctr_resolucion_ot_programa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  num_ot text NOT NULL,
  cliente_wg_origen text,
  metodo text CHECK (metodo IN ('EXPLICIT_OT_FIELD','CONTRACTUAL_MAPPING','SINGLE_PROGRAM_CLIENT','MANUAL_OVERRIDE')),
  programa_id uuid REFERENCES public.ctr_programa(id),
  resultado text NOT NULL CHECK (resultado IN ('determinista','ambiguous','sin_cliente','cliente_sin_programa')),
  identidad_contractual text NOT NULL DEFAULT 'no_establecida'
    CHECK (identidad_contractual IN ('establecida','no_establecida')),
  inputs jsonb NOT NULL,
  resolution_context_id uuid NOT NULL REFERENCES public.ctr_resolucion_contexto(id),
  mapping_version uuid,
  fingerprint text NOT NULL UNIQUE,
  vigente boolean NOT NULL DEFAULT true,
  supersede_de_id uuid REFERENCES public.ctr_resolucion_ot_programa(id),
  superseded_at timestamptz,
  superseded_by_id uuid,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  override_actor_id uuid,
  override_motivo text,
  acto_gobierno_id uuid,
  CONSTRAINT ctr_res_map_req CHECK (metodo <> 'CONTRACTUAL_MAPPING' OR mapping_version IS NOT NULL),
  CONSTRAINT ctr_res_map_only CHECK (metodo = 'CONTRACTUAL_MAPPING' OR mapping_version IS NULL),
  CONSTRAINT ctr_res_override CHECK (metodo <> 'MANUAL_OVERRIDE'
    OR (override_actor_id IS NOT NULL AND override_motivo IS NOT NULL AND acto_gobierno_id IS NOT NULL)),
  CONSTRAINT ctr_res_identidad CHECK (identidad_contractual = 'no_establecida'
    OR metodo IN ('EXPLICIT_OT_FIELD','CONTRACTUAL_MAPPING'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ctr_resolucion_vigente
  ON public.ctr_resolucion_ot_programa (num_ot) WHERE vigente;
CREATE INDEX IF NOT EXISTS ix_ctr_resolucion_resultado
  ON public.ctr_resolucion_ot_programa (resultado, metodo);

-- Inmutabilidad del payload de negocio; ciclo de vida solo vía función de gobierno
CREATE OR REPLACE FUNCTION public.ctr_trg_resolucion_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'FH-3: ctr_resolucion_ot_programa es append-only (DELETE no permitido)';
  END IF;
  IF NEW.num_ot IS DISTINCT FROM OLD.num_ot
     OR NEW.metodo IS DISTINCT FROM OLD.metodo
     OR NEW.programa_id IS DISTINCT FROM OLD.programa_id
     OR NEW.resultado IS DISTINCT FROM OLD.resultado
     OR NEW.identidad_contractual IS DISTINCT FROM OLD.identidad_contractual
     OR NEW.inputs IS DISTINCT FROM OLD.inputs
     OR NEW.resolution_context_id IS DISTINCT FROM OLD.resolution_context_id
     OR NEW.mapping_version IS DISTINCT FROM OLD.mapping_version
     OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint THEN
    RAISE EXCEPTION 'FH-3: el payload de negocio de una resolución es inmutable tras el insert';
  END IF;
  IF (NEW.vigente IS DISTINCT FROM OLD.vigente
      OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
      OR NEW.superseded_by_id IS DISTINCT FROM OLD.superseded_by_id)
     AND coalesce(current_setting('ctr.supersede', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'FH-3: el ciclo de vida solo puede modificarse mediante ctr_supersede_resolucion()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ctr_resolucion_inmutable ON public.ctr_resolucion_ot_programa;
CREATE TRIGGER ctr_resolucion_inmutable
  BEFORE UPDATE OR DELETE ON public.ctr_resolucion_ot_programa
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_resolucion_inmutable();

-- Fingerprint canónico
CREATE OR REPLACE FUNCTION public.ctr_resolucion_fingerprint(
  p_num_ot text, p_inputs jsonb, p_contexto uuid, p_mapping uuid, p_algoritmo text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT encode(sha256(
    (p_num_ot || '|' || p_inputs::text || '|' || p_contexto::text || '|' ||
     coalesce(p_mapping::text, '∅') || '|' || p_algoritmo)::bytea), 'hex');
$$;

-- Resolución de UNA OT (documenta la jerarquía completa)
CREATE OR REPLACE FUNCTION public.ctr_resolver_programa(
  p_num_ot text, p_cliente_wg text, p_contexto uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_alias_ver uuid; v_censo_ver uuid; v_alg text;
  v_cliente uuid; v_n int; v_prog uuid;
  v_metodo text; v_res text;
BEGIN
  SELECT alias_set_version, censo_version, algoritmo_version
    INTO v_alias_ver, v_censo_ver, v_alg
    FROM public.ctr_resolucion_contexto WHERE id = p_contexto;
  IF v_alias_ver IS NULL THEN
    RAISE EXCEPTION 'contexto de resolución inexistente: %', p_contexto;
  END IF;

  -- (1) EXPLICIT_OT_FIELD: ops_fact_ot NO tiene campo de programa gobernado → rama inactiva.
  -- (2) CONTRACTUAL_MAPPING: mapa_contractual_version es NULL en I1 → rama inactiva.
  -- (3) SINGLE_PROGRAM_CLIENT:
  SELECT i.cliente_id INTO v_cliente
    FROM public.ctr_alias_set_item i
   WHERE i.version_id = v_alias_ver
     AND i.sistema_origen = 'erp_cliente'
     AND upper(btrim(i.valor_origen)) = upper(btrim(coalesce(p_cliente_wg,'')))
   LIMIT 1;

  IF v_cliente IS NULL THEN
    v_res := 'sin_cliente';
  ELSE
    SELECT count(*), min(c.programa_id) INTO v_n, v_prog
      FROM public.ctr_censo_programas_item c
     WHERE c.version_id = v_censo_ver AND c.cliente_id = v_cliente AND c.estado = 'vigente';
    IF v_n = 0 THEN v_res := 'cliente_sin_programa';
    ELSIF v_n = 1 THEN v_res := 'determinista'; v_metodo := 'SINGLE_PROGRAM_CLIENT';
    ELSE v_res := 'ambiguous'; v_prog := NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'num_ot', p_num_ot, 'cliente_id', v_cliente, 'programa_id', v_prog,
    'metodo', v_metodo, 'resultado', v_res, 'identidad_contractual', 'no_establecida');
END;
$$;

-- Sustitución controlada (único camino para el ciclo de vida)
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

  UPDATE public.ctr_resolucion_ot_programa
     SET vigente = false, superseded_at = now(), superseded_by_id = v_new
   WHERE id = v_old;

  PERFORM set_config('ctr.supersede','off', true);
  RETURN v_new;
END;
$$;

-- RLS / ACL
ALTER TABLE public.ctr_resolucion_ot_programa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ctr_resolucion_ot_programa FROM PUBLIC;
REVOKE ALL ON public.ctr_resolucion_ot_programa FROM anon;
REVOKE ALL ON public.ctr_resolucion_ot_programa FROM authenticator;
GRANT SELECT ON public.ctr_resolucion_ot_programa TO authenticated;
GRANT ALL ON public.ctr_resolucion_ot_programa TO service_role;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                   AND tablename='ctr_resolucion_ot_programa' AND policyname='mgmt_select') THEN
    CREATE POLICY mgmt_select ON public.ctr_resolucion_ot_programa FOR SELECT TO authenticated
      USING (public.is_management(auth.uid()));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) FROM authenticator;
GRANT EXECUTE ON FUNCTION public.ctr_supersede_resolucion(text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.ctr_resolver_programa(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_resolver_programa(text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.ctr_resolver_programa(text, text, uuid) FROM authenticator;
REVOKE ALL ON FUNCTION public.ctr_resolucion_fingerprint(text, jsonb, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_resolucion_fingerprint(text, jsonb, uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.ctr_resolucion_fingerprint(text, jsonb, uuid, uuid, text) FROM authenticator;