GRANT EXECUTE ON FUNCTION public.ops_equipos(date, date, text, text) TO service_role, postgres, anon;
REVOKE EXECUTE ON FUNCTION public.ops_equipos(date, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ops_equipos(date, date, text, text) TO authenticator;