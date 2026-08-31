DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ctr_claim','ctr_regla_definicion','ctr_regla_version',
    'ctr_regla_aplicabilidad_scope','ctr_regla_aplicabilidad_predicado',
    'ctr_aplicabilidad','ctr_precedencia','ctr_gobierno_config',
    'ctr_alias_propuesta','ctr_correspondencia_operativa',
    'ctr_mapa_contractual_version','ctr_mapa_contractual_item'
  ] LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticator', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;