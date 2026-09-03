REVOKE EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ops_add_calendar_days(date,integer) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid,text) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid,text) FROM sandbox_exec;
REVOKE EXECUTE ON FUNCTION public.ctr_sla_batch1_resumen(text) FROM sandbox_exec;