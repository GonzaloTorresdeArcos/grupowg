CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_ot(p_regla_version uuid, p_escenario_baja text DEFAULT 'A'::text)
RETURNS TABLE(programa_id uuid, claim_id uuid, regla_version_id uuid, num_ot text, poblacion text,
              start_date date, deadline_date date, end_date date, temporal_result text,
              reason_not_evaluable text, mapping_status_start text, mapping_status_end text,
              calendar_type text, calendar_source text, territorio_ot text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_rv record; v_par jsonb; v_prog uuid; v_ini record; v_fin record;
  v_n int; v_asof date; v_unidad text;
  v_pop text; v_canal text; v_baja text; v_dl text; v_calsrc text; v_calver text; v_lab text;
  v_cols text[] := ARRAY['fecha_creacion','fecha_primer_contacto','fecha_primera_visita','fecha_cierre'];
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF p_escenario_baja NOT IN ('A','B') THEN RAISE EXCEPTION 'escenario de baja no soportado: %', p_escenario_baja; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  v_par := v_rv.parametros;
  v_n := (v_par->>'deadline_dias')::int;
  v_unidad := v_par->>'deadline_unidad';
  IF v_n IS NULL OR v_n < 1 THEN RAISE EXCEPTION 'deadline_dias no representado'; END IF;
  IF v_unidad NOT IN ('dias_laborables','dias_naturales') THEN
    RAISE EXCEPTION 'unidad de deadline no soportada: %', v_unidad;
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

  IF coalesce(v_par->>'poblacion_fuente','correspondencia') = 'resolucion' THEN
    v_pop := format('o.num_ot IN (SELECT r.num_ot FROM public.ctr_resolucion_ot_programa r WHERE r.programa_id = %L::uuid AND r.vigente)', v_prog);
  ELSE
    v_pop := format('o.cliente_wg IN (SELECT co.valor_literal FROM public.ctr_correspondencia_operativa co WHERE co.dimension = ''campo_ot'' AND co.campo_erp = ''cliente_wg'' AND co.programa_id = %L::uuid AND co.estado = ''APPROVED'' AND co.determinista)', v_prog);
  END IF;

  IF v_par->'poblacion_filtro'->'canal' IS NOT NULL THEN
    SELECT format('(o.canal = ANY (%L::text[]))',
             (SELECT array_agg(x) FROM jsonb_array_elements_text(v_par->'poblacion_filtro'->'canal') x))
      INTO v_canal;
  ELSE
    v_canal := 'true';
  END IF;

  v_baja := CASE WHEN p_escenario_baja = 'B' THEN 'coalesce(o.es_baja,false)' ELSE 'false' END;

  IF v_unidad = 'dias_naturales' THEN
    v_dl := format('(b.s_date + %s)', v_n);
    v_calsrc := 'dias_naturales (sin calendario laboral)';
    v_lab := 'false';
  ELSE
    v_dl := format('w.fecha', v_n);
    SELECT coalesce(max(version_carga),'sin_version') INTO v_calver FROM public.ops_calendario_laboral;
    v_calsrc := 'ops_calendario_laboral · territorio de la OT (nacional + autonomico) · version ' || v_calver;
    v_lab := 'true';
  END IF;

  v_asof := public.ops_as_of('ot');

  RETURN QUERY EXECUTE format($q$
    WITH base AS (
      SELECT o.num_ot::text AS num_ot,
             o.%1$I::date AS s_date,
             o.%2$I::date AS e_date,
             (o.incidencia = 'ANULADO AVISO') AS anulado,
             ((%9$s) IS TRUE) AS en_filtro,
             coalesce(%10$s, false) AS baja_excluida,
             public.ops_territorio_ot(o.codigo_postal, o.provincia) AS terr
        FROM public.ops_fact_ot o
       WHERE %8$s
    ), terrs AS (
      SELECT DISTINCT terr FROM base WHERE %16$s AND terr <> 'UNRESOLVED'
    ), rango AS (
      SELECT coalesce(min(s_date), current_date) AS d0,
             coalesce(max(s_date), current_date) + 180 AS d1 FROM base
    ), dias AS (
      SELECT t.terr, d::date AS fecha,
             (extract(isodow FROM d) <= 5
              AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                               WHERE c.fecha = d::date AND NOT c.laborable
                                 AND (c.territorio = t.terr
                                      OR (t.terr LIKE 'ES-%%' AND c.territorio = 'ES')))) AS lab
        FROM terrs t, rango, generate_series(rango.d0, rango.d1, interval '1 day') d
    ), cum AS (
      SELECT terr, fecha, lab,
             sum(CASE WHEN lab THEN 1 ELSE 0 END) OVER (PARTITION BY terr ORDER BY fecha) AS rn
        FROM dias
    ), wlist AS (
      SELECT terr, rn, fecha FROM cum WHERE lab
    ), calc AS (
      SELECT b.*, CASE WHEN b.s_date IS NULL THEN NULL ELSE %11$s END AS dl
        FROM base b
        LEFT JOIN cum c0 ON c0.terr = b.terr AND c0.fecha = b.s_date
        LEFT JOIN wlist w ON w.terr = b.terr AND w.rn = c0.rn + %17$s
    )
    SELECT %3$L::uuid, %5$L::uuid, %6$L::uuid, c.num_ot,
           CASE WHEN c.anulado THEN 'anulado'
                WHEN c.en_filtro IS NOT TRUE THEN 'fuera_de_alcance'
                WHEN c.baja_excluida THEN 'excluida_baja'
                ELSE 'servicio' END,
           c.s_date, c.dl, c.e_date,
           CASE
             WHEN c.anulado OR c.en_filtro IS NOT TRUE OR c.baja_excluida THEN 'NOT_EVALUABLE'
             WHEN c.s_date IS NULL OR c.dl IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date IS NULL THEN 'NOT_EVALUABLE'
             WHEN c.e_date < c.s_date THEN 'NOT_EVALUABLE'
             WHEN c.s_date > %7$L::date OR c.e_date > %7$L::date THEN 'NOT_EVALUABLE'
             WHEN c.e_date <= c.dl THEN 'MET'
             ELSE 'MISSED'
           END,
           CASE
             WHEN c.anulado THEN 'aviso_anulado_excluido'
             WHEN c.en_filtro IS NOT TRUE THEN 'fuera_de_poblacion_declarada'
             WHEN c.baja_excluida THEN 'baja_excluida_escenario_b'
             WHEN c.s_date IS NULL THEN 'start_missing'
             WHEN %16$s AND c.terr = 'UNRESOLVED' THEN 'territorio_no_resuelto'
             WHEN c.dl IS NULL THEN 'calendario_fuera_de_cobertura'
             WHEN c.e_date IS NULL THEN 'end_missing'
             WHEN c.e_date < c.s_date THEN 'end_previo_a_start'
             WHEN c.s_date > %7$L::date OR c.e_date > %7$L::date THEN 'fecha_futura'
             ELSE NULL
           END,
           %12$L::text, %13$L::text, %14$L::text, %15$L::text, c.terr
      FROM calc c
    $q$, v_ini.campo_erp, v_fin.campo_erp, v_prog, '', v_rv.claim_id, p_regla_version,
         v_asof, v_pop, v_canal, v_baja, v_dl, v_ini.grado, v_fin.grado,
         coalesce(v_par->>'calendar_type','NATURAL'), v_calsrc, v_lab, v_n::text);
END $fn$;

REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid, text) TO authenticated, service_role, sandbox_exec;