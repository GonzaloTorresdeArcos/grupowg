-- =========================================
-- PROFILES TABLE
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.wg_network_applications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_application_id ON public.profiles(application_id);

-- =========================================
-- TIMESTAMP TRIGGER FUNCTION
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- HANDLE NEW USER: auto-create profile + auto-link by email
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id UUID;
  v_company_name TEXT;
  v_phone TEXT;
  v_display_name TEXT;
BEGIN
  -- Buscar solicitud aprobada con el mismo email
  SELECT id, COALESCE(nombre_comercial, razon_social), telefono, persona_contacto
    INTO v_application_id, v_company_name, v_phone, v_display_name
  FROM public.wg_network_applications
  WHERE LOWER(email) = LOWER(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.profiles (user_id, email, display_name, phone, company_name, application_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', v_display_name, NEW.email),
    v_phone,
    v_company_name,
    v_application_id,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Asignar rol por defecto: 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- COLLABORATOR DOCUMENTS (renovación documental)
-- =========================================
CREATE TABLE public.wg_collaborator_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  issued_at DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'valid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_collaborator_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents"
  ON public.wg_collaborator_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own documents"
  ON public.wg_collaborator_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own documents"
  ON public.wg_collaborator_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all collaborator documents"
  ON public.wg_collaborator_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_collab_docs_user ON public.wg_collaborator_documents(user_id);
CREATE INDEX idx_collab_docs_expires ON public.wg_collaborator_documents(expires_at);

CREATE TRIGGER update_collab_docs_updated_at
  BEFORE UPDATE ON public.wg_collaborator_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- APPOINTMENTS (calendario)
-- =========================================
CREATE TABLE public.wg_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_ref TEXT,
  title TEXT NOT NULL,
  customer_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  brand TEXT,
  product_family TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own appointments"
  ON public.wg_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own appointments"
  ON public.wg_appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all appointments"
  ON public.wg_appointments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_appointments_user ON public.wg_appointments(user_id);
CREATE INDEX idx_appointments_scheduled ON public.wg_appointments(scheduled_at);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.wg_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- INVOICES (facturación y liquidaciones)
-- =========================================
CREATE TABLE public.wg_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  period TEXT,
  issued_at DATE NOT NULL,
  due_at DATE,
  paid_at DATE,
  amount_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  pdf_path TEXT,
  service_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invoices"
  ON public.wg_invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all invoices"
  ON public.wg_invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_invoices_user ON public.wg_invoices(user_id);
CREATE INDEX idx_invoices_issued ON public.wg_invoices(issued_at);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.wg_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();