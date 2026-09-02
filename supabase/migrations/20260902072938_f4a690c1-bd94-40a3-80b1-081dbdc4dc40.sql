-- ============================================================================
-- SLA-E1 · PROFESSIONAL BATCH 1 · parte 1/2 · representación gobernada
-- Autorización: GO Dirección 02-09-2026 (A,B,C,D)
-- ============================================================================

-- (0) CARGA -----------------------------------------------------------------
INSERT INTO public.ctr_carga (id, origen, artefacto_ref, loaded_by_nombre, estado, notas)
VALUES ('7a1e0001-0000-4000-8000-000000000001', 'manual', 'SLA-E1-professional-batch-1',
        'Direccion (GO SLA-E1 02-09-2026)', 'ok',
        'Representacion gobernada de MAK-01/MAK-02/MET-01/MET-02, calendario laboral nacional ES/PT y mappings de eventos temporales.');

-- (1) CALENDARIO LABORAL · esquema ------------------------------------------
ALTER TABLE public.ops_calendario_laboral
  ADD COLUMN IF NOT EXISTS pais          text,
  ADD COLUMN IF NOT EXISTS tipo_festivo  text,
  ADD COLUMN IF NOT EXISTS laborable     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version_carga text,
  ADD COLUMN IF NOT EXISTS carga_id      uuid REFERENCES public.ctr_carga(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ops_calendario_territorio_fecha
  ON public.ops_calendario_laboral (territorio, fecha);

-- (2) CALENDARIO LABORAL · festivos nacionales ES (BOE) y PT (CT art.234) ----
INSERT INTO public.ops_calendario_laboral
  (pais, territorio, ambito, fecha, descripcion, tipo_festivo, laborable, fuente, version_carga, carga_id, vigencia_desde, vigencia_hasta)
SELECT v.pais, v.territorio, 'nacional', v.fecha::date, v.descripcion, 'festivo_nacional', false, v.fuente,
       'SLA-E1-v1', '7a1e0001-0000-4000-8000-000000000001', NULL, NULL
FROM (VALUES
  -- ESPAÑA 2025 · BOE Resolucion calendario laboral 2025 (fiestas nacionales)
  ('ES','ES','2025-01-01','Ano Nuevo','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-01-06','Epifania del Senor','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-04-18','Viernes Santo','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-05-01','Fiesta del Trabajo','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-08-15','Asuncion de la Virgen','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-10-12','Fiesta Nacional de Espana','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-11-01','Todos los Santos','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-12-06','Dia de la Constitucion','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-12-08','Inmaculada Concepcion','BOE calendario laboral nacional 2025'),
  ('ES','ES','2025-12-25','Natividad del Senor','BOE calendario laboral nacional 2025'),
  -- ESPAÑA 2026
  ('ES','ES','2026-01-01','Ano Nuevo','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-01-06','Epifania del Senor','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-04-03','Viernes Santo','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-05-01','Fiesta del Trabajo','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-08-15','Asuncion de la Virgen','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-10-12','Fiesta Nacional de Espana','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-11-01','Todos los Santos','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-12-08','Inmaculada Concepcion','BOE calendario laboral nacional 2026'),
  ('ES','ES','2026-12-25','Natividad del Senor','BOE calendario laboral nacional 2026'),
  -- PORTUGAL 2025 · Codigo do Trabalho art. 234 (feriados obrigatorios)
  ('PT','PT','2025-01-01','Ano Novo','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-04-18','Sexta-feira Santa','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-04-20','Domingo de Pascoa','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-04-25','Dia da Liberdade','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-05-01','Dia do Trabalhador','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-06-10','Dia de Portugal','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-06-19','Corpo de Deus','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-08-15','Assuncao de Nossa Senhora','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-10-05','Implantacao da Republica','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-11-01','Todos os Santos','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-12-01','Restauracao da Independencia','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-12-08','Imaculada Conceicao','Codigo do Trabalho art.234 (PT) 2025'),
  ('PT','PT','2025-12-25','Natal','Codigo do Trabalho art.234 (PT) 2025'),
  -- PORTUGAL 2026
  ('PT','PT','2026-01-01','Ano Novo','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-04-03','Sexta-feira Santa','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-04-05','Domingo de Pascoa','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-04-25','Dia da Liberdade','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-05-01','Dia do Trabalhador','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-06-04','Corpo de Deus','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-06-10','Dia de Portugal','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-08-15','Assuncao de Nossa Senhora','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-10-05','Implantacao da Republica','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-11-01','Todos os Santos','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-12-01','Restauracao da Independencia','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-12-08','Imaculada Conceicao','Codigo do Trabalho art.234 (PT) 2026'),
  ('PT','PT','2026-12-25','Natal','Codigo do Trabalho art.234 (PT) 2026')
) AS v(pais, territorio, fecha, descripcion, fuente)
ON CONFLICT (territorio, fecha) DO NOTHING;

-- (3) MAPPINGS GOBERNADOS DE EVENTOS TEMPORALES ------------------------------
CREATE TABLE IF NOT EXISTS public.ctr_mapping_evento_temporal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  carga_id      uuid REFERENCES public.ctr_carga(id),
  programa_id   uuid NOT NULL REFERENCES public.ctr_programa(id),
  evento        text NOT NULL,
  rol_evento    text NOT NULL CHECK (rol_evento IN ('START','END')),
  pipeline      text NOT NULL,
  campo_erp     text NOT NULL CHECK (campo_erp IN ('fecha_creacion','fecha_primer_contacto','fecha_primera_visita')),
  grado         text NOT NULL CHECK (grado IN ('DETERMINISTIC','GOVERNED','PROXY','NOT_AVAILABLE')),
  estado        text NOT NULL DEFAULT 'APPROVED' CHECK (estado IN ('PROPOSED','APPROVED','SUPERSEDED')),
  granularidad  text NOT NULL DEFAULT 'date' CHECK (granularidad IN ('date','timestamp')),
  evidencia_ref text NOT NULL,
  procedencia   text NOT NULL,
  notas         text
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ctr_mapping_evento_vigente
  ON public.ctr_mapping_evento_temporal (programa_id, evento)
  WHERE estado = 'APPROVED';

REVOKE ALL ON public.ctr_mapping_evento_temporal FROM PUBLIC, anon;
GRANT SELECT ON public.ctr_mapping_evento_temporal TO authenticated;
GRANT ALL    ON public.ctr_mapping_evento_temporal TO service_role;
ALTER TABLE public.ctr_mapping_evento_temporal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mgmt_read_ctr_mapping_evento_temporal ON public.ctr_mapping_evento_temporal;
CREATE POLICY mgmt_read_ctr_mapping_evento_temporal
  ON public.ctr_mapping_evento_temporal FOR SELECT TO authenticated
  USING (public.is_management());

INSERT INTO public.ctr_mapping_evento_temporal
  (carga_id, programa_id, evento, rol_evento, pipeline, campo_erp, grado, granularidad, evidencia_ref, procedencia, notas)
VALUES
  ('7a1e0001-0000-4000-8000-000000000001','cb6419c5-6170-4d05-bee4-66554ade6729',
   'start_captura_aviso_wg','START','MAKRO_WG_DIRECT_CAPTURE','fecha_creacion','GOVERNED','date',
   '04_PROFESSIONAL_MAKRO_Contrato_2022.pdf + definicion de campo fuente ops_fact_ot.fecha_creacion',
   'Management SLA-E1 (02-09-2026)',
   'Front office WG_DIRECT: el aviso Makro se captura directamente en WG, por lo que la fecha de alta de la OT es el evento de recepcion contractual. Granularidad fecha (sin hora).'),
  ('7a1e0001-0000-4000-8000-000000000001','c04eb914-1ef1-4d53-b04f-5deb2256071c',
   'start_recepcion_aviso_transferido','START','METRO_FRONT_OFFICE_TRANSFER','fecha_creacion','GOVERNED','date',
   '04_PROFESSIONAL_METROMARKETS_Contrato_2025.pdf + definicion de campo fuente ops_fact_ot.fecha_creacion',
   'Management SLA-E1 (02-09-2026)',
   'Front office CLIENT_FRONT_OFFICE: Metro atiende al cliente final y transfiere el aviso; el alta en WG marca la recepcion. El tiempo previo a la transferencia NO es observable ni imputable a WG. Pipeline distinto al de Makro aunque el campo coincida.'),
  ('7a1e0001-0000-4000-8000-000000000001','cb6419c5-6170-4d05-bee4-66554ade6729',
   'end_primer_contacto','END','WG_OPERATIVO','fecha_primer_contacto','DETERMINISTIC','date',
   'ops_fact_ot.fecha_primer_contacto (campo dedicado del evento)','Management SLA-E1 (02-09-2026)',
   'Campo dedicado al evento de primer contacto. Granularidad fecha: suficiente para el umbral normalizado en dias laborables.'),
  ('7a1e0001-0000-4000-8000-000000000001','c04eb914-1ef1-4d53-b04f-5deb2256071c',
   'end_primer_contacto','END','WG_OPERATIVO','fecha_primer_contacto','DETERMINISTIC','date',
   'ops_fact_ot.fecha_primer_contacto (campo dedicado del evento)','Management SLA-E1 (02-09-2026)',
   'Campo dedicado al evento de primer contacto. Granularidad fecha.'),
  ('7a1e0001-0000-4000-8000-000000000001','cb6419c5-6170-4d05-bee4-66554ade6729',
   'end_primera_visita','END','WG_OPERATIVO','fecha_primera_visita','DETERMINISTIC','date',
   'ops_fact_ot.fecha_primera_visita (campo dedicado del evento)','Management SLA-E1 (02-09-2026)',
   'Campo dedicado al evento de primera visita. Granularidad fecha.'),
  ('7a1e0001-0000-4000-8000-000000000001','c04eb914-1ef1-4d53-b04f-5deb2256071c',
   'end_primera_visita','END','WG_OPERATIVO','fecha_primera_visita','DETERMINISTIC','date',
   'ops_fact_ot.fecha_primera_visita (campo dedicado del evento)','Management SLA-E1 (02-09-2026)',
   'Campo dedicado al evento de primera visita. Granularidad fecha.')
ON CONFLICT DO NOTHING;

-- (4) CLAIMS (literal contractual, estado PENDING) ---------------------------
INSERT INTO public.ctr_claim
  (id, carga_id, doc_id, contrato_id, programa_id, categoria, enunciado, valor_estructurado, ref_pagina, estado, extraido_por, notas)
VALUES
  ('7a1e0002-0000-4000-8000-000000000001','7a1e0001-0000-4000-8000-000000000001',
   'f1dbfc25-4f34-4665-a8bb-ae9f7692bceb','e2ec13c0-c31b-4928-83cf-c223165c8d1d','cb6419c5-6170-4d05-bee4-66554ade6729',
   'sla','MAK-01 · Primer contacto con el cliente en un plazo maximo de 8 horas laborables desde la recepcion del aviso.',
   '{"codigo":"MAK-01","literal_contractual":"contacto cliente <=8 horas laborables","umbral_valor":8,"umbral_unidad":"horas_laborables","evento_inicio_literal":"recepcion del aviso","evento_fin_literal":"primer contacto con el cliente","fuente":"Contrato Makro 2022 Anexo IV"}'::jsonb,
   'Anexo IV','PENDING','SLA-E1 (Direccion 02-09-2026)',
   'Literal contractual preservado. La normalizacion WG (8h laborables -> T+1 working day) se representa exclusivamente en la regla, no en el claim.'),
  ('7a1e0002-0000-4000-8000-000000000002','7a1e0001-0000-4000-8000-000000000001',
   'f1dbfc25-4f34-4665-a8bb-ae9f7692bceb','e2ec13c0-c31b-4928-83cf-c223165c8d1d','cb6419c5-6170-4d05-bee4-66554ade6729',
   'sla','MAK-02 · Primera visita en un plazo maximo de 32 horas laborables desde la creacion/apertura de la OT.',
   '{"codigo":"MAK-02","literal_contractual":"primera visita <=32 horas laborables desde creacion/apertura OT","umbral_valor":32,"umbral_unidad":"horas_laborables","evento_inicio_literal":"creacion/apertura de la OT","evento_fin_literal":"primera visita","fuente":"Contrato Makro 2022 Anexo IV"}'::jsonb,
   'Anexo IV','PENDING','SLA-E1 (Direccion 02-09-2026)',
   'Literal contractual preservado. Normalizacion WG (32h laborables -> T+4 working days) representada solo en la regla.'),
  ('7a1e0002-0000-4000-8000-000000000003','7a1e0001-0000-4000-8000-000000000001',
   '5a8d794f-a259-495a-a6e9-c348eb338778','3283ccee-5c26-4710-b153-58c2b38e91b4','c04eb914-1ef1-4d53-b04f-5deb2256071c',
   'sla','MET-01 · Primer contacto con el cliente en un plazo maximo de 8 horas laborables desde la recepcion del aviso transferido por Metro Front Office.',
   '{"codigo":"MET-01","literal_contractual":"contacto cliente <=8 horas laborables","umbral_valor":8,"umbral_unidad":"horas_laborables","evento_inicio_literal":"recepcion del aviso transferido por Metro Front Office","evento_fin_literal":"primer contacto con el cliente","fuente":"Metro Markets 2025 Annex IV"}'::jsonb,
   'Annex IV','PENDING','SLA-E1 (Direccion 02-09-2026)',
   'Literal contractual preservado. Front office de cliente: el reloj WG arranca en la recepcion del aviso transferido.'),
  ('7a1e0002-0000-4000-8000-000000000004','7a1e0001-0000-4000-8000-000000000001',
   '5a8d794f-a259-495a-a6e9-c348eb338778','3283ccee-5c26-4710-b153-58c2b38e91b4','c04eb914-1ef1-4d53-b04f-5deb2256071c',
   'sla','MET-02 · Primera visita en un plazo maximo de 32 horas laborables desde la creacion/apertura de la OT.',
   '{"codigo":"MET-02","literal_contractual":"primera visita <=32 horas laborables desde creacion/apertura OT","umbral_valor":32,"umbral_unidad":"horas_laborables","evento_inicio_literal":"creacion/apertura de la OT","evento_fin_literal":"primera visita","fuente":"Metro Markets 2025 Annex IV"}'::jsonb,
   'Annex IV','PENDING','SLA-E1 (Direccion 02-09-2026)',
   'Literal contractual preservado. Normalizacion WG (32h laborables -> T+4 working days) representada solo en la regla.');

-- (5) REGLAS NORMALIZADAS ----------------------------------------------------
INSERT INTO public.ctr_regla_definicion (id, carga_id, codigo, nombre, categoria) VALUES
  ('7a1e0003-0000-4000-8000-000000000001','7a1e0001-0000-4000-8000-000000000001','R_SLA_MAK_01','Makro HORECA · primer contacto T+1 dia laborable','sla'),
  ('7a1e0003-0000-4000-8000-000000000002','7a1e0001-0000-4000-8000-000000000001','R_SLA_MAK_02','Makro HORECA · primera visita T+4 dias laborables','sla'),
  ('7a1e0003-0000-4000-8000-000000000003','7a1e0001-0000-4000-8000-000000000001','R_SLA_MET_01','Metro Markets · primer contacto T+1 dia laborable','sla'),
  ('7a1e0003-0000-4000-8000-000000000004','7a1e0001-0000-4000-8000-000000000001','R_SLA_MET_02','Metro Markets · primera visita T+4 dias laborables','sla');

INSERT INTO public.ctr_regla_version (id, carga_id, regla_id, version, parametros, unidad, calendario_requerido, fase, claim_id) VALUES
  ('7a1e0004-0000-4000-8000-000000000001','7a1e0001-0000-4000-8000-000000000001','7a1e0003-0000-4000-8000-000000000001',1,
   '{"start_event":"start_captura_aviso_wg","end_event":"end_primer_contacto","deadline_dias":1,"deadline_unidad":"dias_laborables","calendar_type":"ES_NACIONAL","territorio":"ES","front_office":"WG_DIRECT","pipeline_start":"MAKRO_WG_DIRECT_CAPTURE","literal_umbral":"8 horas laborables","normalizacion":"8 horas laborables -> T+1 working day (decision Management SLA-E1 02-09-2026)","dia_inicio_no_cuenta":true}'::jsonb,
   'dias_laborables', true, 'ejecucion','7a1e0002-0000-4000-8000-000000000001'),
  ('7a1e0004-0000-4000-8000-000000000002','7a1e0001-0000-4000-8000-000000000001','7a1e0003-0000-4000-8000-000000000002',1,
   '{"start_event":"start_captura_aviso_wg","end_event":"end_primera_visita","deadline_dias":4,"deadline_unidad":"dias_laborables","calendar_type":"ES_NACIONAL","territorio":"ES","front_office":"WG_DIRECT","pipeline_start":"MAKRO_WG_DIRECT_CAPTURE","literal_umbral":"32 horas laborables","normalizacion":"32 horas laborables -> T+4 working days (decision Management SLA-E1 02-09-2026)","dia_inicio_no_cuenta":true}'::jsonb,
   'dias_laborables', true, 'ejecucion','7a1e0002-0000-4000-8000-000000000002'),
  ('7a1e0004-0000-4000-8000-000000000003','7a1e0001-0000-4000-8000-000000000001','7a1e0003-0000-4000-8000-000000000003',1,
   '{"start_event":"start_recepcion_aviso_transferido","end_event":"end_primer_contacto","deadline_dias":1,"deadline_unidad":"dias_laborables","calendar_type":"ES_NACIONAL","territorio":"ES","front_office":"CLIENT_FRONT_OFFICE","pipeline_start":"METRO_FRONT_OFFICE_TRANSFER","literal_umbral":"8 horas laborables","normalizacion":"8 horas laborables -> T+1 working day (decision Management SLA-E1 02-09-2026)","dia_inicio_no_cuenta":true}'::jsonb,
   'dias_laborables', true, 'ejecucion','7a1e0002-0000-4000-8000-000000000003'),
  ('7a1e0004-0000-4000-8000-000000000004','7a1e0001-0000-4000-8000-000000000001','7a1e0003-0000-4000-8000-000000000004',1,
   '{"start_event":"start_recepcion_aviso_transferido","end_event":"end_primera_visita","deadline_dias":4,"deadline_unidad":"dias_laborables","calendar_type":"ES_NACIONAL","territorio":"ES","front_office":"CLIENT_FRONT_OFFICE","pipeline_start":"METRO_FRONT_OFFICE_TRANSFER","literal_umbral":"32 horas laborables","normalizacion":"32 horas laborables -> T+4 working days (decision Management SLA-E1 02-09-2026)","dia_inicio_no_cuenta":true}'::jsonb,
   'dias_laborables', true, 'ejecucion','7a1e0002-0000-4000-8000-000000000004');

-- (6) SCOPE + PREDICADO DE PROGRAMA -----------------------------------------
INSERT INTO public.ctr_regla_aplicabilidad_scope (id, carga_id, regla_version_id, version, effective_from, effective_to, estado_gobernanza, claim_id, notas) VALUES
  ('7a1e0005-0000-4000-8000-000000000001','7a1e0001-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000001',1,'2022-01-01',NULL,'APPROVED','7a1e0002-0000-4000-8000-000000000001','Scope = programa Makro HORECA'),
  ('7a1e0005-0000-4000-8000-000000000002','7a1e0001-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000002',1,'2022-01-01',NULL,'APPROVED','7a1e0002-0000-4000-8000-000000000002','Scope = programa Makro HORECA'),
  ('7a1e0005-0000-4000-8000-000000000003','7a1e0001-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000003',1,'2025-01-01',NULL,'APPROVED','7a1e0002-0000-4000-8000-000000000003','Scope = programa Metro Markets marketplace'),
  ('7a1e0005-0000-4000-8000-000000000004','7a1e0001-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000004',1,'2025-01-01',NULL,'APPROVED','7a1e0002-0000-4000-8000-000000000004','Scope = programa Metro Markets marketplace');

INSERT INTO public.ctr_regla_aplicabilidad_predicado (carga_id, scope_id, dimension, operador, valor, incluir, orden, fuente_evidencia) VALUES
  ('7a1e0001-0000-4000-8000-000000000001','7a1e0005-0000-4000-8000-000000000001','programa','igual','"cb6419c5-6170-4d05-bee4-66554ade6729"'::jsonb,true,1,'ctr_contrato_alcance Makro 2022'),
  ('7a1e0001-0000-4000-8000-000000000001','7a1e0005-0000-4000-8000-000000000002','programa','igual','"cb6419c5-6170-4d05-bee4-66554ade6729"'::jsonb,true,1,'ctr_contrato_alcance Makro 2022'),
  ('7a1e0001-0000-4000-8000-000000000001','7a1e0005-0000-4000-8000-000000000003','programa','igual','"c04eb914-1ef1-4d53-b04f-5deb2256071c"'::jsonb,true,1,'ctr_contrato_alcance Metro Markets 2025'),
  ('7a1e0001-0000-4000-8000-000000000001','7a1e0005-0000-4000-8000-000000000004','programa','igual','"c04eb914-1ef1-4d53-b04f-5deb2256071c"'::jsonb,true,1,'ctr_contrato_alcance Metro Markets 2025');

-- (7) ASSESSMENT DE REQUISITOS (REVIEWED_ZERO) -------------------------------
INSERT INTO public.ctr_regla_requisitos_assessment
  (regla_version_id, version, estado_revision, actor_id, actor_nombre, actor_rol, justificacion, evidencia_ref, carga_id, vigente)
SELECT rv, 1, 'REVIEWED_ZERO',
  'f2840a10-d660-4adc-8854-11f947423fb9',
  'Direccion (GO SLA-E1 02-09-2026) · registro tecnico bajo id de Gonzalo Torres',
  'direccion',
  'Parametros revisados uno a uno: start_event, end_event, deadline_dias, calendar_type y territorio. La clausula fija un plazo unico para todo el programa y no distingue gama, familia, marca, canal ni geografia. No se requiere ninguna dimension adicional al programa.',
  'GO SLA-E1 · parametros de la rule version', '7a1e0001-0000-4000-8000-000000000001', true
FROM unnest(ARRAY['7a1e0004-0000-4000-8000-000000000001','7a1e0004-0000-4000-8000-000000000002','7a1e0004-0000-4000-8000-000000000003','7a1e0004-0000-4000-8000-000000000004']::uuid[]) AS rv;

-- (8) ACTOS DE GOBIERNO ------------------------------------------------------
INSERT INTO public.ctr_acto_gobierno
  (carga_id, objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo, actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo, fuente_procedencia)
SELECT '7a1e0001-0000-4000-8000-000000000001', v.tipo, v.oid::uuid, v.accion, v.ant, v.nue,
       'f2840a10-d660-4adc-8854-11f947423fb9',
       'Direccion (GO SLA-E1 02-09-2026) · registro tecnico bajo id de Gonzalo Torres','direccion',
       v.evi, v.motivo, 'Management SLA-E1 (02-09-2026)'
FROM (VALUES
  ('claim','7a1e0002-0000-4000-8000-000000000001','solicitud_evidencia',NULL,'PENDING','04_PROFESSIONAL_MAKRO_Contrato_2022.pdf, Anexo IV','Alta del claim MAK-01. Pendiente de validacion por contractual_validator.'),
  ('claim','7a1e0002-0000-4000-8000-000000000002','solicitud_evidencia',NULL,'PENDING','04_PROFESSIONAL_MAKRO_Contrato_2022.pdf, Anexo IV','Alta del claim MAK-02. Pendiente de validacion por contractual_validator.'),
  ('claim','7a1e0002-0000-4000-8000-000000000003','solicitud_evidencia',NULL,'PENDING','04_PROFESSIONAL_METROMARKETS_Contrato_2025.pdf, Annex IV','Alta del claim MET-01. Pendiente de validacion por contractual_validator.'),
  ('claim','7a1e0002-0000-4000-8000-000000000004','solicitud_evidencia',NULL,'PENDING','04_PROFESSIONAL_METROMARKETS_Contrato_2025.pdf, Annex IV','Alta del claim MET-02. Pendiente de validacion por contractual_validator.'),
  ('regla_version','7a1e0004-0000-4000-8000-000000000001','declaracion_requisitos',NULL,'REVIEWED_ZERO','Parametros de la rule version R_SLA_MAK_01 v1','Normalizacion WG 8h laborables -> T+1 working day.'),
  ('regla_version','7a1e0004-0000-4000-8000-000000000002','declaracion_requisitos',NULL,'REVIEWED_ZERO','Parametros de la rule version R_SLA_MAK_02 v1','Normalizacion WG 32h laborables -> T+4 working days.'),
  ('regla_version','7a1e0004-0000-4000-8000-000000000003','declaracion_requisitos',NULL,'REVIEWED_ZERO','Parametros de la rule version R_SLA_MET_01 v1','Normalizacion WG 8h laborables -> T+1 working day. Pipeline START distinto (front office de cliente).'),
  ('regla_version','7a1e0004-0000-4000-8000-000000000004','declaracion_requisitos',NULL,'REVIEWED_ZERO','Parametros de la rule version R_SLA_MET_02 v1','Normalizacion WG 32h laborables -> T+4 working days.'),
  ('mapeo_identidad','cb6419c5-6170-4d05-bee4-66554ade6729','override',NULL,'GOVERNED','Definicion de campo fuente ops_fact_ot.fecha_creacion + contrato Makro 2022','Mapping START Makro: fecha_creacion = captura del aviso por WG (front office WG_DIRECT).'),
  ('mapeo_identidad','c04eb914-1ef1-4d53-b04f-5deb2256071c','override',NULL,'GOVERNED','Definicion de campo fuente ops_fact_ot.fecha_creacion + contrato Metro Markets 2025','Mapping START Metro: fecha_creacion = recepcion en WG del aviso transferido por Metro Front Office.')
) AS v(tipo,oid,accion,ant,nue,evi,motivo);
