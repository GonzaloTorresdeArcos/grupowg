DO $$
DECLARE f record; nuevo text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('ops_costes','ops_costes_entidades','ops_delegacion_ficha','ops_delegaciones',
                        'ops_dispersion','ops_equipos','ops_evolucion','ops_logistica',
                        'ops_tecnico_ficha','ops_tecnicos_scorecard')
  LOOP
    nuevo := regexp_replace(f.def, '\mCURRENT_DATE\M', 'public.ops_as_of(''ot'')', 'gi');
    EXECUTE nuevo;
  END LOOP;
END $$;