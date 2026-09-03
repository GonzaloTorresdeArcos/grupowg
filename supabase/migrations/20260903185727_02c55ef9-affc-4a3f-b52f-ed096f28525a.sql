CREATE OR REPLACE FUNCTION public.ctr_e13_selftest(p_what text, p_arg text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims','{"sub":"f2840a10-d660-4adc-8854-11f947423fb9"}', true);
  IF p_what = 'kpis' THEN v := public.ctr_sla_programa_kpis(p_arg::uuid,'A');
  ELSIF p_what = 'disp' THEN v := public.ctr_sla_disponibilidad();
  ELSIF p_what = 'evid' THEN v := public.ctr_sla_evidencia_kpi(p_arg::uuid);
  ELSIF p_what = 'batch' THEN v := public.ctr_sla_batch1_resumen('A');
  END IF;
  RETURN v;
END $function$;
REVOKE ALL ON FUNCTION public.ctr_e13_selftest(text,text) FROM PUBLIC, anon, authenticated;