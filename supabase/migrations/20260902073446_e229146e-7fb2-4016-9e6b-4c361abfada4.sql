CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_ot(p_regla_version uuid)
RETURNS TABLE(
  programa_id uuid, claim_id uuid, regla_version_id uuid, num_ot text,
  poblacion text, start_date date, deadline_date date, end_date date,
  temporal_result text, reason_not_evaluable text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rv record; v_par jsonb; v_prog uuid; v_ini record; v_fin record;
  v_terr text; v_n int; v_asof date;
  v_cols text[] := ARRAY['fecha_creacion','fecha_primer_contacto','fecha_primera_visita'];
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  v_par := v_rv.parametros;
  v_terr := coalesce(v_par->>'territorio','ES');
  v_n := (v_par->>'deadline_dias')::int;
  IF v_n IS NULL OR v_n < 1 THEN RAISE EXCEPTION 'deadline_dias no representado'; END IF;
  IF v_par->>'deadline_unidad' IS DISTINCT FROM 'dias_laborables' THEN
    RAISE EXCEPTION 'unidad de deadline no soportada: %', v_par->>'deadline_unidad';
  END IF;

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN RAISE EXCEPTION 'programa no resuelto para la regla'; END IF;

  SELECT * INTO v_ini FROM public.ctr_mapping_evento_temporal m
   WHERE m.programa_id = v_prog AND m.evento = v_par->>'start_event' AND m.estado = 'APPROVED';
  SELECT * INTO v_fin FROM public.ctr_mapping_evento_temporal m
   WHERE m.programa_id = v_prog AND m.evento = v_par->>'end_event' AND m.estado = 'APPROVED';
  IF v_ini IS NULL OR v_fin IS NULL THEN RAISE EXCEPTION 'mapping de evento START/END no gobernado'; END IF;
  IF v_ini.grado IN ('PROXY','NOT_AVAILABLE') OR v_fin.grado IN ('PROXY','NOT_AVAILABLE') THEN
    RAISE EXCEPTION 'mapping PROXY/NOT_AVAILABLE: no se evalua como contractual';
  END IF;
  IF NOT (v_ini.campo_erp = ANY(v_cols)) OR NOT (v_fin.campo_erp = ANY(v_cols)) THEN
    RAISE EXCEPTION 'campo_erp no permitido';
  END IF;

  v_asof := public.ops_as_of('ot');

  RETURN QUERY EXECUTE format($q$
    WITH base AS (
      SELECT o.num_ot::text AS num_ot,
             o.%1$I::date AS s_date,
             o.%2$I::date AS e_date,
             (o.incidencia = 'ANULADO AVISO') AS anulado
        FROM public.ops_fact_ot o
       WHERE o.cliente_wg IN (SELECT co.valor_literal FROM public.ctr_correspondencia_operativa co
                               WHERE co.dimension = 'campo_ot' AND co.campo_erp = 'cliente_wg'
                                 AND co.programa_id = %3$L::uuid AND co.estado = 'APPROVED' AND co.determinista)
    ), rango AS (
      SELECT coalesce(min(s_date), current_date) AS d0,
             coalesce(max(s_date), current_date) + 120 AS d1 FROM base
    ), wd AS (
      SELECT d::date AS fecha, row_number() OVER (ORDER BY d) AS rn
        FROM rango, generate_series(rango.d0, rango.d1, interval '1 day') d
       WHERE extract(isodow FROM d) <= 5
         AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                          WHERE c.territorio = %4$L AND c.fecha = d::date AND NOT c.laborable)
    ), calc AS (
      SELECT b.*,
             (SELECT w2.fecha FROM wd w2
               WHERE w2.rn = (SELECT max(w1.rn) FROM wd w1 WHERE w1.fecha <= b.s_date) + %5$s) AS dl
        FROM base b
    )
    SELECT %3$L::uuid, %6$L::uuid, %7$L::uuid, c.num_ot,
           CASE WHEN c.anulado THEN 'anulado' ELSE 'servicio' END,
           c.s_date, c.dl, c.e_date,
           CASE
             WHEN c.anulado THEN 'NOT_EVALUABLE'
             WHEN c.s_date IS NULL OR c.dl IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date < c.s_date THEN 'NOT_EVALUABLE'
             WHEN c.s_date > %8$L::date OR c.e_date > %8$L::date THEN 'NOT_EVALUABLE'
             WHEN c.e_date <= c.dl THEN 'MET'
             ELSE 'MISSED'
           END,
           CASE
             WHEN c.anulado THEN 'aviso_anulado_excluido'
             WHEN c.s_date IS NULL THEN 'start_missing'
             WHEN c.dl IS NULL THEN 'calendario_fuera_de_cobertura'
             WHEN c.e_date IS NULL THEN 'end_missing'
             WHEN c.e_date < c.s_date THEN 'end_previo_a_start'
             WHEN c.s_date > %8$L::date OR c.e_date > %8$L::date THEN 'fecha_futura'
             ELSE NULL
           END
      FROM calc c
    $q$, v_ini.campo_erp, v_fin.campo_erp, v_prog, v_terr, v_n, v_rv.claim_id, p_regla_version, v_asof);
END $$;

CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_resumen(p_regla_version uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rv record; v_def record; v_cl record; v_prog record; v_r jsonb; v_ev jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  SELECT * INTO v_def FROM public.ctr_regla_definicion WHERE id = v_rv.regla_id;
  SELECT * INTO v_cl  FROM public.ctr_claim WHERE id = v_rv.claim_id;
  SELECT p.*, c.nombre_display AS cli, v.nombre AS vert INTO v_prog
    FROM public.ctr_programa p
    JOIN public.ctr_cliente c ON c.id = p.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
   WHERE p.id = v_cl.programa_id;

  v_ev := public.ctr_sla_evaluabilidad(p_regla_version);

  SELECT jsonb_build_object(
    'poblacion_programa_resuelta', count(*),
    'poblacion_anulado_aviso', count(*) FILTER (WHERE poblacion = 'anulado'),
    'poblacion_servicio', count(*) FILTER (WHERE poblacion = 'servicio'),
    'candidata_kpi', count(*) FILTER (WHERE poblacion = 'servicio'),
    'evaluables', count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')),
    'no_evaluables', count(*) FILTER (WHERE temporal_result = 'NOT_EVALUABLE'),
    'met', count(*) FILTER (WHERE temporal_result = 'MET'),
    'missed', count(*) FILTER (WHERE temporal_result = 'MISSED'),
    'pct_met_sobre_evaluables', CASE WHEN count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE temporal_result = 'MET')
                   / count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')), 2) END,
    'completitud_start', round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND start_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'completitud_end',   round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND end_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'motivos_no_evaluable', (SELECT jsonb_object_agg(k, n) FROM (
        SELECT reason_not_evaluable k, count(*) n FROM public.ctr_sla_temporal_ot(p_regla_version)
         WHERE reason_not_evaluable IS NOT NULL GROUP BY 1) z),
    'rango_start', jsonb_build_object('min', min(start_date), 'max', max(start_date))
  ) INTO v_r
  FROM public.ctr_sla_temporal_ot(p_regla_version);

  RETURN jsonb_build_object(
    'vertical', v_prog.vert, 'cliente', v_prog.cli, 'programa', v_prog.nombre, 'programa_id', v_prog.id,
    'kpi', v_def.codigo, 'kpi_nombre', v_def.nombre,
    'claim_id', v_cl.id, 'claim_estado', v_cl.estado,
    'literal_contractual', v_cl.enunciado,
    'normalizacion_wg', v_rv.parametros->>'normalizacion',
    'start_event', v_rv.parametros->>'start_event',
    'end_event', v_rv.parametros->>'end_event',
    'pipeline_start', v_rv.parametros->>'pipeline_start',
    'front_office', v_rv.parametros->>'front_office',
    'deadline', (v_rv.parametros->>'deadline_dias') || ' dias laborables (dia de inicio no cuenta)',
    'calendar_type', v_rv.parametros->>'calendar_type',
    'as_of', public.ops_as_of('ot'),
    'evaluabilidad', v_ev,
    'universos_y_resultado', v_r,
    'etiqueta', 'Resultado temporal antes de aplicacion de causas no imputables 80/20',
    'publicable', (v_ev->>'evaluation_ready')::boolean);
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) TO sandbox_exec;
    GRANT EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text)          TO sandbox_exec;
    GRANT EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid)             TO sandbox_exec;
    GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid)               TO sandbox_exec;
    GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid)          TO sandbox_exec;
    GRANT EXECUTE ON FUNCTION public.ops_as_of(text)                         TO sandbox_exec;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
