DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    REVOKE EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) FROM sandbox_exec;
    REVOKE EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text)          FROM sandbox_exec;
    REVOKE EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid)             FROM sandbox_exec;
    REVOKE EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid)               FROM sandbox_exec;
    REVOKE EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid)          FROM sandbox_exec;
    REVOKE EXECUTE ON FUNCTION public.ops_as_of(text)                         FROM sandbox_exec;
  END IF;
END $$;
