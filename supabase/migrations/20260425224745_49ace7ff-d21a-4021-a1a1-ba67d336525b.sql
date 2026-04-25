-- Tabla para solicitudes y quejas de accesibilidad (RD 1112/2018)
CREATE TABLE public.wg_accessibility_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('informacion_accesible', 'queja', 'reclamacion', 'sugerencia')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  page_url TEXT,
  preferred_format TEXT CHECK (preferred_format IN ('email', 'telefono', 'correo_postal', 'otro', NULL)),
  postal_address TEXT,
  description TEXT NOT NULL,
  assistive_tech TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'received',
  admin_notes TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_accessibility_requests ENABLE ROW LEVEL SECURITY;

-- Cualquiera (incluido anónimo) puede crear una solicitud
CREATE POLICY "Anyone can submit accessibility requests"
ON public.wg_accessibility_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (consent_given = true);

-- Solo admins pueden leer
CREATE POLICY "Admins read accessibility requests"
ON public.wg_accessibility_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Solo admins pueden actualizar (gestionar estado/notas)
CREATE POLICY "Admins update accessibility requests"
ON public.wg_accessibility_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_wg_accessibility_requests_updated_at
BEFORE UPDATE ON public.wg_accessibility_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_wg_accessibility_requests_created_at ON public.wg_accessibility_requests (created_at DESC);
CREATE INDEX idx_wg_accessibility_requests_status ON public.wg_accessibility_requests (status);