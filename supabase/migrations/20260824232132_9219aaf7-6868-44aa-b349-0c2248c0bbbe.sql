CREATE TABLE public.ops_rrhh_logistica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id text NOT NULL,
  nombre text,
  equipo text,
  almacen_base text NOT NULL,
  fecha date NOT NULL,
  jornada_horas numeric,
  presente boolean NOT NULL DEFAULT true,
  origen_dato text NOT NULL DEFAULT 'importador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ops_rrhh_logistica_clave
  ON public.ops_rrhh_logistica (almacen_base, persona_id, fecha);
CREATE INDEX ops_rrhh_logistica_fecha ON public.ops_rrhh_logistica (fecha);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_rrhh_logistica TO authenticated;
GRANT ALL ON public.ops_rrhh_logistica TO service_role;

ALTER TABLE public.ops_rrhh_logistica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "management gestiona rrhh logistica"
  ON public.ops_rrhh_logistica FOR ALL TO authenticated
  USING (public.is_management(auth.uid()))
  WITH CHECK (public.is_management(auth.uid()));

CREATE TRIGGER trg_ops_rrhh_logistica_updated
  BEFORE UPDATE ON public.ops_rrhh_logistica
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.ops_data_freshness
WITH (security_invoker = true) AS
  SELECT dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas, created_at
    FROM public.ops_carga_log;

GRANT SELECT ON public.ops_data_freshness TO authenticated;
GRANT ALL ON public.ops_data_freshness TO service_role;