CREATE OR REPLACE FUNCTION public.ops_supply_detalle_impl(
  p_bloque text DEFAULT 'pte_piezas', p_clave text DEFAULT NULL,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_delegacion text DEFAULT NULL,
  p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL, p_familia text DEFAULT NULL,
  p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL, p_sat text DEFAULT NULL,
  p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_asof date := public.ops_as_of('ot');
  v_from date := COALESCE(p_from, date_trunc('month', v_asof)::date);
  v_to date := COALESCE(p_to, v_asof);
  v_lim int := LEAST(GREATEST(COALESCE(p_limit,50),1),500);
  v_off int := GREATEST(COALESCE(p_offset,0),0);
  v_total bigint; v_rows jsonb;
BEGIN
  WITH base AS (
    SELECT f.num_ot, f.cliente_wg, f.gama_real, f.delegacion, f.sat, f.provincia,
           f.tecnico, f.estado, f.situacion, f.fecha_creacion, f.fecha_cierre,
           (v_asof - f.fecha_creacion)::int AS edad
    FROM public.ops_fact_ot f
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
      AND (
        (p_bloque = 'pte_piezas' AND f.situacion = 'Abierto' AND upper(COALESCE(f.estado,'')) = 'PTE. PIEZAS')
        OR (p_bloque = 'demanda' AND f.tiene_piezas IS TRUE AND f.fecha_creacion BETWEEN v_from AND v_to)
      )
      AND (p_clave IS NULL OR COALESCE(f.cliente_wg,'(sin dato)') = p_clave
           OR COALESCE(f.delegacion,'(sin dato)') = p_clave
           OR COALESCE(f.provincia,'(sin dato)') = p_clave
           OR COALESCE(f.sat,'(sin dato)') = p_clave
           OR COALESCE(f.gama_real,'(sin dato)') = p_clave)
  )
  SELECT count(*), COALESCE(jsonb_agg(row_to_json(t)) FILTER (WHERE t.rn > v_off AND t.rn <= v_off + v_lim), '[]'::jsonb)
  INTO v_total, v_rows
  FROM (SELECT b.*, row_number() OVER (ORDER BY edad DESC NULLS LAST, num_ot) rn FROM base b) t;

  RETURN jsonb_build_object('as_of', v_asof, 'total', v_total, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ops_panorama_resumen(date,date,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ops_panorama_series(date,date,text,text,text,text,text,text,text,text,text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ops_supply_resumen(date,date,text,text,text,text,text,text,text,text,text,date,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ops_supply_detalle(text,text,date,date,text,text,text,text,text,text,text,text,text,integer,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ops_panorama_resumen_impl(date,date,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_panorama_series_impl(date,date,text,text,text,text,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_supply_resumen_impl(date,date,text,text,text,text,text,text,text,text,text,date,date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_supply_detalle_impl(text,text,date,date,text,text,text,text,text,text,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_panorama_resumen(date,date,text,text,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_panorama_series(date,date,text,text,text,text,text,text,text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_supply_resumen(date,date,text,text,text,text,text,text,text,text,text,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_supply_detalle(text,text,date,date,text,text,text,text,text,text,text,text,text,integer,integer) TO authenticated;