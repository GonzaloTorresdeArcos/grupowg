REVOKE EXECUTE ON FUNCTION public.ops_cobertura_datos() FROM anon, public;

CREATE OR REPLACE FUNCTION public.ops_cobertura_datos()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT jsonb_build_object(
    'min_creacion', min(fecha_creacion),
    'max_creacion', max(fecha_creacion),
    'min_cierre', min(fecha_cierre),
    'max_cierre', max(fecha_cierre),
    'total_ots', count(*)
  )
    INTO v
    FROM public.ops_fact_ot
   WHERE NOT es_anulado;

  RETURN COALESCE(v, '{}'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ops_cobertura_datos() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ops_cobertura_datos() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';