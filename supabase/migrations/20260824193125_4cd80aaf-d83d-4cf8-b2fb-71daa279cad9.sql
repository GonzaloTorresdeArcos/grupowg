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
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT jsonb_build_object(
    'min_fecha', min(fecha_creacion),
    'max_fecha', max(fecha_creacion),
    'max_cierre', max(fecha_cierre),
    'ots', count(*)
  ) INTO v
  FROM public.ops_fact_ot
  WHERE coalesce(incidencia,'') <> 'ANULADO AVISO'
    AND fecha_creacion IS NOT NULL;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_cobertura_datos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_cobertura_datos() TO authenticated;

NOTIFY pgrst, 'reload schema';