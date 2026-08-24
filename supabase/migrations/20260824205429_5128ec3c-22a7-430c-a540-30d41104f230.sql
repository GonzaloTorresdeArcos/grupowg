CREATE TABLE public.ops_sla_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_line text NOT NULL,
  cliente text NOT NULL,
  cliente_wg_patron text,
  programa text NOT NULL,
  sociedad_wg_ejecutora text,
  gama_familia text,
  tipologia_servicio text,
  fase text CHECK (fase IN ('preventa','postventa')),
  kpi text NOT NULL,
  evento_inicio text NOT NULL CHECK (evento_inicio IN ('creacion_ot','primer_contacto','asignacion','primera_visita','recogida','solicitud_pieza','disponibilidad_pieza','entrega','cierre_anterior','otro')),
  evento_fin text NOT NULL CHECK (evento_fin IN ('creacion_ot','primer_contacto','asignacion','primera_visita','recogida','solicitud_pieza','disponibilidad_pieza','entrega','cierre_anterior','otro','reparacion','cierre','contacto','visita','respuesta')),
  target numeric,
  hard_limit numeric,
  unidad text NOT NULL CHECK (unidad IN ('horas_laborables','horas_naturales','dias_laborables','dias_naturales','porcentaje','media','recuento')),
  calendario text NOT NULL DEFAULT 'natural' CHECK (calendario IN ('natural','laborable_es','laborable_local','otro')),
  regla_medicion text NOT NULL CHECK (regla_medicion IN ('por_ot','promedio','porcentaje_ots','recurrencia','meses_consecutivos','reporting','supply','quality','bonus_malus')),
  umbral_agregado numeric,
  ventana_medicion text NOT NULL DEFAULT 'por_ot' CHECK (ventana_medicion IN ('mes','trimestre','rolling_3m','anual','por_ot')),
  meses_consecutivos integer,
  ventana_garantia_dias integer,
  pausas_exclusiones text[] NOT NULL DEFAULT '{}',
  imputabilidad text NOT NULL DEFAULT 'por_determinar' CHECK (imputabilidad IN ('wg','sat','cliente','proveedor_pieza','mixta','por_determinar')),
  bonus jsonb,
  penalizacion jsonb,
  tipo_consecuencia text NOT NULL DEFAULT 'ninguna' CHECK (tipo_consecuencia IN ('coste_baja','reparacion_no_pagada','devolucion_abono','bonus','malus','pct_facturacion_mensual','rework_absorbido','incumplimiento_grave','riesgo_sin_cuantificar','ninguna')),
  exposicion_estado text NOT NULL DEFAULT 'identificada' CHECK (exposicion_estado IN ('identificada','cuantificable','pendiente_cuantificar')),
  vigencia_desde date,
  vigencia_hasta date,
  fuente_contractual text,
  tipo_target text NOT NULL CHECK (tipo_target IN ('contractual_target','contractual_hard_limit','internal_operating_target','operational_reference')),
  estado_regla text NOT NULL DEFAULT 'borrador' CHECK (estado_regla IN ('borrador','validada','obsoleta')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ops_sla_registry TO authenticated;
GRANT ALL ON public.ops_sla_registry TO service_role;

ALTER TABLE public.ops_sla_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mgmt_read_sla_registry" ON public.ops_sla_registry
  FOR SELECT TO authenticated USING ((SELECT public.is_management()));

CREATE INDEX idx_ops_sla_registry_cliente ON public.ops_sla_registry (cliente);
CREATE INDEX idx_ops_sla_registry_programa ON public.ops_sla_registry (programa);
CREATE INDEX idx_ops_sla_registry_estado ON public.ops_sla_registry (estado_regla);

CREATE TRIGGER trg_ops_sla_registry_updated_at
  BEFORE UPDATE ON public.ops_sla_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ops_sla_registry_resumen()
RETURNS TABLE(business_line text, cliente text, programa text, estado_regla text, reglas bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.business_line, r.cliente, r.programa, r.estado_regla, count(*)::bigint
  FROM public.ops_sla_registry r
  GROUP BY 1,2,3,4
  ORDER BY 1,2,3,4
$$;

GRANT EXECUTE ON FUNCTION public.ops_sla_registry_resumen() TO authenticated;

NOTIFY pgrst, 'reload schema';