-- ============================================================================
-- Test de la guardia is_management en funciones SECURITY DEFINER de /operaciones
--
-- Patrón bajo prueba (ver docs/perf/security-definer-pattern.md):
--   wrapper SECURITY DEFINER  →  IF NOT public.is_management(auth.uid())
--                                  THEN RAISE EXCEPTION 'no autorizado';
--                                →  delega en <fn>_impl (SECURITY INVOKER)
--
-- Comprueba, dentro de una transacción con ROLLBACK, que:
--   1. Con rol authenticated y JWT de un usuario management → devuelve datos.
--   2. Con rol authenticated y JWT de un usuario sin rol management → error
--      'no autorizado'.
--
-- Ejecución:  psql -f supabase/tests/security_definer_guard.sql
-- No modifica datos: todo ocurre en una transacción que termina en ROLLBACK.
-- ============================================================================

BEGIN;

-- Usuarios de prueba resueltos por rol (no se codifica ningún UUID).
CREATE TEMP TABLE _tt_users ON COMMIT DROP AS
SELECT
  (SELECT user_id::text FROM public.user_roles WHERE role = 'management' LIMIT 1) AS mgmt,
  (SELECT ur.user_id::text
     FROM public.user_roles ur
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles m
       WHERE m.user_id = ur.user_id AND m.role = 'management')
    LIMIT 1) AS nomgmt;

DO $$
DECLARE
  v_mgmt text;
  v_no   text;
  v_res  jsonb;
  v_ok   int := 0;
  fn     text;
BEGIN
  SELECT mgmt, nomgmt INTO v_mgmt, v_no FROM _tt_users;
  IF v_mgmt IS NULL OR v_no IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: faltan usuarios de prueba (management=% / sin rol=%)', v_mgmt, v_no;
  END IF;

  FOREACH fn IN ARRAY ARRAY[
    'ops_cobertura_datos',
    'ops_dispersion_resumen',
    'ops_dispersion_detalle',
    'ops_panorama_resumen',
    'ops_panorama_series',
    'ops_supply_resumen',
    'ops_supply_detalle'
  ] LOOP
    -- (1) AUTORIZADO ---------------------------------------------------------
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_mgmt, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      EXECUTE format(
        CASE fn
          WHEN 'ops_cobertura_datos'     THEN 'SELECT public.%I()'
          WHEN 'ops_dispersion_resumen'  THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_dispersion_detalle'  THEN 'SELECT public.%I(''provincia'', ''MADRID'', DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_panorama_resumen'    THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_panorama_series'     THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_supply_resumen'      THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_supply_detalle'      THEN 'SELECT public.%I(''pte_piezas'', NULL, DATE ''2026-06-01'', DATE ''2026-06-30'')'
        END, fn) INTO v_res;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      RAISE EXCEPTION 'FAIL % · management debería poder ejecutarla: %', fn, SQLERRM;
    END;
    RESET ROLE;
    IF v_res IS NULL THEN
      RAISE EXCEPTION 'FAIL % · management no obtuvo payload', fn;
    END IF;

    -- (2) NO AUTORIZADO ------------------------------------------------------
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_no, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      EXECUTE format(
        CASE fn
          WHEN 'ops_cobertura_datos'     THEN 'SELECT public.%I()'
          WHEN 'ops_dispersion_resumen'  THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_dispersion_detalle'  THEN 'SELECT public.%I(''provincia'', ''MADRID'', DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_panorama_resumen'    THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_panorama_series'     THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_supply_resumen'      THEN 'SELECT public.%I(DATE ''2026-06-01'', DATE ''2026-06-30'')'
          WHEN 'ops_supply_detalle'      THEN 'SELECT public.%I(''pte_piezas'', NULL, DATE ''2026-06-01'', DATE ''2026-06-30'')'
        END, fn) INTO v_res;
      RESET ROLE;
      RAISE EXCEPTION 'FAIL % · un usuario sin rol management ha obtenido datos', fn;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLERRM NOT ILIKE '%no autorizado%' THEN
        RAISE EXCEPTION 'FAIL % · error inesperado sin rol: %', fn, SQLERRM;
      END IF;
    END;

    v_ok := v_ok + 1;
    RAISE NOTICE 'PASS % · autorizado devuelve datos / no autorizado bloqueado', fn;
  END LOOP;

  RAISE NOTICE '== SECURITY DEFINER GUARD: % / % funciones PASS ==', v_ok, 7;
END $$;

ROLLBACK;
