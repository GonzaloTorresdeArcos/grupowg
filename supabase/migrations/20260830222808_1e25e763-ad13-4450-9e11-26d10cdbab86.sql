-- =====================================================================
-- I1 · M-01 LINAJE + CATÁLOGOS (capa ctr_*, 100% aditiva)
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctr_gobierno_owner') THEN
    BEGIN
      EXECUTE 'CREATE ROLE ctr_gobierno_owner NOLOGIN';
      RAISE NOTICE 'M-01: rol ctr_gobierno_owner creado';
    EXCEPTION WHEN insufficient_privilege OR feature_not_supported THEN
      RAISE NOTICE 'M-01 DESVIACIÓN: CREATE ROLE no permitido; owner = %', current_user;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ctr_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid,
  origen text NOT NULL CHECK (origen IN ('migracion_i1','semilla_documental','batch_resolucion','manual')),
  artefacto_ref text,
  hash text,
  plantilla_version text,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  loaded_by_id uuid,
  loaded_by_nombre text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('ok','parcial','fallida')),
  notas text
);
CREATE UNIQUE INDEX IF NOT EXISTS ctr_carga_origen_ref_uq
  ON public.ctr_carga (origen, artefacto_ref);

CREATE TABLE IF NOT EXISTS public.ctr_business_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ctr_vertical (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ctr_actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  comparable boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.ctr_sociedad_wg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  razon_social text NOT NULL UNIQUE,
  nif text UNIQUE,
  notas text
);

CREATE TABLE IF NOT EXISTS public.ctr_territorio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  nivel text NOT NULL CHECK (nivel IN ('pais','ccaa','provincia','isla')),
  padre_id uuid REFERENCES public.ctr_territorio(id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_carga','ctr_business_line','ctr_vertical','ctr_actividad','ctr_sociedad_wg','ctr_territorio'] LOOP
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

DO $$
DECLARE
  v_carga uuid;
  n_bl int; n_vt int; n_ac int; n_ac_cmp int; n_so int; n_te int;
BEGIN
  INSERT INTO public.ctr_carga (origen, artefacto_ref, plantilla_version, loaded_by_nombre, estado, notas)
  VALUES ('migracion_i1','I1/M-01..M-06 semilla catálogos','I1 v1.2 FINAL','I1 executor (Claude/agent)','ok',
          'Semilla de catálogos y estructura de la fase 1/2 del Master Plan I1')
  ON CONFLICT (origen, artefacto_ref) DO NOTHING;

  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='migracion_i1' AND artefacto_ref='I1/M-01..M-06 semilla catálogos';
  UPDATE public.ctr_carga SET carga_id = id WHERE id = v_carga AND carga_id IS NULL;

  INSERT INTO public.ctr_business_line (carga_id, codigo, nombre) VALUES
    (v_carga,'01_RETAIL_AFTERSALES','Retail after-sales'),
    (v_carga,'02_MOBILITY','Mobility'),
    (v_carga,'03_CLIMATE','Climate'),
    (v_carga,'04_PROFESSIONAL','Professional'),
    (v_carga,'05_INSURANCE','Insurance')
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_vertical (carga_id, codigo, nombre) VALUES
    (v_carga,'01_RETAIL_AFTERSALES','Retail after-sales'),
    (v_carga,'02_MOBILITY','Mobility'),
    (v_carga,'03_CLIMATE','Climate'),
    (v_carga,'04_PROFESSIONAL','Professional'),
    (v_carga,'05_INSURANCE','Insurance')
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_actividad (carga_id, codigo, nombre, comparable) VALUES
    (v_carga,'SAME_UNIT_REPAIR','Reparación de la misma unidad',true),
    (v_carga,'ON_SITE_REPAIR','Reparación a domicilio',true),
    (v_carga,'PICKUP_RETURN_REPAIR','Recogida, reparación y devolución',true),
    (v_carga,'SWAP','Sustitución de unidad',true),
    (v_carga,'REFURB','Reacondicionamiento',false),
    (v_carga,'INSTALL','Instalación',true),
    (v_carga,'UNINSTALL','Desinstalación',false),
    (v_carga,'SPARE_SUPPLY','Suministro de repuestos',false),
    (v_carga,'CALL_CENTER','Atención telefónica',false),
    (v_carga,'WARRANTY_EXTENSION_ADMIN','Administración de garantía extendida',false),
    (v_carga,'BER_ASSESSMENT','Evaluación de irreparabilidad (BER)',false),
    (v_carga,'LOGISTICS_STORAGE','Logística y almacenaje',false)
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_sociedad_wg (carga_id, razon_social, nif, notas) VALUES
    (v_carga,'Hiperservice de Arcos SL',NULL,'NIF no consta en el corpus documental I1'),
    (v_carga,'Serseguro SL',NULL,'NIF no consta en el corpus documental I1'),
    (v_carga,'Asure Electronics SL',NULL,'NIF no consta en el corpus documental I1')
  ON CONFLICT (razon_social) DO NOTHING;

  INSERT INTO public.ctr_territorio (carga_id, codigo, nombre, nivel, padre_id) VALUES
    (v_carga,'ES','España','pais',NULL),
    (v_carga,'PT','Portugal','pais',NULL)
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_territorio (carga_id, codigo, nombre, nivel, padre_id)
  SELECT v_carga, x.codigo, x.nombre, 'ccaa', (SELECT id FROM public.ctr_territorio WHERE codigo='ES')
  FROM (VALUES
    ('ES-AN','Andalucía'),('ES-AR','Aragón'),('ES-AS','Principado de Asturias'),
    ('ES-IB','Illes Balears'),('ES-CN','Canarias'),('ES-CB','Cantabria'),
    ('ES-CL','Castilla y León'),('ES-CM','Castilla-La Mancha'),('ES-CT','Cataluña'),
    ('ES-EX','Extremadura'),('ES-GA','Galicia'),('ES-RI','La Rioja'),
    ('ES-MD','Comunidad de Madrid'),('ES-MC','Región de Murcia'),
    ('ES-NC','Comunidad Foral de Navarra'),('ES-PV','País Vasco'),
    ('ES-VC','Comunitat Valenciana')
  ) AS x(codigo,nombre)
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_territorio (carga_id, codigo, nombre, nivel, padre_id)
  SELECT v_carga, x.codigo, x.nombre, 'isla', (SELECT id FROM public.ctr_territorio WHERE codigo='ES-CN')
  FROM (VALUES
    ('ES-CN-TF','Tenerife'),('ES-CN-GC','Gran Canaria'),('ES-CN-LZ','Lanzarote'),
    ('ES-CN-FV','Fuerteventura'),('ES-CN-LP','La Palma'),('ES-CN-LG','La Gomera'),
    ('ES-CN-EH','El Hierro')
  ) AS x(codigo,nombre)
  ON CONFLICT (codigo) DO NOTHING;

  INSERT INTO public.ctr_territorio (carga_id, codigo, nombre, nivel, padre_id)
  SELECT v_carga, x.codigo, x.nombre, 'isla', (SELECT id FROM public.ctr_territorio WHERE codigo='ES-IB')
  FROM (VALUES
    ('ES-IB-MA','Mallorca'),('ES-IB-ME','Menorca'),('ES-IB-IZ','Eivissa'),('ES-IB-FO','Formentera')
  ) AS x(codigo,nombre)
  ON CONFLICT (codigo) DO NOTHING;

  SELECT count(*) INTO n_bl FROM public.ctr_business_line;
  SELECT count(*) INTO n_vt FROM public.ctr_vertical;
  SELECT count(*) INTO n_ac FROM public.ctr_actividad;
  SELECT count(*) INTO n_ac_cmp FROM public.ctr_actividad WHERE comparable;
  SELECT count(*) INTO n_so FROM public.ctr_sociedad_wg;
  SELECT count(*) INTO n_te FROM public.ctr_territorio;

  IF n_bl <> 5 OR n_vt <> 5 OR n_ac <> 12 OR n_ac_cmp <> 5 OR n_so <> 3 OR n_te <> 30 THEN
    RAISE EXCEPTION 'M-01 VERIFICACIÓN FALLIDA: bl=% vt=% act=% act_cmp=% soc=% terr=% (esperado 5/5/12/5/3/30)',
      n_bl, n_vt, n_ac, n_ac_cmp, n_so, n_te;
  END IF;
  RAISE NOTICE 'M-01 OK: bl=% vt=% act=% (comparable=%) soc=% terr=%', n_bl, n_vt, n_ac, n_ac_cmp, n_so, n_te;
END $$;