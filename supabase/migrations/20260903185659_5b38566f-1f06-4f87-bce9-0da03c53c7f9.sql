-- SLA-E1.3 · RPCs mínimos de presentación contractual temporal (solo lectura)

CREATE OR REPLACE FUNCTION public.ctr_sla_kpis_de_programa(p_programa uuid)
RETURNS TABLE(regla_version_id uuid, codigo text, nombre text, modo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  RETURN QUERY
  SELECT rv.id, d.codigo, d.nombre, coalesce(rv.parametros->>'modo','CONTRACTUAL')
  FROM public.ctr_regla_version rv
  JOIN public.ctr_regla_definicion d ON d.id = rv.regla_id
  JOIN public.ctr_claim c ON c.id = rv.claim_id
  WHERE c.programa_id = p_programa
    AND rv.parametros ? 'deadline_dias'
    AND rv.parametros->>'deadline_unidad' IN ('dias_laborables','dias_naturales')
    AND rv.version = (
      SELECT max(rv2.version) FROM public.ctr_regla_version rv2
      JOIN public.ctr_claim c2 ON c2.id = rv2.claim_id
      WHERE rv2.regla_id = rv.regla_id AND c2.programa_id = c.programa_id
        AND rv2.parametros ? 'deadline_dias')
    AND EXISTS (SELECT 1 FROM public.ctr_regla_aplicabilidad_scope s
                 WHERE s.regla_version_id = rv.id AND s.estado_gobernanza = 'APPROVED')
    AND EXISTS (SELECT 1 FROM public.ctr_mapping_evento_temporal m
                 WHERE m.programa_id = c.programa_id AND m.evento = rv.parametros->>'start_event'
                   AND m.estado = 'APPROVED' AND m.grado NOT IN ('PROXY','NOT_AVAILABLE'))
    AND EXISTS (SELECT 1 FROM public.ctr_mapping_evento_temporal m
                 WHERE m.programa_id = c.programa_id AND m.evento = rv.parametros->>'end_event'
                   AND m.estado = 'APPROVED' AND m.grado NOT IN ('PROXY','NOT_AVAILABLE'))
  ORDER BY d.codigo;
END $function$;

CREATE OR REPLACE FUNCTION public.ctr_sla_programa_kpis(p_programa uuid, p_escenario_baja text DEFAULT 'A')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_k record; v_r jsonb; v_terr jsonb; v_out jsonb := '[]'::jsonb;
  v_clas text; v_prof boolean; v_cand numeric; v_ne numeric; v_ev numeric;
  v_nota_8020 CONSTANT text :=
    'Adherencia temporal observable previa a la aplicación del mecanismo contractual de imputabilidad 80/20. Los resultados se calculan sobre las fechas registradas en ERP; pueden existir desfases entre ejecución física y registro en aplicativo.';
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF p_escenario_baja NOT IN ('A','B') THEN RAISE EXCEPTION 'escenario de baja no soportado'; END IF;

  FOR v_k IN SELECT * FROM public.ctr_sla_kpis_de_programa(p_programa) LOOP
    BEGIN
      v_r := public.ctr_sla_temporal_resumen(v_k.regla_version_id, p_escenario_baja);
    EXCEPTION WHEN OTHERS THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'regla_version_id', v_k.regla_version_id, 'kpi', v_k.codigo, 'kpi_nombre', v_k.nombre,
        'clasificacion', 'NOT_READY', 'evaluation_ready', false,
        'error_evaluacion', SQLERRM));
      CONTINUE;
    END;

    v_prof := (v_k.codigo LIKE 'R_SLA_M%');

    -- Clasificación: la BD clasifica, el frontend solo presenta.
    v_clas := CASE
      WHEN v_k.modo = 'MANAGEMENT_ASSUMPTION_SCENARIO' THEN 'MANAGEMENT_SCENARIO_ONLY'
      WHEN coalesce((v_r->>'publication_ready')::boolean, false) THEN 'CONTRACTUAL_TEMPORAL_RESULT_READY'
      WHEN coalesce((v_r->>'temporal_result_available')::boolean, false)
        OR coalesce((v_r->>'scenario_result_available')::boolean, false) THEN 'SHADOW_RESULT_ONLY'
      ELSE 'NOT_READY' END;

    -- Desglose territorial ES / PT / UNRESOLVED (recuentos absolutos).
    SELECT jsonb_agg(x ORDER BY orden) INTO v_terr FROM (
      SELECT CASE WHEN t.territorio_ot LIKE 'ES%' THEN 1 WHEN t.territorio_ot LIKE 'PT%' THEN 2 ELSE 3 END AS orden,
             jsonb_build_object(
               'grupo', CASE WHEN t.territorio_ot LIKE 'ES%' THEN 'ES'
                             WHEN t.territorio_ot LIKE 'PT%' THEN 'PT' ELSE 'UNRESOLVED' END,
               'poblacion', count(*),
               'candidata', count(*) FILTER (WHERE t.poblacion = 'servicio'),
               'met', count(*) FILTER (WHERE t.temporal_result = 'MET'),
               'missed', count(*) FILTER (WHERE t.temporal_result = 'MISSED'),
               'not_evaluable', count(*) FILTER (WHERE t.temporal_result = 'NOT_EVALUABLE'),
               'adherencia_pct', CASE WHEN count(*) FILTER (WHERE t.temporal_result IN ('MET','MISSED')) > 0
                   THEN round(100.0 * count(*) FILTER (WHERE t.temporal_result = 'MET')
                        / count(*) FILTER (WHERE t.temporal_result IN ('MET','MISSED')), 2) END
             ) AS x
        FROM public.ctr_sla_temporal_ot(v_k.regla_version_id, p_escenario_baja) t
       GROUP BY 1, CASE WHEN t.territorio_ot LIKE 'ES%' THEN 'ES'
                        WHEN t.territorio_ot LIKE 'PT%' THEN 'PT' ELSE 'UNRESOLVED' END
    ) z;

    v_cand := coalesce((v_r#>>'{universos_y_resultado,candidate_kpi}')::numeric, 0);
    v_ne   := coalesce((v_r#>>'{universos_y_resultado,not_evaluable_within_candidate}')::numeric, 0);
    v_ev   := coalesce((v_r#>>'{universos_y_resultado,evaluable}')::numeric, 0);

    v_out := v_out || jsonb_build_array(v_r || jsonb_build_object(
      'clasificacion', v_clas,
      'es_professional_8020', v_prof,
      'nota_gobernada', CASE WHEN v_prof THEN v_nota_8020 END,
      'cobertura', jsonb_build_object(
        'candidate_population', v_cand,
        'evaluables', v_ev,
        'not_evaluable', v_ne,
        'ratio_evaluables_pct', CASE WHEN v_cand > 0 THEN round(100.0 * v_ev / v_cand, 2) END,
        'ratio_no_evaluables_pct', CASE WHEN v_cand > 0 THEN round(100.0 * v_ne / v_cand, 2) END,
        'limitada', CASE WHEN v_cand > 0 THEN (v_ne / v_cand) > 0.20 ELSE true END),
      'desglose_territorial', coalesce(v_terr, '[]'::jsonb)));
  END LOOP;

  RETURN v_out;
END $function$;

CREATE OR REPLACE FUNCTION public.ctr_sla_evidencia_kpi(p_regla_version uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rv record; v_c record; v_d record; v_par jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  v_par := v_rv.parametros;
  SELECT * INTO v_c FROM public.ctr_claim WHERE id = v_rv.claim_id;
  SELECT * INTO v_d FROM public.ctr_documento WHERE id = v_c.doc_id;

  RETURN jsonb_build_object(
    'claim', jsonb_build_object(
      'id', v_c.id, 'categoria', v_c.categoria, 'estado', v_c.estado,
      'literal_contractual', v_c.enunciado, 'ref_pagina', v_c.ref_pagina,
      'valor_estructurado', v_c.valor_estructurado, 'extraido_por', v_c.extraido_por),
    'documento', CASE WHEN v_d.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_d.id, 'fichero', v_d.fichero, 'hash', v_d.hash,
      'tipo_documental', v_d.tipo_documental, 'fecha_documento', v_d.fecha_documento,
      'estado_evidencia', v_d.estado_evidencia, 'ocr_estado', v_d.ocr_estado,
      'paginas', v_d.paginas, 'idioma', v_d.idioma,
      'salvedad_ocr', (v_d.ocr_estado IS DISTINCT FROM 'ocr_completo')) END,
    'normalizacion', jsonb_build_object(
      'literal_documental', v_par->>'literal_documental',
      'unidad_documental', v_par->>'unidad_documental',
      'normalizacion_wg', v_par->>'normalizacion',
      'procedencia', coalesce(v_par->>'procedencia_normalizacion',
        'Management E0.1 §24 (decisión cerrada): 8 h laborables → T+1 día laborable; 32 h laborables → T+4 días laborables. Granularidad DATE suficiente.'),
      'deadline_dias', v_par->>'deadline_dias',
      'deadline_unidad', v_par->>'deadline_unidad',
      'calendar_type', v_par->>'calendar_type'),
    'regla', jsonb_build_object(
      'regla_version_id', v_rv.id, 'version', v_rv.version, 'fase', v_rv.fase,
      'unidad', v_rv.unidad, 'calendario_requerido', v_rv.calendario_requerido,
      'parametros', v_par),
    'mappings', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'evento', m.evento, 'rol_evento', m.rol_evento, 'campo_erp', m.campo_erp,
        'grado', m.grado, 'estado', m.estado, 'granularidad', m.granularidad,
        'procedencia', m.procedencia, 'evidencia_ref', m.evidencia_ref) ORDER BY m.rol_evento), '[]'::jsonb)
      FROM public.ctr_mapping_evento_temporal m
      WHERE m.programa_id = v_c.programa_id
        AND m.evento IN (v_par->>'start_event', v_par->>'end_event')),
    'actos', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'ts', a.ts, 'accion', a.accion, 'objeto_tipo', a.objeto_tipo,
        'estado_anterior', a.estado_anterior, 'estado_nuevo', a.estado_nuevo,
        'actor_nombre', a.actor_nombre, 'actor_rol', a.actor_rol,
        'cuatro_ojos_nombre', a.cuatro_ojos_nombre,
        'motivo', a.motivo, 'fuente_procedencia', a.fuente_procedencia) ORDER BY a.ts DESC), '[]'::jsonb)
      FROM public.ctr_acto_gobierno a
      WHERE a.objeto_id IN (v_c.id, v_rv.id)),
    'as_of', public.ops_as_of('ot'));
END $function$;

CREATE OR REPLACE FUNCTION public.ctr_sla_disponibilidad()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_p record; v_k record; v_ev jsonb; v_out jsonb := '[]'::jsonb;
  v_n int; v_pub int; v_sh int; v_sc int;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  FOR v_p IN
    SELECT DISTINCT p.id, p.nombre, p.cliente_id, v.codigo AS vertical_codigo
      FROM public.ctr_programa p
      LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
     WHERE EXISTS (SELECT 1 FROM public.ctr_claim c
                    JOIN public.ctr_regla_version rv ON rv.claim_id = c.id
                   WHERE c.programa_id = p.id AND rv.parametros ? 'deadline_dias')
  LOOP
    v_n := 0; v_pub := 0; v_sh := 0; v_sc := 0;
    FOR v_k IN SELECT * FROM public.ctr_sla_kpis_de_programa(v_p.id) LOOP
      v_n := v_n + 1;
      IF v_k.modo = 'MANAGEMENT_ASSUMPTION_SCENARIO' THEN
        v_sc := v_sc + 1;
      ELSE
        BEGIN
          v_ev := public.ctr_sla_evaluabilidad(v_k.regla_version_id);
        EXCEPTION WHEN OTHERS THEN v_ev := '{}'::jsonb;
        END;
        IF coalesce((v_ev->>'publication_ready')::boolean, false) THEN v_pub := v_pub + 1;
        ELSE v_sh := v_sh + 1; END IF;
      END IF;
    END LOOP;
    IF v_n > 0 THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'programa_id', v_p.id, 'programa_nombre', v_p.nombre, 'cliente_id', v_p.cliente_id,
        'vertical_codigo', v_p.vertical_codigo,
        'n_kpis', v_n, 'n_publicables', v_pub, 'n_shadow', v_sh, 'n_escenario', v_sc));
    END IF;
  END LOOP;
  RETURN v_out;
END $function$;

REVOKE ALL ON FUNCTION public.ctr_sla_kpis_de_programa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_sla_programa_kpis(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_sla_evidencia_kpi(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ctr_sla_disponibilidad() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ctr_sla_kpis_de_programa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ctr_sla_programa_kpis(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ctr_sla_evidencia_kpi(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ctr_sla_disponibilidad() TO authenticated;
NOTIFY pgrst, 'reload schema';