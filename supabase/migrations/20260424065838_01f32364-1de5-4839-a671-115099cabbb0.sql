-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inscripciones
CREATE TABLE public.wg_network_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  -- Step 1
  razon_social text NOT NULL,
  nombre_comercial text,
  cif_nif text NOT NULL,
  tipo_colaborador text NOT NULL,
  persona_contacto text NOT NULL,
  email text NOT NULL,
  telefono text NOT NULL,
  direccion_fiscal text,
  zona_cobertura text,
  provincias text,
  -- Step 2
  familias_producto text[],
  marcas_trabajadas text,
  numero_tecnicos integer,
  servicios_ofrecidos text[],
  horarios text,
  capacidad_mensual text,
  -- Step 4
  coberturas text[],
  -- Step 5: datos condicionales por seguro (JSONB para flexibilidad)
  datos_seguros jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.wg_network_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create applications" ON public.wg_network_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read applications" ON public.wg_network_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications" ON public.wg_network_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete applications" ON public.wg_network_applications
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Documentos
CREATE TABLE public.wg_network_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  application_id uuid REFERENCES public.wg_network_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer
);
ALTER TABLE public.wg_network_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create documents" ON public.wg_network_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read documents" ON public.wg_network_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bucket privado para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('wg-documents', 'wg-documents', false);

CREATE POLICY "Anyone can upload wg docs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'wg-documents');

CREATE POLICY "Admins read wg docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'wg-documents' AND public.has_role(auth.uid(), 'admin'));