-- Add an in-function admin check to prevent authenticated non-admin users
-- from calling match_candidates_for_incidence via PostgREST and reading
-- approved collaborator data.
CREATE OR REPLACE FUNCTION public.match_candidates_for_incidence(
  _province_code text,
  _product_family text,
  _brand text DEFAULT NULL::text,
  _limit integer DEFAULT 5
)
RETURNS TABLE(
  application_id uuid,
  razon_social text,
  nombre_comercial text,
  current_tier text,
  current_score integer,
  numero_tecnicos integer,
  capacidad_mensual text,
  cobertura_match boolean,
  familia_match boolean,
  marca_match boolean,
  match_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins may invoke directly. Edge functions using service_role
  -- bypass this check (auth.uid() is NULL and role is service_role).
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.razon_social,
    a.nombre_comercial,
    a.current_tier,
    a.current_score,
    a.numero_tecnicos,
    a.capacidad_mensual,
    (_province_code = ANY(a.provincias_codes)) AS cobertura_match,
    (_product_family = ANY(a.familias_producto)) AS familia_match,
    (_brand IS NULL OR _brand = ANY(a.marcas_codes)) AS marca_match,
    (
      CASE WHEN _province_code = ANY(a.provincias_codes) THEN 40 ELSE 0 END +
      CASE WHEN _product_family = ANY(a.familias_producto) THEN 25 ELSE 0 END +
      CASE WHEN _brand IS NOT NULL AND _brand = ANY(a.marcas_codes) THEN 15 ELSE 0 END +
      CASE a.current_tier WHEN 'premium' THEN 20 WHEN 'advanced' THEN 12 ELSE 5 END +
      LEAST(10, COALESCE(a.numero_tecnicos, 0))
    ) AS match_score
  FROM public.wg_network_applications a
  WHERE a.status = 'approved'
    AND _province_code = ANY(a.provincias_codes)
    AND _product_family = ANY(a.familias_producto)
  ORDER BY match_score DESC, a.current_score DESC
  LIMIT _limit;
END;
$function$;

-- Keep prior grants (edge function service_role uses it); block anon explicitly.
REVOKE EXECUTE ON FUNCTION public.match_candidates_for_incidence(text, text, text, integer) FROM PUBLIC, anon;