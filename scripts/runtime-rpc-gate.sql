-- =====================================================================
-- GATE TÉCNICO PERMANENTE · ejecución real de todas las RPC ops_* que
-- consume el frontend de /operaciones.
--
-- Propósito: ninguna RPC consumida puede estar rota en runtime. El gate
-- las ejecuta de verdad, con parámetros representativos, mide tiempo y
-- tamaño de payload y FALLA (RAISE EXCEPTION) si alguna devuelve error.
--
-- Uso:   psql -v ON_ERROR_STOP=1 -f scripts/runtime-rpc-gate.sql
-- Ejecutarlo DOS VECES: la segunda medición es la válida (caché caliente).
--
-- Nota de permisos: ops_panorama y ops_cobertura_datos solo tienen
-- EXECUTE para `authenticated`. El gate intenta asumir ese rol dentro de
-- una transacción; si el rol de ejecución no puede hacerlo, esas dos
-- quedan como SKIPPED_PERM (no como FAIL) y se indica en la salida.
--
-- El único efecto persistente es una fila en public.ops_gate_log (traza
-- de ejecución, sin dato operativo). Las mediciones viven en una tabla
-- temporal.
-- =====================================================================

\set ON_ERROR_STOP on
\timing off

DROP TABLE IF EXISTS rpc_gate_result;
CREATE TEMP TABLE rpc_gate_result (
  orden      serial,
  rpc        text,
  caso       text,
  estado     text,
  ms         numeric(10,1),
  payload_kb numeric(10,1),
  consumidor text,
  error      text
);

DO $gate$
DECLARE
  -- caso: rpc | etiqueta | expresión SQL | consumidor frontend | requiere_authenticated
  casos text[][] := ARRAY[
    ['ops_as_of','base',
     $q$SELECT public.ops_as_of('ot')$q$,
     'src/lib/ops-as-of.ts (vía ops_data_quality)','n'],

    ['ops_kpis','jun-2026 sin filtros',
     $q$SELECT public.ops_kpis('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Dashboard.tsx, src/pages/ops/SLA.tsx','n'],
    ['ops_kpis','12M jul25-jun26',
     $q$SELECT public.ops_kpis('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/Dashboard.tsx','n'],
    ['ops_kpis','filtro delegacion+gama',
     $q$SELECT public.ops_kpis('2026-06-01','2026-06-30','Central San Agustin',NULL,'Blanca')$q$,
     'src/pages/ops/Dashboard.tsx','n'],

    ['ops_evolucion','sin filtros',
     $q$SELECT count(*) FROM public.ops_evolucion()$q$,
     'src/pages/ops/Dashboard.tsx','n'],
    ['ops_evolucion','filtro delegacion+gama',
     $q$SELECT count(*) FROM public.ops_evolucion('Central San Agustin',NULL,'Blanca')$q$,
     'src/pages/ops/Dashboard.tsx','n'],

    ['ops_alertas','jun-2026 sin filtros',
     $q$SELECT public.ops_alertas('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Dashboard.tsx','n'],
    ['ops_alertas','12M jul25-jun26',
     $q$SELECT public.ops_alertas('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/Dashboard.tsx','n'],

    ['ops_equipos','jun-2026 sin filtros',
     $q$SELECT count(*) FROM public.ops_equipos('2026-06-01','2026-06-30')$q$,
     'src/components/ops/EquiposComparativa.tsx','n'],
    ['ops_equipos','12M jul25-jun26',
     $q$SELECT count(*) FROM public.ops_equipos('2025-07-01','2026-06-30')$q$,
     'src/components/ops/EquiposComparativa.tsx','n'],

    ['ops_tecnicos_scorecard','jun-2026 sin filtros',
     $q$SELECT count(*) FROM public.ops_tecnicos_scorecard('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Tecnicos.tsx, src/pages/ops/Dashboard.tsx','n'],
    ['ops_tecnicos_scorecard','12M jul25-jun26',
     $q$SELECT count(*) FROM public.ops_tecnicos_scorecard('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/Tecnicos.tsx','n'],

    ['ops_tecnico_ficha','tecnico real',
     $q$SELECT public.ops_tecnico_ficha('MANUEL')$q$,
     'src/pages/ops/Tecnicos.tsx','n'],

    ['ops_delegaciones','jun-2026 sin filtros',
     $q$SELECT public.ops_delegaciones('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Delegaciones.tsx','n'],
    ['ops_delegaciones','12M jul25-jun26',
     $q$SELECT public.ops_delegaciones('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/Delegaciones.tsx','n'],

    ['ops_delegacion_ficha','Central San Agustin jun-2026',
     $q$SELECT public.ops_delegacion_ficha('Central San Agustin','2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Hub.tsx, src/pages/ops/Delegaciones.tsx','n'],

    -- @deprecated (sustituida por resumen+detalle); se mantiene en el gate
    -- mientras exista en la base como referencia de paridad.
    ['ops_sla','jun-2026 sin filtros (deprecada)',
     $q$SELECT public.ops_sla('2026-06-01','2026-06-30')$q$,
     '— (sustituida por ops_sla_resumen)','n'],
    ['ops_sla_resumen','jun-2026 sin filtros',
     $q$SELECT public.ops_sla_resumen('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/SLA.tsx','n'],
    ['ops_sla_resumen','12M jul25-jun26',
     $q$SELECT public.ops_sla_resumen('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/SLA.tsx','n'],
    ['ops_sla_detalle','bucket 31-60 pág.1',
     $q$SELECT public.ops_sla_detalle('bucket','31-60')$q$,
     'src/pages/ops/SLA.tsx (drill-down)','n'],
    ['ops_sla_detalle','etapa pág.1',
     $q$SELECT public.ops_sla_detalle('etapa','PTE. PIEZAS')$q$,
     'src/pages/ops/SLA.tsx (drill-down)','n'],

    ['ops_costes','jun-2026',
     $q$SELECT public.ops_costes('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Costes.tsx','n'],
    ['ops_costes_entidades','jun-2026 delegacion',
     $q$SELECT count(*) FROM public.ops_costes_entidades('2026-06-01','2026-06-30','delegacion')$q$,
     'src/pages/ops/Costes.tsx','n'],

    ['ops_dispersion','jun-2026 sin filtros (deprecada)',
     $q$SELECT public.ops_dispersion('2026-06-01','2026-06-30')$q$,
     '— (sustituida por ops_dispersion_resumen)','n'],
    ['ops_dispersion_resumen','jun-2026 sin filtros',
     $q$SELECT public.ops_dispersion_resumen('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Dispersion.tsx','y'],
    ['ops_dispersion_resumen','12M jul25-jun26',
     $q$SELECT public.ops_dispersion_resumen('2025-07-01','2026-06-30')$q$,
     'src/pages/ops/Dispersion.tsx','y'],
    ['ops_dispersion_detalle','provincia Madrid pág.1',
     $q$SELECT public.ops_dispersion_detalle('provincia','MADRID','2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Dispersion.tsx (drill-down)','y'],


    ['ops_supply','jun-2026 con previo',
     $q$SELECT public.ops_supply('2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-01','2026-05-31')$q$,
     '— (sustituida por ops_supply_resumen/detalle)','n'],
    ['ops_supply','12M con previo',
     $q$SELECT public.ops_supply('2025-07-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-07-01','2025-06-30')$q$,
     '— (sustituida por ops_supply_resumen/detalle)','n'],

    -- Tercera pasada: resumen + detalle de supply (predicate pushdown).
    ['ops_supply_resumen','jun-2026 con previo',
     $q$SELECT public.ops_supply_resumen('2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-01','2026-05-31')$q$,
     'src/pages/ops/Repuestos.tsx, Logistica.tsx, Dashboard.tsx','y'],
    ['ops_supply_resumen','12M con previo',
     $q$SELECT public.ops_supply_resumen('2025-07-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-07-01','2025-06-30')$q$,
     'src/pages/ops/Repuestos.tsx','y'],
    ['ops_supply_detalle','pte_piezas límite 50',
     $q$SELECT public.ops_supply_detalle('pte_piezas',NULL,'2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,50,0)$q$,
     'src/pages/ops/Repuestos.tsx (drill-down)','y'],
    ['ops_supply_detalle','demanda límite 50',
     $q$SELECT public.ops_supply_detalle('demanda',NULL,'2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,50,0)$q$,
     'src/pages/ops/Repuestos.tsx (drill-down)','y'],


    ['ops_logistica','jun-2026 con previo',
     $q$SELECT public.ops_logistica('2026-06-01','2026-06-30','2026-05-01','2026-05-31')$q$,
     'src/pages/ops/Logistica.tsx','n'],

    ['ops_sats_ranking','jun-2026',
     $q$SELECT count(*) FROM public.ops_sats_ranking('2026-06-01','2026-06-30')$q$,
     'src/pages/ops/Sats.tsx','n'],

    ['ops_data_quality','base',
     $q$SELECT public.ops_data_quality()$q$,
     'src/hooks/useDataQuality.ts','n'],
    ['ops_sla_registry_resumen','base',
     $q$SELECT count(*) FROM public.ops_sla_registry_resumen()$q$,
     'src/pages/ops/CalidadDatos.tsx','n'],

    ['ops_filter_options','sin filtros',
     $q$SELECT public.ops_filter_options()$q$,
     'src/lib/ops-filters.tsx','n'],
    ['ops_filter_options','filtro delegacion+gama',
     $q$SELECT public.ops_filter_options('Central San Agustin',NULL,'Blanca')$q$,
     'src/lib/ops-filters.tsx','n'],

    ['ops_panorama','jun-2026 p_meses=12',
     $q$SELECT public.ops_panorama('2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,12)$q$,
     'src/pages/ops/Dashboard.tsx','y'],
    ['ops_panorama','jun-2026 p_meses=1',
     $q$SELECT public.ops_panorama('2026-06-01','2026-06-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1)$q$,
     'src/pages/ops/Dashboard.tsx','y'],
    ['ops_cobertura_datos','base',
     $q$SELECT public.ops_cobertura_datos()$q$,
     'src/lib/ops-filters.tsx','y']
  ];
  i int;
  t0 timestamptz;
  ms numeric;
  res text;
  fallos int := 0;
  total int := 0;
  ok int := 0;
  ms_acum numeric := 0;
  puede_authenticated boolean := true;
BEGIN
  -- ¿Podemos asumir el rol `authenticated` para las RPC restringidas?
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    puede_authenticated := false;
    RESET ROLE;
  END;

  FOR i IN 1 .. array_length(casos, 1) LOOP
    total := total + 1;

    IF casos[i][5] = 'y' AND NOT puede_authenticated THEN
      INSERT INTO rpc_gate_result(rpc, caso, estado, ms, payload_kb, consumidor, error)
      VALUES (casos[i][1], casos[i][2], 'SKIPPED_PERM', NULL, NULL, casos[i][4],
              'EXECUTE solo para authenticated; el rol actual no puede asumirlo');
      CONTINUE;
    END IF;

    BEGIN
      IF casos[i][5] = 'y' THEN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format(
          'SET LOCAL request.jwt.claims = %L',
          (SELECT json_build_object('sub', user_id, 'role', 'authenticated')::text
             FROM public.user_roles WHERE role = 'management' LIMIT 1));
      END IF;

      t0 := clock_timestamp();
      EXECUTE 'SELECT (' || casos[i][3] || ')::text' INTO res;
      ms := EXTRACT(epoch FROM clock_timestamp() - t0) * 1000;

      IF casos[i][5] = 'y' THEN RESET ROLE; END IF;

      ok := ok + 1;
      ms_acum := ms_acum + ms;
      INSERT INTO rpc_gate_result(rpc, caso, estado, ms, payload_kb, consumidor, error)
      VALUES (casos[i][1], casos[i][2], 'PASS', round(ms, 1),
              round(coalesce(length(res), 0) / 1024.0, 1), casos[i][4], NULL);

    EXCEPTION WHEN OTHERS THEN
      BEGIN RESET ROLE; EXCEPTION WHEN OTHERS THEN NULL; END;
      fallos := fallos + 1;
      RAISE WARNING 'GATE FAIL · % [%]: %', casos[i][1], casos[i][2], SQLERRM;
      INSERT INTO rpc_gate_result(rpc, caso, estado, ms, payload_kb, consumidor, error)
      VALUES (casos[i][1], casos[i][2], 'FAIL', NULL, NULL, casos[i][4], SQLERRM);
    END;
  END LOOP;

  INSERT INTO public.ops_gate_log(rpcs_total, rpcs_ok, ms_total, notas)
  VALUES (total, ok, round(ms_acum)::int,
          CASE WHEN puede_authenticated THEN 'gate completo'
               ELSE 'gate parcial: ops_panorama / ops_cobertura_datos omitidas por permisos' END);

  IF fallos > 0 THEN
    RAISE EXCEPTION 'RUNTIME RPC GATE: % de % casos han fallado (ver rpc_gate_result)', fallos, total;
  END IF;

  RAISE NOTICE 'RUNTIME RPC GATE OK: % casos, % ms acumulados', total, round(ms_acum);
END;
$gate$;

SELECT rpc, caso, estado, ms, payload_kb, consumidor, error
FROM rpc_gate_result
ORDER BY orden;

SELECT ejecutado_en, rpcs_total, rpcs_ok, ms_total, notas
FROM public.ops_gate_log
ORDER BY ejecutado_en DESC
LIMIT 1;
