-- ── F4A.1 · Modelo de logística de almacén (HUB San Agustín) ──────────────────

ALTER TABLE public.ops_expedicion
  ADD COLUMN IF NOT EXISTS almacen_base text,
  ADD COLUMN IF NOT EXISTS expedicion_id text,
  ADD COLUMN IF NOT EXISTS preparado_por text,
  ADD COLUMN IF NOT EXISTS persona_id text,
  ADD COLUMN IF NOT EXISTS equipo text,
  ADD COLUMN IF NOT EXISTS picking_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS picking_fin timestamptz,
  ADD COLUMN IF NOT EXISTS expedicion_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS destino text,
  ADD COLUMN IF NOT EXISTS tipo_incidencia text,
  ADD COLUMN IF NOT EXISTS reexpedicion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expedicion_origen_id text,
  ADD COLUMN IF NOT EXISTS coste_transporte numeric,
  ADD COLUMN IF NOT EXISTS num_lineas integer,
  ADD COLUMN IF NOT EXISTS num_unidades numeric,
  ADD COLUMN IF NOT EXISTS num_ot_abastecidas integer,
  ADD COLUMN IF NOT EXISTS procedencia_conteo text NOT NULL DEFAULT 'declarado';

ALTER TABLE public.ops_expedicion
  DROP CONSTRAINT IF EXISTS ops_expedicion_procedencia_conteo_chk;
ALTER TABLE public.ops_expedicion
  ADD CONSTRAINT ops_expedicion_procedencia_conteo_chk
  CHECK (procedencia_conteo IN ('declarado', 'derivado_lineas'));

-- expedicion_id es la clave natural. Compatibilidad: si no viene, se hereda de
-- referencia_expedicion; almacen_base por defecto 'SIN_DECLARAR' para poder
-- sostener la clave única compuesta y la FK de las líneas.
UPDATE public.ops_expedicion
   SET expedicion_id = COALESCE(expedicion_id, referencia_expedicion),
       almacen_base  = COALESCE(almacen_base, 'SIN_DECLARAR'),
       expedicion_timestamp = COALESCE(expedicion_timestamp, fecha_expedicion),
       coste_transporte = COALESCE(coste_transporte, coste_envio);

ALTER TABLE public.ops_expedicion
  ALTER COLUMN expedicion_id SET NOT NULL,
  ALTER COLUMN almacen_base SET DEFAULT 'SIN_DECLARAR',
  ALTER COLUMN almacen_base SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ops_expedicion_natural_key
  ON public.ops_expedicion (almacen_base, expedicion_id);

CREATE INDEX IF NOT EXISTS ops_expedicion_persona_idx ON public.ops_expedicion (persona_id);
CREATE INDEX IF NOT EXISTS ops_expedicion_equipo_idx ON public.ops_expedicion (equipo);
CREATE INDEX IF NOT EXISTS ops_expedicion_ts_idx ON public.ops_expedicion (expedicion_timestamp);

-- Sincronía bidireccional entre los nombres nuevos y los antiguos, para que las
-- RPC y el importador existentes sigan funcionando sin reescritura.
CREATE OR REPLACE FUNCTION public.ops_trg_expedicion_compat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.expedicion_id := COALESCE(NEW.expedicion_id, NEW.referencia_expedicion);
  NEW.referencia_expedicion := COALESCE(NEW.referencia_expedicion, NEW.expedicion_id);
  NEW.almacen_base := COALESCE(NEW.almacen_base, 'SIN_DECLARAR');
  NEW.expedicion_timestamp := COALESCE(NEW.expedicion_timestamp, NEW.fecha_expedicion);
  NEW.fecha_expedicion := COALESCE(NEW.fecha_expedicion, NEW.expedicion_timestamp);
  NEW.coste_transporte := COALESCE(NEW.coste_transporte, NEW.coste_envio);
  NEW.coste_envio := COALESCE(NEW.coste_envio, NEW.coste_transporte);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_expedicion_compat ON public.ops_expedicion;
CREATE TRIGGER trg_ops_expedicion_compat
  BEFORE INSERT OR UPDATE ON public.ops_expedicion
  FOR EACH ROW EXECUTE FUNCTION public.ops_trg_expedicion_compat();

-- ── Líneas de expedición ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ops_expedicion_linea (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  almacen_base text NOT NULL DEFAULT 'SIN_DECLARAR',
  expedicion_id text NOT NULL,
  linea integer NOT NULL,
  referencia text NOT NULL,
  descripcion text,
  cantidad numeric NOT NULL DEFAULT 1,
  num_ot text,
  pieza_solicitud_id uuid REFERENCES public.ops_pieza_solicitud(id) ON DELETE SET NULL,
  origen_dato text NOT NULL DEFAULT 'importador',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_expedicion_linea_unica UNIQUE (almacen_base, expedicion_id, linea),
  CONSTRAINT ops_expedicion_linea_fk
    FOREIGN KEY (almacen_base, expedicion_id)
    REFERENCES public.ops_expedicion (almacen_base, expedicion_id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_expedicion_linea TO authenticated;
GRANT ALL ON public.ops_expedicion_linea TO service_role;

ALTER TABLE public.ops_expedicion_linea ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo dirección accede a las líneas de expedición" ON public.ops_expedicion_linea;
CREATE POLICY "Solo dirección accede a las líneas de expedición"
  ON public.ops_expedicion_linea
  FOR ALL
  TO authenticated
  USING (public.is_management(auth.uid()))
  WITH CHECK (public.is_management(auth.uid()));

CREATE INDEX IF NOT EXISTS ops_expedicion_linea_ot_idx ON public.ops_expedicion_linea (num_ot);
CREATE INDEX IF NOT EXISTS ops_expedicion_linea_ref_idx ON public.ops_expedicion_linea (referencia);

-- Los recuentos se DERIVAN de las líneas cuando existe detalle.
CREATE OR REPLACE FUNCTION public.ops_trg_expedicion_conteos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_alm text;
  v_exp text;
BEGIN
  v_alm := COALESCE(NEW.almacen_base, OLD.almacen_base);
  v_exp := COALESCE(NEW.expedicion_id, OLD.expedicion_id);

  UPDATE public.ops_expedicion e
     SET num_lineas = agg.n_lineas,
         num_unidades = agg.n_unidades,
         num_ot_abastecidas = agg.n_ots,
         procedencia_conteo = 'derivado_lineas'
    FROM (
      SELECT count(*) AS n_lineas,
             sum(cantidad) AS n_unidades,
             count(DISTINCT num_ot) FILTER (WHERE num_ot IS NOT NULL) AS n_ots
        FROM public.ops_expedicion_linea
       WHERE almacen_base = v_alm AND expedicion_id = v_exp
    ) agg
   WHERE e.almacen_base = v_alm AND e.expedicion_id = v_exp;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_expedicion_conteos ON public.ops_expedicion_linea;
CREATE TRIGGER trg_ops_expedicion_conteos
  AFTER INSERT OR UPDATE OR DELETE ON public.ops_expedicion_linea
  FOR EACH ROW EXECUTE FUNCTION public.ops_trg_expedicion_conteos();

-- ── Stock ────────────────────────────────────────────────────────────────────

ALTER TABLE public.ops_stock_snapshot RENAME COLUMN fecha TO fecha_snapshot;
ALTER TABLE public.ops_stock_snapshot RENAME COLUMN almacen TO almacen_base;
ALTER TABLE public.ops_stock_snapshot RENAME COLUMN cantidad TO stock_fisico;
ALTER TABLE public.ops_stock_snapshot RENAME COLUMN cantidad_reservada TO reservado;

ALTER TABLE public.ops_stock_snapshot
  ADD COLUMN IF NOT EXISTS stock_disponible numeric,
  ADD COLUMN IF NOT EXISTS en_transito numeric;

DROP INDEX IF EXISTS public.ops_stock_snapshot_key;
CREATE UNIQUE INDEX IF NOT EXISTS ops_stock_snapshot_natural_key
  ON public.ops_stock_snapshot (fecha_snapshot, almacen_base, referencia);

NOTIFY pgrst, 'reload schema';