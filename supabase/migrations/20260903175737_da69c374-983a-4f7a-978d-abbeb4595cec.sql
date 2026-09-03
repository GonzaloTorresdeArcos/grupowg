CREATE OR REPLACE FUNCTION public.ops_territorio_ot(p_cp text, p_provincia text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $fn$
DECLARE cp text; pv text; pc text; r text;
BEGIN
  cp := btrim(coalesce(p_cp,''));
  pv := upper(btrim(coalesce(p_provincia,'')));
  IF cp ~ '^[0-9]{4}-[0-9]{3}$' THEN RETURN 'PT'; END IF;
  IF cp ~ '^[0-9]{2}' THEN
    pc := substr(cp,1,2);
    r := CASE pc
        WHEN '01' THEN 'ES-PV' WHEN '02' THEN 'ES-CM' WHEN '03' THEN 'ES-VC' WHEN '04' THEN 'ES-AN'
        WHEN '05' THEN 'ES-CL' WHEN '06' THEN 'ES-EX' WHEN '07' THEN 'ES-IB' WHEN '08' THEN 'ES-CT'
        WHEN '09' THEN 'ES-CL' WHEN '10' THEN 'ES-EX' WHEN '11' THEN 'ES-AN' WHEN '12' THEN 'ES-VC'
        WHEN '13' THEN 'ES-CM' WHEN '14' THEN 'ES-AN' WHEN '15' THEN 'ES-GA' WHEN '16' THEN 'ES-CM'
        WHEN '17' THEN 'ES-CT' WHEN '18' THEN 'ES-AN' WHEN '19' THEN 'ES-CM' WHEN '20' THEN 'ES-PV'
        WHEN '21' THEN 'ES-AN' WHEN '22' THEN 'ES-AR' WHEN '23' THEN 'ES-AN' WHEN '24' THEN 'ES-CL'
        WHEN '25' THEN 'ES-CT' WHEN '26' THEN 'ES-RI' WHEN '27' THEN 'ES-GA' WHEN '28' THEN 'ES-MD'
        WHEN '29' THEN 'ES-AN' WHEN '30' THEN 'ES-MC' WHEN '31' THEN 'ES-NC' WHEN '32' THEN 'ES-GA'
        WHEN '33' THEN 'ES-AS' WHEN '34' THEN 'ES-CL' WHEN '35' THEN 'ES-CN' WHEN '36' THEN 'ES-GA'
        WHEN '37' THEN 'ES-CL' WHEN '38' THEN 'ES-CN' WHEN '39' THEN 'ES-CB' WHEN '40' THEN 'ES-CL'
        WHEN '41' THEN 'ES-AN' WHEN '42' THEN 'ES-CL' WHEN '43' THEN 'ES-CT' WHEN '44' THEN 'ES-AR'
        WHEN '45' THEN 'ES-CM' WHEN '46' THEN 'ES-VC' WHEN '47' THEN 'ES-CL' WHEN '48' THEN 'ES-PV'
        WHEN '49' THEN 'ES-CL' WHEN '50' THEN 'ES-AR' WHEN '51' THEN 'ES-CE' WHEN '52' THEN 'ES-ML'
        ELSE NULL END;
    IF r IS NOT NULL THEN RETURN r; END IF;
  END IF;
  r := CASE pv
      WHEN 'ÁLAVA' THEN 'ES-PV' WHEN 'ALAVA' THEN 'ES-PV' WHEN 'ALBACETE' THEN 'ES-CM' WHEN 'ALICANTE' THEN 'ES-VC'
      WHEN 'ALMERÍA' THEN 'ES-AN' WHEN 'ASTURIAS' THEN 'ES-AS' WHEN 'ÁVILA' THEN 'ES-CL' WHEN 'BADAJOZ' THEN 'ES-EX'
      WHEN 'ISLAS BALEARES' THEN 'ES-IB' WHEN 'BALEARES' THEN 'ES-IB' WHEN 'BARCELONA' THEN 'ES-CT' WHEN 'BURGOS' THEN 'ES-CL'
      WHEN 'CÁCERES' THEN 'ES-EX' WHEN 'CÁDIZ' THEN 'ES-AN' WHEN 'CANTABRIA' THEN 'ES-CB' WHEN 'CASTELLÓN' THEN 'ES-VC'
      WHEN 'CEUTA' THEN 'ES-CE' WHEN 'CIUDAD REAL' THEN 'ES-CM' WHEN 'CÓRDOBA' THEN 'ES-AN' WHEN 'CUENCA' THEN 'ES-CM'
      WHEN 'GERONA' THEN 'ES-CT' WHEN 'GIRONA' THEN 'ES-CT' WHEN 'GRANADA' THEN 'ES-AN' WHEN 'GUADALAJARA' THEN 'ES-CM'
      WHEN 'GUIPÚZCOA' THEN 'ES-PV' WHEN 'HUELVA' THEN 'ES-AN' WHEN 'HUESCA' THEN 'ES-AR' WHEN 'JAÉN' THEN 'ES-AN'
      WHEN 'LA CORUÑA' THEN 'ES-GA' WHEN 'A CORUÑA' THEN 'ES-GA' WHEN 'LA RIOJA' THEN 'ES-RI' WHEN 'LAS PALMAS' THEN 'ES-CN'
      WHEN 'LEÓN' THEN 'ES-CL' WHEN 'LLEIDA' THEN 'ES-CT' WHEN 'LÉRIDA' THEN 'ES-CT' WHEN 'LUGO' THEN 'ES-GA'
      WHEN 'MADRID' THEN 'ES-MD' WHEN 'MÁLAGA' THEN 'ES-AN' WHEN 'MELILLA' THEN 'ES-ML' WHEN 'MURCIA' THEN 'ES-MC'
      WHEN 'NAVARRA' THEN 'ES-NC' WHEN 'OURENSE' THEN 'ES-GA' WHEN 'ORENSE' THEN 'ES-GA' WHEN 'PALENCIA' THEN 'ES-CL'
      WHEN 'PONTEVEDRA' THEN 'ES-GA' WHEN 'SALAMANCA' THEN 'ES-CL' WHEN 'SANTA CRUZ DE TENERIFE' THEN 'ES-CN'
      WHEN 'SEGOVIA' THEN 'ES-CL' WHEN 'SEVILLA' THEN 'ES-AN' WHEN 'SORIA' THEN 'ES-CL' WHEN 'TARRAGONA' THEN 'ES-CT'
      WHEN 'TERUEL' THEN 'ES-AR' WHEN 'TOLEDO' THEN 'ES-CM' WHEN 'VALENCIA' THEN 'ES-VC' WHEN 'VALLADOLID' THEN 'ES-CL'
      WHEN 'VIZCAYA' THEN 'ES-PV' WHEN 'BIZKAIA' THEN 'ES-PV' WHEN 'ZAMORA' THEN 'ES-CL' WHEN 'ZARAGOZA' THEN 'ES-AR'
      ELSE NULL END;
  RETURN coalesce(r,'UNRESOLVED');
END $fn$;

COMMENT ON FUNCTION public.ops_territorio_ot(text,text) IS
'SLA-E1.0A: mapping determinista de territorio POR OT. CP NNNN-NNN => PT; CP espanol => ES-<CCAA> por los dos primeros digitos (codigo de provincia INE), fallback por nombre de provincia; resto => UNRESOLVED (nunca se asume ES).';

CREATE OR REPLACE FUNCTION public.ops_add_working_days(p_start date, p_n integer, p_territorio text)
RETURNS date LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $fn$
DECLARE d date; i int := 0; guard int := 0;
BEGIN
  IF p_start IS NULL OR p_n IS NULL OR p_n < 0 OR p_territorio IS NULL OR p_territorio = 'UNRESOLVED' THEN RETURN NULL; END IF;
  d := p_start;
  WHILE i < p_n LOOP
    guard := guard + 1;
    IF guard > 3650 THEN RAISE EXCEPTION 'ops_add_working_days: rango excedido'; END IF;
    d := d + 1;
    IF extract(isodow FROM d) <= 5
       AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                        WHERE c.fecha = d AND NOT c.laborable
                          AND (c.territorio = p_territorio
                               OR (p_territorio LIKE 'ES-%' AND c.territorio = 'ES'))) THEN
      i := i + 1;
    END IF;
  END LOOP;
  RETURN d;
END $fn$;

CREATE OR REPLACE FUNCTION public.ctr_calendario_cobertura(p_territorio text)
RETURNS TABLE(territorio text, dias_festivos integer, desde date, hasta date, version_carga text)
LANGUAGE sql STABLE SET search_path TO 'public' AS $fn$
  SELECT p_territorio, count(*)::int, min(c.fecha), max(c.fecha), max(c.version_carga)
    FROM public.ops_calendario_laboral c
   WHERE NOT c.laborable
     AND (c.territorio = p_territorio OR (p_territorio LIKE 'ES-%' AND c.territorio = 'ES'))
  HAVING count(*) > 0
$fn$;

DROP FUNCTION IF EXISTS public.ctr_sla_temporal_ot(uuid, text);
CREATE FUNCTION public.ctr_sla_temporal_ot(p_regla_version uuid, p_escenario_baja text DEFAULT 'A'::text)
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
    v_dl := format('(SELECT w2.fecha FROM wd w2 WHERE w2.terr = b.terr AND w2.rn = (SELECT max(w1.rn) FROM wd w1 WHERE w1.terr = b.terr AND w1.fecha <= b.s_date) + %s)', v_n);
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
      SELECT DISTINCT terr FROM base WHERE terr <> 'UNRESOLVED'
    ), rango AS (
      SELECT coalesce(min(s_date), current_date) AS d0,
             coalesce(max(s_date), current_date) + 180 AS d1 FROM base
    ), wd AS (
      SELECT t.terr, d::date AS fecha, row_number() OVER (PARTITION BY t.terr ORDER BY d) AS rn
        FROM terrs t, rango, generate_series(rango.d0, rango.d1, interval '1 day') d
       WHERE extract(isodow FROM d) <= 5
         AND NOT EXISTS (SELECT 1 FROM public.ops_calendario_laboral c
                          WHERE c.fecha = d::date AND NOT c.laborable
                            AND (c.territorio = t.terr
                                 OR (t.terr LIKE 'ES-%%' AND c.territorio = 'ES')))
    ), calc AS (
      SELECT b.*, CASE WHEN b.s_date IS NULL THEN NULL ELSE %11$s END AS dl FROM base b
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
         coalesce(v_par->>'calendar_type','NATURAL'), v_calsrc, v_lab);
END $fn$;

CREATE OR REPLACE FUNCTION public.ctr_sla_evaluabilidad(p_regla_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_rv record; v_prog uuid; v_par jsonb; v_b text[] := ARRAY[]::text[];
  v_ini record; v_fin record; v_cov record; v_min date; v_max date; v_claim text;
  v_pub text[] := ARRAY[]::text[]; v_shadow boolean; v_modo text; v_escenario boolean;
  v_terrs jsonb := '[]'::jsonb; v_unres bigint := 0; v_t text; v_cobs jsonb := '[]'::jsonb;
  v_calc_ok boolean;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN
    RETURN jsonb_build_object('evaluation_ready', false, 'temporal_result_available', false,
                              'contractual_temporal_result_available', false,
                              'scenario_result_available', false,
                              'publication_ready', false, 'next_blocker', 'regla_version_inexistente',
                              'remaining_blockers', jsonb_build_array('regla_version_inexistente'));
  END IF;
  v_par := v_rv.parametros;
  v_shadow := coalesce((v_par->>'shadow')::boolean, false);
  v_modo := coalesce(v_par->>'modo','CONTRACTUAL');
  v_escenario := (v_modo = 'MANAGEMENT_ASSUMPTION_SCENARIO');

  SELECT (p.valor #>> '{}')::uuid INTO v_prog
    FROM public.ctr_regla_aplicabilidad_scope s
    JOIN public.ctr_regla_aplicabilidad_predicado p ON p.scope_id = s.id AND p.dimension = 'programa' AND p.incluir
   WHERE s.regla_version_id = p_regla_version AND s.estado_gobernanza = 'APPROVED'
   ORDER BY s.version DESC LIMIT 1;
  IF v_prog IS NULL THEN v_b := v_b || 'programa_no_resuelto'::text; END IF;

  SELECT c.estado INTO v_claim FROM public.ctr_claim c WHERE c.id = v_rv.claim_id;
  IF v_claim IS DISTINCT FROM 'VALIDATED' THEN v_pub := v_pub || 'claim_pending'::text; END IF;

  IF v_prog IS NOT NULL THEN
    SELECT * INTO v_ini FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'start_event' AND m.estado = 'APPROVED';
    SELECT * INTO v_fin FROM public.ctr_mapping_evento_temporal m
     WHERE m.programa_id = v_prog AND m.evento = v_par->>'end_event' AND m.estado = 'APPROVED';
    IF v_ini IS NULL THEN v_b := v_b || 'start_mapping_ausente'::text;
    ELSIF v_ini.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('start_mapping_' || lower(v_ini.grado))::text; END IF;
    IF v_fin IS NULL THEN v_b := v_b || 'end_mapping_ausente'::text;
    ELSIF v_fin.grado IN ('PROXY','NOT_AVAILABLE') THEN v_b := v_b || ('end_mapping_' || lower(v_fin.grado))::text; END IF;
  END IF;

  IF coalesce(v_par->>'poblacion_grado','') IN ('PROXY','NOT_AVAILABLE') OR v_shadow THEN
    v_b := v_b || 'poblacion_no_gobernada_proxy'::text;
  END IF;
  IF coalesce((v_par->>'baja_sin_gobernar')::boolean,false) THEN
    v_pub := v_pub || 'tratamiento_baja_no_gobernado'::text;
  END IF;

  IF v_escenario THEN
    IF coalesce(v_par->>'unidad_documental','') = 'SIN_CALIFICAR' THEN
      v_b := v_b || 'unidad_contractual_sin_calificar'::text;
    END IF;
    IF coalesce((v_par->>'start_contractual_explicito')::boolean, true) IS FALSE THEN
      v_b := v_b || 'start_no_explicito_en_instrumento'::text;
    END IF;
    IF coalesce((v_par->>'end_contractual_explicito')::boolean, true) IS FALSE THEN
      v_b := v_b || 'end_no_explicito_en_instrumento'::text;
    END IF;
  END IF;

  -- territorios realmente observados en la poblacion del programa
  IF v_prog IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb),
           coalesce(max(u), 0)
      INTO v_terrs, v_unres
      FROM (
        SELECT public.ops_territorio_ot(o.codigo_postal, o.provincia) AS t,
               count(*) FILTER (WHERE public.ops_territorio_ot(o.codigo_postal, o.provincia) = 'UNRESOLVED') OVER () AS u
          FROM public.ops_fact_ot o
         WHERE o.num_ot IN (SELECT r.num_ot FROM public.ctr_resolucion_ot_programa r
                             WHERE r.programa_id = v_prog AND r.vigente)
         GROUP BY 1
      ) z;
  END IF;

  IF v_rv.calendario_requerido THEN
    IF v_par->>'calendar_type' IS NULL THEN
      v_b := v_b || 'calendario_no_declarado'::text;
    ELSE
      SELECT min(o.fecha_creacion), max(o.fecha_creacion) INTO v_min, v_max
        FROM public.ops_fact_ot o
       WHERE v_prog IS NOT NULL
         AND o.num_ot IN (SELECT r.num_ot FROM public.ctr_resolucion_ot_programa r
                           WHERE r.programa_id = v_prog AND r.vigente);
      FOR v_t IN SELECT x FROM jsonb_array_elements_text(v_terrs) x WHERE x <> 'UNRESOLVED' LOOP
        SELECT * INTO v_cov FROM public.ctr_calendario_cobertura(v_t);
        IF v_cov IS NULL THEN
          v_b := v_b || ('calendario_no_cargado:' || v_t)::text;
        ELSE
          v_cobs := v_cobs || jsonb_build_array(to_jsonb(v_cov));
          IF v_min IS NOT NULL AND (v_cov.desde > v_min OR v_cov.hasta < v_max + 60) THEN
            v_b := v_b || ('calendario_cobertura_parcial:' || v_t)::text;
          END IF;
        END IF;
      END LOOP;
      IF v_unres > 0 THEN
        v_b := v_b || ('territorio_no_resuelto_en_poblacion:' || v_unres::text)::text;
      END IF;
    END IF;
  END IF;

  v_calc_ok := (v_prog IS NOT NULL AND v_ini IS NOT NULL AND v_fin IS NOT NULL
                AND v_ini.grado NOT IN ('PROXY','NOT_AVAILABLE')
                AND v_fin.grado NOT IN ('PROXY','NOT_AVAILABLE')
                AND NOT EXISTS (SELECT 1 FROM unnest(v_b) b WHERE b LIKE 'calendario_no_cargado%' OR b = 'calendario_no_declarado'));

  RETURN jsonb_build_object(
    'regla_version_id', p_regla_version,
    'programa_id', v_prog,
    'claim_id', v_rv.claim_id,
    'claim_estado', v_claim,
    'modo', v_modo,
    'evaluation_ready', (array_length(v_b,1) IS NULL),
    'temporal_result_available', v_calc_ok,
    'contractual_temporal_result_available', (v_calc_ok AND NOT v_escenario),
    'scenario_result_available', (v_calc_ok AND v_escenario),
    'publication_ready', (array_length(v_b,1) IS NULL AND array_length(v_pub,1) IS NULL AND NOT v_escenario),
    'shadow', v_shadow,
    'next_blocker', coalesce(v_b[1], v_pub[1]),
    'remaining_blockers', to_jsonb(v_b || v_pub),
    'blockers_evaluacion', to_jsonb(v_b),
    'blockers_publicacion', to_jsonb(v_pub),
    'mapping_start', to_jsonb(v_ini),
    'mapping_end', to_jsonb(v_fin),
    'territorios_poblacion', v_terrs,
    'territorio_no_resuelto_ots', v_unres,
    'calendario', v_cobs);
END $fn$;

CREATE OR REPLACE FUNCTION public.ctr_sla_temporal_resumen(p_regla_version uuid, p_escenario_baja text DEFAULT 'A'::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_rv record; v_def record; v_cl record; v_prog record; v_r jsonb; v_ev jsonb; v_par jsonb; v_prof boolean;
  v_modo text; v_esc boolean;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;

  SELECT * INTO v_rv FROM public.ctr_regla_version WHERE id = p_regla_version;
  IF v_rv IS NULL THEN RAISE EXCEPTION 'regla_version inexistente'; END IF;
  v_par := v_rv.parametros;
  v_modo := coalesce(v_par->>'modo','CONTRACTUAL');
  v_esc := (v_modo = 'MANAGEMENT_ASSUMPTION_SCENARIO');
  SELECT * INTO v_def FROM public.ctr_regla_definicion WHERE id = v_rv.regla_id;
  SELECT * INTO v_cl  FROM public.ctr_claim WHERE id = v_rv.claim_id;
  SELECT p.*, c.nombre_display AS cli, v.nombre AS vert INTO v_prog
    FROM public.ctr_programa p
    JOIN public.ctr_cliente c ON c.id = p.cliente_id
    LEFT JOIN public.ctr_vertical v ON v.id = p.vertical_id
   WHERE p.id = v_cl.programa_id;
  v_prof := (v_def.codigo LIKE 'R_SLA_M%');

  v_ev := public.ctr_sla_evaluabilidad(p_regla_version);

  WITH t AS (SELECT * FROM public.ctr_sla_temporal_ot(p_regla_version, p_escenario_baja))
  SELECT jsonb_build_object(
    'programme_resolved', count(*),
    'poblacion_programa_resuelta', count(*),
    'poblacion_anulado_aviso', count(*) FILTER (WHERE poblacion = 'anulado'),
    'poblacion_fuera_de_alcance', count(*) FILTER (WHERE poblacion = 'fuera_de_alcance'),
    'poblacion_excluida_baja', count(*) FILTER (WHERE poblacion = 'excluida_baja'),
    'programme_service', count(*) FILTER (WHERE poblacion <> 'anulado'),
    'poblacion_servicio', count(*) FILTER (WHERE poblacion = 'servicio'),
    'candidate_kpi', count(*) FILTER (WHERE poblacion = 'servicio'),
    'candidata_kpi', count(*) FILTER (WHERE poblacion = 'servicio'),
    'excluded_from_candidate', count(*) FILTER (WHERE poblacion <> 'servicio'),
    'evaluable', count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')),
    'evaluables', count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')),
    'not_evaluable_within_candidate', count(*) FILTER (WHERE poblacion = 'servicio' AND temporal_result = 'NOT_EVALUABLE'),
    'no_evaluables', count(*) FILTER (WHERE temporal_result = 'NOT_EVALUABLE'),
    'met', count(*) FILTER (WHERE temporal_result = 'MET'),
    'missed', count(*) FILTER (WHERE temporal_result = 'MISSED'),
    'temporal_adherence_pct', CASE WHEN count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')) > 0
        THEN round(100.0 * count(*) FILTER (WHERE temporal_result = 'MET')
                   / count(*) FILTER (WHERE temporal_result IN ('MET','MISSED')), 2) END,
    'completitud_start', round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND start_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'completitud_end',   round(100.0 * count(*) FILTER (WHERE poblacion='servicio' AND end_date IS NOT NULL)
                               / nullif(count(*) FILTER (WHERE poblacion='servicio'),0), 2),
    'anomalia_end_previo_start', count(*) FILTER (WHERE reason_not_evaluable = 'end_previo_a_start'),
    'anomalia_fecha_futura', count(*) FILTER (WHERE reason_not_evaluable = 'fecha_futura'),
    'anomalia_territorio_no_resuelto', count(*) FILTER (WHERE territorio_ot = 'UNRESOLVED'),
    'duplicados_num_ot', count(*) - count(DISTINCT num_ot),
    'motivos_no_evaluable', (SELECT jsonb_object_agg(k, n) FROM (
        SELECT reason_not_evaluable k, count(*) n FROM t WHERE reason_not_evaluable IS NOT NULL GROUP BY 1) z),
    'territorios', (SELECT jsonb_object_agg(k, n) FROM (
        SELECT territorio_ot k, count(*) n FROM t GROUP BY 1) z2),
    'rango_start', jsonb_build_object('min', min(start_date), 'max', max(start_date))
  ) INTO v_r FROM t;

  RETURN jsonb_build_object(
    'vertical', v_prog.vert, 'cliente', v_prog.cli, 'programa', v_prog.nombre, 'programa_id', v_prog.id,
    'kpi', v_def.codigo, 'kpi_nombre', v_def.nombre, 'regla_version_id', p_regla_version,
    'regla_version_num', v_rv.version,
    'claim_id', v_cl.id, 'claim_estado', v_cl.estado,
    'modo', v_modo,
    'literal_contractual', v_cl.enunciado,
    'literal_umbral', v_par->>'literal_umbral',
    'literal_documental', v_par->>'literal_documental',
    'unidad_documental', v_par->>'unidad_documental',
    'normalizacion_wg', v_par->>'normalizacion',
    'start_event', v_par->>'start_event',
    'start_campo', v_ev->'mapping_start'->>'campo_erp',
    'mapping_status_start', v_ev->'mapping_start'->>'grado',
    'end_event', v_par->>'end_event',
    'end_campo', v_ev->'mapping_end'->>'campo_erp',
    'mapping_status_end', v_ev->'mapping_end'->>'grado',
    'poblacion_fuente', coalesce(v_par->>'poblacion_fuente','correspondencia'),
    'poblacion_filtro', v_par->'poblacion_filtro',
    'poblacion_grado', v_par->>'poblacion_grado',
    'escenario_baja', p_escenario_baja,
    'pipeline_start', v_par->>'pipeline_start',
    'front_office', v_par->>'front_office',
    'deadline_days', (v_par->>'deadline_dias')::int,
    'calendar_type', v_par->>'calendar_type',
    'territorio_modo', coalesce(v_par->>'territorio_modo','por_ot'),
    'deadline', (v_par->>'deadline_dias') || ' ' || replace(v_par->>'deadline_unidad','_',' ') || ' (dia de inicio no cuenta)',
    'as_of', public.ops_as_of('ot'),
    'evaluabilidad', v_ev,
    'evaluation_ready', v_ev->'evaluation_ready',
    'temporal_result_available', v_ev->'temporal_result_available',
    'contractual_temporal_result_available', v_ev->'contractual_temporal_result_available',
    'scenario_result_available', v_ev->'scenario_result_available',
    'publication_ready', v_ev->'publication_ready',
    'next_blocker', v_ev->>'next_blocker',
    'remaining_blockers', v_ev->'remaining_blockers',
    'universos_y_resultado', v_r,
    'etiqueta', CASE
      WHEN v_esc THEN 'ESCENARIO DE MANAGEMENT (no hecho contractual): el instrumento no califica la unidad temporal ni fija START/END explicitos.'
      WHEN v_prof THEN 'Adherencia temporal observable antes de aplicacion del mecanismo contractual de imputabilidad 80/20'
      ELSE 'Adherencia temporal observable. No aplica mecanismo 80/20 (semantica propia de la vertical Insurance/Retail).' END,
    'publicable', (v_ev->>'publication_ready')::boolean);
END $fn$;

CREATE OR REPLACE FUNCTION public.ctr_sla_batch1_resumen(p_escenario_baja text DEFAULT 'A'::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_out jsonb;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT jsonb_agg(public.ctr_sla_temporal_resumen(rv, p_escenario_baja) ORDER BY ord) INTO v_out
  FROM (VALUES
    ('7a1e0004-0000-4000-8000-000000000001'::uuid, 1),
    ('7a1e0004-0000-4000-8000-000000000002'::uuid, 2),
    ('7c1e0004-0000-4000-8000-000000000003'::uuid, 3),
    ('7c1e0004-0000-4000-8000-000000000004'::uuid, 4),
    ('7b1e0004-0000-4000-8000-000000000002'::uuid, 5),
    ('7c1e0004-0000-4000-8000-000000000023'::uuid, 6)
  ) t(rv, ord);
  RETURN v_out;
END $fn$;

GRANT EXECUTE ON FUNCTION public.ops_territorio_ot(text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ops_add_working_days(date,integer,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_calendario_cobertura(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_ot(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_evaluabilidad(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_temporal_resumen(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ctr_sla_batch1_resumen(text) TO authenticated, service_role;