# UAT Round 2 — cierre del spinner de Delegaciones

## Objetivo
Encontrar y corregir exclusivamente la causa real del bloqueo de `/operaciones/delegaciones`, conservando los 11 filtros y sin alterar definiciones de KPI.

## Investigación y evidencia
- Reproducir exactamente los parámetros que construye `Delegaciones.tsx`, distinguiendo `null`, `undefined` y claves ausentes.
- Ejecutar la llamada REST autenticada y consultar el OpenAPI para comprobar la firma expuesta por la caché de esquema.
- Medir en base de datos los cuatro escenarios solicitados bajo identidad management.
- Reconstruir temporalmente la versión anterior de cinco parámetros dentro de una transacción y comparar `EXPLAIN (ANALYZE, BUFFERS)` con la versión actual.
- Confirmar el comportamiento de React Query cuando una de las consultas falla y documentar por qué la UI queda en spinner.

## Corrección acotada
- Si la firma REST está desactualizada, aplicar `NOTIFY pgrst, 'reload schema'` mediante migración y documentar la regla para cambios de firma.
- Si el plan SQL está degradado, estrechar la CTE a las columnas necesarias manteniendo exactamente los filtros y KPIs.
- En `Delegaciones.tsx`, mostrar un estado de error con RPC, mensaje y botón **Reintentar**; cargar solo mientras se está obteniendo y aún no hay datos.
- En `ops-query.ts`, añadir un registro en memoria `opsRpcErrors` para diagnóstico y logging, sin cambiar la presentación de otros módulos.

## Verificación
- Ampliar `scripts/runtime-rpc-gate.sql` con los cuatro casos, contrato `kpis/evo/tecnicos` y umbral de 3.000 ms.
- Añadir tests Vitest para las 11 claves con `null` y para rechazo de RPC sin spinner permanente.
- Validar REST/OpenAPI después de la corrección y comprobar la página real con Jun–Ago y Mar–May si existe sesión management.
- Ejecutar suite completa, `bunx tsgo --noEmit` y `vite build`; reportar causa A/B/C, evidencia literal, tiempos y payloads antes/después, tests y commit SHA.
