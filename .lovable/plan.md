# PRE-PUBLISH / BASELINE CHECK — solo lectura

HEAD = `adf6cafcc6404fc400c5fb969a3803f96ae1ec62` · árbol de trabajo limpio (`git status --porcelain` vacío).
Producción sirve `assets/index-DIDjkJYi.js` (commit a9c5497, deployment fde91654…).

## A. PENDING TO PUBLISH

`git log --oneline a9c5497..HEAD` → 2 commits: `ae33814` (WIP) y `adf6caf` (Migró ops_delegacion_ficha a INVOKER). Ambos tocan exactamente el mismo conjunto de 5 ficheros (el segundo consolida al primero).

| Fichero | Clasificación | Efecto runtime en navegador |
|---|---|---|
| `supabase/migrations/20260825165959_46d62405-….sql` | SQL-migración | No (ya aplicada en la BD compartida) |
| `src/lib/__fixtures__/ops-delegacion-ficha-before.json` | fixture | No (solo lo importa un test) |
| `src/lib/__tests__/ops-delegacion-ficha-fixtures.test.ts` | test | No |
| `scripts/runtime-rpc-gate.sql` | script | No |
| `docs/perf/security-definer-pattern.md` | documentación | No |

`git diff --stat a9c5497..HEAD -- src/` excluyendo `__tests__` y `__fixtures__` → **vacío**. Ningún módulo consumido por el navegador cambia; el bundle resultante sería idéntico al publicado.

Estado SQL en BD:
- `pg_get_functiondef(ops_delegacion_ficha)` contiene `v_asof` → **sí**; `prosecdef = false` (INVOKER, como se decidió).
- `supabase_migrations.schema_migrations` contiene `20260825115101` → **sí** y `20260825165959` → **sí**.
- Las 5 versiones más recientes registradas: 20260825165959, 20260825115101, 20260825100956, 20260825100937, 20260825074701 — coinciden con los ficheros de `supabase/migrations`. **0 migraciones pendientes**. `NOTIFY pgrst, 'reload schema'` se emitió en la propia migración y las RPC responden con la firma vigente.

## B. ALREADY ACTIVE IN PROD

- **Frontend**: a9c5497 (session-loss / ACL hardening) está publicado — el bundle remoto es `index-DIDjkJYi.js`, el mismo referenciado en el smoke test previo del deployment fde91654. HTTP 200 en `/`, `/operaciones`, `/operaciones/delegaciones`, `/portal/login`.
- **Backend**: la optimización de `ops_delegacion_ficha` (adf6caf) **ya está activa** en la BD compartida, porque las migraciones se aplican en el momento de aprobarse, no al publicar. Producción ya se beneficia de los ~96 ms en caliente aunque el commit no esté publicado.
- ACL: 0 funciones `ops_*` invocables por `anon`. Las 3 coincidencias de `has_function_privilege('anon', …)` son funciones de trigger (`ops_trg_expedicion_compat`, `ops_trg_expedicion_conteos`, `ops_trg_gama_real`, todas `RETURNS trigger`), no expuestas por PostgREST.

## C. RISKS OF PUBLISHING NOW

- **Migraciones**: 0 pendientes; publicar no re-aplica migraciones ya registradas en `schema_migrations`. Las migraciones son aditivas (`CREATE OR REPLACE` + GRANT/REVOKE) y HEAD contiene todas las de las últimas 48 h, por lo que no se revierte nada.
- **KPIs / payloads**: sin cambios — el diff de `src/` fuera de tests y fixtures es vacío.
- **Bundle**: idéntico al actual; el riesgo funcional es esencialmente nulo, pero también el beneficio.
- Riesgo residual único: una publicación innecesaria consume una ventana de despliegue y purga cachés de CDN sin aportar cambio observable.

## D. SMOKE RESULT

| Check | Resultado |
|---|---|
| HTTP `/`, `/operaciones`, `/operaciones/delegaciones`, `/portal/login` | 200 / 200 / 200 / 200 |
| Bundle producción | `assets/index-DIDjkJYi.js` (= a9c5497) |
| curl anon `ops_kpis` | 401 · 42501 permission denied for function ops_kpis |
| curl anon `ops_panorama_resumen` | 401 · 42501 permission denied |
| curl anon `ops_delegaciones` | 401 · 42501 permission denied |
| Funciones `ops_*` ejecutables por anon (pg_proc) | 0 RPC (solo 3 funciones de trigger) |
| Usuario management `f2840a10-…` | existe, email confirmado, rol `management` presente (login visual queda para Dirección) |
| `Dispersion.tsx` | consume solo `ops_dispersion_resumen` (×2, actual+comparable) y `ops_dispersion_detalle`; **0 referencias a `ops_dispersion` legacy** (las coincidencias restantes son comentarios en `ops-dispersion.ts`) |
| `ops-session-loss.test.tsx` + `ops-session-ux.test.tsx` | **51 tests PASS** (2 ficheros, 5,07 s) |
| Tiempos de las 8 RPC (ops_kpis, ops_panorama_resumen, ops_delegacion_ficha, ops_delegaciones, ops_sats_ranking, ops_sla_resumen, ops_dispersion_resumen/_detalle) | **NO EJECUTADO** — en modo plan la herramienta de escritura SQL está bloqueada y la de solo lectura corre con un rol sin `EXECUTE` (`permission denied for function is_management`). Última medición conocida (gate del 25-ago, sesión authenticated + management): `ops_kpis` 265/162 ms caliente, `ops_panorama_resumen` ~128 ms, `ops_delegacion_ficha` ~96 ms, `ops_delegaciones` ~664 ms, `ops_dispersion_resumen` ~279 ms. Para reejecutarlo en caliente hace falta modo build. |

## E. RECOMMENDATION

**PUBLISH NOT NECESSARY.** HEAD difiere de lo publicado únicamente en una migración SQL **ya aplicada** en la BD compartida (y por tanto ya activa en producción), un fixture, un test, un script de gate y documentación. El diff de código de aplicación (`src/` sin tests ni fixtures) es literalmente vacío, así que el bundle generado por un publish sería byte-equivalente al `index-DIDjkJYi.js` que ya se sirve: cero cambio observable para el usuario.

Publicar sería razonable solo por higiene de trazabilidad (dejar que el commit publicado coincida con HEAD antes de abrir el siguiente frente de trabajo); es seguro hacerlo, pero no aporta nada al navegador.

Pendiente si se quiere cerrar del todo el smoke: reejecutar en modo build el gate de las 8 RPC con sesión authenticated + claims management y umbral en caliente.
