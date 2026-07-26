
REVOKE EXECUTE ON FUNCTION public.is_management(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_management(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_management(uuid) TO authenticated, service_role;
