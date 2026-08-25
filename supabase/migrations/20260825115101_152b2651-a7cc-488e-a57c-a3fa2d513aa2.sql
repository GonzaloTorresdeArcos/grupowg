DO $$
DECLARE
  f record;
  sig text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname LIKE 'ops\_%'
       AND p.prokind = 'f'
       AND p.proname NOT LIKE 'ops\_trg\_%'
  LOOP
    sig := format('public.%I(%s)', f.proname, f.args);

    -- Nadie por defecto: ni PUBLIC ni el rol anónimo.
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticator', sig);

    IF f.proname LIKE '%\_impl' THEN
      -- Implementaciones internas: solo a través del envoltorio con guardia.
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
  END LOOP;
END;
$$;