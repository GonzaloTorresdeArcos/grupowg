
CREATE OR REPLACE FUNCTION public.is_management(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'management'
  )
$$;

CREATE TABLE public.ops_fact_ot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  num_ot TEXT NOT NULL UNIQUE,
  fecha_creacion DATE,
  fecha_cierre DATE,
  fecha_primer_contacto DATE,
  fecha_primera_visita DATE,
  fecha_baja DATE,
  cliente_wg TEXT,
  sat TEXT,
  tipo_recurso TEXT,
  tecnico TEXT,
  canal TEXT,
  delegacion TEXT,
  estado TEXT,
  situacion TEXT,
  incidencia TEXT,
  aparato TEXT,
  marca TEXT,
  modelo TEXT,
  familia TEXT,
  subfamilia TEXT,
  gama_origen TEXT,
  seccion TEXT,
  provincia TEXT,
  municipio TEXT,
  codigo_postal TEXT,
  capital TEXT,
  dias_cierre INTEGER,
  sla_cierre_dlab INTEGER,
  kpi_20d BOOLEAN,
  kpi_30d BOOLEAN,
  tiene_piezas BOOLEAN,
  anio_garantia INTEGER,
  importe_mo NUMERIC(12,2),
  importe_desplazamiento NUMERIC(12,2),
  fact_cli NUMERIC(12,2),
  fact_sat NUMERIC(12,2),
  es_baja BOOLEAN NOT NULL DEFAULT false,
  es_nff BOOLEAN NOT NULL DEFAULT false,
  es_anulado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_fact_ot TO authenticated;
GRANT ALL ON public.ops_fact_ot TO service_role;
ALTER TABLE public.ops_fact_ot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_all_fact_ot" ON public.ops_fact_ot FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE INDEX ops_fact_ot_fecha_creacion_idx ON public.ops_fact_ot(fecha_creacion);
CREATE INDEX ops_fact_ot_fecha_cierre_idx ON public.ops_fact_ot(fecha_cierre);
CREATE INDEX ops_fact_ot_tecnico_idx ON public.ops_fact_ot(tecnico);
CREATE INDEX ops_fact_ot_sat_idx ON public.ops_fact_ot(sat);
CREATE INDEX ops_fact_ot_cliente_wg_idx ON public.ops_fact_ot(cliente_wg);
CREATE INDEX ops_fact_ot_familia_idx ON public.ops_fact_ot(familia);
CREATE INDEX ops_fact_ot_situacion_idx ON public.ops_fact_ot(situacion);
CREATE INDEX ops_fact_ot_provincia_idx ON public.ops_fact_ot(provincia);
CREATE TRIGGER ops_fact_ot_updated_at BEFORE UPDATE ON public.ops_fact_ot
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ops_tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico TEXT NOT NULL UNIQUE,
  delegacion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  motivo_inactivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_tecnicos TO authenticated;
GRANT ALL ON public.ops_tecnicos TO service_role;
ALTER TABLE public.ops_tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_all_tecnicos" ON public.ops_tecnicos FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE TRIGGER ops_tecnicos_updated_at BEFORE UPDATE ON public.ops_tecnicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ops_portfolio_gamas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marca TEXT NOT NULL,
  cliente_wg TEXT NOT NULL,
  gama_real TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(marca, cliente_wg)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_portfolio_gamas TO authenticated;
GRANT ALL ON public.ops_portfolio_gamas TO service_role;
ALTER TABLE public.ops_portfolio_gamas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_all_portfolio" ON public.ops_portfolio_gamas FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE TRIGGER ops_portfolio_gamas_updated_at BEFORE UPDATE ON public.ops_portfolio_gamas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ops_benchmark (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  familia TEXT NOT NULL,
  cliente_wg TEXT NOT NULL,
  ots INTEGER,
  dias_medio NUMERIC(6,2),
  pct_bajas NUMERIC(5,2),
  pct_nff NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(familia, cliente_wg)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_benchmark TO authenticated;
GRANT ALL ON public.ops_benchmark TO service_role;
ALTER TABLE public.ops_benchmark ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_all_benchmark" ON public.ops_benchmark FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE TRIGGER ops_benchmark_updated_at BEFORE UPDATE ON public.ops_benchmark
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ops_rrhh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico TEXT NOT NULL,
  mes DATE NOT NULL,
  dias_trabajados INTEGER,
  ausencias INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tecnico, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_rrhh TO authenticated;
GRANT ALL ON public.ops_rrhh TO service_role;
ALTER TABLE public.ops_rrhh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_all_rrhh" ON public.ops_rrhh FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE TRIGGER ops_rrhh_updated_at BEFORE UPDATE ON public.ops_rrhh
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
