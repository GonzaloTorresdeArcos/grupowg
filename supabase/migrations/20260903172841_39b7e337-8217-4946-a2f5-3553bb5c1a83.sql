REVOKE ALL ON FUNCTION public.ops_add_calendar_days(date,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ops_add_calendar_days(date,integer) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid,text) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid,text) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.ctr_sla_batch1_resumen(text) TO sandbox_exec;