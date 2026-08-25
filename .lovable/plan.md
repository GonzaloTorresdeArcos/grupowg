# Cierre del gate pre-producción: 2 verificaciones bloqueadas + 7 defectos de UI

El informe completo está en el mensaje de chat. Este plan cubre **solo lo que el modo plan no me deja ejecutar** y los defectos detectados. No incluye cambios de KPI, ni F5, ni publicación.

## A. Verificaciones que faltan por ejecutar (requieren modo build)

En modo plan no puedo ejecutar SQL con `SET ROLE authenticated` (la herramienta SQL administrada está bloqueada por ser potencialmente de escritura, aunque el script sea de solo lectura y termine en ROLLBACK). Quedan pendientes:

1. **Gate runtime de las 18 llamadas restringidas** (`ops_delegaciones` ×5, `ops_sla_evolucion` ×2, `ops_dispersion_resumen/detalle` ×3, `ops_supply_resumen/detalle` ×4, `ops_panorama_resumen/series` ×3, `ops_cobertura_datos`) bajo rol `authenticated` + claims de un usuario management, con umbral 3.000 ms. Salida: tabla RPC | caso | PASS/FAIL | ms | KB.
2. **`supabase/tests/security_definer_guard.sql`** (autorizado / no autorizado) para reportar N/N.
3. Opcional: sesión real de management en el navegador (`lovable auth-session`) para medir la experiencia de carga de Panorama, Delegaciones y SLA con `?perf=1`.

Ninguna de las tres modifica datos.

## B. Defectos de UI detectados (spinner infinito ante error de RPC)

Solo `Delegaciones`, `Dispersión`, `Repuestos`, `Logística`, `Dashboard` y la barra de filtros muestran error visible. Las siguientes se quedan en spinner o en «sin datos» cuando la RPC falla:

| Página / componente | Guardia actual | Corrección |
|---|---|---|
| `SLA.tsx` | `if (loading \|\| !data)` → spinner | rama `isError` con RPC, mensaje y Reintentar |
| `Tecnicos.tsx` | `loading` → spinner | igual |
| `Sats.tsx` | `q.isPending` → spinner, luego «sin datos» | igual |
| `Costes.tsx` | `isPending` ×2 → spinner | igual |
| `Hub.tsx` | `q.isPending` → spinner | igual |
| `EquiposComparativa.tsx` | `isPending` → spinner, luego «sin datos» | igual |
| `CalidadDatos.tsx` | `.then(({data,error}) => error ? [] : …)` traga el error del registry y de los alias | propagar a un aviso visible |

Patrón a reutilizar: el bloque de error ya implementado en `Delegaciones.tsx` (lista de RPC fallidas + botón Reintentar), extraído a un componente compartido `OpsErrorBlock`.

## C. Nada más

Sin cambios de definición de KPI, sin migraciones, sin publicar.
