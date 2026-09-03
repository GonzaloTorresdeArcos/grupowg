REVOKE ALL ON FUNCTION public.ops_add_working_days(date,integer,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.ctr_calendario_cobertura(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.ctr_sla_evaluabilidad(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid) TO authenticated, service_role;