ALTER TABLE public.ops_sla_registry ADD COLUMN IF NOT EXISTS condicion_aplicacion text;
NOTIFY pgrst, 'reload schema';