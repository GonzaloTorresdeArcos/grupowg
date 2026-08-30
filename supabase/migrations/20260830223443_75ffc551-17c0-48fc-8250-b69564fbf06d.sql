-- =====================================================================
-- I1 · M-05 PROGRAMAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ctr_programa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  cliente_id uuid NOT NULL REFERENCES public.ctr_cliente(id),
  nombre text NOT NULL,
  business_line_id uuid REFERENCES public.ctr_business_line(id),
  vertical_id uuid REFERENCES public.ctr_vertical(id),
  estado text NOT NULL CHECK (estado IN ('vigente','historico','propuesto','terminado')),
  effective_from date NOT NULL,
  effective_to date,
  territorio text[] NOT NULL,
  beneficiario_canal text,
  notas text,
  UNIQUE (cliente_id, nombre)
);

CREATE TABLE IF NOT EXISTS public.ctr_programa_parte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  tipo_entidad text NOT NULL CHECK (tipo_entidad IN ('sociedad_wg','contraparte','tercero')),
  entidad_id uuid,
  entidad_nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('contrata','ejecuta','suministra_repuestos','factura','beneficiario','transportista')),
  effective_from date,
  effective_to date,
  doc_id uuid REFERENCES public.ctr_documento(id),
  estado_evidencia text NOT NULL CHECK (estado_evidencia IN ('UNKNOWN_PENDING_SOURCE','PROPOSAL_ONLY','INTERNAL_WG_TARGET','OPERATIONALLY_AGREED','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','CONTRACTUAL_VALIDATED')),
  origen_conocimiento text NOT NULL CHECK (origen_conocimiento IN ('documental','operativo')),
  notas text,
  CONSTRAINT ctr_programa_parte_doc_o_estado
    CHECK (doc_id IS NOT NULL OR estado_evidencia IN ('UNKNOWN_PENDING_SOURCE','OPERATIONALLY_AGREED')),
  CONSTRAINT ctr_programa_parte_cv_exige_doc
    CHECK (estado_evidencia <> 'CONTRACTUAL_VALIDATED' OR doc_id IS NOT NULL),
  CONSTRAINT ctr_programa_parte_uq UNIQUE (programa_id, tipo_entidad, entidad_nombre, rol)
);

CREATE TABLE IF NOT EXISTS public.ctr_programa_servicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  actividad_id uuid NOT NULL REFERENCES public.ctr_actividad(id),
  condiciones text,
  doc_id uuid REFERENCES public.ctr_documento(id),
  UNIQUE (programa_id, actividad_id)
);

DROP TRIGGER IF EXISTS ctr_programa_parte_no_cv_insert ON public.ctr_programa_parte;
CREATE TRIGGER ctr_programa_parte_no_cv_insert
  BEFORE INSERT ON public.ctr_programa_parte
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_no_cv_en_insert();
DROP TRIGGER IF EXISTS ctr_programa_parte_candado ON public.ctr_programa_parte;
CREATE TRIGGER ctr_programa_parte_candado
  BEFORE UPDATE ON public.ctr_programa_parte
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_estado_evidencia_candado();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_programa','ctr_programa_parte','ctr_programa_servicio'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticator', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('GRANT SELECT ON public.%I TO ctr_gobierno_owner', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='mgmt_select') THEN
      EXECUTE format($p$CREATE POLICY mgmt_select ON public.%I FOR SELECT TO authenticated
                        USING (public.is_management(auth.uid()))$p$, t);
    END IF;
  END LOOP;
  EXECUTE 'REVOKE UPDATE (estado_evidencia) ON public.ctr_programa_parte FROM authenticated';
  EXECUTE 'REVOKE UPDATE (estado_evidencia) ON public.ctr_programa_parte FROM service_role';
  EXECUTE 'GRANT UPDATE ON public.ctr_programa_parte TO ctr_gobierno_owner';
END $$;

DO $$
DECLARE v_carga uuid; n_prog int; n_partes int; n_cv int; n_doc_malo int;
BEGIN
  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='migracion_i1' AND artefacto_ref='I1/M-01..M-06 semilla catálogos';

  INSERT INTO public.ctr_programa (carga_id, cliente_id, nombre, business_line_id, vertical_id, estado, effective_from, territorio, beneficiario_canal, notas)
  SELECT v_carga, c.id, x.nombre, bl.id, vt.id, x.estado, x.desde::date, x.terr, x.canal, x.notas
  FROM (VALUES
   ('Vestel','Postventa SAT','01_RETAIL_AFTERSALES','vigente','2022-02-09',ARRAY['ES','PT'],NULL::text,NULL::text),
   ('Vestel','Suministro repuestos','01_RETAIL_AFTERSALES','vigente','2022-09-02',ARRAY['ES','PT'],NULL,NULL),
   ('Alcampo/Auchan','Basic Service Agreement','01_RETAIL_AFTERSALES','vigente','2023-03-01',ARRAY['ES'],NULL,NULL),
   ('Alcampo/Auchan','After-sales 2019','01_RETAIL_AFTERSALES','historico','2019-01-01',ARRAY['ES'],NULL,NULL),
   ('Carrefour','Postventa SAT Electro','01_RETAIL_AFTERSALES','vigente','2019-01-01',ARRAY['ES'],NULL,'Instrumento vigente no presente en el corpus documental I1'),
   ('Carrefour','Clima instalación','03_CLIMATE','vigente','2026-01-01',ARRAY['ES'],NULL,NULL),
   ('Cecotec','Retail postventa','01_RETAIL_AFTERSALES','vigente','2022-11-01',ARRAY['ES'],NULL,NULL),
   ('Cecotec','Mobility','02_MOBILITY','vigente','2025-12-23',ARRAY['ES'],NULL,NULL),
   ('Cecotec','Clima instalación','03_CLIMATE','vigente','2024-01-01',ARRAY['ES'],NULL,NULL),
   ('METRO / MAKRO','Makro HORECA','04_PROFESSIONAL','vigente','2022-01-01',ARRAY['ES'],NULL,NULL),
   ('METRO / MAKRO','Metro Markets marketplace','04_PROFESSIONAL','vigente','2025-01-01',ARRAY['ES','PT'],NULL,NULL),
   ('Assurant','SOW1 e-scooters','05_INSURANCE','vigente','2023-07-01',ARRAY['ES'],NULL,NULL),
   ('Assurant','Amazon aged jobs','05_INSURANCE','vigente','2023-07-01',ARRAY['ES'],'Amazon',NULL),
   ('PC Componentes','Fee reparación AA+Blanca','01_RETAIL_AFTERSALES','vigente','2024-01-19',ARRAY['ES','PT'],NULL,NULL),
   ('Navee/Brightway','Service agreement scooters','02_MOBILITY','vigente','2025-04-01',ARRAY['ES'],NULL,NULL),
   ('Electro Depot','Retail after-sales','01_RETAIL_AFTERSALES','vigente','2020-01-01',ARRAY['ES'],NULL,NULL),
   ('Electro Depot','Clima','03_CLIMATE','propuesto','2021-01-01',ARRAY['ES'],NULL,NULL),
   ('Sauber','Garantía primaria','01_RETAIL_AFTERSALES','vigente','2019-01-01',ARRAY['ES'],NULL,NULL),
   ('Jocel','Garantía primaria','01_RETAIL_AFTERSALES','vigente','2019-03-07',ARRAY['ES'],NULL,NULL),
   ('Neumesse','Garantía primaria','01_RETAIL_AFTERSALES','vigente','2022-02-01',ARRAY['ES'],NULL,NULL),
   ('Neumesse','Clima','03_CLIMATE','propuesto','2023-01-01',ARRAY['ES'],NULL,NULL),
   ('Thomson/StreamView','ASS agreement','01_RETAIL_AFTERSALES','vigente','2024-01-01',ARRAY['ES','PT'],NULL,NULL),
   ('MT Distribution','Repair e-mobility','02_MOBILITY','vigente','2021-10-26',ARRAY['ES'],NULL,NULL),
   ('Telefac','PAE+AA portátil','01_RETAIL_AFTERSALES','propuesto','2025-01-01',ARRAY['ES'],NULL,NULL)
  ) AS x(cliente, nombre, bl, estado, desde, terr, canal, notas)
  JOIN public.ctr_cliente c ON c.nombre_display = x.cliente
  JOIN public.ctr_business_line bl ON bl.codigo = x.bl
  JOIN public.ctr_vertical vt ON vt.codigo = x.bl
  ON CONFLICT (cliente_id, nombre) DO NOTHING;

  INSERT INTO public.ctr_programa_parte (carga_id, programa_id, tipo_entidad, entidad_id, entidad_nombre, rol, doc_id, estado_evidencia, origen_conocimiento)
  SELECT v_carga, p.id, x.tipo_entidad, s.id, x.entidad_nombre, x.rol, d.id, x.estado, x.origen
  FROM (VALUES
   ('Vestel','Postventa SAT','sociedad_wg','Serseguro SL','contrata','1bbfdcab03a01863','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Vestel','Postventa SAT','sociedad_wg','Hiperservice de Arcos SL','ejecuta','27a5f68218e04599','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Vestel','Suministro repuestos','sociedad_wg','Asure Electronics SL','suministra_repuestos','937ab0ab54a3ae20','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('METRO / MAKRO','Makro HORECA','sociedad_wg','Serseguro SL','contrata','0a4d6c54e9b94cf6','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('METRO / MAKRO','Makro HORECA','sociedad_wg','Hiperservice de Arcos SL','ejecuta','0a4d6c54e9b94cf6','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('METRO / MAKRO','Metro Markets marketplace','sociedad_wg','Hiperservice de Arcos SL','contrata','d5735621986a9659','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Assurant','SOW1 e-scooters','sociedad_wg','Serseguro SL','contrata','0ec2f6283e03fbf0','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Assurant','Amazon aged jobs','sociedad_wg','Serseguro SL','ejecuta','c6448a8f644aee00','OPERATIONALLY_AGREED','documental'),
   ('PC Componentes','Fee reparación AA+Blanca','sociedad_wg','Hiperservice de Arcos SL','contrata','452fb3d55c9361e0','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Navee/Brightway','Service agreement scooters','sociedad_wg','Hiperservice de Arcos SL','contrata','b92978888fd6c999','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Alcampo/Auchan','Basic Service Agreement','sociedad_wg','Hiperservice de Arcos SL','contrata','c7298a4020bffa59','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Alcampo/Auchan','After-sales 2019','sociedad_wg','Hiperservice de Arcos SL','contrata','69bec5efd0dada0f','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Cecotec','Retail postventa','sociedad_wg','Hiperservice de Arcos SL','contrata','11f114c8c10c53c5','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Cecotec','Mobility','sociedad_wg','Hiperservice de Arcos SL','contrata','da30ad489dd17af4','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Cecotec','Clima instalación','sociedad_wg','Hiperservice de Arcos SL','ejecuta','9aa991353a7cfb0a','OPERATIONALLY_AGREED','documental'),
   ('Electro Depot','Retail after-sales','sociedad_wg','Hiperservice de Arcos SL','ejecuta','92950e456237ec6e','UNKNOWN_PENDING_SOURCE','documental'),
   ('Sauber','Garantía primaria','sociedad_wg','Hiperservice de Arcos SL','contrata','6bf861a66c2859e1','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Jocel','Garantía primaria','sociedad_wg','Hiperservice de Arcos SL','contrata','5ca8c0d08361f600','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Neumesse','Garantía primaria','sociedad_wg','Hiperservice de Arcos SL','contrata','59f7c16ed41157b2','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('Thomson/StreamView','ASS agreement','sociedad_wg','Hiperservice de Arcos SL','contrata','044957ccbd7b27fb','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental'),
   ('MT Distribution','Repair e-mobility','sociedad_wg','Hiperservice de Arcos SL','contrata','209a2756ea9c5f69','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental')
  ) AS x(cliente, programa, tipo_entidad, entidad_nombre, rol, hash, estado, origen)
  JOIN public.ctr_cliente c ON c.nombre_display = x.cliente
  JOIN public.ctr_programa p ON p.cliente_id = c.id AND p.nombre = x.programa
  JOIN public.ctr_documento d ON d.hash = x.hash
  LEFT JOIN public.ctr_sociedad_wg s ON s.razon_social = x.entidad_nombre
  ON CONFLICT (programa_id, tipo_entidad, entidad_nombre, rol) DO NOTHING;

  INSERT INTO public.ctr_programa_parte (carga_id, programa_id, tipo_entidad, entidad_id, entidad_nombre, rol, doc_id, estado_evidencia, origen_conocimiento, notas)
  SELECT v_carga, p.id, x.tipo_entidad, NULL, x.entidad_nombre, x.rol,
         (SELECT d.id FROM public.ctr_documento d WHERE d.hash = x.hash), x.estado, x.origen, x.notas
  FROM (VALUES
   ('Assurant','Amazon aged jobs','tercero','Amazon','beneficiario','c6448a8f644aee00','OPERATIONALLY_AGREED','documental',NULL::text),
   ('Carrefour','Postventa SAT Electro','sociedad_wg','Hiperservice de Arcos SL','ejecuta',NULL::text,'UNKNOWN_PENDING_SOURCE','operativo','Sin instrumento en el corpus; conocimiento operativo'),
   ('Carrefour','Clima instalación','sociedad_wg','Sociedad WG firmante por confirmar','contrata','1c26d147aeec3339','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','documental','Sociedad WG firmante pendiente de confirmar en articulado'),
   ('Telefac','PAE+AA portátil','sociedad_wg','Hiperservice de Arcos SL','ejecuta',NULL,'UNKNOWN_PENDING_SOURCE','operativo','Cotización Telefac permanece únicamente en C1')
  ) AS x(cliente, programa, tipo_entidad, entidad_nombre, rol, hash, estado, origen, notas)
  JOIN public.ctr_cliente c ON c.nombre_display = x.cliente
  JOIN public.ctr_programa p ON p.cliente_id = c.id AND p.nombre = x.programa
  ON CONFLICT (programa_id, tipo_entidad, entidad_nombre, rol) DO NOTHING;

  SELECT count(*) INTO n_prog FROM public.ctr_programa;
  SELECT count(*) INTO n_partes FROM public.ctr_programa_parte;
  SELECT count(*) INTO n_cv FROM public.ctr_programa_parte WHERE estado_evidencia='CONTRACTUAL_VALIDATED';
  SELECT count(*) INTO n_doc_malo FROM public.ctr_programa_parte pp
    WHERE pp.doc_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.ctr_documento d WHERE d.id = pp.doc_id);

  IF n_prog <> 24 OR n_partes <> 25 OR n_cv <> 0 OR n_doc_malo <> 0 THEN
    RAISE EXCEPTION 'M-05 VERIFICACIÓN FALLIDA: programas=% (24), partes=% (25), CV=% (0), docs_invalidos=% (0)',
      n_prog, n_partes, n_cv, n_doc_malo;
  END IF;
  RAISE NOTICE 'M-05 OK: programas=% partes=% CV=%', n_prog, n_partes, n_cv;
END $$;