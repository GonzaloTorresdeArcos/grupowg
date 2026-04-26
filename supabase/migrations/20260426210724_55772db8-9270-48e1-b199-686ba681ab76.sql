ALTER TABLE public.wg_signed_agreements
  ADD COLUMN IF NOT EXISTS agreement_version text,
  ADD COLUMN IF NOT EXISTS agreement_hash text,
  ADD COLUMN IF NOT EXISTS agreement_read_at timestamptz;