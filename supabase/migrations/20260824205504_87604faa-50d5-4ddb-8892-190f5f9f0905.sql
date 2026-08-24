CREATE OR REPLACE FUNCTION public.ops_data_quality()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_fact jsonb;
  v_campos jsonb;
  v_rrhh jsonb;
  v_coste jsonb;
  v_geo jsonb;
  v_tablas jsonb;
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

  SELECT jsonb_build_object(
    'filas', count(*), 'meses', count(DISTINCT mes), 'ultimo_mes', max(mes)
  ) INTO v_rrhh FROM public.ops_rrhh;

  SELECT jsonb_build_object(
    'filas', count(*), 'meses', count(DISTINCT mes), 'ultimo_mes', max(mes)
  ) INTO v_coste FROM public.ops_coste_mensual;

  SELECT jsonb_build_object(
    'filas_cp_geo', (SELECT count(*) FROM public.ops_cp_geo),
    'ots_domicilio', count(*),
    'ots_domicilio_geocodificables', count(g.cp),
    'pct_geocodificable',
      CASE WHEN count(*) = 0 THEN NULL ELSE round(count(g.cp)::numeric / count(*), 4) END
  ) INTO v_geo
  FROM public.ops_fact_ot f
  LEFT JOIN public.ops_cp_geo g ON g.cp = f.codigo_postal
  WHERE f.canal = 'Domicilio';

  v_tablas := jsonb_build_object(
    'ops_visitas',            to_regclass('public.ops_visitas') IS NOT NULL,
    'ops_historial_estados',  to_regclass('public.ops_historial_estados') IS NOT NULL,
    'ops_repuestos',          to_regclass('public.ops_repuestos') IS NOT NULL,
    'ops_reclamaciones',      to_regclass('public.ops_reclamaciones') IS NOT NULL,
    'ops_csat',               to_regclass('public.ops_csat') IS NOT NULL,
    'ops_sla_registry',       to_regclass('public.ops_sla_registry') IS NOT NULL
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
    'registry_reglas', (SELECT count(*) FROM public.ops_sla_registry)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ops_data_quality() TO authenticated;

NOTIFY pgrst, 'reload schema';