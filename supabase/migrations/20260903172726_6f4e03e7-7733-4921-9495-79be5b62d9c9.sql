REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid,text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_sla_temporal_resumen(uuid,text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_sla_batch1_resumen(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_batch1_resumen(text) TO authenticated, service_role;