-- =============================================================================
-- E2E SUPPLY (F4B.1) — prueba permanente y repetible, SIN residuos.
--
-- Ejercita en una sola transacción:
--   · 3 líneas de expedición que abastecen 2 OTs distintas
--   · una expedición con incidencia y su reexpedición asociada
--   · una foto de stock
--   · los 7 hitos temporales de la cadena (necesidad → solicitud → disponibilidad
--     → picking inicio → picking fin → expedición → entrega)
--   · campos vacíos (nulos) que NO deben convertirse en ceros
--   · segunda carga idéntica (idempotencia por clave natural)
--
-- Cómo se ejecuta: como bloque DO. Al final SIEMPRE lanza una excepción con el
-- resumen, de modo que la transacción hace ROLLBACK y la base queda intacta
-- (0 residuos). Un resultado que empiece por "E2E SUPPLY OK" es un PASS.
--
-- NOTA: este script cubre la capa de datos. El acceptance test real con
-- Analytics deberá además ejercitar el IMPORTADOR CSV, una SESIÓN MANAGEMENT y
-- las políticas RLS extremo a extremo desde el navegador.
-- =============================================================================
DO $$
DECLARE
  v_sol int; v_exp int; v_lin int; v_stk int;
  v_ot1 int; v_ot2 int; v_reexp int; v_nulos int;
  v_lin2 int; v_exp2 int;
BEGIN
  -- 1) Solicitudes de pieza con los 7 hitos y un campo deliberadamente vacío.
  INSERT INTO public.ops_pieza_solicitud
    (num_ot, referencia, descripcion, cantidad, proveedor,
     fecha_necesidad, fecha_solicitud, fecha_disponibilidad, fecha_picking,
     fecha_expedicion, fecha_entrega, fecha_montaje, estado_pieza, coste_unitario, origen_dato)
  VALUES
    ('E2E-OT-1','E2E-REF-A','Motor E2E',1,'PROV-E2E',
     '2026-06-01','2026-06-02','2026-06-04','2026-06-05',
     '2026-06-05','2026-06-06','2026-06-07','montada',12.5,'e2e'),
    ('E2E-OT-2','E2E-REF-B','Bomba E2E',2,NULL,
     '2026-06-01','2026-06-02',NULL,NULL,
     NULL,NULL,NULL,'solicitada',NULL,'e2e');

  -- 2) Expedición original con incidencia + reexpedición que la sustituye.
  INSERT INTO public.ops_expedicion
    (referencia_expedicion, almacen_base, expedicion_id, num_ot, preparado_por, persona_id, equipo,
     picking_inicio, picking_fin, expedicion_timestamp, transportista, origen, destino, destino_cp,
     destino_tipo, fecha_entrega_prevista, fecha_entrega_real, estado_expedicion, tipo_incidencia,
     reexpedicion, expedicion_origen_id, coste_transporte, num_lineas, num_unidades,
     num_ot_abastecidas, procedencia_conteo, origen_dato)
  VALUES
    ('E2E-EXP-1','E2E-CENTRAL','E2E-EXP-1','E2E-OT-1','Ana','P-E2E','Turno E2E',
     '2026-06-05 08:00','2026-06-05 08:30','2026-06-05 10:15','SEUR','E2E-CENTRAL','SAT E2E','28001',
     'cliente','2026-06-06',NULL,'incidencia','rotura',
     false,NULL,7.00,2,3,2,'declarado','e2e'),
    ('E2E-EXP-2','E2E-CENTRAL','E2E-EXP-2','E2E-OT-1','Ana','P-E2E','Turno E2E',
     '2026-06-08 08:00','2026-06-08 08:20','2026-06-08 09:00','SEUR','E2E-CENTRAL','SAT E2E','28001',
     'cliente','2026-06-09','2026-06-09','entregada',NULL,
     true,'E2E-EXP-1',5.00,1,1,1,'declarado','e2e');

  -- 3) Tres líneas que abastecen dos OTs distintas.
  INSERT INTO public.ops_expedicion_linea
    (almacen_base, expedicion_id, linea, referencia, descripcion, cantidad, num_ot, origen_dato)
  VALUES
    ('E2E-CENTRAL','E2E-EXP-1',1,'E2E-REF-A','Motor E2E',1,'E2E-OT-1','e2e'),
    ('E2E-CENTRAL','E2E-EXP-1',2,'E2E-REF-B','Bomba E2E',2,'E2E-OT-2','e2e'),
    ('E2E-CENTRAL','E2E-EXP-2',1,'E2E-REF-A','Motor E2E',1,'E2E-OT-1','e2e');

  -- 4) Foto de stock, con un disponible vacío que debe seguir siendo NULL.
  INSERT INTO public.ops_stock_snapshot
    (fecha_snapshot, almacen_base, referencia, descripcion, stock_fisico, reservado,
     stock_disponible, en_transito, coste_medio, origen_dato)
  VALUES
    ('2026-06-05','E2E-CENTRAL','E2E-REF-A','Motor E2E',4,1,3,0,22.0,'e2e'),
    ('2026-06-05','E2E-CENTRAL','E2E-REF-B','Bomba E2E',0,0,NULL,NULL,NULL,'e2e');

  -- 5) SEGUNDA CARGA IDÉNTICA → debe actualizar, nunca duplicar.
  INSERT INTO public.ops_expedicion_linea
    (almacen_base, expedicion_id, linea, referencia, descripcion, cantidad, num_ot, origen_dato)
  VALUES
    ('E2E-CENTRAL','E2E-EXP-1',1,'E2E-REF-A','Motor E2E',1,'E2E-OT-1','e2e'),
    ('E2E-CENTRAL','E2E-EXP-1',2,'E2E-REF-B','Bomba E2E',2,'E2E-OT-2','e2e'),
    ('E2E-CENTRAL','E2E-EXP-2',1,'E2E-REF-A','Motor E2E',1,'E2E-OT-1','e2e')
  ON CONFLICT (almacen_base, expedicion_id, linea) DO UPDATE
    SET cantidad = EXCLUDED.cantidad, descripcion = EXCLUDED.descripcion;

  SELECT count(*) INTO v_sol FROM public.ops_pieza_solicitud WHERE origen_dato = 'e2e';
  SELECT count(*) INTO v_exp FROM public.ops_expedicion       WHERE origen_dato = 'e2e';
  SELECT count(*) INTO v_lin FROM public.ops_expedicion_linea WHERE origen_dato = 'e2e';
  SELECT count(*) INTO v_stk FROM public.ops_stock_snapshot   WHERE origen_dato = 'e2e';
  SELECT count(DISTINCT num_ot) INTO v_ot1 FROM public.ops_expedicion_linea WHERE origen_dato = 'e2e';
  SELECT count(*) INTO v_reexp FROM public.ops_expedicion WHERE origen_dato='e2e' AND reexpedicion;
  SELECT count(*) INTO v_nulos FROM public.ops_pieza_solicitud
    WHERE origen_dato='e2e' AND fecha_disponibilidad IS NULL AND coste_unitario IS NULL;
  SELECT count(*) INTO v_lin2 FROM public.ops_expedicion_linea
    WHERE origen_dato='e2e' AND expedicion_id='E2E-EXP-1';
  SELECT count(*) INTO v_exp2 FROM public.ops_stock_snapshot
    WHERE origen_dato='e2e' AND stock_disponible IS NULL;

  IF v_sol <> 2 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: solicitudes=% (esperado 2)', v_sol; END IF;
  IF v_exp <> 2 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: expediciones=% (esperado 2)', v_exp; END IF;
  IF v_lin <> 3 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: lineas=% (esperado 3, la 2a carga NO debe duplicar)', v_lin; END IF;
  IF v_lin2 <> 2 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: lineas de EXP-1=% (esperado 2)', v_lin2; END IF;
  IF v_ot1 <> 2 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: OTs abastecidas=% (esperado 2)', v_ot1; END IF;
  IF v_reexp <> 1 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: reexpediciones=% (esperado 1)', v_reexp; END IF;
  IF v_nulos <> 1 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: los campos vacios se han rellenado con ceros'; END IF;
  IF v_exp2 <> 1 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: stock_disponible vacio convertido en 0'; END IF;
  IF v_stk <> 2 THEN RAISE EXCEPTION 'E2E SUPPLY FAIL: stock=% (esperado 2)', v_stk; END IF;

  RAISE EXCEPTION 'E2E SUPPLY OK · solicitudes=% expediciones=% lineas=% OTs=% reexpedicion=% stock=% · ROLLBACK aplicado, 0 residuos',
    v_sol, v_exp, v_lin, v_ot1, v_reexp, v_stk;
END $$;
