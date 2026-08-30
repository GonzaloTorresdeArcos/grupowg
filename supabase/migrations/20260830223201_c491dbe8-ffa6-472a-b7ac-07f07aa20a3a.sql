-- =====================================================================
-- I1 · M-04 DOCUMENTOS (43 fichas, bootstrap FH-2 sin CONTRACTUAL_VALIDATED)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ctr_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  fichero text NOT NULL,
  hash text NOT NULL UNIQUE,
  tipo_documental text NOT NULL CHECK (tipo_documental IN ('tender','pliego','oferta','plantilla_contrato','contrato','adenda','sow','anexo_sla','anexo_tarifas','anexo_productos','comunicacion_operativa','tarifa_revision','guia_operativa','maestro_producto','due_diligence','cotizacion','cgc')),
  fecha_documento date,
  firmado_verificado text NOT NULL CHECK (firmado_verificado IN ('si','no','parcial','na')),
  metodo_firma text CHECK (metodo_firma IN ('docusign','ades','manuscrita','sello','na')),
  firma_ref text,
  estado_evidencia text NOT NULL CHECK (estado_evidencia IN ('UNKNOWN_PENDING_SOURCE','PROPOSAL_ONLY','INTERNAL_WG_TARGET','OPERATIONALLY_AGREED','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','CONTRACTUAL_VALIDATED')),
  ocr_estado text NOT NULL CHECK (ocr_estado IN ('texto_nativo','ocr_parcial','ocr_total','ilegible')),
  paginas integer,
  idioma text,
  notas text
);

DROP TRIGGER IF EXISTS ctr_documento_no_cv_insert ON public.ctr_documento;
CREATE TRIGGER ctr_documento_no_cv_insert
  BEFORE INSERT ON public.ctr_documento
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_no_cv_en_insert();

DROP TRIGGER IF EXISTS ctr_documento_candado ON public.ctr_documento;
CREATE TRIGGER ctr_documento_candado
  BEFORE UPDATE ON public.ctr_documento
  FOR EACH ROW EXECUTE FUNCTION public.ctr_trg_estado_evidencia_candado();

ALTER TABLE public.ctr_documento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ctr_documento FROM PUBLIC;
REVOKE ALL ON public.ctr_documento FROM anon;
REVOKE ALL ON public.ctr_documento FROM authenticator;
GRANT SELECT ON public.ctr_documento TO authenticated;
REVOKE UPDATE (estado_evidencia) ON public.ctr_documento FROM authenticated;
GRANT ALL ON public.ctr_documento TO service_role;
REVOKE UPDATE (estado_evidencia) ON public.ctr_documento FROM service_role;
GRANT SELECT, UPDATE ON public.ctr_documento TO ctr_gobierno_owner;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ctr_documento' AND policyname='mgmt_select') THEN
    CREATE POLICY mgmt_select ON public.ctr_documento FOR SELECT TO authenticated
      USING (public.is_management(auth.uid()));
  END IF;
END $$;

DO $$
DECLARE v_carga uuid; n int; n_cv int;
BEGIN
  INSERT INTO public.ctr_carga (origen, artefacto_ref, plantilla_version, loaded_by_nombre, estado, notas)
  VALUES ('semilla_documental','I1/M-04 corpus documental','I1 v1.2 FINAL','I1 executor (Claude/agent)','ok',
          'Corpus documental I1: 43 ficheros tras excluir Overview e índice')
  ON CONFLICT (origen, artefacto_ref) DO NOTHING;
  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='semilla_documental' AND artefacto_ref='I1/M-04 corpus documental';

  INSERT INTO public.ctr_documento (carga_id, hash, fichero, tipo_documental, fecha_documento, firmado_verificado, metodo_firma, estado_evidencia, ocr_estado)
  SELECT v_carga, x.hash, x.fichero, x.tipo, x.fecha, x.firmado, x.metodo, x.estado, x.ocr
  FROM (VALUES
   ('c5fe4eb78a5f48b2','01_RETAIL-AFTER-SALES_CARREFOUR_Condiciones-Generales-Contratacion.doc','cgc',NULL::date,'na','na','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('396c57f8188a21e7','01_RETAILAFTERSALES_CARREFOUR_OfertaPrimasServicio_Tender2026.xlsx','oferta','2026-01-01','na','na','PROPOSAL_ONLY','texto_nativo'),
   ('02b1ce382e878324','01_RETAILAFTERSALES_CARREFOUR_ProcedimientoFacturacionAcreedores_2026.pdf','guia_operativa','2026-02-16','na','na','OPERATIONALLY_AGREED','ocr_parcial'),
   ('69bec5efd0dada0f','01_RETAIL_AUCHANALCAMPO_Contrato_2019.pdf','contrato','2019-01-01','parcial','manuscrita','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('c7298a4020bffa59','01_RETAIL_AUCHANALCAMPO_Contrato_2023.pdf','contrato','2023-03-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('80f5b21e7961ac6f','01_RETAIL_CARREFOUR_AnexoServiciosSLA_Tender2026.pdf','anexo_sla','2026-01-01','na','na','PROPOSAL_ONLY','texto_nativo'),
   ('ddec60a13a14500c','01_RETAIL_CARREFOUR_Modelo-Contrato-SAT-Electro-Bazar_Tender-2026.docx','plantilla_contrato','2026-01-01','na','na','PROPOSAL_ONLY','texto_nativo'),
   ('d948ef946465347e','01_RETAIL_CARREFOUR_PliegoSATElectrodomesticos_Tender2026.pdf','pliego','2026-01-01','na','na','PROPOSAL_ONLY','texto_nativo'),
   ('11f114c8c10c53c5','01_RETAIL_CECOTEC_Contrato_2022.pdf','contrato','2022-11-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('92950e456237ec6e','01_RETAIL_ELECTRODEPOT_Contrato_2020.pdf','oferta','2020-01-01','no',NULL,'UNKNOWN_PENDING_SOURCE','ocr_parcial'),
   ('5ca8c0d08361f600','01_RETAIL_JOCEL_Contrato_2019.pdf','contrato','2019-03-07','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('ab28602812178742','01_RETAIL_JOCEL_MaestroProductos.xlsx','maestro_producto',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('3bb3034115f8d7a0','01_RETAIL_JOCEL_OfertaComercial_2025.pdf','oferta','2025-08-14','no',NULL,'PROPOSAL_ONLY','texto_nativo'),
   ('59f7c16ed41157b2','01_RETAIL_NEUMESSE_Contrato_2022.pdf','contrato','2022-02-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('506ba72bea9fa590','01_RETAIL_NEUMESSE_MaestroProductos.xlsx','maestro_producto',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('452fb3d55c9361e0','01_RETAIL_PCCOMPONENTES_ContratoFeeReparacion_2024.pdf','contrato','2024-01-19','si','ades','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('8ddee396914022c2','01_RETAIL_PCCOMPONENTES_MaestroProductos.xlsx','maestro_producto',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('a5c821cc43e7c1e7','01_RETAIL_PCCOMPONENTES_TarifasPrimasServicio_2023.pdf','oferta','2023-01-01','parcial','manuscrita','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('6bf861a66c2859e1','01_RETAIL_SAUBER_Contrato_2019.pdf','contrato','2019-01-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('044957ccbd7b27fb','01_RETAIL_ThomsonStreamView_Contrato_2024.pdf','contrato','2024-01-01','parcial','docusign','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('b79250bab113934a','01_RETAIL_ThomsonStreamView_MaestroProductos.xlsx','maestro_producto',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('dd3cd6701acc8c68','01_RETAIL_VESTEL_AnexoSLAKPI_Tender2021.xlsx','anexo_sla','2021-09-01','na','na','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('ded5d6148323babd','01_RETAIL_VESTEL_AnexoTarifas_Tender2021.xlsx','anexo_tarifas','2021-09-01','na','na','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('27a5f68218e04599','01_RETAIL_VESTEL_ContratoPostventa_HIPERSERVICE_2022.pdf','contrato','2022-02-09','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('1bbfdcab03a01863','01_RETAIL_VESTEL_ContratoPostventa_SERSEGURO_2022.pdf','contrato','2022-02-09','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('937ab0ab54a3ae20','01_RETAIL_VESTEL_ContratoSuministroRepuestos_ASURE_2022.pdf','contrato','2022-09-02','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('a979739d2252e72e','01_RETAIL_VESTEL_TarifasPostventa_2024.xlsx','tarifa_revision','2024-01-01','na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('da30ad489dd17af4','02_Mobility_Cecotec_AdendaContrato_2025.pdf','adenda','2025-12-23','si','ades','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('30b9558b5d4b3494','02_Mobility_Cecotec_Movilidad_Tarifa_2024.pdf','anexo_tarifas','2024-10-16','si','ades','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('209a2756ea9c5f69','02_Mobility_MTDistribution_Contrato_2021.pdf','contrato','2021-10-26','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('b92978888fd6c999','02_Mobility_NaveeBrightway_Contrato_2025.pdf','contrato','2025-04-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('1c26d147aeec3339','03_Climate_Carrefour_Contrato_2026.pdf','contrato','2026-01-01','parcial','docusign','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('14956910ea04702c','03_Climate_Carrefour_TarifasporCentro_2026.xlsx','anexo_tarifas','2026-01-01','na','na','CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('9aa991353a7cfb0a','03_Climate_Cecotec_Tarifas_2024.pdf','anexo_tarifas','2024-01-01','no',NULL,'OPERATIONALLY_AGREED','texto_nativo'),
   ('0f69419f8c9be8ff','03_Climate_ElectroDepot_Electro_Depot_OfertaAcuerdo_2021.pdf','oferta','2021-01-01','no',NULL,'UNKNOWN_PENDING_SOURCE','ilegible'),
   ('e5815481607acd39','03_Climate_Neumesse_OfertaAcuerdo_2023.pdf','oferta','2023-01-01','no',NULL,'PROPOSAL_ONLY','ocr_parcial'),
   ('0a4d6c54e9b94cf6','04_PROFESSIONAL_MAKRO_Contrato_2022.pdf','contrato','2022-01-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('d5735621986a9659','04_PROFESSIONAL_METROMARKETS_Contrato_2025.pdf','contrato','2025-01-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','ocr_parcial'),
   ('c6448a8f644aee00','05_INSURANCE_ASSURANT_AMAZON_SLA-KPI_Aged-Jobs.docx','comunicacion_operativa',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('fa5771a150b3216e','05_INSURANCE_ASSURANT_DueDiligence_2024.pdf','due_diligence','2024-01-01','na','na','OPERATIONALLY_AGREED','texto_nativo'),
   ('0ec2f6283e03fbf0','05_INSURANCE_ASSURANT_ESCOOTERS_RepairServicesAgreement_SOW1_2023.pdf','sow','2023-07-01','no',NULL,'CONTRACTUAL_EXTRACTED_PENDING_VALIDATION','texto_nativo'),
   ('492deb465a5753d1','Telefac_Contrato.pdf','cotizacion',NULL,'no',NULL,'PROPOSAL_ONLY','ocr_parcial'),
   ('a283ce0befc9223d','Telefac_Marca_Gama_Familia_Aparato_Modelo.xlsx','maestro_producto',NULL,'na','na','OPERATIONALLY_AGREED','texto_nativo')
  ) AS x(hash, fichero, tipo, fecha, firmado, metodo, estado, ocr)
  ON CONFLICT (hash) DO NOTHING;

  SELECT count(*) INTO n FROM public.ctr_documento;
  SELECT count(*) INTO n_cv FROM public.ctr_documento WHERE estado_evidencia = 'CONTRACTUAL_VALIDATED';
  IF n <> 43 OR n_cv <> 0 THEN
    RAISE EXCEPTION 'M-04 VERIFICACIÓN FALLIDA: documentos=% (esperado 43), CV=% (esperado 0)', n, n_cv;
  END IF;
  RAISE NOTICE 'M-04 OK: documentos=% CV=% firmados_si=%', n, n_cv,
    (SELECT count(*) FROM public.ctr_documento WHERE firmado_verificado='si');
END $$;