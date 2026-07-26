DO $mig$
DECLARE
  fn_oid oid;
  fn_names text[] := ARRAY[
    'ops_kpis','ops_evolucion','ops_tecnicos_scorecard','ops_tecnico_ficha',
    'ops_sla','ops_sats_ranking','ops_delegaciones'
  ];
  n text;
  src text;
  new_src text;
BEGIN
  FOREACH n IN ARRAY fn_names LOOP
    SELECT oid INTO fn_oid FROM pg_proc WHERE proname = n AND pronamespace = 'public'::regnamespace;
    IF fn_oid IS NULL THEN
      RAISE NOTICE 'skip %', n;
      CONTINUE;
    END IF;
    src := pg_get_functiondef(fn_oid);
    new_src := regexp_replace(src, 'gama_origen\s*=\s*p_gama', 'gama_real = p_gama', 'g');
    IF new_src = src THEN
      RAISE NOTICE 'no change in %', n;
    ELSE
      EXECUTE new_src;
    END IF;
  END LOOP;
END
$mig$;

CREATE OR REPLACE FUNCTION public.ops_filter_options()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'delegaciones', COALESCE((SELECT jsonb_agg(DISTINCT delegacion ORDER BY delegacion) FROM public.ops_fact_ot WHERE delegacion IS NOT NULL AND delegacion <> ''), '[]'::jsonb),
    'clientes', COALESCE((SELECT jsonb_agg(DISTINCT cliente_wg ORDER BY cliente_wg) FROM public.ops_fact_ot WHERE cliente_wg IS NOT NULL), '[]'::jsonb),
    'gamas', COALESCE((SELECT jsonb_agg(DISTINCT gama_real ORDER BY gama_real) FROM public.ops_fact_ot WHERE gama_real IS NOT NULL), '[]'::jsonb),
    'familias', COALESCE((SELECT jsonb_agg(DISTINCT familia ORDER BY familia) FROM public.ops_fact_ot WHERE familia IS NOT NULL), '[]'::jsonb),
    'provincias', COALESCE((SELECT jsonb_agg(DISTINCT provincia ORDER BY provincia) FROM public.ops_fact_ot WHERE provincia IS NOT NULL), '[]'::jsonb),
    'sats', COALESCE((SELECT jsonb_agg(DISTINCT sat ORDER BY sat) FROM public.ops_fact_ot WHERE sat IS NOT NULL), '[]'::jsonb),
    'tecnicos', COALESCE((SELECT jsonb_agg(t.tecnico ORDER BY t.tecnico) FROM public.ops_tecnicos t), '[]'::jsonb),
    'canales', COALESCE((SELECT jsonb_agg(DISTINCT canal ORDER BY canal) FROM public.ops_fact_ot WHERE canal IS NOT NULL AND canal <> ''), '[]'::jsonb)
  );
$function$;