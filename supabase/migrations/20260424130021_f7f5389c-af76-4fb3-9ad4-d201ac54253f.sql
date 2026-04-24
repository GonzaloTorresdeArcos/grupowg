
-- 1. Ampliar wg_network_applications con campos para matching
ALTER TABLE public.wg_network_applications
  ADD COLUMN IF NOT EXISTS provincias_codes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS marcas_codes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_wg_apps_provincias ON public.wg_network_applications USING GIN(provincias_codes);
CREATE INDEX IF NOT EXISTS idx_wg_apps_familias ON public.wg_network_applications USING GIN(familias_producto);
CREATE INDEX IF NOT EXISTS idx_wg_apps_marcas ON public.wg_network_applications USING GIN(marcas_codes);
CREATE INDEX IF NOT EXISTS idx_wg_apps_status ON public.wg_network_applications(status);

-- 2. Crear tabla wg_incidences
CREATE TABLE IF NOT EXISTS public.wg_incidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  province_code TEXT NOT NULL,
  product_family TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','closed','cancelled')),
  assigned_application_id UUID REFERENCES public.wg_network_applications(id) ON DELETE SET NULL,
  assigned_user_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  appointment_id UUID,
  match_snapshot JSONB DEFAULT '{}'::JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wg_inc_status ON public.wg_incidences(status);
CREATE INDEX IF NOT EXISTS idx_wg_inc_province ON public.wg_incidences(province_code);
CREATE INDEX IF NOT EXISTS idx_wg_inc_family ON public.wg_incidences(product_family);
CREATE INDEX IF NOT EXISTS idx_wg_inc_assigned ON public.wg_incidences(assigned_application_id);

ALTER TABLE public.wg_incidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage incidences"
  ON public.wg_incidences
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Collaborators view assigned incidences"
  ON public.wg_incidences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_user_id);

CREATE TRIGGER update_wg_incidences_updated_at
  BEFORE UPDATE ON public.wg_incidences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Función para sincronizar tier/score actuales desde scoring
CREATE OR REPLACE FUNCTION public.sync_application_scoring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.application_id IS NOT NULL THEN
    UPDATE public.wg_network_applications
       SET current_score = NEW.total_score,
           current_tier = NEW.tier
     WHERE id = NEW.application_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_scoring_to_application ON public.wg_application_scoring;
CREATE TRIGGER sync_scoring_to_application
  AFTER INSERT OR UPDATE ON public.wg_application_scoring
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_application_scoring();

-- 4. Función para promocionar a admin por email (solo ejecutable por admin existente)
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN 'user_not_found';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$$;

-- 5. Función matching: top candidatos para una incidencia
CREATE OR REPLACE FUNCTION public.match_candidates_for_incidence(
  _province_code TEXT,
  _product_family TEXT,
  _brand TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  application_id UUID,
  razon_social TEXT,
  nombre_comercial TEXT,
  current_tier TEXT,
  current_score INTEGER,
  numero_tecnicos INTEGER,
  capacidad_mensual TEXT,
  cobertura_match BOOLEAN,
  familia_match BOOLEAN,
  marca_match BOOLEAN,
  match_score INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
