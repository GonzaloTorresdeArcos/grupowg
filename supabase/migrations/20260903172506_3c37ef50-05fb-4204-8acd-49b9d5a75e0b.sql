-- 1) Catálogo de campos admitidos para mapeos temporales
ALTER TABLE public.ctr_mapping_evento_temporal
  DROP CONSTRAINT ctr_mapping_evento_temporal_campo_erp_check;
ALTER TABLE public.ctr_mapping_evento_temporal
  ADD CONSTRAINT ctr_mapping_evento_temporal_campo_erp_check
  CHECK (campo_erp = ANY (ARRAY['fecha_creacion','fecha_primer_contacto','fecha_primera_visita','fecha_cierre']));

-- 2) Carga de gobierno del batch
INSERT INTO public.ctr_carga (id, origen, artefacto_ref, plantilla_version, loaded_by_nombre, estado, notas)
VALUES ('7b1e0001-0000-4000-8000-000000000001','manual','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO (Direccion 02-09-2026)','SLA-E1-batch1',
        'Direccion (GO SLA-E1 Batch 1 02-09-2026)','ok',
        'Representacion gobernada de ALC-02 y ALC-03 sobre el programa Alcampo Basic Service Agreement. Reutiliza claims 392b8f60 (VALIDATED) y 06cb9bee (PENDING) y las reglas R_I2_02 / R_I2_03 ya existentes.');

-- 3) Mappings de eventos temporales del programa Alcampo (4ee3c386)
INSERT INTO public.ctr_mapping_evento_temporal
  (id, carga_id, programa_id, evento, rol_evento, pipeline, campo_erp, grado, estado, granularidad, evidencia_ref, procedencia, notas)
VALUES
 ('7b1e0002-0000-4000-8000-000000000001','7b1e0001-0000-4000-8000-000000000001','4ee3c386-59e0-4a79-a170-7b06dc413b0e',
  'start_solicitud_servicio','START','ALCAMPO_BSA_SERVICE_REQUEST','fecha_creacion','GOVERNED','APPROVED','date',
  'doc BSA 2023 Alcampo + auditoria SLA-E0 seccion 3 (hitos capturados como date)',
  'Direccion (GO SLA-E1 Batch 1 02-09-2026)',
  'La solicitud de servicio del cliente se materializa en WG como alta de OT. Granularidad date: no hay hora. GOVERNED, no DETERMINISTIC, porque el instante de solicitud del cliente no es observable de forma independiente.'),
 ('7b1e0002-0000-4000-8000-000000000002','7b1e0001-0000-4000-8000-000000000001','4ee3c386-59e0-4a79-a170-7b06dc413b0e',
  'end_intervencion_onsite','END','ALCAMPO_BSA_ONSITE','fecha_primera_visita','DETERMINISTIC','APPROVED','date',
  'ops_fact_ot.fecha_primera_visita · campo de registro de visita efectiva',
  'Direccion (GO SLA-E1 Batch 1 02-09-2026)',
  'Fecha de la primera visita efectiva. Representa el fulfilment on-site. El mapeo del campo es determinista; la identificacion de QUE OT pertenece a la poblacion on-site NO lo es (ver poblacion_grado=PROXY en R_I2_02 v2).'),
 ('7b1e0002-0000-4000-8000-000000000003','7b1e0001-0000-4000-8000-000000000001','4ee3c386-59e0-4a79-a170-7b06dc413b0e',
  'end_cierre_resolucion','END','ALCAMPO_BSA_CLOSURE','fecha_cierre','DETERMINISTIC','APPROVED','date',
  'ops_fact_ot.fecha_cierre · campo de cierre de OT del ERP',
  'Direccion (GO SLA-E1 Batch 1 02-09-2026)',
  'Cierre administrativo de la OT en el ERP. Es el unico END observable para el cap duro de 21 dias naturales. El tratamiento de las bajas queda SIN GOBERNAR (E-10 abierta) y se reporta como doble escenario.');

-- 4) Nuevas versiones de reglas existentes (no se recrean definiciones ni claims)
INSERT INTO public.ctr_regla_version (id, carga_id, regla_id, version, parametros, unidad, calendario_requerido, fase, claim_id)
SELECT '7b1e0004-0000-4000-8000-000000000002','7b1e0001-0000-4000-8000-000000000001', rd.id, 2,
 jsonb_build_object(
   'start_event','start_solicitud_servicio','end_event','end_intervencion_onsite',
   'deadline_dias',5,'deadline_unidad','dias_laborables','dia_inicio_no_cuenta',true,
   'calendar_type','ES_NACIONAL','territorio','ES',
   'poblacion_fuente','resolucion','poblacion_filtro', jsonb_build_object('canal', jsonb_build_array('Domicilio')),
   'poblacion_grado','PROXY',
   'literal_umbral','Intervencion on-site en 5 dias laborables o menos',
   'normalizacion','<=5 dias laborables -> deadline = T+5 working days sobre calendario ES_NACIONAL, dia de solicitud no cuenta (decision Management SLA-E1 Batch 1 02-09-2026)',
   'shadow',true,
   'shadow_motivo','La identificacion de la poblacion on-site se apoya en canal=Domicilio, declarado PROXY en el workbook y no gobernado con evidencia contractual. Resultado SHADOW: no publicable.'),
 'dias_laborables', true, 'ejecucion', '392b8f60-4922-4ae8-8b08-89208776443d'
FROM public.ctr_regla_definicion rd WHERE rd.codigo='R_I2_02';

INSERT INTO public.ctr_regla_version (id, carga_id, regla_id, version, parametros, unidad, calendario_requerido, fase, claim_id)
SELECT '7b1e0004-0000-4000-8000-000000000003','7b1e0001-0000-4000-8000-000000000001', rd.id, 2,
 jsonb_build_object(
   'start_event','start_solicitud_servicio','end_event','end_cierre_resolucion',
   'deadline_dias',21,'deadline_unidad','dias_naturales','dia_inicio_no_cuenta',true,
   'calendar_type','NATURAL','territorio','ES',
   'poblacion_fuente','resolucion',
   'literal_umbral','Limite duro de 21 dias naturales para cierre',
   'normalizacion','<=21 dias naturales -> deadline = T+21 calendar days, dia de solicitud no cuenta, sin calendario laboral (decision Management SLA-E1 Batch 1 02-09-2026)',
   'baja_sin_gobernar',true,
   'baja_nota','E-10 abierta: el tratamiento de la baja como cierre/resolucion no esta gobernado. Se reportan escenarios A (baja = cierre) y B (baja excluida).'),
 'dias_naturales', false, 'ejecucion', '06cb9bee-0d66-4914-970b-55c9bf690a8e'
FROM public.ctr_regla_definicion rd WHERE rd.codigo='R_I2_03';

-- 5) Scopes de aplicabilidad (programa Alcampo)
INSERT INTO public.ctr_regla_aplicabilidad_scope (id, carga_id, regla_version_id, version, estado_gobernanza, claim_id, notas)
VALUES
 ('7b1e0005-0000-4000-8000-000000000002','7b1e0001-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000002',1,'APPROVED','392b8f60-4922-4ae8-8b08-89208776443d','Scope de programa unico: Alcampo Basic Service Agreement.'),
 ('7b1e0005-0000-4000-8000-000000000003','7b1e0001-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000003',1,'APPROVED','06cb9bee-0d66-4914-970b-55c9bf690a8e','Scope de programa unico: Alcampo Basic Service Agreement.');

INSERT INTO public.ctr_regla_aplicabilidad_predicado (carga_id, scope_id, dimension, operador, valor, incluir, orden, fuente_evidencia)
VALUES
 ('7b1e0001-0000-4000-8000-000000000001','7b1e0005-0000-4000-8000-000000000002','programa','igual', to_jsonb('4ee3c386-59e0-4a79-a170-7b06dc413b0e'::text), true, 1, 'ctr_resolucion_ot_programa · 9603 OT resueltas de forma determinista al programa'),
 ('7b1e0001-0000-4000-8000-000000000001','7b1e0005-0000-4000-8000-000000000003','programa','igual', to_jsonb('4ee3c386-59e0-4a79-a170-7b06dc413b0e'::text), true, 1, 'ctr_resolucion_ot_programa · 9603 OT resueltas de forma determinista al programa');

-- 6) Revision de dimensiones requeridas (ninguna adicional al programa)
INSERT INTO public.ctr_regla_requisitos_assessment (regla_version_id, version, estado_revision, actor_id, actor_nombre, actor_rol, justificacion, evidencia_ref, carga_id)
SELECT '7b1e0004-0000-4000-8000-000000000002',1,'REVIEWED_ZERO', a.actor_id, a.actor_nombre, a.actor_rol,
 'R_I2_02 v2 (intervencion on-site <=5 dias laborables): los parametros describen exclusivamente START, END, plazo y calendario. El subconjunto on-site NO se declara como dimension gobernada porque la unica evidencia disponible (canal) es un PROXY; se representa como filtro de poblacion marcado PROXY y el resultado es SHADOW. No se requiere ninguna dimension adicional al programa.',
 'GO Management SLA-E1 Batch 1 · auditoria de canal sobre 9603 OT Alcampo', '7b1e0001-0000-4000-8000-000000000001'
FROM (SELECT actor_id, actor_nombre, actor_rol FROM public.ctr_regla_requisitos_assessment ORDER BY ts DESC LIMIT 1) a;

INSERT INTO public.ctr_regla_requisitos_assessment (regla_version_id, version, estado_revision, actor_id, actor_nombre, actor_rol, justificacion, evidencia_ref, carga_id)
SELECT '7b1e0004-0000-4000-8000-000000000003',1,'REVIEWED_ZERO', a.actor_id, a.actor_nombre, a.actor_rol,
 'R_I2_03 v2 (cap duro <=21 dias naturales): la clausula aplica al conjunto del programa sin distinguir producto, canal, marca ni geografia. Revisados los parametros uno a uno, no se requiere ninguna dimension adicional al programa.',
 'GO Management SLA-E1 Batch 1 · lectura de parametros de la rule version', '7b1e0001-0000-4000-8000-000000000001'
FROM (SELECT actor_id, actor_nombre, actor_rol FROM public.ctr_regla_requisitos_assessment ORDER BY ts DESC LIMIT 1) a;

-- 7) Aplicabilidad registrada
INSERT INTO public.ctr_aplicabilidad (carga_id, regla_version_id, programa_id, scope_version, estado, reason_code, evaluado_en)
VALUES
 ('7b1e0001-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000002','4ee3c386-59e0-4a79-a170-7b06dc413b0e',1,'INSUFFICIENT_EVIDENCE','poblacion_on_site_proxy', now()),
 ('7b1e0001-0000-4000-8000-000000000001','7b1e0004-0000-4000-8000-000000000003','4ee3c386-59e0-4a79-a170-7b06dc413b0e',1,'INSUFFICIENT_EVIDENCE','claim_pending', now());

-- 8) Actos de gobierno
INSERT INTO public.ctr_acto_gobierno (carga_id, objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo, actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo, fuente_procedencia)
VALUES
 ('7b1e0001-0000-4000-8000-000000000001','regla_version','7b1e0004-0000-4000-8000-000000000002','declaracion_requisitos', NULL,'v2 representada','f2840a10-d660-4adc-8854-11f947423fb9','Direccion (GO SLA-E1 Batch 1)','management',
  'Claim 392b8f60 VALIDATED + R_I2_02 v1 + auditoria de canal Alcampo','Representar ALC-02 en formato evaluable sin alterar la version 1 (inmutable).','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO 02-09-2026'),
 ('7b1e0001-0000-4000-8000-000000000001','regla_version','7b1e0004-0000-4000-8000-000000000003','declaracion_requisitos', NULL,'v2 representada','f2840a10-d660-4adc-8854-11f947423fb9','Direccion (GO SLA-E1 Batch 1)','management',
  'Claim 06cb9bee PENDING + R_I2_03 v1','Representar ALC-03 en formato evaluable. El claim permanece PENDING: resultado CANDIDATE, no publicable.','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO 02-09-2026'),
 ('7b1e0001-0000-4000-8000-000000000001','mapeo_identidad','7b1e0002-0000-4000-8000-000000000001','validacion', NULL,'APPROVED','f2840a10-d660-4adc-8854-11f947423fb9','Direccion (GO SLA-E1 Batch 1)','management',
  'BSA 2023 Alcampo + auditoria SLA-E0','Mapping START gobernado para el programa Alcampo.','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO 02-09-2026'),
 ('7b1e0001-0000-4000-8000-000000000001','mapeo_identidad','7b1e0002-0000-4000-8000-000000000002','validacion', NULL,'APPROVED','f2840a10-d660-4adc-8854-11f947423fb9','Direccion (GO SLA-E1 Batch 1)','management',
  'ops_fact_ot.fecha_primera_visita','Mapping END on-site. Poblacion on-site NO gobernada (PROXY).','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO 02-09-2026'),
 ('7b1e0001-0000-4000-8000-000000000001','mapeo_identidad','7b1e0002-0000-4000-8000-000000000003','validacion', NULL,'APPROVED','f2840a10-d660-4adc-8854-11f947423fb9','Direccion (GO SLA-E1 Batch 1)','management',
  'ops_fact_ot.fecha_cierre','Mapping END de cierre/resolucion para el cap de 21 dias naturales.','GO MANAGEMENT SLA-E1 BATCH 1 DEFINITIVO 02-09-2026');