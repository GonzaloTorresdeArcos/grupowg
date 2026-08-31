BEGIN;

ALTER TABLE public.ctr_acto_gobierno DROP CONSTRAINT ctr_acto_gobierno_objeto_tipo_check;
ALTER TABLE public.ctr_acto_gobierno ADD CONSTRAINT ctr_acto_gobierno_objeto_tipo_check
  CHECK (objeto_tipo = ANY (ARRAY['documento','contrato','claim','regla_version','economia','responsabilidad','precedencia','mapeo_identidad','gobierno']));

INSERT INTO public.user_roles (user_id, role)
VALUES ('f2840a10-d660-4adc-8854-11f947423fb9', 'contractual_validator')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.ctr_gobierno_config (parametro, valor, actor_nombre, vigente)
VALUES (
  'd3_validador_contractual',
  '{"owner_funcional":"Contractual Intelligence / Control de Gestion","persona":"Gonzalo Torres","user_id":"f2840a10-d660-4adc-8854-11f947423fb9","rol":"contractual_validator","caracter":"transitorio hasta designacion de owner permanente","reglas":["proponente distinto de validador, sin excepciones: Gonzalo no puede validar claims propuestos personalmente por el","las extracciones del sistema (I2/I2.1) cuentan como propuestas y si requieren validacion humana la hace el validador","en casos high-risk que exijan escalado a DG, la doble condicion validador+DG de la misma persona NO cuenta como dos ojos: quedan PENDIENTES de un segundo aprobador distinto","high-risk = precedencias entre instrumentos; reasignaciones de identidad >=1000 OTs o clientes nuevos/remaps; obligaciones economicas materiales; conflicto de evidencia declarado"]}'::jsonb,
  'Direccion General (Mario)',
  true
);

INSERT INTO public.ctr_acto_gobierno (
  objeto_tipo, accion, estado_anterior, estado_nuevo,
  actor_id, actor_nombre, actor_rol,
  evidencia_revisada, motivo, fuente_procedencia
) VALUES (
  'gobierno', 'nombramiento', NULL, 'contractual_validator',
  'f2840a10-d660-4adc-8854-11f947423fb9', 'Gonzalo Torres', 'management',
  'WG_D3_ACTO_NOMBRAMIENTO_BORRADOR_v1.md sha256=037ae13613359e73f0de0a7e5a6c25d36ebaf650e559b3638a6b6100f4bf42f3',
  'D-3: nombramiento transitorio de Gonzalo Torres como contractual_validator y owner funcional temporal de Contractual Intelligence / Control de Gestion, por orden de Direccion 31-08-2026; segregacion proponente/validador integra; doble condicion validador+DG no computa como cuatro ojos',
  'Orden de Direccion 31-08-2026'
);

COMMIT;