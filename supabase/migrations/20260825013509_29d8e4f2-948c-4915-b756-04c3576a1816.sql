CREATE TABLE public.ops_gate_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ejecutado_en timestamptz NOT NULL DEFAULT now(),
  rpcs_total integer NOT NULL DEFAULT 0,
  rpcs_ok integer NOT NULL DEFAULT 0,
  ms_total integer,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ops_gate_log TO authenticated;
GRANT ALL ON public.ops_gate_log TO service_role;

ALTER TABLE public.ops_gate_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "management lee gate log"
  ON public.ops_gate_log FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()));

CREATE POLICY "management escribe gate log"
  ON public.ops_gate_log FOR INSERT TO authenticated
  WITH CHECK (public.is_management(auth.uid()));