CREATE TABLE public.wg_collaborator_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('parts','equipment','warranty')),
  units integer NOT NULL DEFAULT 1 CHECK (units >= 0),
  amount_margin numeric NOT NULL DEFAULT 0,
  incidence_id uuid NULL REFERENCES public.wg_incidences(id) ON DELETE SET NULL,
  reference text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_collaborator_sales TO authenticated;
GRANT ALL ON public.wg_collaborator_sales TO service_role;

ALTER TABLE public.wg_collaborator_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaboradores y admin ven sus ventas"
  ON public.wg_collaborator_sales FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Colaboradores y admin insertan ventas"
  ON public.wg_collaborator_sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Solo admin actualiza ventas"
  ON public.wg_collaborator_sales FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Solo admin borra ventas"
  ON public.wg_collaborator_sales FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wg_collaborator_sales_user_created
  ON public.wg_collaborator_sales (user_id, created_at DESC);

CREATE INDEX idx_wg_collaborator_sales_user_kind
  ON public.wg_collaborator_sales (user_id, kind);