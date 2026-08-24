-- ─── 1. Tablas de Supply & Fulfilment ───────────────────────────────────────
CREATE TABLE public.ops_pieza_solicitud (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num_ot text NOT NULL,
  referencia text NOT NULL,
  descripcion text,
  cantidad numeric NOT NULL DEFAULT 1,
  proveedor text,
  fecha_necesidad timestamptz,
  fecha_solicitud timestamptz,
  fecha_disponibilidad timestamptz,
  fecha_picking timestamptz,
  fecha_expedicion timestamptz,
  fecha_entrega timestamptz,
  fecha_montaje timestamptz,
  estado_pieza text NOT NULL DEFAULT 'solicitada',
  coste_unitario numeric,
  imputabilidad_retraso text,
  origen_dato text NOT NULL DEFAULT 'importador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_pieza_solicitud_estado_chk CHECK (estado_pieza IN ('solicitada','pendiente_proveedor','disponible','en_picking','expedida','entregada','montada','anulada')),
  CONSTRAINT ops_pieza_solicitud_imput_chk CHECK (imputabilidad_retraso IS NULL OR imputabilidad_retraso IN ('wg','proveedor','cliente','sat','por_determinar')),
  CONSTRAINT ops_pieza_solicitud_origen_chk CHECK (origen_dato IN ('importador','manual')),
  CONSTRAINT ops_pieza_solicitud_clave UNIQUE (num_ot, referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_pieza_solicitud TO authenticated;
GRANT ALL ON public.ops_pieza_solicitud TO service_role;
ALTER TABLE public.ops_pieza_solicitud ENABLE ROW LEVEL SECURITY;
CREATE POLICY mgmt_all_pieza_solicitud ON public.ops_pieza_solicitud
  FOR ALL TO authenticated USING ((SELECT public.is_management())) WITH CHECK ((SELECT public.is_management()));
CREATE INDEX ops_pieza_solicitud_num_ot_idx ON public.ops_pieza_solicitud (num_ot);
CREATE INDEX ops_pieza_solicitud_estado_idx ON public.ops_pieza_solicitud (estado_pieza);
CREATE INDEX ops_pieza_solicitud_fsol_idx ON public.ops_pieza_solicitud (fecha_solicitud);

CREATE TABLE public.ops_expedicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num_ot text,
  referencia_expedicion text NOT NULL,
  transportista text,
  origen text,
  destino_cp text,
  destino_tipo text,
  fecha_expedicion timestamptz,
  fecha_entrega_prevista timestamptz,
  fecha_entrega_real timestamptz,
  estado_expedicion text NOT NULL DEFAULT 'preparada',
  coste_envio numeric,
  incidencia text,
  origen_dato text NOT NULL DEFAULT 'importador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_expedicion_destino_chk CHECK (destino_tipo IS NULL OR destino_tipo IN ('cliente','sat','delegacion','taller','proveedor')),
  CONSTRAINT ops_expedicion_estado_chk CHECK (estado_expedicion IN ('preparada','en_transito','entregada','incidencia','devuelta')),
  CONSTRAINT ops_expedicion_origen_chk CHECK (origen_dato IN ('importador','manual')),
  CONSTRAINT ops_expedicion_clave UNIQUE (referencia_expedicion)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_expedicion TO authenticated;
GRANT ALL ON public.ops_expedicion TO service_role;
ALTER TABLE public.ops_expedicion ENABLE ROW LEVEL SECURITY;
CREATE POLICY mgmt_all_expedicion ON public.ops_expedicion
  FOR ALL TO authenticated USING ((SELECT public.is_management())) WITH CHECK ((SELECT public.is_management()));
CREATE INDEX ops_expedicion_num_ot_idx ON public.ops_expedicion (num_ot);
CREATE INDEX ops_expedicion_estado_idx ON public.ops_expedicion (estado_expedicion);
CREATE INDEX ops_expedicion_fexp_idx ON public.ops_expedicion (fecha_expedicion);

CREATE TABLE public.ops_stock_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  almacen text NOT NULL,
  referencia text NOT NULL,
  descripcion text,
  cantidad numeric NOT NULL DEFAULT 0,
  cantidad_reservada numeric,
  coste_medio numeric,
  origen_dato text NOT NULL DEFAULT 'importador',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_stock_snapshot_origen_chk CHECK (origen_dato IN ('importador','manual')),
  CONSTRAINT ops_stock_snapshot_clave UNIQUE (fecha, almacen, referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_stock_snapshot TO authenticated;
GRANT ALL ON public.ops_stock_snapshot TO service_role;
ALTER TABLE public.ops_stock_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY mgmt_all_stock_snapshot ON public.ops_stock_snapshot
  FOR ALL TO authenticated USING ((SELECT public.is_management())) WITH CHECK ((SELECT public.is_management()));
CREATE INDEX ops_stock_snapshot_idx ON public.ops_stock_snapshot (fecha, almacen, referencia);

CREATE TRIGGER trg_pieza_solicitud_updated BEFORE UPDATE ON public.ops_pieza_solicitud
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expedicion_updated BEFORE UPDATE ON public.ops_expedicion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 2. ops_data_quality: añadir las tres fuentes de supply ─────────────────
CREATE OR REPLACE FUNCTION public.ops_data_quality()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fact jsonb; v_campos jsonb; v_rrhh jsonb; v_coste jsonb; v_geo jsonb;
  v_tablas jsonb; v_cal jsonb; v_clientes jsonb; v_supply jsonb; v_total bigint;
BEGIN
  SELECT count(*) INTO v_total FROM public.ops_fact_ot;

  SELECT jsonb_build_object(
    'filas', v_total,
    'min_fecha_creacion', min(fecha_creacion),
    'max_fecha_creacion', max(fecha_creacion),
    'ultima_importacion', max(created_at),
    'ultima_actualizacion', max(updated_at)
  ) INTO v_fact FROM public.ops_fact_ot;

  IF v_total = 0 THEN
    v_campos := '{}'::jsonb;
  ELSE
    SELECT jsonb_build_object(
      'num_ot',                 round(count(num_ot)::numeric / v_total, 4),
      'fecha_creacion',         round(count(fecha_creacion)::numeric / v_total, 4),
      'fecha_cierre',           round(count(fecha_cierre)::numeric / v_total, 4),
      'fecha_primer_contacto',  round(count(fecha_primer_contacto)::numeric / v_total, 4),
      'fecha_primera_visita',   round(count(fecha_primera_visita)::numeric / v_total, 4),
      'fecha_baja',             round(count(fecha_baja)::numeric / v_total, 4),
      'cliente_wg',             round(count(cliente_wg)::numeric / v_total, 4),
      'gama_real',              round(count(gama_real)::numeric / v_total, 4),
      'gama_origen',            round(count(gama_origen)::numeric / v_total, 4),
      'familia',                round(count(familia)::numeric / v_total, 4),
      'subfamilia',             round(count(subfamilia)::numeric / v_total, 4),
      'marca',                  round(count(marca)::numeric / v_total, 4),
      'modelo',                 round(count(modelo)::numeric / v_total, 4),
      'tecnico',                round(count(tecnico)::numeric / v_total, 4),
      'sat',                    round(count(sat)::numeric / v_total, 4),
      'tipo_recurso',           round(count(tipo_recurso)::numeric / v_total, 4),
      'delegacion',             round(count(delegacion)::numeric / v_total, 4),
      'provincia',              round(count(provincia)::numeric / v_total, 4),
      'municipio',              round(count(municipio)::numeric / v_total, 4),
      'codigo_postal',          round(count(codigo_postal)::numeric / v_total, 4),
      'canal',                  round(count(canal)::numeric / v_total, 4),
      'estado',                 round(count(estado)::numeric / v_total, 4),
      'situacion',              round(count(situacion)::numeric / v_total, 4),
      'incidencia',             round(count(incidencia)::numeric / v_total, 4),
      'es_baja',                round(count(es_baja)::numeric / v_total, 4),
      'es_nff',                 round(count(es_nff)::numeric / v_total, 4),
      'tiene_piezas',           round(count(tiene_piezas)::numeric / v_total, 4),
      'anio_garantia',          round(count(anio_garantia)::numeric / v_total, 4),
      'importe_mo',             round(count(importe_mo)::numeric / v_total, 4),
      'importe_desplazamiento', round(count(importe_desplazamiento)::numeric / v_total, 4),
      'fact_cli',               round(count(fact_cli)::numeric / v_total, 4),
      'fact_sat',               round(count(fact_sat)::numeric / v_total, 4),
      'dias_cierre',            round(count(dias_cierre)::numeric / v_total, 4),
      'sla_cierre_dlab',        round(count(sla_cierre_dlab)::numeric / v_total, 4)
    ) INTO v_campos FROM public.ops_fact_ot;
  END IF;

  SELECT jsonb_build_object('filas', count(*), 'meses', count(DISTINCT mes), 'ultimo_mes', max(mes))
    INTO v_rrhh FROM public.ops_rrhh;
  SELECT jsonb_build_object('filas', count(*), 'meses', count(DISTINCT mes), 'ultimo_mes', max(mes))
    INTO v_coste FROM public.ops_coste_mensual;

  SELECT jsonb_build_object(
    'filas_cp_geo', (SELECT count(*) FROM public.ops_cp_geo),
    'ots_domicilio', count(*),
    'ots_domicilio_geocodificables', count(g.cp),
    'pct_geocodificable', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(g.cp)::numeric / count(*), 4) END
  ) INTO v_geo
  FROM public.ops_fact_ot f
  LEFT JOIN public.ops_cp_geo g ON g.cp = f.codigo_postal
  WHERE f.canal = 'Domicilio';

  v_tablas := jsonb_build_object(
    'ops_visitas',                 to_regclass('public.ops_visitas') IS NOT NULL,
    'ops_historial_estados',       to_regclass('public.ops_historial_estados') IS NOT NULL,
    'ops_repuestos',               to_regclass('public.ops_repuestos') IS NOT NULL,
    'ops_reclamaciones',           to_regclass('public.ops_reclamaciones') IS NOT NULL,
    'ops_csat',                    to_regclass('public.ops_csat') IS NOT NULL,
    'ops_sla_registry',            to_regclass('public.ops_sla_registry') IS NOT NULL,
    'ops_cliente_contrato_alias',  to_regclass('public.ops_cliente_contrato_alias') IS NOT NULL,
    'ops_calendario_laboral',      to_regclass('public.ops_calendario_laboral') IS NOT NULL,
    'ops_pieza_solicitud',         to_regclass('public.ops_pieza_solicitud') IS NOT NULL,
    'ops_expedicion',              to_regclass('public.ops_expedicion') IS NOT NULL,
    'ops_stock_snapshot',          to_regclass('public.ops_stock_snapshot') IS NOT NULL
  );

  SELECT COALESCE(jsonb_object_agg(territorio, n), '{}'::jsonb) INTO v_cal
  FROM (SELECT territorio, count(*) n FROM public.ops_calendario_laboral GROUP BY 1) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'cliente_wg', cliente_wg, 'ots', n,
           'cob_primer_contacto', c1, 'cob_primera_visita', c2, 'cob_cierre', c3
         ) ORDER BY n DESC), '[]'::jsonb) INTO v_clientes
  FROM (
    SELECT cliente_wg, count(*) n,
           round(avg((fecha_primer_contacto IS NOT NULL)::int)::numeric, 4) c1,
           round(avg((fecha_primera_visita  IS NOT NULL)::int)::numeric, 4) c2,
           round(avg((fecha_cierre          IS NOT NULL)::int)::numeric, 4) c3
    FROM public.ops_fact_ot WHERE cliente_wg IS NOT NULL GROUP BY 1
  ) c;

  v_supply := jsonb_build_object(
    'ops_pieza_solicitud', (
      SELECT jsonb_build_object(
        'existe', true,
        'filas', count(*),
        'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', COALESCE(fecha_solicitud, fecha_necesidad))),
        'ots_distintas', count(DISTINCT num_ot)
      ) FROM public.ops_pieza_solicitud),
    'ops_expedicion', (
      SELECT jsonb_build_object(
        'existe', true,
        'filas', count(*),
        'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', fecha_expedicion)),
        'ots_distintas', count(DISTINCT num_ot)
      ) FROM public.ops_expedicion),
    'ops_stock_snapshot', (
      SELECT jsonb_build_object(
        'existe', true,
        'filas', count(*),
        'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', fecha)),
        'ots_distintas', 0
      ) FROM public.ops_stock_snapshot),
    'ots_con_pieza_total', (SELECT count(*) FROM public.ops_fact_ot WHERE tiene_piezas IS TRUE AND es_anulado = false),
    'ots_con_pieza_trazadas', (
      SELECT count(DISTINCT f.num_ot) FROM public.ops_fact_ot f
      JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot
      WHERE f.tiene_piezas IS TRUE AND f.es_anulado = false)
  );

  RETURN jsonb_build_object(
    'generado_en', now(),
    'fact_ot', v_fact,
    'campos_fact_ot', v_campos,
    'campos_ausentes_fact_ot', to_jsonb(ARRAY[
      'motivo_cierre','motivo_baja','imputabilidad','exclusion_sla','motivo_exclusion',
      'fecha_asignacion','fecha_llegada','fecha_inicio_intervencion','fecha_fin_intervencion',
      'fecha_solicitud_pieza','fecha_disponibilidad_pieza','fecha_expedicion','fecha_entrega',
      'visita_id','secuencia_visita','ot_anterior','reclamacion','programa','contrato_version',
      'business_line','tipologia_servicio','fase','calendario_laboral'
    ]),
    'rrhh', v_rrhh,
    'coste_mensual', v_coste,
    'geo', v_geo,
    'tablas', v_tablas,
    'calendario_laboral', v_cal,
    'clientes_erp', v_clientes,
    'supply', v_supply,
    'registry_reglas', (SELECT count(*) FROM public.ops_sla_registry)
  );
END;
$function$;

-- ─── 3. RPC ops_supply ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ops_supply(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL,
  p_familia text DEFAULT NULL, p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL,
  p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_prev_from date DEFAULT NULL, p_prev_to date DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from date := COALESCE(p_from, date_trunc('month', CURRENT_DATE)::date);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_len int;
  v_pfrom date; v_pto date;
  v_dem jsonb; v_dem_prev jsonb; v_pte jsonb; v_conv jsonb; v_conv_prev jsonb;
  v_expo jsonb; v_cadena jsonb; v_pte_prev bigint;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_pfrom := COALESCE(p_prev_from, (v_from - v_len)::date);
  v_pto := COALESCE(p_prev_to, (v_from - 1)::date);

  CREATE TEMP TABLE _f ON COMMIT DROP AS
    SELECT f.* FROM public.ops_fact_ot f
    WHERE f.es_anulado = false
      AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR f.gama_real = p_gama)
      AND (p_familia IS NULL OR f.familia = p_familia)
      AND (p_marca IS NULL OR f.marca = p_marca)
      AND (p_provincia IS NULL OR f.provincia = p_provincia)
      AND (p_sat IS NULL OR f.sat = p_sat)
      AND (p_tecnico IS NULL OR f.tecnico = p_tecnico)
      AND (p_canal IS NULL OR f.canal = p_canal);

  -- ── pieza_demanda: OTs creadas en el período con tiene_piezas ──
  SELECT jsonb_build_object(
    'ots', count(*),
    'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
    'pct', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4) END,
    'por_cliente', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'con_pieza')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(cliente_wg,'(sin dato)'), 'ots', count(*),
          'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
          'pct', round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4)) x
        FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to GROUP BY cliente_wg) s),
    'por_gama', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'con_pieza')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(gama_real,'(sin dato)'), 'ots', count(*),
          'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
          'pct', round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4)) x
        FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to GROUP BY gama_real) s),
    'por_delegacion', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'con_pieza')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(delegacion,'(sin dato)'), 'ots', count(*),
          'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
          'pct', round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4)) x
        FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to GROUP BY delegacion) s),
    'por_sat', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'con_pieza')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(sat,'(sin dato)'), 'ots', count(*),
          'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
          'pct', round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4)) x
        FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to GROUP BY sat) s),
    'por_provincia', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'con_pieza')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(provincia,'(sin dato)'), 'ots', count(*),
          'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
          'pct', round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4)) x
        FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to GROUP BY provincia) s)
  ) INTO v_dem FROM _f WHERE fecha_creacion BETWEEN v_from AND v_to;

  SELECT jsonb_build_object(
    'ots', count(*),
    'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
    'pct', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4) END
  ) INTO v_dem_prev FROM _f WHERE fecha_creacion BETWEEN v_pfrom AND v_pto;

  -- ── pte_piezas_actual: OTs abiertas hoy en PTE. PIEZAS ──
  CREATE TEMP TABLE _pte ON COMMIT DROP AS
    SELECT f.*, (CURRENT_DATE - f.fecha_creacion)::int AS edad
    FROM _f f WHERE f.situacion = 'Abierto' AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS';

  SELECT count(*) INTO v_pte_prev FROM _f
    WHERE upper(COALESCE(estado,'')) = 'PTE. PIEZAS'
      AND fecha_creacion IS NOT NULL AND fecha_creacion <= v_pto
      AND (fecha_cierre IS NULL OR fecha_cierre > v_pto);

  SELECT jsonb_build_object(
    'n', count(*),
    'n_prev', v_pte_prev,
    'edad_media', round(avg(edad)::numeric, 1),
    'abiertas_total', (SELECT count(*) FROM _f WHERE situacion = 'Abierto'),
    'buckets', (SELECT COALESCE(jsonb_object_agg(b, n), '{}'::jsonb) FROM (
        SELECT CASE
          WHEN GREATEST(edad,0) <= 5 THEN '0-5'
          WHEN edad BETWEEN 6 AND 10 THEN '6-10'
          WHEN edad BETWEEN 11 AND 20 THEN '11-20'
          WHEN edad BETWEEN 21 AND 30 THEN '21-30'
          WHEN edad BETWEEN 31 AND 45 THEN '31-45'
          WHEN edad BETWEEN 46 AND 60 THEN '46-60'
          ELSE '>60' END AS b, count(*) n FROM _pte GROUP BY 1) t),
    'por_cliente', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(cliente_wg,'(sin dato)'), 'n', count(*), 'edad_media', round(avg(edad)::numeric,1), 'n30', count(*) FILTER (WHERE edad > 30)) x
        FROM _pte GROUP BY cliente_wg) s),
    'por_gama', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(gama_real,'(sin dato)'), 'n', count(*), 'edad_media', round(avg(edad)::numeric,1), 'n30', count(*) FILTER (WHERE edad > 30)) x
        FROM _pte GROUP BY gama_real) s),
    'por_delegacion', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(delegacion,'(sin dato)'), 'n', count(*), 'edad_media', round(avg(edad)::numeric,1), 'n30', count(*) FILTER (WHERE edad > 30)) x
        FROM _pte GROUP BY delegacion) s),
    'por_sat', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(sat,'(sin dato)'), 'n', count(*), 'edad_media', round(avg(edad)::numeric,1), 'n30', count(*) FILTER (WHERE edad > 30)) x
        FROM _pte GROUP BY sat) s),
    'por_provincia', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('entidad', COALESCE(provincia,'(sin dato)'), 'n', count(*), 'edad_media', round(avg(edad)::numeric,1), 'n30', count(*) FILTER (WHERE edad > 30)) x
        FROM _pte GROUP BY provincia) s)
  ) INTO v_pte FROM _pte;

  -- ── conversion: cerradas en el período, con pieza vs sin pieza ──
  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END AS k,
      jsonb_build_object(
        'n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric, 1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric, 1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0), 4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0), 4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0), 4)
      ) AS v
    FROM _f WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_from AND v_to
    GROUP BY 1) t;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv_prev FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END AS k,
      jsonb_build_object(
        'n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric, 1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric, 1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0), 4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0), 4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0), 4)
      ) AS v
    FROM _f WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_pfrom AND v_pto
    GROUP BY 1) t;

  -- ── exposición contractual: PTE. PIEZAS por valor real de cliente_wg ──
  SELECT COALESCE(jsonb_agg(jsonb_build_object('cliente_wg', COALESCE(cliente_wg,'(sin dato)'), 'n', n, 'n30', n30) ORDER BY n DESC), '[]'::jsonb)
    INTO v_expo
  FROM (SELECT cliente_wg, count(*) n, count(*) FILTER (WHERE edad > 30) n30 FROM _pte GROUP BY 1) t;

  -- ── cadena: lead times reales (tablas hoy vacías → todo null) ──
  SELECT jsonb_build_object(
    'solicitudes', (SELECT count(*) FROM public.ops_pieza_solicitud),
    'expediciones', (SELECT count(*) FROM public.ops_expedicion),
    'stock_filas', (SELECT count(*) FROM public.ops_stock_snapshot),
    'ots_con_pieza_periodo', (SELECT count(*) FROM _f WHERE tiene_piezas IS TRUE AND fecha_creacion BETWEEN v_from AND v_to),
    'ots_con_pieza_trazadas', (
      SELECT count(DISTINCT f.num_ot) FROM _f f
      JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot
      WHERE f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to),
    'etapas', (SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) FROM (
        SELECT estado_pieza k, count(*) n FROM public.ops_pieza_solicitud GROUP BY 1) t),
    'lead_times', (SELECT jsonb_build_object(
        'necesidad_solicitud', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_necesidad IS NOT NULL AND fecha_solicitud IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric, 1)),
        'solicitud_disponibilidad', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_solicitud IS NOT NULL AND fecha_disponibilidad IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric, 1)),
        'disponibilidad_picking', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_disponibilidad IS NOT NULL AND fecha_picking IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric, 1)),
        'picking_expedicion', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_picking IS NOT NULL AND fecha_expedicion IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric, 1)),
        'expedicion_entrega', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_expedicion IS NOT NULL AND fecha_entrega IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric, 1)),
        'entrega_montaje', jsonb_build_object(
          'n', count(*) FILTER (WHERE fecha_entrega IS NOT NULL AND fecha_montaje IS NOT NULL),
          'medio', round(avg(EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric, 1),
          'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric, 1))
      ) FROM public.ops_pieza_solicitud)
  ) INTO v_cadena;

  DROP TABLE IF EXISTS _f;
  DROP TABLE IF EXISTS _pte;

  RETURN jsonb_build_object(
    'rango', jsonb_build_object('from', v_from, 'to', v_to, 'prev_from', v_pfrom, 'prev_to', v_pto),
    'pieza_demanda', COALESCE(v_dem, '{}'::jsonb),
    'pieza_demanda_prev', COALESCE(v_dem_prev, '{}'::jsonb),
    'pte_piezas_actual', COALESCE(v_pte, '{}'::jsonb),
    'conversion', COALESCE(v_conv, '{}'::jsonb),
    'conversion_prev', COALESCE(v_conv_prev, '{}'::jsonb),
    'exposicion_pieza', COALESCE(v_expo, '[]'::jsonb),
    'cadena', COALESCE(v_cadena, '{}'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.ops_supply(date,date,text,text,text,text,text,text,text,text,text,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_supply(date,date,text,text,text,text,text,text,text,text,text,date,date) TO authenticated;

NOTIFY pgrst, 'reload schema';