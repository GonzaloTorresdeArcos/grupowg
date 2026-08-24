ALTER TABLE public.ops_sla_registry
  ADD COLUMN IF NOT EXISTS territorio_calendario text,
  ADD COLUMN IF NOT EXISTS estado_extraccion text NOT NULL DEFAULT 'pendiente_extraer';

ALTER TABLE public.ops_sla_registry
  DROP CONSTRAINT IF EXISTS ops_sla_registry_estado_extraccion_check;
ALTER TABLE public.ops_sla_registry
  ADD CONSTRAINT ops_sla_registry_estado_extraccion_check
  CHECK (estado_extraccion IN ('extraida_contrato','pendiente_extraer'));

CREATE TABLE IF NOT EXISTS public.ops_cliente_contrato_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_wg_real text NOT NULL,
  cliente_contractual text NOT NULL,
  programa text,
  vigencia_desde date,
  vigencia_hasta date,
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','patron_provisional')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_wg_real, cliente_contractual)
);
GRANT SELECT ON public.ops_cliente_contrato_alias TO authenticated;
GRANT ALL ON public.ops_cliente_contrato_alias TO service_role;
ALTER TABLE public.ops_cliente_contrato_alias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mgmt_read_cliente_alias ON public.ops_cliente_contrato_alias;
CREATE POLICY mgmt_read_cliente_alias ON public.ops_cliente_contrato_alias
  FOR SELECT TO authenticated USING ((SELECT public.is_management()));

CREATE TABLE IF NOT EXISTS public.ops_calendario_laboral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territorio text NOT NULL,
  ambito text NOT NULL CHECK (ambito IN ('nacional','autonomico','local')),
  fecha date NOT NULL,
  descripcion text,
  fuente text,
  vigencia_desde date,
  vigencia_hasta date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (territorio, ambito, fecha)
);
GRANT SELECT ON public.ops_calendario_laboral TO authenticated;
GRANT ALL ON public.ops_calendario_laboral TO service_role;
ALTER TABLE public.ops_calendario_laboral ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mgmt_read_calendario_laboral ON public.ops_calendario_laboral;
CREATE POLICY mgmt_read_calendario_laboral ON public.ops_calendario_laboral
  FOR SELECT TO authenticated USING ((SELECT public.is_management()));

NOTIFY pgrst, 'reload schema';