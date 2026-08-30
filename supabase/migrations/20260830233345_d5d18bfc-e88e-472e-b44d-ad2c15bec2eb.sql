-- M-09 CIERRE
DO $$
DECLARE r record; t text;
BEGIN
  -- REVOKE EXECUTE de ctr_acto_bootstrap a todos los roles salvo owner
  FOR r IN SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
             FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='ctr_acto_bootstrap' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.ctr_acto_bootstrap(%s) FROM PUBLIC', r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.ctr_acto_bootstrap(%s) FROM anon', r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.ctr_acto_bootstrap(%s) FROM authenticator', r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.ctr_acto_bootstrap(%s) FROM authenticated', r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.ctr_acto_bootstrap(%s) FROM service_role', r.args);
  END LOOP;

  -- Barrido: ninguna escritura para anon/authenticated/authenticator en tablas ctr_*
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ctr!_%' ESCAPE '!' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticator', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';