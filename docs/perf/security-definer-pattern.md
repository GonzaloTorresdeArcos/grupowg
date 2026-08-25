# Patrón SECURITY DEFINER + guardia `is_management`

## Por qué existe

Todas las tablas `ops_*` tienen RLS con una política que llama a
`public.is_management(auth.uid())`. En consultas analíticas que barren cientos
de miles de filas, el planificador evalúa esa política por fila y bloquea el
paralelismo, lo que multiplicaba por 10–30 el tiempo de respuesta (medido:
`ops_dispersion_resumen` 6,8 s → 0,23 s al eliminar esa reevaluación).

## Cuándo se usa

Solo en las RPC de análisis de `/operaciones` que agregan sobre `ops_fact_ot` y
tablas asociadas, y cuyo resultado es un agregado o un listado paginado. Nunca
para escritura, nunca para datos de otros dominios (portal, red WG).

## Forma obligatoria

Dos funciones por RPC:

```sql
-- 1) Implementación SIN privilegios elevados (SECURITY INVOKER por defecto).
CREATE OR REPLACE FUNCTION public.ops_x_impl(...) RETURNS jsonb
LANGUAGE sql STABLE PARALLEL SAFE SET search_path TO 'public' AS $$ ... $$;

-- 2) Wrapper SECURITY DEFINER con guardia explícita: sin ella, la función
--    quedaría abierta a cualquier usuario autenticado.
CREATE OR REPLACE FUNCTION public.ops_x(...) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_management(auth.uid()) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN public.ops_x_impl(...);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_x(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_x(...) TO authenticated;
```

Reglas no negociables:

1. La guardia `is_management` es la **primera** sentencia del wrapper.
2. El mensaje de error es siempre `no autorizado` (contrato de los tests).
3. `REVOKE ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated`: el rol
   `anon` no puede ejecutarlas.
4. La implementación `_impl` nunca se expone a `authenticated`.
5. El wrapper no acepta parámetros que permitan leer fuera del dominio `ops_*`.

## Funciones cubiertas hoy

`ops_cobertura_datos`, `ops_delegaciones`, `ops_dispersion_resumen`,
`ops_dispersion_detalle`, `ops_panorama_resumen`, `ops_panorama_series`,
`ops_supply_resumen`, `ops_supply_detalle`.

`ops_delegaciones` se incorporó en UAT-2: bajo rol `authenticated` tardaba
6.862 ms (RLS reevaluada + CTE `base` con `SELECT *` materializada) y con las
dos llamadas de la página —actual y previo— se rozaba el `statement_timeout`
de 8 s. Tras el patrón + CTE estrecha: 119 ms. Misma definición de KPI.

## Regla de migraciones

Todo cambio de firma o de exposición de una RPC termina con
`NOTIFY pgrst, 'reload schema';` en la misma migración.


## Cómo se prueba

- **En base de datos**: `supabase/tests/security_definer_guard.sql`. Abre una
  transacción, fija `request.jwt.claims` con el `sub` de un usuario management
  y `SET LOCAL ROLE authenticated` → la función debe devolver payload; repite
  con un usuario sin rol management → debe abortar con `no autorizado`;
  termina en `ROLLBACK`. No escribe nada.
  El rol restringido del sandbox no puede hacer `SET ROLE authenticated` desde
  `psql`; el script se ejecuta con la herramienta SQL administrada del
  proyecto (misma sentencia, mismo resultado).
- **En CI**: `src/lib/__tests__/ops-security-definer.test.ts` lee las
  migraciones y falla si aparece cualquier `public.ops_*` SECURITY DEFINER sin
  la guardia o sin el mensaje `no autorizado`. Cubre el caso de una función
  nueva añadida sin proteger.

Última ejecución del script SQL: **7/7 funciones PASS** (autorizado devuelve
datos, no autorizado bloqueado).

## Caso que NO usa el patrón: `ops_delegacion_ficha`

Medida bajo `authenticated` + claims management, tardaba ~4,1 s. El
`EXPLAIN (ANALYZE, BUFFERS)` descartó la RLS como causa: el 98 % del tiempo
estaba en la CTE `evo`, que llamaba a `public.ops_as_of('ot')` dentro de un
`FILTER` evaluado fila a fila sobre 46.221 filas materializadas.

La corrección eleva `ops_as_of` a variable escalar y estrecha las columnas de
la CTE `base`. La función sigue siendo **SECURITY INVOKER** (no hay motivo de
rendimiento para elevar privilegios) y se endurece igualmente su exposición:

```sql
REVOKE ALL ON FUNCTION public.ops_delegacion_ficha(text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_delegacion_ficha(text, date, date) TO authenticated;
```

Resultado: 4.300 ms → ~96 ms en caliente (8 casos medidos, todos <500 ms) con
igualdad de payload verificada contra
`src/lib/__fixtures__/ops-delegacion-ficha-before.json`.

Regla derivada: antes de aplicar el patrón SECURITY DEFINER hay que
**demostrar con plan** que la causa es la reevaluación de RLS. Si la causa es
una función volátil o STABLE llamada por fila, la solución correcta es
elevarla a escalar, no elevar privilegios.

## Estado del gate de RPC

`scripts/runtime-rpc-gate.sql` ejecuta ya **todos** los casos asumiendo el rol
`authenticated` con claims de un usuario management: tras el ACL hardening
ninguna función `ops_*` es ejecutable por `PUBLIC`/`anon`, por lo que el rol
restringido de `psql` del sandbox obtiene `permission denied` en todos ellos y
el gate debe lanzarse con la herramienta SQL administrada del proyecto.

Última ejecución (50 casos, umbral 3.000 ms): **48 PASS / 2 FAIL**.
- `ops_kpis` jun-26: 5.317 ms en frío, **162–265 ms** en caliente → sin deuda.
- `ops_dispersion` jun-26 (**@deprecated**, sustituida por
  `ops_dispersion_resumen` + `ops_dispersion_detalle`, sin consumidor en el
  frontend): 8.163 / 8.278 ms. Deuda conocida y aislada; no afecta a ninguna
  pantalla.
