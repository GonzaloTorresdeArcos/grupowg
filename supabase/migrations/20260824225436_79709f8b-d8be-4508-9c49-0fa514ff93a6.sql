-- ═══════════════════════════════════════════════════════════════════════════
-- F4B.1 · ops_carga_log + ops_as_of
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ops_carga_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dominio text NOT NULL CHECK (dominio IN (
    'ot','rrhh','coste','geo','registry','alias',
    'pieza_solicitud','expedicion','expedicion_linea','stock','calendario')),
  fuente text,
  last_successful_load timestamptz,
  data_as_of_date date,
  filas int,
  origen text NOT NULL DEFAULT 'importador' CHECK (origen IN ('importador','migracion','manual')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_carga_log TO authenticated;
GRANT ALL ON public.ops_carga_log TO service_role;

ALTER TABLE public.ops_carga_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "management gestiona ops_carga_log" ON public.ops_carga_log;
CREATE POLICY "management gestiona ops_carga_log"
  ON public.ops_carga_log FOR ALL TO authenticated
  USING (public.is_management(auth.uid()))
  WITH CHECK (public.is_management(auth.uid()));

CREATE INDEX IF NOT EXISTS ops_carga_log_dominio_idx
  ON public.ops_carga_log (dominio, data_as_of_date DESC NULLS LAST);

-- Fecha efectiva del dato de un dominio. Para 'ot' nunca devuelve NULL:
-- sin registro cae a la fecha de hoy para no romper el cálculo.
CREATE OR REPLACE FUNCTION public.ops_as_of(p_dominio text DEFAULT 'ot')
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN p_dominio = 'ot' THEN COALESCE(t.m, CURRENT_DATE) ELSE t.m END
  FROM (SELECT max(data_as_of_date) AS m
        FROM public.ops_carga_log WHERE dominio = p_dominio) t;
$$;

-- ── Semilla con el estado real de hoy ───────────────────────────────────────
DELETE FROM public.ops_carga_log WHERE origen = 'migracion';

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'ot', 'ops_fact_ot', max(created_at),
       GREATEST(max(fecha_creacion), max(fecha_cierre), max(fecha_primer_contacto), max(fecha_primera_visita)),
       count(*), 'migracion',
       'Fecha efectiva = última fecha operativa observada en el fichero cargado.'
FROM public.ops_fact_ot;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'rrhh', 'ops_rrhh', max(created_at),
       (max(mes) + INTERVAL '1 month - 1 day')::date, count(*), 'migracion',
       'Fecha efectiva = último día del último mes cargado.'
FROM public.ops_rrhh HAVING count(*) > 0;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'coste', 'ops_coste_mensual', NULL,
       (max(mes) + INTERVAL '1 month - 1 day')::date, count(*), 'migracion',
       'Fecha efectiva = último día del último mes cargado.'
FROM public.ops_coste_mensual HAVING count(*) > 0;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'registry', 'ops_sla_registry', max(created_at), max(created_at)::date, count(*), 'migracion',
       'Reglas contractuales extraídas; todas en estado borrador.'
FROM public.ops_sla_registry HAVING count(*) > 0;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'alias', 'ops_cliente_contrato_alias', max(created_at), max(created_at)::date, count(*), 'migracion',
       'Alias ERP → cliente contractual declarados manualmente.'
FROM public.ops_cliente_contrato_alias HAVING count(*) > 0;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'calendario', 'ops_calendario_laboral', max(created_at), max(created_at)::date, count(*), 'migracion', NULL
FROM public.ops_calendario_laboral HAVING count(*) > 0;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
SELECT 'geo', 'ops_cp_geo', NULL, NULL, count(*), 'migracion',
       'Maestro geográfico estático: no tiene fecha efectiva propia.'
FROM public.ops_cp_geo;

INSERT INTO public.ops_carga_log (dominio, fuente, last_successful_load, data_as_of_date, filas, origen, notas)
VALUES
  ('pieza_solicitud','ops_pieza_solicitud', NULL, NULL, 0, 'migracion', 'Tabla creada y vacía: sin fecha efectiva.'),
  ('expedicion','ops_expedicion', NULL, NULL, 0, 'migracion', 'Tabla creada y vacía: sin fecha efectiva.'),
  ('expedicion_linea','ops_expedicion_linea', NULL, NULL, 0, 'migracion', 'Tabla creada y vacía: sin fecha efectiva.'),
  ('stock','ops_stock_snapshot', NULL, NULL, 0, 'migracion', 'Tabla creada y vacía: sin fecha efectiva.');

-- ═══════════════════════════════════════════════════════════════════════════
-- F4B.2 · Las RPC de antigüedad dejan de mirar el reloj y miran el as-of
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ops_kpis(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
WITH asof AS (SELECT public.ops_as_of('ot') AS d),
base AS (
  SELECT fecha_creacion, fecha_cierre, situacion, es_baja, es_nff, kpi_20d, kpi_30d, dias_cierre, fact_sat
  FROM public.ops_fact_ot
  WHERE es_anulado = false
    AND (p_delegacion IS NULL OR delegacion = p_delegacion)
    AND (p_cliente IS NULL OR cliente_wg = p_cliente)
    AND (p_gama IS NULL OR gama_real = p_gama)
    AND (p_familia IS NULL OR familia = p_familia)
    AND (p_marca IS NULL OR marca = p_marca)
    AND (p_provincia IS NULL OR provincia = p_provincia)
    AND (p_sat IS NULL OR sat = p_sat)
    AND (p_tecnico IS NULL OR tecnico = p_tecnico)
    AND (p_canal IS NULL OR canal = p_canal)
),
cer AS (
  SELECT COUNT(*) n, COUNT(*) FILTER (WHERE es_baja) bajas, COUNT(*) FILTER (WHERE es_nff) nff,
    COUNT(*) FILTER (WHERE kpi_20d) sla20, COUNT(*) FILTER (WHERE kpi_30d) sla30,
    COALESCE(AVG(dias_cierre) FILTER (WHERE dias_cierre > 0),0) dias, COALESCE(SUM(fact_sat),0) coste_sat
  FROM base
  WHERE situacion IN ('Cerrado','Baja')
    AND (p_from IS NULL OR fecha_cierre >= p_from)
    AND (p_to IS NULL OR fecha_cierre <= p_to)
),
cre AS (
  SELECT COUNT(*) n FROM base
  WHERE (p_from IS NULL OR fecha_creacion >= p_from)
    AND (p_to IS NULL OR fecha_creacion <= p_to)
),
abi AS (
  SELECT COUNT(*) n,
    COUNT(*) FILTER (WHERE fecha_creacion IS NOT NULL AND (a.d - fecha_creacion) > 30) n30,
    COUNT(*) FILTER (WHERE fecha_creacion IS NOT NULL AND (a.d - fecha_creacion) > 20) n20
  FROM base, asof a WHERE situacion = 'Abierto'
)
SELECT jsonb_build_object(
  'as_of', (SELECT d FROM asof),
  'creadas', cre.n, 'cerradas', cer.n, 'bajas', cer.bajas, 'nff', cer.nff,
  'pct_bajas', CASE WHEN cer.n>0 THEN cer.bajas::numeric/cer.n ELSE 0 END,
  'pct_nff', CASE WHEN cer.n>0 THEN cer.nff::numeric/cer.n ELSE 0 END,
  'pct_sla20', CASE WHEN cer.n>0 THEN cer.sla20::numeric/cer.n ELSE 0 END,
  'pct_sla30', CASE WHEN cer.n>0 THEN cer.sla30::numeric/cer.n ELSE 0 END,
  'dias_medio', cer.dias, 'abiertas_total', abi.n, 'abiertas_30', abi.n30, 'abiertas_20', abi.n20,
  'coste_sat_total', cer.coste_sat,
  'coste_sat_medio', CASE WHEN cer.n>0 THEN cer.coste_sat/cer.n ELSE 0 END,
  'balance', cre.n - cer.n
) FROM cer, cre, abi;
$function$;

CREATE OR REPLACE FUNCTION public.ops_alertas(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_prev_from date := (v_from - (v_to - v_from + 1))::date;
  v_prev_to date := (v_from - 1)::date;
  v jsonb;
BEGIN
  WITH filtrada AS (
    SELECT f.* FROM public.ops_fact_ot f
    WHERE f.es_anulado=false
      AND (p_delegacion IS NULL OR f.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR f.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR f.gama_real = p_gama)
      AND (p_familia IS NULL OR f.familia = p_familia)
      AND (p_marca IS NULL OR f.marca = p_marca)
      AND (p_provincia IS NULL OR f.provincia = p_provincia)
      AND (p_sat IS NULL OR f.sat = p_sat)
      AND (p_tecnico IS NULL OR f.tecnico = p_tecnico)
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  caidas AS (
    SELECT f.tecnico,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to) AS n_now,
      COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) AS n_prev
    FROM filtrada f
    LEFT JOIN public.ops_tecnicos t ON t.tecnico = f.tecnico
    WHERE f.situacion IN ('Cerrado','Baja') AND f.tecnico IS NOT NULL AND COALESCE(t.activo, true)
    GROUP BY f.tecnico
    HAVING COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to) >= 10
       AND COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_from AND v_to)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE fecha_cierre BETWEEN v_prev_from AND v_prev_to), 0) < 0.6
    ORDER BY (n_now::numeric / NULLIF(n_prev,0)) ASC LIMIT 10
  ),
  calidad AS (
    SELECT b.tecnico, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) AS pct_bajas,
      AVG(bm.pct_bajas)/100.0 AS pct_bajas_esp,
      COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) AS pct_nff,
      AVG(bm.pct_nff)/100.0 AS pct_nff_esp
    FROM filtrada b
    LEFT JOIN public.ops_benchmark bm ON bm.familia = b.familia AND bm.cliente_wg = b.cliente_wg
    WHERE b.situacion IN ('Cerrado','Baja') AND b.tecnico IS NOT NULL
      AND b.fecha_cierre BETWEEN v_from AND v_to
    GROUP BY b.tecnico
    HAVING COUNT(*) >= 20
       AND (COUNT(*) FILTER (WHERE b.es_baja)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_bajas)/100.0, 0)
         OR COUNT(*) FILTER (WHERE b.es_nff)::numeric / COUNT(*) > 2 * NULLIF(AVG(bm.pct_nff)/100.0, 0))
    LIMIT 10
  ),
  provincias AS (
    SELECT provincia, COUNT(*) AS abiertas_30
    FROM filtrada
    WHERE situacion='Abierto' AND provincia IS NOT NULL AND (v_asof - fecha_creacion) > 30
    GROUP BY provincia ORDER BY abiertas_30 DESC LIMIT 8
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'caidas', COALESCE((SELECT jsonb_agg(row_to_json(caidas)) FROM caidas), '[]'::jsonb),
    'calidad', COALESCE((SELECT jsonb_agg(row_to_json(calidad)) FROM calidad), '[]'::jsonb),
    'provincias', COALESCE((SELECT jsonb_agg(row_to_json(provincias)) FROM provincias), '[]'::jsonb)
  ) INTO v; RETURN v;
END; $function$;

CREATE OR REPLACE FUNCTION public.ops_panorama(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text, p_meses integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_meses int := GREATEST(1, LEAST(COALESCE(p_meses, 12), 24));
  v jsonb;
BEGIN
  WITH filtrada AS (
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
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  balance AS (
    SELECT
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_creacion IS NOT NULL AND fecha_creacion < v_from
          AND (fecha_cierre IS NULL OR fecha_cierre >= v_from)) AS backlog_ini,
      (SELECT COUNT(*) FROM filtrada WHERE fecha_creacion BETWEEN v_from AND v_to) AS entrantes,
      (SELECT COUNT(*) FROM filtrada WHERE situacion = 'Cerrado' AND fecha_cierre BETWEEN v_from AND v_to) AS reparadas,
      (SELECT COUNT(*) FROM filtrada WHERE situacion = 'Baja' AND fecha_cierre BETWEEN v_from AND v_to) AS bajas,
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_to
          AND (fecha_cierre IS NULL OR fecha_cierre > v_to)) AS backlog_fin,
      (SELECT COUNT(*) FROM filtrada
        WHERE fecha_cierre BETWEEN v_from AND v_to AND fecha_creacion IS NULL) AS sin_fecha_creacion
  ),
  etapas AS (
    SELECT COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      ROUND(AVG((v_asof - fecha_creacion))::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE (v_asof - fecha_creacion) > 30) AS n30,
      COUNT(*) FILTER (WHERE (v_asof - fecha_creacion) > 60) AS n60
    FROM filtrada WHERE situacion = 'Abierto'
    GROUP BY 1
  ),
  meses AS (
    SELECT (date_trunc('month', LEAST(v_to, v_asof)::timestamp) - (make_interval(months => g)))::date AS m_ini
    FROM generate_series(0, v_meses - 1) g
  ),
  serie AS (
    SELECT
      m.m_ini AS mes,
      (SELECT COUNT(*) FROM filtrada f
        WHERE f.fecha_creacion IS NOT NULL
          AND f.fecha_creacion <= (m.m_ini + interval '1 month - 1 day')::date
          AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.m_ini + interval '1 month - 1 day')::date)
      ) AS backlog,
      (SELECT COUNT(*) FILTER (WHERE f.kpi_20d)::numeric / NULLIF(COUNT(*),0)
         FROM filtrada f
        WHERE f.situacion IN ('Cerrado','Baja')
          AND f.fecha_cierre >= m.m_ini
          AND f.fecha_cierre < (m.m_ini + interval '1 month')::date
      ) AS pct_sla20
    FROM meses m
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'balance', (SELECT row_to_json(b) FROM balance b),
    'etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM etapas ORDER BY n DESC) e), '[]'::jsonb),
    'serie', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (SELECT * FROM serie ORDER BY mes) s), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ops_sla(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_len int;
  v_prev_from date;
  v_prev_to date;
  v_snap_prev date;
  v jsonb;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_prev_from := (v_from - v_len)::date;
  v_prev_to := (v_from - 1)::date;
  v_snap_prev := (v_asof - v_len)::date;

  WITH filtrada AS (
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
      AND (p_canal IS NULL OR f.canal = p_canal)
  ),
  ab AS (
    SELECT f.*, (v_asof - f.fecha_creacion)::int AS edad
    FROM filtrada f WHERE f.situacion = 'Abierto'
  ),
  periodo AS (
    SELECT * FROM filtrada WHERE situacion IN ('Cerrado','Baja')
      AND fecha_cierre BETWEEN v_from AND v_to
  ),
  periodo_prev AS (
    SELECT * FROM filtrada WHERE situacion IN ('Cerrado','Baja')
      AND fecha_cierre BETWEEN v_prev_from AND v_prev_to
  ),
  tramos AS (
    SELECT COUNT(*) FILTER (WHERE dias_cierre <= 10) AS t0_10,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 11 AND 20) AS t11_20,
      COUNT(*) FILTER (WHERE dias_cierre BETWEEN 21 AND 30) AS t21_30,
      COUNT(*) FILTER (WHERE dias_cierre > 30) AS t_30_plus,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE kpi_20d) AS n_sla20,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo
  ),
  sla_prev AS (
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo_prev
  ),
  flujo AS (
    SELECT
      (SELECT COUNT(*) FROM filtrada WHERE fecha_creacion BETWEEN v_from AND v_to) AS creadas,
      (SELECT COUNT(*) FROM filtrada WHERE fecha_creacion BETWEEN v_prev_from AND v_prev_to) AS creadas_prev,
      (SELECT COUNT(*) FROM periodo) AS cerradas,
      (SELECT COUNT(*) FROM periodo_prev) AS cerradas_prev
  ),
  snap AS (
    SELECT COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      COUNT(*) FILTER (WHERE edad > 60) AS n60,
      COUNT(*) FILTER (WHERE estado IS NULL OR estado = '') AS sin_estado
    FROM ab
  ),
  snap_prev AS (
    SELECT COUNT(*) AS abiertas,
      ROUND(AVG(v_snap_prev - fecha_creacion)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE (v_snap_prev - fecha_creacion) > 30) AS n30,
      COUNT(*) FILTER (WHERE (v_snap_prev - fecha_creacion) > 60) AS n60
    FROM filtrada
    WHERE fecha_creacion IS NOT NULL AND fecha_creacion <= v_snap_prev
      AND (fecha_cierre IS NULL OR fecha_cierre > v_snap_prev)
  ),
  bucket_rows AS (
    SELECT CASE
        WHEN GREATEST(edad,0) <= 5 THEN '0-5'
        WHEN edad BETWEEN 6 AND 10 THEN '6-10'
        WHEN edad BETWEEN 11 AND 20 THEN '11-20'
        WHEN edad BETWEEN 21 AND 30 THEN '21-30'
        WHEN edad BETWEEN 31 AND 45 THEN '31-45'
        WHEN edad BETWEEN 46 AND 60 THEN '46-60'
        ELSE '>60' END AS bucket,
      COALESCE(NULLIF(estado,''),'(sin estado)') AS est
    FROM ab
  ),
  buckets AS (
    SELECT b.bucket, COUNT(*) AS total,
      (SELECT s.est FROM (
          SELECT br2.est, COUNT(*) AS cn FROM bucket_rows br2 WHERE br2.bucket = b.bucket
          GROUP BY br2.est ORDER BY cn DESC, br2.est LIMIT 1
        ) s) AS estado_pred,
      (SELECT s.cn FROM (
          SELECT br2.est, COUNT(*) AS cn FROM bucket_rows br2 WHERE br2.bucket = b.bucket
          GROUP BY br2.est ORDER BY cn DESC, br2.est LIMIT 1
        ) s) AS estado_pred_n
    FROM bucket_rows b GROUP BY b.bucket
  ),
  etapas AS (
    SELECT COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n,
      ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30,
      COUNT(*) FILTER (WHERE edad > 60) AS n60
    FROM ab GROUP BY 1
  ),
  del_base AS (
    SELECT ab.*, COALESCE(NULLIF(ab.delegacion,''),'Red SAT externa') AS dele FROM ab
  ),
  deleg AS (
    SELECT dele, COUNT(*) AS abiertas, ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30, COUNT(*) FILTER (WHERE edad > 60) AS n60
    FROM del_base GROUP BY dele
  ),
  deleg_ot AS (
    SELECT DISTINCT ON (dele) dele, num_ot, edad FROM del_base ORDER BY dele, edad DESC, num_ot
  ),
  deleg_etapa AS (
    SELECT DISTINCT ON (dele) dele, estado_dom, n_dom FROM (
      SELECT dele, COALESCE(NULLIF(estado,''),'(sin estado)') AS estado_dom, COUNT(*) AS n_dom
      FROM del_base WHERE edad > 30 GROUP BY 1,2
    ) s ORDER BY dele, n_dom DESC, estado_dom
  ),
  deleg_sla AS (
    SELECT COALESCE(NULLIF(delegacion,''),'Red SAT externa') AS dele,
      COUNT(*) AS cerradas, COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo GROUP BY 1
  ),
  deleg_final AS (
    SELECT d.dele AS delegacion, d.abiertas, d.edad_media, d.n30, d.n60,
      o.edad AS dias_mas_antigua, o.num_ot AS ot_mas_antigua,
      e.estado_dom, e.n_dom, COALESCE(s.cerradas, 0) AS cerradas, s.pct_sla20
    FROM deleg d
    LEFT JOIN deleg_ot o ON o.dele = d.dele
    LEFT JOIN deleg_etapa e ON e.dele = d.dele
    LEFT JOIN deleg_sla s ON s.dele = d.dele
  ),
  tec AS (
    SELECT tecnico, MAX(delegacion) AS delegacion, COUNT(*) AS abiertas,
      ROUND(AVG(edad)::numeric,1) AS edad_media, COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM ab WHERE tecnico IS NOT NULL GROUP BY tecnico
  ),
  tec_sla AS (
    SELECT tecnico, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo WHERE tecnico IS NOT NULL GROUP BY tecnico
  ),
  tecnicos AS (
    SELECT t.tecnico, t.delegacion, t.abiertas, t.edad_media, t.n30,
      COALESCE(s.cerradas,0) AS cerradas, s.pct_sla20
    FROM tec t LEFT JOIN tec_sla s ON s.tecnico = t.tecnico
    ORDER BY t.n30 DESC, t.abiertas DESC LIMIT 100
  ),
  tec_etapas AS (
    SELECT tecnico, COALESCE(NULLIF(estado,''),'(sin estado)') AS estado,
      COUNT(*) AS n, COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM ab WHERE tecnico IS NOT NULL GROUP BY 1,2
  ),
  cli AS (
    SELECT cliente_wg AS cliente, COUNT(*) AS abiertas, ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30, MAX(edad) AS dias_mas_antigua
    FROM ab WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  cli_sla AS (
    SELECT cliente_wg AS cliente, COUNT(*) AS cerradas,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS pct_sla20
    FROM periodo WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  cli_prev AS (
    SELECT cliente_wg AS cliente, COUNT(*) AS cerradas_prev,
      COUNT(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(COUNT(*),0) AS sla_prev
    FROM periodo_prev WHERE cliente_wg IS NOT NULL GROUP BY cliente_wg
  ),
  clientes AS (
    SELECT c.cliente, c.abiertas, c.edad_media, c.n30, c.dias_mas_antigua,
      COALESCE(s.cerradas,0) AS cerradas, COALESCE(p.cerradas_prev,0) AS cerradas_prev,
      s.pct_sla20, p.sla_prev
    FROM cli c
    LEFT JOIN cli_sla s ON s.cliente = c.cliente
    LEFT JOIN cli_prev p ON p.cliente = c.cliente
    ORDER BY c.n30 DESC, c.abiertas DESC LIMIT 30
  ),
  prod AS (
    SELECT dim, valor, COUNT(*) AS abiertas, ROUND(AVG(edad)::numeric,1) AS edad_media,
      COUNT(*) FILTER (WHERE edad > 30) AS n30
    FROM (
      SELECT 'gama'::text AS dim, gama_real AS valor, edad FROM ab WHERE gama_real IS NOT NULL AND gama_real <> ''
      UNION ALL SELECT 'familia', familia, edad FROM ab WHERE familia IS NOT NULL AND familia <> ''
      UNION ALL SELECT 'marca', marca, edad FROM ab WHERE marca IS NOT NULL AND marca <> '' AND marca <> 'SIN MARCA'
    ) x GROUP BY dim, valor HAVING COUNT(*) >= 5
  ),
  meses AS (
    SELECT generate_series(date_trunc('month', v_asof::timestamp) - INTERVAL '11 months', date_trunc('month', v_asof::timestamp), '1 month')::date AS mes
  ),
  evo AS (
    SELECT m.mes, COUNT(f.id) AS abiertas,
      ROUND(AVG(((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion)::numeric,1) AS edad_media,
      COUNT(f.id) FILTER (WHERE (((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion) > 30) AS n30
    FROM meses m
    LEFT JOIN filtrada f ON f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY m.mes
  ),
  meses6 AS (
    SELECT generate_series(date_trunc('month', v_asof::timestamp) - INTERVAL '5 months', date_trunc('month', v_asof::timestamp), '1 month')::date AS mes
  ),
  evo_deleg AS (
    SELECT COALESCE(NULLIF(f.delegacion,''),'Red SAT externa') AS delegacion, m.mes,
      COUNT(f.id) AS abiertas,
      ROUND(AVG(((m.mes + INTERVAL '1 month - 1 day')::date) - f.fecha_creacion)::numeric,1) AS edad_media
    FROM meses6 m
    LEFT JOIN filtrada f ON f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY 1, m.mes
  ),
  meses4 AS (
    SELECT generate_series(date_trunc('month', v_asof::timestamp) - INTERVAL '3 months', date_trunc('month', v_asof::timestamp), '1 month')::date AS mes
  ),
  top_tecs AS (
    SELECT tecnico, COUNT(*) AS n FROM ab WHERE tecnico IS NOT NULL GROUP BY tecnico ORDER BY n DESC LIMIT 50
  ),
  evo_tec AS (
    SELECT tt.tecnico, m.mes, COUNT(f.id) AS abiertas
    FROM meses4 m CROSS JOIN top_tecs tt
    LEFT JOIN filtrada f ON f.tecnico = tt.tecnico
      AND f.fecha_creacion IS NOT NULL
      AND f.fecha_creacion <= (m.mes + INTERVAL '1 month - 1 day')::date
      AND (f.fecha_cierre IS NULL OR f.fecha_cierre > (m.mes + INTERVAL '1 month - 1 day')::date)
    GROUP BY tt.tecnico, m.mes
  ),
  cal AS (
    SELECT
      COUNT(*) FILTER (WHERE estado IS NULL OR estado = '') AS sin_estado,
      COUNT(*) FILTER (WHERE edad < 0) AS edad_negativa,
      (SELECT COUNT(*) FROM filtrada
        WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre IS NOT NULL AND fecha_creacion IS NOT NULL
          AND fecha_cierre < fecha_creacion) AS cierre_prev_apertura,
      COUNT(*) FILTER (WHERE tipo_recurso = 'Tecnico propio' AND (delegacion IS NULL OR delegacion = '')) AS propios_sin_delegacion,
      COUNT(*) FILTER (WHERE tipo_recurso = 'Tecnico propio' AND tecnico IS NULL) AS propios_sin_tecnico,
      COUNT(*) FILTER (WHERE tipo_recurso = 'SAT externo' AND (delegacion IS NULL OR delegacion = '')) AS red_sat_sin_delegacion
    FROM ab
  ),
  dup AS (
    SELECT COUNT(*) AS n FROM (SELECT num_ot FROM ab GROUP BY num_ot HAVING COUNT(*) > 1) s
  ),
  abiertas_list AS (
    SELECT num_ot, cliente_wg, familia, provincia, tecnico, sat, delegacion,
      COALESCE(NULLIF(estado,''),'(sin estado)') AS estado, fecha_creacion, edad AS dias_abierta
    FROM ab ORDER BY fecha_creacion ASC NULLS LAST LIMIT 500
  ),
  prov_30 AS (
    SELECT provincia, COUNT(*) AS n FROM ab WHERE provincia IS NOT NULL AND edad > 30
    GROUP BY provincia ORDER BY n DESC LIMIT 20
  ),
  sat_30 AS (
    SELECT sat, COUNT(*) AS n FROM ab WHERE sat IS NOT NULL AND edad > 30
    GROUP BY sat ORDER BY n DESC LIMIT 20
  )
  SELECT jsonb_build_object(
    'as_of', v_asof,
    'snapshot_prev_fecha', v_snap_prev,
    'tramos', (SELECT row_to_json(tramos) FROM tramos),
    'sla_prev', (SELECT row_to_json(sla_prev) FROM sla_prev),
    'flujo', (SELECT row_to_json(flujo) FROM flujo),
    'snapshot', (SELECT row_to_json(snap) FROM snap),
    'snapshot_prev', (SELECT row_to_json(snap_prev) FROM snap_prev),
    'buckets', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM buckets) e), '[]'::jsonb),
    'etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM etapas ORDER BY n DESC) e), '[]'::jsonb),
    'delegaciones', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM deleg_final ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'tecnicos', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM tecnicos ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'tec_etapas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM tec_etapas e), '[]'::jsonb),
    'clientes', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM clientes ORDER BY n30 DESC, abiertas DESC) e), '[]'::jsonb),
    'producto', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM prod ORDER BY dim, n30 DESC) e), '[]'::jsonb),
    'evo', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo ORDER BY mes) e), '[]'::jsonb),
    'evo_deleg', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_deleg ORDER BY delegacion, mes) e), '[]'::jsonb),
    'evo_tec', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM evo_tec ORDER BY tecnico, mes) e), '[]'::jsonb),
    'calidad', (SELECT row_to_json(cal)::jsonb FROM cal) || jsonb_build_object('duplicados_abiertas', (SELECT n FROM dup)),
    'abiertas', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM abiertas_list e), '[]'::jsonb),
    'prov_30', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM prov_30 ORDER BY n DESC) e), '[]'::jsonb),
    'sat_30', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM (SELECT * FROM sat_30 ORDER BY n DESC) e), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- F4B.3 · ops_supply: as-of, cliente contractual por ALIAS y desglose por gama
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ops_supply(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_delegacion text DEFAULT NULL::text, p_cliente text DEFAULT NULL::text, p_gama text DEFAULT NULL::text, p_familia text DEFAULT NULL::text, p_marca text DEFAULT NULL::text, p_provincia text DEFAULT NULL::text, p_sat text DEFAULT NULL::text, p_tecnico text DEFAULT NULL::text, p_canal text DEFAULT NULL::text, p_prev_from date DEFAULT NULL::date, p_prev_to date DEFAULT NULL::date)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_len int; v_pfrom date; v_pto date;
  v_dem jsonb; v_dem_prev jsonb; v_pte jsonb; v_conv jsonb; v_conv_prev jsonb;
  v_conv_gama jsonb; v_expo jsonb; v_cadena jsonb; v_pte_prev bigint;
BEGIN
  v_len := (v_to - v_from) + 1;
  v_pfrom := COALESCE(p_prev_from, (v_from - v_len)::date);
  v_pto := COALESCE(p_prev_to, (v_from - 1)::date);

  WITH per AS (
    SELECT * FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE fecha_creacion BETWEEN v_from AND v_to
  ),
  d(dim, entidad, ots, con_pieza) AS (
    SELECT 'cliente', COALESCE(cliente_wg,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'gama', COALESCE(gama_real,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'delegacion', COALESCE(delegacion,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'sat', COALESCE(sat,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
    UNION ALL SELECT 'provincia', COALESCE(provincia,'(sin dato)'), count(*), count(*) FILTER (WHERE tiene_piezas IS TRUE) FROM per GROUP BY 2
  ),
  agg AS (
    SELECT dim, jsonb_agg(jsonb_build_object('entidad', entidad, 'ots', ots, 'con_pieza', con_pieza,
             'pct', round(con_pieza::numeric / NULLIF(ots,0), 4)) ORDER BY con_pieza DESC, ots DESC) j
    FROM d GROUP BY dim
  ),
  tot AS (SELECT count(*) n, count(*) FILTER (WHERE tiene_piezas IS TRUE) cp FROM per)
  SELECT jsonb_build_object(
    'ots', t.n, 'con_pieza', t.cp,
    'pct', CASE WHEN t.n = 0 THEN NULL ELSE round(t.cp::numeric / t.n, 4) END,
    'por_cliente',    COALESCE((SELECT j FROM agg WHERE dim='cliente'), '[]'::jsonb),
    'por_gama',       COALESCE((SELECT j FROM agg WHERE dim='gama'), '[]'::jsonb),
    'por_delegacion', COALESCE((SELECT j FROM agg WHERE dim='delegacion'), '[]'::jsonb),
    'por_sat',        COALESCE((SELECT j FROM agg WHERE dim='sat'), '[]'::jsonb),
    'por_provincia',  COALESCE((SELECT j FROM agg WHERE dim='provincia'), '[]'::jsonb)
  ) INTO v_dem FROM tot t;

  SELECT jsonb_build_object(
    'ots', count(*), 'con_pieza', count(*) FILTER (WHERE tiene_piezas IS TRUE),
    'pct', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(*) FILTER (WHERE tiene_piezas IS TRUE)::numeric / count(*), 4) END
  ) INTO v_dem_prev
  FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  WHERE fecha_creacion BETWEEN v_pfrom AND v_pto;

  SELECT count(*) INTO v_pte_prev
  FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  WHERE upper(COALESCE(estado,'')) = 'PTE. PIEZAS'
    AND fecha_creacion IS NOT NULL AND fecha_creacion <= v_pto
    AND (fecha_cierre IS NULL OR fecha_cierre > v_pto);

  WITH base AS (
    SELECT * FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
  ),
  pte0 AS (SELECT b.*, (v_asof - b.fecha_creacion)::int edad FROM base b
          WHERE b.situacion = 'Abierto' AND upper(COALESCE(b.estado,'')) = 'PTE. PIEZAS'),
  -- Resolución cliente ERP → cliente contractual SOLO por alias declarado.
  -- Nunca por parecido de nombre: ELECTRO DEPOT y SAUBER son clientes distintos.
  pte AS (
    SELECT p.*, a.cliente_contractual
    FROM pte0 p
    LEFT JOIN public.ops_cliente_contrato_alias a
      ON a.cliente_wg_real = p.cliente_wg
     AND (a.vigencia_desde IS NULL OR a.vigencia_desde <= v_asof)
     AND (a.vigencia_hasta IS NULL OR a.vigencia_hasta >= v_asof)
  ),
  d(dim, entidad, n, edad_media, n30) AS (
    SELECT 'cliente', COALESCE(cliente_wg,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'cliente_contractual',
      COALESCE(cliente_contractual, '(sin resolver) ' || COALESCE(cliente_wg,'(sin dato)')),
      count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'gama', COALESCE(gama_real,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'delegacion', COALESCE(delegacion,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'sat', COALESCE(sat,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
    UNION ALL SELECT 'provincia', COALESCE(provincia,'(sin dato)'), count(*), round(avg(edad)::numeric,1), count(*) FILTER (WHERE edad>30) FROM pte GROUP BY 2
  ),
  agg AS (
    SELECT dim, jsonb_agg(jsonb_build_object('entidad',entidad,'n',n,'edad_media',edad_media,'n30',n30) ORDER BY n DESC) j
    FROM d GROUP BY dim
  ),
  bk AS (
    SELECT COALESCE(jsonb_object_agg(b, n), '{}'::jsonb) j FROM (
      SELECT CASE
        WHEN GREATEST(edad,0) <= 5 THEN '0-5'
        WHEN edad BETWEEN 6 AND 10 THEN '6-10'
        WHEN edad BETWEEN 11 AND 20 THEN '11-20'
        WHEN edad BETWEEN 21 AND 30 THEN '21-30'
        WHEN edad BETWEEN 31 AND 45 THEN '31-45'
        WHEN edad BETWEEN 46 AND 60 THEN '46-60'
        ELSE '>60' END b, count(*) n FROM pte GROUP BY 1) t
  ),
  res AS (SELECT count(*) n, round(avg(edad)::numeric,1) em, count(*) FILTER (WHERE edad>30) n30 FROM pte),
  ab AS (SELECT count(*) n FROM base WHERE situacion = 'Abierto')
  SELECT jsonb_build_object(
    'n', r.n, 'n_prev', v_pte_prev, 'edad_media', r.em, 'n30', r.n30,
    'abiertas_total', (SELECT n FROM ab),
    'buckets', (SELECT j FROM bk),
    'por_cliente',    COALESCE((SELECT j FROM agg WHERE dim='cliente'), '[]'::jsonb),
    'por_cliente_contractual', COALESCE((SELECT j FROM agg WHERE dim='cliente_contractual'), '[]'::jsonb),
    'por_gama',       COALESCE((SELECT j FROM agg WHERE dim='gama'), '[]'::jsonb),
    'por_delegacion', COALESCE((SELECT j FROM agg WHERE dim='delegacion'), '[]'::jsonb),
    'por_sat',        COALESCE((SELECT j FROM agg WHERE dim='sat'), '[]'::jsonb),
    'por_provincia',  COALESCE((SELECT j FROM agg WHERE dim='provincia'), '[]'::jsonb)
  ) INTO v_pte FROM res r;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_from AND v_to GROUP BY 1) t;

  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_conv_prev FROM (
    SELECT CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
      jsonb_build_object('n', count(*),
        'dias_medio', round(avg(dias_cierre)::numeric,1),
        'dias_mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1),
        'pct_20d', round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4),
        'pct_bajas', round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4),
        'pct_nff', round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4)) v
    FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
    WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_pfrom AND v_pto GROUP BY 1) t;

  -- Descomposición con/sin pieza DENTRO de cada gama: deja ver el efecto del mix
  -- sin que el sistema lo interprete como causalidad.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'gama', g, 'grupo', k, 'n', n, 'dias_medio', dm, 'dias_mediana', dmed,
           'pct_20d', p20, 'pct_bajas', pb, 'pct_nff', pn) ORDER BY g, k), '[]'::jsonb)
    INTO v_conv_gama FROM (
      SELECT COALESCE(gama_real,'(sin dato)') g,
        CASE WHEN tiene_piezas IS TRUE THEN 'con_pieza' ELSE 'sin_pieza' END k,
        count(*) n,
        round(avg(dias_cierre)::numeric,1) dm,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dias_cierre)::numeric,1) dmed,
        round(count(*) FILTER (WHERE kpi_20d)::numeric / NULLIF(count(*),0),4) p20,
        round(count(*) FILTER (WHERE es_baja)::numeric / NULLIF(count(*),0),4) pb,
        round(count(*) FILTER (WHERE es_nff)::numeric / NULLIF(count(*),0),4) pn
      FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
      WHERE situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN v_from AND v_to
      GROUP BY 1,2) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('cliente_wg', c, 'n', n, 'n30', n30) ORDER BY n DESC), '[]'::jsonb)
    INTO v_expo FROM (
      SELECT COALESCE(cliente_wg,'(sin dato)') c, count(*) n,
             count(*) FILTER (WHERE (v_asof - fecha_creacion) > 30) n30
      FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal)
      WHERE situacion = 'Abierto' AND upper(COALESCE(estado,'')) = 'PTE. PIEZAS' GROUP BY 1) t;

  SELECT jsonb_build_object(
    'solicitudes', (SELECT count(*) FROM public.ops_pieza_solicitud),
    'expediciones', (SELECT count(*) FROM public.ops_expedicion),
    'stock_filas', (SELECT count(*) FROM public.ops_stock_snapshot),
    'ots_con_pieza_periodo', (SELECT count(*) FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal) WHERE tiene_piezas IS TRUE AND fecha_creacion BETWEEN v_from AND v_to),
    'ots_con_pieza_trazadas', (SELECT count(DISTINCT f.num_ot) FROM public.ops_supply_filtrada(p_delegacion,p_cliente,p_gama,p_familia,p_marca,p_provincia,p_sat,p_tecnico,p_canal) f JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot WHERE f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to),
    'etapas', (SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT estado_pieza k, count(*) n FROM public.ops_pieza_solicitud GROUP BY 1) t),
    'expediciones_estado', (SELECT COALESCE(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT estado_expedicion k, count(*) n FROM public.ops_expedicion GROUP BY 1) t),
    'lead_times', (SELECT jsonb_build_object(
      'necesidad_solicitud', jsonb_build_object('n', count(*) FILTER (WHERE fecha_necesidad IS NOT NULL AND fecha_solicitud IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_solicitud - fecha_necesidad)/86400)::numeric,1)),
      'solicitud_disponibilidad', jsonb_build_object('n', count(*) FILTER (WHERE fecha_solicitud IS NOT NULL AND fecha_disponibilidad IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_disponibilidad - fecha_solicitud)/86400)::numeric,1)),
      'disponibilidad_picking', jsonb_build_object('n', count(*) FILTER (WHERE fecha_disponibilidad IS NOT NULL AND fecha_picking IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_picking - fecha_disponibilidad)/86400)::numeric,1)),
      'picking_expedicion', jsonb_build_object('n', count(*) FILTER (WHERE fecha_picking IS NOT NULL AND fecha_expedicion IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_expedicion - fecha_picking)/86400)::numeric,1)),
      'expedicion_entrega', jsonb_build_object('n', count(*) FILTER (WHERE fecha_expedicion IS NOT NULL AND fecha_entrega IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_entrega - fecha_expedicion)/86400)::numeric,1)),
      'entrega_montaje', jsonb_build_object('n', count(*) FILTER (WHERE fecha_entrega IS NOT NULL AND fecha_montaje IS NOT NULL),
        'medio', round(avg(EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric,1),
        'mediana', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM fecha_montaje - fecha_entrega)/86400)::numeric,1))
    ) FROM public.ops_pieza_solicitud)
  ) INTO v_cadena;

  RETURN jsonb_build_object(
    'as_of', v_asof,
    'rango', jsonb_build_object('from', v_from, 'to', v_to, 'prev_from', v_pfrom, 'prev_to', v_pto),
    'pieza_demanda', COALESCE(v_dem, '{}'::jsonb),
    'pieza_demanda_prev', COALESCE(v_dem_prev, '{}'::jsonb),
    'pte_piezas_actual', COALESCE(v_pte, '{}'::jsonb),
    'conversion', COALESCE(v_conv, '{}'::jsonb),
    'conversion_prev', COALESCE(v_conv_prev, '{}'::jsonb),
    'conversion_por_gama', COALESCE(v_conv_gama, '[]'::jsonb),
    'exposicion_pieza', COALESCE(v_expo, '[]'::jsonb),
    'cadena', COALESCE(v_cadena, '{}'::jsonb)
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- F4B.4 · ops_data_quality expone las cargas por dominio
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ops_data_quality()
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_fact jsonb; v_campos jsonb; v_rrhh jsonb; v_coste jsonb; v_geo jsonb;
  v_tablas jsonb; v_cal jsonb; v_clientes jsonb; v_supply jsonb; v_cargas jsonb;
  v_total bigint;
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
    'ops_stock_snapshot',          to_regclass('public.ops_stock_snapshot') IS NOT NULL,
    'ops_carga_log',               to_regclass('public.ops_carga_log') IS NOT NULL
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
      SELECT jsonb_build_object('existe', true, 'filas', count(*), 'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', COALESCE(fecha_solicitud, fecha_necesidad))),
        'ots_distintas', count(DISTINCT num_ot)) FROM public.ops_pieza_solicitud),
    'ops_expedicion', (
      SELECT jsonb_build_object('existe', true, 'filas', count(*), 'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', fecha_expedicion)),
        'ots_distintas', count(DISTINCT num_ot)) FROM public.ops_expedicion),
    'ops_stock_snapshot', (
      SELECT jsonb_build_object('existe', true, 'filas', count(*), 'ultima_carga', max(created_at),
        'meses', count(DISTINCT date_trunc('month', fecha_snapshot)),
        'ots_distintas', 0) FROM public.ops_stock_snapshot),
    'ots_con_pieza_total', (SELECT count(*) FROM public.ops_fact_ot WHERE tiene_piezas IS TRUE AND es_anulado = false),
    'ots_con_pieza_trazadas', (
      SELECT count(DISTINCT f.num_ot) FROM public.ops_fact_ot f
      JOIN public.ops_pieza_solicitud p ON p.num_ot = f.num_ot
      WHERE f.tiene_piezas IS TRUE AND f.es_anulado = false)
  );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'dominio', dominio, 'fuente', fuente,
           'last_successful_load', last_successful_load,
           'data_as_of_date', data_as_of_date,
           'filas', filas, 'origen', origen, 'notas', notas) ORDER BY dominio), '[]'::jsonb)
    INTO v_cargas
  FROM (
    SELECT DISTINCT ON (dominio) * FROM public.ops_carga_log
    ORDER BY dominio, data_as_of_date DESC NULLS LAST, created_at DESC
  ) c;

  RETURN jsonb_build_object(
    'generado_en', now(),
    'as_of_ot', public.ops_as_of('ot'),
    'cargas', v_cargas,
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