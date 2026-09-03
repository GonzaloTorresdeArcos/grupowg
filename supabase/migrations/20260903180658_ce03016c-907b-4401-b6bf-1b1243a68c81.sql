REVOKE EXECUTE ON FUNCTION public.ops_territorio_ot(text, text) FROM PUBLIC, anon;

DO $$
DECLARE f text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    FOREACH f IN ARRAY ARRAY[
      'public.ops_territorio_ot(text, text)',
      'public.ops_add_working_days(date, integer, text)',
      'public.ops_add_calendar_days(date, integer)',
      'public.ctr_calendario_cobertura(text)',
      'public.ctr_sla_evaluabilidad(uuid)',
      'public.ctr_sla_temporal_ot(uuid, text)',
      'public.ctr_sla_temporal_resumen(uuid, text)',
      'public.ctr_sla_batch1_resumen(text)'
    ] LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM sandbox_exec', f);
    END LOOP;
  END IF;
END $$;