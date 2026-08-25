DROP INDEX IF EXISTS public.ops_fact_ot_fecha_cierre_idx;
DROP INDEX IF EXISTS public.ops_fact_ot_fecha_creacion_idx;
DROP INDEX IF EXISTS public.ops_fact_ot_tecnico_idx;
DROP INDEX IF EXISTS public.ops_fact_ot_sat_idx;
DROP INDEX IF EXISTS public.ops_fact_ot_provincia_idx;
DROP INDEX IF EXISTS public.ops_fact_ot_situacion_idx;

CREATE INDEX IF NOT EXISTS idx_ops_fact_ot_cierre_dim
  ON public.ops_fact_ot (fecha_cierre, delegacion, cliente_wg)
  WHERE es_anulado = false;

CREATE INDEX IF NOT EXISTS idx_ops_fact_ot_backlog
  ON public.ops_fact_ot (situacion, fecha_creacion, delegacion)
  WHERE es_anulado = false;

ANALYZE public.ops_fact_ot;