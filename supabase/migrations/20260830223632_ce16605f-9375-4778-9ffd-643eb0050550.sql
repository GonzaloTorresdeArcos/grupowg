-- =====================================================================
-- I1 · M-06 INSTRUMENTOS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ctr_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  contraparte_id uuid NOT NULL REFERENCES public.ctr_contraparte_legal(id),
  sociedad_wg_id uuid REFERENCES public.ctr_sociedad_wg(id),
  titulo text NOT NULL,
  tipo_instrumento text NOT NULL CHECK (tipo_instrumento IN ('contrato_marco','contrato','adenda','sow','anexo_vinculado','oferta_aceptada','condiciones_generales')),
  fecha_firma date,
  effective_from date NOT NULL,
  effective_to date,
  renovacion text CHECK (renovacion IS NULL OR renovacion IN ('automatica','expresa','no_consta')),
  preaviso text,
  estado_evidencia text NOT NULL CHECK (estado_evidencia IN ('UNKNOWN_PENDING_SOURCE','PROPOSAL_ONLY','INTERNAL_WG_TARGET','OPERATIONALLY_AGREED','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','CONTRACTUAL_VALIDATED')),
  notas text,
  CONSTRAINT ctr_contrato_uq UNIQUE (contraparte_id, titulo)
);

CREATE TABLE IF NOT EXISTS public.ctr_contrato_alcance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  contrato_id uuid NOT NULL REFERENCES public.ctr_contrato(id),
  programa_id uuid NOT NULL REFERENCES public.ctr_programa(id),
  alcance_nota text,
  doc_id uuid NOT NULL REFERENCES public.ctr_documento(id),
  effective_from date,
  effective_to date,
  estado_ejecucion text NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (estado_ejecucion IN ('NOT_STARTED','EXECUTION_OBSERVED','EXECUTION_ATTESTED','SUSPENDED','TERMINATED')),
  CONSTRAINT ctr_contrato_alcance_uq UNIQUE (contrato_id, programa_id)
);

CREATE TABLE IF NOT EXISTS public.ctr_contrato_relacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  origen_id uuid NOT NULL REFERENCES public.ctr_contrato(id),
  destino_id uuid NOT NULL REFERENCES public.ctr_contrato(id),
  tipo text NOT NULL CHECK (tipo IN ('sustituye','adenda_de','incorpora','depende_de','renueva','termina')),
  evidencia_sustitucion text,
  doc_id uuid NOT NULL REFERENCES public.ctr_documento(id),
  CONSTRAINT ctr_contrato_relacion_no_self CHECK (origen_id <> destino_id),
  CONSTRAINT ctr_contrato_relacion_sustituye_evidencia
    CHECK (tipo <> 'sustituye' OR evidencia_sustitucion IS NOT NULL),
  CONSTRAINT ctr_contrato_relacion_uq UNIQUE (origen_id, destino_id, tipo)
);

CREATE TABLE IF NOT EXISTS public.ctr_instrumento_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  contrato_id uuid NOT NULL REFERENCES public.ctr_contrato(id),
  doc_id uuid NOT NULL REFERENCES public.ctr_documento(id),
  tipo_relacion text NOT NULL CHECK (tipo_relacion IN ('principal','anexo','certificado_firma','documento_incorporado','soporte')),
  nota text,
  CONSTRAINT ctr_instrumento_documento_uq UNIQUE (contrato_id, doc_id, tipo_relacion)
);

-- Triggers de evidencia
DROP TRIGGER IF EXISTS ctr_contrato_no_cv_insert ON public.ctr_contrato;
CREATE TRIGGER ctr_contrato_no_cv_insert
  BEFORE INSERT ON public.ctr_contrato
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_no_cv_en_insert();
DROP TRIGGER IF EXISTS ctr_contrato_candado ON public.ctr_contrato;
CREATE TRIGGER ctr_contrato_candado
  BEFORE UPDATE ON public.ctr_contrato
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_estado_evidencia_candado();

-- Anti-ciclo en el grafo de instrumentos
CREATE OR REPLACE FUNCTION public.ctr_trg_relacion_sin_ciclo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE v_ciclo boolean;
BEGIN
  WITH RECURSIVE camino(nodo, profundidad) AS (
    SELECT NEW.destino_id, 1
    UNION ALL
    SELECT r.destino_id, c.profundidad + 1
      FROM public.ctr_contrato_relacion r
      JOIN camino c ON r.origen_id = c.nodo
     WHERE c.profundidad < 50
  )
  SELECT EXISTS (SELECT 1 FROM camino WHERE nodo = NEW.origen_id) INTO v_ciclo;
  IF v_ciclo THEN
    RAISE EXCEPTION 'CICLO: la relación % -> % cerraría un ciclo en el grafo de instrumentos',
      NEW.origen_id, NEW.destino_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ctr_contrato_relacion_dag ON public.ctr_contrato_relacion;
CREATE TRIGGER ctr_contrato_relacion_dag
  BEFORE INSERT OR UPDATE ON public.ctr_contrato_relacion
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_relacion_sin_ciclo();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_contrato','ctr_contrato_alcance','ctr_contrato_relacion','ctr_instrumento_documento'] LOOP
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
  EXECUTE 'REVOKE UPDATE (estado_evidencia) ON public.ctr_contrato FROM authenticated';
  EXECUTE 'REVOKE UPDATE (estado_evidencia) ON public.ctr_contrato FROM service_role';
  EXECUTE 'GRANT UPDATE ON public.ctr_contrato TO ctr_gobierno_owner';
END $$;

DO $$
DECLARE v_carga uuid; n_i int; n_cv int; n_bad_tipo int; n_alc int; n_doc int; n_rel int;
BEGIN
  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='migracion_i1' AND artefacto_ref='I1/M-01..M-06 semilla catálogos';

  -- 19 instrumentos
  INSERT INTO public.ctr_contrato (carga_id, contraparte_id, sociedad_wg_id, titulo, tipo_instrumento,
                                   fecha_firma, effective_from, estado_evidencia, notas)
  SELECT v_carga, cp.id, s.id, x.titulo, x.tipo, x.firma::date, x.desde::date,
         'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION', x.notas
  FROM (VALUES
   ('Vestel','Serseguro SL','Contrato SAT 2022','contrato',NULL::text,'2022-02-09',NULL::text),
   ('Vestel','Hiperservice de Arcos SL','Contrato colaboración 2022','contrato',NULL,'2022-02-09',NULL),
   ('Vestel','Asure Electronics SL','Suministro repuestos 2022','contrato',NULL,'2022-09-02',NULL),
   ('Organisation Intra-Groupe des Achats','Hiperservice de Arcos SL','After-sales 2019','contrato',NULL,'2019-01-01',NULL),
   ('Organisation Intra-Groupe des Achats','Hiperservice de Arcos SL','BSA 2023','contrato',NULL,'2023-03-01',NULL),
   ('Cecotec Innovaciones SLU','Hiperservice de Arcos SL','Contrato SAT 2022','contrato',NULL,'2022-11-01',NULL),
   ('Cecotec Innovaciones SLU','Hiperservice de Arcos SL','Adenda nº1 2025','adenda',NULL,'2025-12-23',NULL),
   ('Centros Comerciales Carrefour SA',NULL,'Contrato Clima 2026','contrato',NULL,'2026-01-01','Sociedad WG firmante por confirmar'),
   ('Centros Comerciales Carrefour SA',NULL,'Condiciones Generales de Contratación','condiciones_generales',NULL,'2019-01-01','Sin fecha en el documento; effective_from provisional. Sociedad WG firmante por confirmar'),
   ('Makro Autoservicio Mayorista','Serseguro SL','Contrato-adenda 2022','contrato',NULL,'2022-01-01',NULL),
   ('Metro Markets GmbH','Hiperservice de Arcos SL','Contrato 2025','contrato',NULL,'2025-01-01',NULL),
   ('Brightway/Navee','Hiperservice de Arcos SL','Service Agreement 2025','contrato',NULL,'2025-04-01',NULL),
   ('MT Distribution','Hiperservice de Arcos SL','Contrato 2021','contrato',NULL,'2021-10-26',NULL),
   ('PC Componentes y Multimedia SL','Hiperservice de Arcos SL','Arrendamiento de servicios 2024','contrato','2024-01-19','2024-01-19',NULL),
   ('Jocel','Hiperservice de Arcos SL','Contrato 2019','contrato',NULL,'2019-03-07',NULL),
   ('Neumesse SL','Hiperservice de Arcos SL','Contrato 2022','contrato',NULL,'2022-02-01',NULL),
   ('Sauber','Hiperservice de Arcos SL','Contrato 2019','contrato',NULL,'2019-01-01',NULL),
   ('StreamView GmbH','Hiperservice de Arcos SL','ASS Agreement 2024','contrato',NULL,'2024-01-01',NULL),
   ('Assurant Europe Insurance N.V.','Serseguro SL','RSA + SOW1 2023','sow',NULL,'2023-07-01',NULL)
  ) AS x(contraparte, sociedad, titulo, tipo, firma, desde, notas)
  JOIN public.ctr_contraparte_legal cp ON cp.razon_social = x.contraparte
  LEFT JOIN public.ctr_sociedad_wg s ON s.razon_social = x.sociedad
  ON CONFLICT (contraparte_id, titulo) DO NOTHING;

  -- documento principal de cada instrumento
  INSERT INTO public.ctr_instrumento_documento (carga_id, contrato_id, doc_id, tipo_relacion, nota)
  SELECT v_carga, k.id, d.id, 'principal', NULL
  FROM (VALUES
   ('Vestel','Contrato SAT 2022','1bbfdcab03a01863'),
   ('Vestel','Contrato colaboración 2022','27a5f68218e04599'),
   ('Vestel','Suministro repuestos 2022','937ab0ab54a3ae20'),
   ('Organisation Intra-Groupe des Achats','After-sales 2019','69bec5efd0dada0f'),
   ('Organisation Intra-Groupe des Achats','BSA 2023','c7298a4020bffa59'),
   ('Cecotec Innovaciones SLU','Contrato SAT 2022','11f114c8c10c53c5'),
   ('Cecotec Innovaciones SLU','Adenda nº1 2025','da30ad489dd17af4'),
   ('Centros Comerciales Carrefour SA','Contrato Clima 2026','1c26d147aeec3339'),
   ('Centros Comerciales Carrefour SA','Condiciones Generales de Contratación','c5fe4eb78a5f48b2'),
   ('Makro Autoservicio Mayorista','Contrato-adenda 2022','0a4d6c54e9b94cf6'),
   ('Metro Markets GmbH','Contrato 2025','d5735621986a9659'),
   ('Brightway/Navee','Service Agreement 2025','b92978888fd6c999'),
   ('MT Distribution','Contrato 2021','209a2756ea9c5f69'),
   ('PC Componentes y Multimedia SL','Arrendamiento de servicios 2024','452fb3d55c9361e0'),
   ('Jocel','Contrato 2019','5ca8c0d08361f600'),
   ('Neumesse SL','Contrato 2022','59f7c16ed41157b2'),
   ('Sauber','Contrato 2019','6bf861a66c2859e1'),
   ('StreamView GmbH','ASS Agreement 2024','044957ccbd7b27fb'),
   ('Assurant Europe Insurance N.V.','RSA + SOW1 2023','0ec2f6283e03fbf0')
  ) AS x(contraparte, titulo, hash)
  JOIN public.ctr_contraparte_legal cp ON cp.razon_social = x.contraparte
  JOIN public.ctr_contrato k ON k.contraparte_id = cp.id AND k.titulo = x.titulo
  JOIN public.ctr_documento d ON d.hash = x.hash
  ON CONFLICT (contrato_id, doc_id, tipo_relacion) DO NOTHING;

  -- documentos asociados (anexo / soporte / incorporado)
  INSERT INTO public.ctr_instrumento_documento (carga_id, contrato_id, doc_id, tipo_relacion, nota)
  SELECT v_carga, k.id, d.id, x.tipo_rel, x.nota
  FROM (VALUES
   ('Cecotec Innovaciones SLU','Adenda nº1 2025','30b9558b5d4b3494','documento_incorporado',NULL::text),
   ('Cecotec Innovaciones SLU','Adenda nº1 2025','9aa991353a7cfb0a','soporte',NULL),
   ('Vestel','Contrato SAT 2022','dd3cd6701acc8c68','anexo','Anexado al tender; vínculo contractual por confirmar (P0.4)'),
   ('Vestel','Contrato SAT 2022','ded5d6148323babd','anexo','Anexado al tender; vínculo contractual por confirmar (P0.4)'),
   ('Vestel','Contrato SAT 2022','a979739d2252e72e','soporte',NULL),
   ('Centros Comerciales Carrefour SA','Contrato Clima 2026','14956910ea04702c','anexo',NULL),
   ('PC Componentes y Multimedia SL','Arrendamiento de servicios 2024','a5c821cc43e7c1e7','soporte',NULL),
   ('Assurant Europe Insurance N.V.','RSA + SOW1 2023','fa5771a150b3216e','soporte',NULL),
   ('Assurant Europe Insurance N.V.','RSA + SOW1 2023','c6448a8f644aee00','soporte',NULL)
  ) AS x(contraparte, titulo, hash, tipo_rel, nota)
  JOIN public.ctr_contraparte_legal cp ON cp.razon_social = x.contraparte
  JOIN public.ctr_contrato k ON k.contraparte_id = cp.id AND k.titulo = x.titulo
  JOIN public.ctr_documento d ON d.hash = x.hash
  ON CONFLICT (contrato_id, doc_id, tipo_relacion) DO NOTHING;

  -- alcances instrumento -> programa
  INSERT INTO public.ctr_contrato_alcance (carga_id, contrato_id, programa_id, alcance_nota, doc_id, effective_from, effective_to, estado_ejecucion)
  SELECT v_carga, k.id, p.id, x.nota, d.id, k.effective_from, x.hasta::date, x.ejec
  FROM (VALUES
   ('Vestel','Contrato SAT 2022','Vestel','Postventa SAT','1bbfdcab03a01863','EXECUTION_OBSERVED',NULL::text,NULL::text),
   ('Vestel','Contrato colaboración 2022','Vestel','Postventa SAT','27a5f68218e04599','EXECUTION_OBSERVED',NULL,NULL),
   ('Vestel','Suministro repuestos 2022','Vestel','Suministro repuestos','937ab0ab54a3ae20','EXECUTION_OBSERVED',NULL,NULL),
   ('Organisation Intra-Groupe des Achats','After-sales 2019','Alcampo/Auchan','After-sales 2019','69bec5efd0dada0f','EXECUTION_OBSERVED','2023-02-28','Sustituido operativamente por el BSA 2023 (sin cláusula de sustitución expresa en el corpus)'),
   ('Organisation Intra-Groupe des Achats','BSA 2023','Alcampo/Auchan','Basic Service Agreement','c7298a4020bffa59','EXECUTION_OBSERVED',NULL,NULL),
   ('Cecotec Innovaciones SLU','Contrato SAT 2022','Cecotec','Retail postventa','11f114c8c10c53c5','EXECUTION_OBSERVED',NULL,NULL),
   ('Cecotec Innovaciones SLU','Adenda nº1 2025','Cecotec','Mobility','da30ad489dd17af4','EXECUTION_OBSERVED',NULL,NULL),
   ('Centros Comerciales Carrefour SA','Contrato Clima 2026','Carrefour','Clima instalación','1c26d147aeec3339','NOT_STARTED',NULL,NULL),
   ('Centros Comerciales Carrefour SA','Condiciones Generales de Contratación','Carrefour','Postventa SAT Electro','c5fe4eb78a5f48b2','NOT_STARTED',NULL,'CGC: marco general; el instrumento operativo del programa no está en el corpus'),
   ('Makro Autoservicio Mayorista','Contrato-adenda 2022','METRO / MAKRO','Makro HORECA','0a4d6c54e9b94cf6','EXECUTION_OBSERVED',NULL,NULL),
   ('Metro Markets GmbH','Contrato 2025','METRO / MAKRO','Metro Markets marketplace','d5735621986a9659','EXECUTION_OBSERVED',NULL,NULL),
   ('Brightway/Navee','Service Agreement 2025','Navee/Brightway','Service agreement scooters','b92978888fd6c999','EXECUTION_OBSERVED',NULL,NULL),
   ('MT Distribution','Contrato 2021','MT Distribution','Repair e-mobility','209a2756ea9c5f69','NOT_STARTED',NULL,'Ejecución observada pendiente de confirmar con datos operativos (P0)'),
   ('PC Componentes y Multimedia SL','Arrendamiento de servicios 2024','PC Componentes','Fee reparación AA+Blanca','452fb3d55c9361e0','EXECUTION_OBSERVED',NULL,NULL),
   ('Jocel','Contrato 2019','Jocel','Garantía primaria','5ca8c0d08361f600','EXECUTION_OBSERVED',NULL,NULL),
   ('Neumesse SL','Contrato 2022','Neumesse','Garantía primaria','59f7c16ed41157b2','EXECUTION_OBSERVED',NULL,NULL),
   ('Sauber','Contrato 2019','Sauber','Garantía primaria','6bf861a66c2859e1','EXECUTION_OBSERVED',NULL,NULL),
   ('StreamView GmbH','ASS Agreement 2024','Thomson/StreamView','ASS agreement','044957ccbd7b27fb','EXECUTION_OBSERVED',NULL,NULL),
   ('Assurant Europe Insurance N.V.','RSA + SOW1 2023','Assurant','SOW1 e-scooters','0ec2f6283e03fbf0','EXECUTION_OBSERVED',NULL,NULL)
  ) AS x(contraparte, titulo, cliente, programa, hash, ejec, hasta, nota)
  JOIN public.ctr_contraparte_legal cp ON cp.razon_social = x.contraparte
  JOIN public.ctr_contrato k ON k.contraparte_id = cp.id AND k.titulo = x.titulo
  JOIN public.ctr_cliente c ON c.nombre_display = x.cliente
  JOIN public.ctr_programa p ON p.cliente_id = c.id AND p.nombre = x.programa
  JOIN public.ctr_documento d ON d.hash = x.hash
  ON CONFLICT (contrato_id, programa_id) DO NOTHING;

  -- relaciones entre instrumentos (0 'sustituye')
  INSERT INTO public.ctr_contrato_relacion (carga_id, origen_id, destino_id, tipo, doc_id)
  SELECT v_carga, ko.id, kd.id, x.tipo, d.id
  FROM (VALUES
   ('Cecotec Innovaciones SLU','Adenda nº1 2025','Cecotec Innovaciones SLU','Contrato SAT 2022','adenda_de','da30ad489dd17af4'),
   ('Vestel','Contrato colaboración 2022','Vestel','Contrato SAT 2022','depende_de','27a5f68218e04599')
  ) AS x(cp_o, tit_o, cp_d, tit_d, tipo, hash)
  JOIN public.ctr_contraparte_legal co ON co.razon_social = x.cp_o
  JOIN public.ctr_contrato ko ON ko.contraparte_id = co.id AND ko.titulo = x.tit_o
  JOIN public.ctr_contraparte_legal cd ON cd.razon_social = x.cp_d
  JOIN public.ctr_contrato kd ON kd.contraparte_id = cd.id AND kd.titulo = x.tit_d
  JOIN public.ctr_documento d ON d.hash = x.hash
  ON CONFLICT (origen_id, destino_id, tipo) DO NOTHING;

  SELECT count(*) INTO n_i FROM public.ctr_contrato;
  SELECT count(*) INTO n_cv FROM public.ctr_contrato WHERE estado_evidencia='CONTRACTUAL_VALIDATED';
  SELECT count(*) INTO n_bad_tipo FROM public.ctr_contrato k
    JOIN public.ctr_instrumento_documento i ON i.contrato_id = k.id AND i.tipo_relacion='principal'
    JOIN public.ctr_documento d ON d.id = i.doc_id
   WHERE d.tipo_documental IN ('tender','oferta','pliego','plantilla_contrato');
  SELECT count(*) INTO n_alc FROM public.ctr_contrato_alcance;
  SELECT count(*) INTO n_doc FROM public.ctr_instrumento_documento;
  SELECT count(*) INTO n_rel FROM public.ctr_contrato_relacion;

  IF n_i <> 19 OR n_cv <> 0 OR n_bad_tipo <> 0 OR n_alc <> 19 OR n_doc <> 28 OR n_rel <> 2 THEN
    RAISE EXCEPTION 'M-06 VERIFICACIÓN FALLIDA: instrumentos=% (19), CV=% (0), principales_tender=% (0), alcances=% (19), vinculos_doc=% (28), relaciones=% (2)',
      n_i, n_cv, n_bad_tipo, n_alc, n_doc, n_rel;
  END IF;
  RAISE NOTICE 'M-06 OK: instrumentos=% alcances=% vinculos=% relaciones=%', n_i, n_alc, n_doc, n_rel;
END $$;