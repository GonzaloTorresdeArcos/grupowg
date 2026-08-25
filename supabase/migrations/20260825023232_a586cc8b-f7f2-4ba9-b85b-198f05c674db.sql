-- Motivo: bajo el rol `authenticated`, las políticas RLS sobre ops_fact_ot /
-- ops_cp_geo / ops_bases convierten los joins en subconsultas security-barrier
-- y el plan degrada de 0,35 s a 6,8 s. Se envuelve la implementación en una
-- función SECURITY DEFINER con guardia explícita de rol `management`, mismo
-- patrón ya usado en public.ops_cobertura_datos.

ALTER FUNCTION public.ops_dispersion_resumen(date, date, text, text, text)
  RENAME TO ops_dispersion_resumen_impl;
ALTER FUNCTION public.ops_dispersion_detalle(text, text, date, date, text, text, text, integer, integer)
  RENAME TO ops_dispersion_detalle_impl;

REVOKE ALL ON FUNCTION public.ops_dispersion_resumen_impl(date, date, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_dispersion_detalle_impl(text, text, date, date, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ops_dispersion_resumen(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN public.ops_dispersion_resumen_impl(p_from, p_to, p_delegacion, p_gama, p_familia);
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_dispersion_detalle(
  p_entidad text, p_clave text,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN public.ops_dispersion_detalle_impl(p_entidad, p_clave, p_from, p_to, p_delegacion, p_gama, p_familia, p_limit, p_offset);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_dispersion_resumen(date, date, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_dispersion_detalle(text, text, date, date, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_dispersion_resumen(date, date, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ops_dispersion_detalle(text, text, date, date, text, text, text, integer, integer) TO authenticated, service_role;