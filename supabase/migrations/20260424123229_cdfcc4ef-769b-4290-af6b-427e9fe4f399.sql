-- ============================================
-- Drafts del formulario de inscripción
-- ============================================
CREATE TABLE public.wg_application_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  resume_token TEXT NOT NULL UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 1,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  last_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drafts_email ON public.wg_application_drafts(LOWER(email));
CREATE INDEX idx_drafts_token ON public.wg_application_drafts(resume_token);

ALTER TABLE public.wg_application_drafts ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar y leer/actualizar su draft (lo identifica por token desde la app)
CREATE POLICY "Anyone can insert drafts"
  ON public.wg_application_drafts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read drafts"
  ON public.wg_application_drafts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update drafts"
  ON public.wg_application_drafts FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins delete drafts"
  ON public.wg_application_drafts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON public.wg_application_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Códigos OTP
-- ============================================
CREATE TABLE public.wg_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_dest ON public.wg_otp_codes(channel, destination);

ALTER TABLE public.wg_otp_codes ENABLE ROW LEVEL SECURITY;

-- Solo edge function (service role) escribe; el cliente no debería leer códigos directamente
CREATE POLICY "Admins read otp"
  ON public.wg_otp_codes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Acuerdos firmados
-- ============================================
CREATE TABLE public.wg_signed_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.wg_network_applications(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.wg_application_drafts(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_dni TEXT,
  signer_email TEXT NOT NULL,
  signature_data_url TEXT,
  pdf_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_signed_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create signed agreements"
  ON public.wg_signed_agreements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read signed agreements"
  ON public.wg_signed_agreements FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Scoring de aplicaciones
-- ============================================
CREATE TABLE public.wg_application_scoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.wg_network_applications(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.wg_application_drafts(id) ON DELETE SET NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL CHECK (tier IN ('basic','advanced','premium')),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_application_scoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create scoring"
  ON public.wg_application_scoring FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read scoring"
  ON public.wg_application_scoring FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- Storage bucket para acuerdos firmados (privado)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wg-agreements', 'wg-agreements', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload signed agreements"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'wg-agreements');

CREATE POLICY "Admins read signed agreements files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'wg-agreements' AND has_role(auth.uid(), 'admin'));