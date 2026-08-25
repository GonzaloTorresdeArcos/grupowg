# Waterfall DESPUÉS — /operaciones

Misma metodología que `waterfall-antes.md` (mediana de 2 pasadas en caliente,
mismo snapshot).

## RPC medidas

| RPC | Parámetros | ANTES | DESPUÉS | Factor |
|---|---|---|---|---|
| `ops_supply` → `ops_supply_resumen` | mes en curso | 5.167 ms | **115 ms** | 45× |
| `ops_supply` → `ops_supply_resumen` | 12 meses | 2.957 ms | **630 ms** | 4,7× |
| `ops_panorama` → `ops_panorama_resumen` | mes en curso | 1.954 ms | **129 ms** | 15× |
| `ops_panorama_series` (diferida) | 12 meses | — | 1.443 ms | — |
| `ops_sla_resumen` | mes en curso | 996 ms | **366 ms** | 2,7× |
| `ops_sla_evolucion` (diferida) | ventana 12 meses | — | 750 ms | — |
| `ops_kpis` | mes en curso | 170 ms | 170 ms | = |
| `ops_dispersion_resumen` | mes en curso | 232 ms | 232 ms | = |

**Ruta crítica del Panorama** = `ops_kpis` (×2) + `ops_panorama_resumen` (×2),
todas en paralelo → **~300 ms de servidor**, por debajo del objetivo de 400 ms.

## Cambios que producen la mejora

1. **`ops_supply_resumen` / `ops_supply_detalle`**: predicados en línea sobre
   `ops_fact_ot` en vez de `SETOF ops_supply_filtrada` (que impedía el
   *predicate pushdown*), y el listado de OTs pasa a paginarse bajo demanda.
2. **`ops_panorama_resumen` / `ops_panorama_series`**: la versión de resumen no
   ejecuta `generate_series` de 12 meses; la serie se pide como secundaria.
3. **`ops_sla_resumen`**: la CTE `filtrada` pasa a `MATERIALIZED` con solo las
   17 columnas usadas, y las series de backlog salen a `ops_sla_evolucion`.
4. Todas las funciones nuevas son `STABLE PARALLEL SAFE`, con envoltorio
   `SECURITY DEFINER` protegido por `is_management(auth.uid())`.

Cada migración incluyó una comprobación de igualdad de resultados dentro de la
propia transacción: si el JSON hubiera cambiado, la migración se aborta.

## Arquitectura de carga en el cliente

- **Panorama** (`src/pages/ops/Dashboard.tsx`): dos etapas.
  - *Crítica* (bloquea la primera pintura): `ops_kpis` actual y previo,
    `ops_panorama_resumen` actual y previo → Situation Line, bloque A y B1.
  - *Secundaria* (`enabled` en cuanto la crítica deja de estar pendiente):
    series, `ops_evolucion`, `ops_alertas`, `ops_equipos` ×2,
    `ops_tecnicos_scorecard` ×2 y `ops_supply_resumen`.
  - El spinner global desaparece: se pinta un esqueleto inmediato y, mientras
    llega lo secundario, un indicador discreto en la cabecera.
- **SLA**: `ops_sla_evolucion` se habilita cuando el resumen ya está en
  pantalla; las series alimentan alertas y sparklines al llegar.
- **`placeholderData`** activado por defecto en `useOpsRpc` / `useOpsRpcs`: al
  cambiar período o filtro se conserva la vista anterior en lugar de vaciarse.

## Medición en navegador

Instrumentación permanente en `src/lib/ops-perf.ts` + overlay
`src/components/ops/PerfOverlay.tsx`, activable con `?perf=1` en cualquier ruta
de `/operaciones`. Registra por RPC: duración real de la llamada, tamaño de
payload y errores, con totales de la sesión.

Pendiente de cerrar con sesión *management* real en el navegador: el entorno de
verificación automática no puede acuñar sesión para este proyecto, así que la
comprobación en vivo (cold / warm / cambio de filtro) debe hacerse abriendo la
vista previa autenticada con `?perf=1`.

## Cierre de la tercera pasada

### UX por bloque (Panorama)

Cada bloque secundario tiene ahora su propio estado, independiente del
indicador global de cabecera ("Completando análisis…", que se mantiene sólo
como señal de cabecera):

| Bloque | Queries que lo alimentan | Estado propio |
|--------|--------------------------|---------------|
| A · serie de backlog | `ops_panorama_series` | esqueleto + "Actualizando…" |
| A · evolución 18m | `ops_panorama_series`, `ops_evolucion` | esqueleto + "Actualizando…" |
| B1 · serie ≤20d | `ops_panorama_series` | esqueleto + "Actualizando…" |
| C · capacidad | `ops_tecnicos_scorecard` (actual y previo) | esqueleto + "Actualizando…" |
| D · flujo (supply) | `ops_supply_resumen` | "Actualizando…" |
| E · atención | equipos, scorecard, alertas, supply | esqueleto + "Actualizando…" |
| Comparativa | `ops_equipos` (actual y previo) | estado propio |

Ninguno bloquea el render de Situation Line, bloque A o B1: éstos dependen sólo
de la tanda crítica (`ops_kpis` ×2 + `ops_panorama_resumen` ×2), verificado por
test.

### Gate runtime

`scripts/runtime-rpc-gate.sql` cubre las RPC optimizadas nuevas
(`ops_panorama_resumen` jun-26 y 12M, `ops_panorama_series` 12 meses,
`ops_supply_resumen` con previo en mes y 12M, `ops_supply_detalle` en
`pte_piezas` y `demanda` con límite 50, `ops_sla_evolucion` sin filtros y con
delegación). Un test comprueba automáticamente que toda RPC `ops_*` invocada
desde `src` tiene caso en el gate.

Tiempos medidos con rol `authenticated` y claims de management (caché templada):

| RPC | Caso | ms | Payload |
|-----|------|----|---------|
| `ops_panorama_resumen` | jun-26 | ~139 | pequeño |
| `ops_panorama_resumen` | 12M | ~140 | pequeño |
| `ops_panorama_series` | 12 meses | ~1442 | medio (diferido a secundario) |
| `ops_supply_resumen` | mes con previo | ~91 | pequeño |
| `ops_supply_detalle` | pte_piezas / demanda, 50 filas | <10 | pequeño |
| `ops_sla_evolucion` | sin filtros | ~750 | medio (diferido) |
| `ops_sla_evolucion` | con delegación | ~314 | pequeño |

### Medición en navegador — estado

**Pendiente de la prueba de Dirección.** No es posible automatizarla en este
entorno: no hay sesión inyectada (`signed_out`), el proyecto tiene varias
cuentas de auth (por lo que la generación de sesión exige aprobación
interactiva) y no hay acceso a `service_role` para crear un usuario temporal
de management. Como alternativa operativa, el overlay `?perf=1` incorpora los
hitos de escenario (Shell visible, Primeros KPI, Panorama usable, Carga
completa) y un botón **Copiar informe** que exporta hitos + tabla de RPC en
texto. El paso a paso está en `docs/perf/protocolo-uat.md`.
