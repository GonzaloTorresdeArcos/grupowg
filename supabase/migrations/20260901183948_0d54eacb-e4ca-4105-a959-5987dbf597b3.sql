REVOKE ALL ON FUNCTION public.ctr_portfolio_resumen() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_portfolio_no_resueltas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_resumen() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_portfolio_no_resueltas() TO authenticated, service_role;