UPDATE public.ctr_claim
SET enunciado = 'Plazo contractual de veintiun (21) [unidad PENDIENTE de calificacion] — literal: "twenty-one (21) days". START y END no calificados documentalmente.',
    valor_estructurado = jsonb_build_object(
      'literal_fuente', 'twenty-one (21) days',
      'valor_numerico', 21,
      'unidad', 'PENDIENTE_DE_CALIFICACION',
      'start_evento', 'PENDIENTE_DE_CALIFICACION',
      'end_evento', 'PENDIENTE_DE_CALIFICACION',
      'escenario_management', jsonb_build_object(
        'regla', 'v3 MANAGEMENT_ASSUMPTION_SCENARIO',
        'supuesto', 'T+21 calendar days desde fecha_creacion hasta fecha_cierre',
        'naturaleza', 'escenario, no resultado contractual'
      ),
      'valor_estructurado_previo', jsonb_build_object('max', 21, 'unidad', 'dias_naturales')
    ),
    notas = 'SLA-E1.2 CORRECCION 1: se retira del enunciado la afirmacion "21 dias naturales para cierre". El literal se preserva como evidencia; unidad, START y END quedan expresamente PENDIENTES de calificacion documental. El claim permanece PENDING y la regla v3 (MANAGEMENT_ASSUMPTION_SCENARIO) permanece intacta.'
WHERE id = '06cb9bee-0d66-4914-970b-55c9bf690a8e';

INSERT INTO public.ctr_acto_gobierno
  (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
   actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo, fuente_procedencia)
VALUES
  ('claim', '06cb9bee-0d66-4914-970b-55c9bf690a8e', 'override', 'PENDING', 'PENDING',
   'f2840a10-d660-4adc-8854-11f947423fb9', 'Gonzalo Torres', 'contractual_validator',
   'Literal contractual "twenty-one (21) days" sin calificacion de unidad ni de hitos START/END en la fuente documental',
   'Correccion de enunciado: se retira la interpretacion "21 dias naturales para cierre"; unidad/START/END quedan PENDIENTES de calificacion. Regla v3 intacta como escenario de Management.',
   'GO SLA-E1.2 (Direccion 03-09-2026) · CORRECCION 1');

UPDATE public.ctr_gobierno_config
SET vigente = false
WHERE parametro = 'validacion_claims_aprobacion_nominal' AND vigente;

INSERT INTO public.ctr_gobierno_config (parametro, valor, version, vigente, actor_nombre)
VALUES (
  'validacion_claims_aprobacion_nominal',
  jsonb_build_object(
    'regla', 'Toda validacion de claim requiere aprobacion explicita de Management en el gate correspondiente, claim por claim o lote nombrado.',
    'prohibido', 'Reutilizar o inferir la identidad/autorizacion del validador a partir de GOs anteriores o genericos.',
    'defecto', 'Sin aprobacion nominal expresa en el pliego del gate, los claims permanecen PENDING.',
    'excepcion_documentada', jsonb_build_object(
      'gate', 'SLA-E1.1',
      'claims', jsonb_build_array('MAK-01','MAK-02','MET-01','MET-02'),
      'motivo', 'Instruccion de validacion explicita en el GO SLA-E1.1 (Direccion 03-09-2026)',
      'estado', 'RATIFICADA'
    ),
    'segregacion', 'Se mantiene proponente distinto de validador y el escalado high-risk vigente.'
  ),
  1, true, 'GO SLA-E1.2 Direccion 03-09-2026'
);

INSERT INTO public.ctr_acto_gobierno
  (objeto_tipo, objeto_id, accion, estado_anterior, estado_nuevo,
   actor_id, actor_nombre, actor_rol, evidencia_revisada, motivo, fuente_procedencia)
SELECT 'gobierno', c.id, 'override', NULL, 'vigente',
   'f2840a10-d660-4adc-8854-11f947423fb9', 'Gonzalo Torres', 'contractual_validator',
   'GO SLA-E1.2 · Correccion 2: gobierno de validaciones de claims',
   'Las futuras validaciones de claims exigen aprobacion nominal de Management en el gate; SLA-E1.1 queda ratificada como excepcion documentada.',
   'GO SLA-E1.2 (Direccion 03-09-2026) · CORRECCION 2'
FROM public.ctr_gobierno_config c
WHERE c.parametro = 'validacion_claims_aprobacion_nominal' AND c.vigente;