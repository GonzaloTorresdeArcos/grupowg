REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) TO authenticated, service_role;