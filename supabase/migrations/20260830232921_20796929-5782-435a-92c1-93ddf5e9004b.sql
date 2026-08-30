-- =====================================================================
-- I1 · M-07 ALIAS + FOTOS + CONTEXTO (capa ctr_*, 100% aditiva)
-- No se modifica ningún objeto ops_*.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ctr_alias_identidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  sistema_origen text NOT NULL CHECK (sistema_origen IN ('erp_cliente','erp_marca','erp_sat','fichero_analytics')),
  valor_origen text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.ctr_cliente(id),
  programa_id uuid REFERENCES public.ctr_programa(id),
  metodo text NOT NULL CHECK (metodo IN ('manual','patron_provisional')),
  gobernado boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  effective_to date,
  CONSTRAINT ctr_alias_identidad_uq UNIQUE (sistema_origen, valor_origen, effective_from)
);

CREATE TABLE IF NOT EXISTS public.ctr_alias_set_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  hash_contenido text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.ctr_alias_set_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  version_id uuid NOT NULL REFERENCES public.ctr_alias_set_version(id),
  sistema_origen text NOT NULL,
  valor_origen text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.ctr_cliente(id),
  programa_id uuid REFERENCES public.ctr_programa(id),
  gobernado boolean NOT NULL DEFAULT false,
  CONSTRAINT ctr_alias_set_item_uq UNIQUE (version_id, sistema_origen, valor_origen)
);

CREATE TABLE IF NOT EXISTS public.ctr_censo_programas_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  hash_contenido text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.ctr_censo_programas_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  version_id uuid NOT NULL REFERENCES public.ctr_censo_programas_version(id),
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  cliente_id uuid NOT NULL REFERENCES public.ctr_cliente(id),
  estado text NOT NULL,
  effective_from date,
  effective_to date,
  CONSTRAINT ctr_censo_programas_item_uq UNIQUE (version_id, programa_id)
);

CREATE TABLE IF NOT EXISTS public.ctr_resolucion_contexto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  algoritmo_version text NOT NULL,
  alias_set_version uuid NOT NULL REFERENCES public.ctr_alias_set_version(id),
  censo_version uuid NOT NULL REFERENCES public.ctr_censo_programas_version(id),
  mapa_contractual_version uuid,
  CONSTRAINT ctr_resolucion_contexto_uq UNIQUE (algoritmo_version, alias_set_version, censo_version)
);

-- RLS / ACL: patrón ctr_*
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_alias_identidad','ctr_alias_set_version','ctr_alias_set_item',
                           'ctr_censo_programas_version','ctr_censo_programas_item','ctr_resolucion_contexto'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticator', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='mgmt_select') THEN
      EXECUTE format($p$CREATE POLICY mgmt_select ON public.%I FOR SELECT TO authenticated
                        USING (public.is_management(auth.uid()))$p$, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- CARGA + DATOS
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_carga uuid;
  v_alias_ver uuid;
  v_censo_ver uuid;
  v_hash_alias text;
  v_hash_censo text;
  n_alias int; n_item int; n_censo int; n_ctx int; n_src int;
BEGIN
  INSERT INTO public.ctr_carga (origen, artefacto_ref, plantilla_version, loaded_by_nombre, estado, notas)
  VALUES ('migracion_i1','I1/M-07 alias+fotos+contexto','I1 v1.2 FINAL','I1 executor (Claude/agent)','ok',
          'Copia gobernada de ops_cliente_contrato_alias y fotos inmutables de alias y censo de programas')
  ON CONFLICT (origen, artefacto_ref) DO NOTHING;

  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='migracion_i1' AND artefacto_ref='I1/M-07 alias+fotos+contexto';
  UPDATE public.ctr_carga SET carga_id = id WHERE id = v_carga AND carga_id IS NULL;

  -- 1) Alias de identidad: copia literal de las 15 filas fuente (fuente NO se toca)
  INSERT INTO public.ctr_alias_identidad
    (carga_id, sistema_origen, valor_origen, cliente_id, programa_id, metodo, gobernado, effective_from)
  SELECT v_carga, 'erp_cliente', a.cliente_wg_real, c.id, NULL, 'manual', false, DATE '2025-01-01'
    FROM public.ops_cliente_contrato_alias a
    JOIN public.ctr_cliente c
      ON upper(replace(c.nombre_display,' ','')) = upper(replace(a.cliente_contractual,' ',''))
  ON CONFLICT (sistema_origen, valor_origen, effective_from) DO NOTHING;

  SELECT count(*) INTO n_alias FROM public.ctr_alias_identidad;
  SELECT count(*) INTO n_src FROM public.ops_cliente_contrato_alias;
  IF n_alias <> 15 OR n_src <> 15 THEN
    RAISE EXCEPTION 'M-07 FAIL: alias=% (esperado 15) / fuente=% (esperado 15)', n_alias, n_src;
  END IF;

  -- 2) Foto de alias
  SELECT md5(string_agg(s, E'\n' ORDER BY s)) INTO v_hash_alias
    FROM (SELECT sistema_origen||'|'||valor_origen||'|'||cliente_id::text||'|'||
                 coalesce(programa_id::text,'')||'|'||gobernado::text AS s
            FROM public.ctr_alias_identidad) q;

  INSERT INTO public.ctr_alias_set_version (carga_id, hash_contenido)
  VALUES (v_carga, v_hash_alias)
  ON CONFLICT (hash_contenido) DO NOTHING;
  SELECT id INTO v_alias_ver FROM public.ctr_alias_set_version WHERE hash_contenido = v_hash_alias;

  INSERT INTO public.ctr_alias_set_item
    (carga_id, version_id, sistema_origen, valor_origen, cliente_id, programa_id, gobernado)
  SELECT v_carga, v_alias_ver, a.sistema_origen, a.valor_origen, a.cliente_id, a.programa_id, a.gobernado
    FROM public.ctr_alias_identidad a
  ON CONFLICT (version_id, sistema_origen, valor_origen) DO NOTHING;

  -- 3) Foto del censo de programas
  SELECT md5(string_agg(s, E'\n' ORDER BY s)) INTO v_hash_censo
    FROM (SELECT p.id::text||'|'||p.cliente_id::text||'|'||p.estado||'|'||
                 coalesce(p.effective_from::text,'')||'|'||coalesce(p.effective_to::text,'') AS s
            FROM public.ctr_programa p) q;

  INSERT INTO public.ctr_censo_programas_version (carga_id, hash_contenido)
  VALUES (v_carga, v_hash_censo)
  ON CONFLICT (hash_contenido) DO NOTHING;
  SELECT id INTO v_censo_ver FROM public.ctr_censo_programas_version WHERE hash_contenido = v_hash_censo;

  INSERT INTO public.ctr_censo_programas_item
    (carga_id, version_id, programa_id, cliente_id, estado, effective_from, effective_to)
  SELECT v_carga, v_censo_ver, p.id, p.cliente_id, p.estado, p.effective_from, p.effective_to
    FROM public.ctr_programa p
  ON CONFLICT (version_id, programa_id) DO NOTHING;

  -- 4) Contexto de resolución
  INSERT INTO public.ctr_resolucion_contexto
    (carga_id, algoritmo_version, alias_set_version, censo_version, mapa_contractual_version)
  VALUES (v_carga, 'i1-v1', v_alias_ver, v_censo_ver, NULL)
  ON CONFLICT (algoritmo_version, alias_set_version, censo_version) DO NOTHING;

  -- 5) Verificación exacta
  SELECT count(*) INTO n_item  FROM public.ctr_alias_set_item WHERE version_id = v_alias_ver;
  SELECT count(*) INTO n_censo FROM public.ctr_censo_programas_item WHERE version_id = v_censo_ver;
  SELECT count(*) INTO n_ctx   FROM public.ctr_resolucion_contexto;

  IF n_item <> 15 OR n_censo <> 24 OR n_ctx <> 1 THEN
    RAISE EXCEPTION 'M-07 FAIL: alias_item=% (15) censo_item=% (24) contexto=% (1)', n_item, n_censo, n_ctx;
  END IF;

  RAISE NOTICE 'M-07 OK: alias=% items=% censo=% contexto=% hash_alias=% hash_censo=%',
    n_alias, n_item, n_censo, n_ctx, v_hash_alias, v_hash_censo;
END $$;