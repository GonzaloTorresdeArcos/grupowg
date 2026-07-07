CREATE TABLE public.wg_network_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nombre text,
  empresa text,
  email text NOT NULL,
  telefono text,
  cp text,
  intervenciones_mes int,
  ticket_medio numeric,
  gama text,
  impacto_total numeric,
  multiplicador numeric,
  caja_liberada numeric,
  breakdown jsonb,
  source text DEFAULT 'simulador',
  user_agent text
);

GRANT SELECT ON public.wg_network_leads TO authenticated;
GRANT ALL ON public.wg_network_leads TO service_role;

ALTER TABLE public.wg_network_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read leads" ON public.wg_network_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wg_leads_email ON public.wg_network_leads(email);
CREATE INDEX IF NOT EXISTS idx_wg_leads_created ON public.wg_network_leads(created_at DESC);