# Waterfall DESPUÉS — /operaciones

Misma metodología que `waterfall-antes.md` (mediana de 2 pasadas en caliente,
mismo snapshot de 125.752 OTs, rol `authenticated` con claim `sub` de un
usuario management y RLS activa).

## RPC medidas (rol authenticated, caliente)

| RPC | Parámetros | ANTES | DESPUÉS | Payload | Factor |
|---|---|---|---|---|---|
| `ops_supply` → `ops_supply_resumen` | junio 2026 + previo | 5.167 ms | **86 ms** | 58,0 KB | 60× |
| `ops_supply` → `ops_supply_resumen` | 12M + previo | 2.957 ms | **699 ms** | 76,0 KB | 4,2× |
| `ops_panorama` → `ops_panorama_resumen` | junio 2026 | 1.954 ms | **128 ms** | 1,1 KB | 15× |
| `ops_panorama_resumen` | 12M | — | **129 ms** | 1,1 KB | — |
| `ops_panorama_series` (secundaria) | 12 meses | incluida arriba | 1.438 ms | 0,9 KB | fuera del crítico |
| `ops_sla_resumen` | junio 2026 | 996 ms | **364 ms** | 39,8 KB | 2,7× |
| `ops_sla_resumen` | 12M | 1.147 ms | **514 ms** | 40,2 KB | 2,2× |
| `ops_sla_evolucion` (drill-down) | ventana 12M | incluida arriba | 750 ms | — | diferida |
| `ops_kpis` | junio 2026 | 170 ms | **162 ms** | 0,4 KB | = |
| `ops_evolucion` (secundaria) | sin filtros | 3.900 ms | **291 ms** | 2,3 KB | 13× |
| `ops_alertas` (secundaria) | junio 2026 | 211 ms | 211 ms | 2,5 KB | = |
| `ops_dispersion_resumen` | junio 2026 | 6.800 ms | **232 ms** | — | 29× |

## Ruta crítica del Panorama

| | ANTES | DESPUÉS |
|---|---|---|
| RPC en la ruta crítica | 11 (una sola tanda bloqueante) | **2** |
| Tiempo de servidor del crítico | ≈ 5.900 ms (la más lenta manda) | **162 ms** (paralelo: `ops_kpis` 162 + `ops_panorama_resumen` 128) |
| Payload del crítico | > 300 KB | **1,5 KB** |
| Bloqueo de la primera pintura | spinner global | ninguno: esqueleto inmediato + datos al llegar |

### Clasificación implementada (documentada en `src/pages/ops/Dashboard.tsx`)

- **CRITICAL** (2 RPC): `ops_kpis` (actual), `ops_panorama_resumen` (actual) →
  Situation Line, KPIs CEO, ecuación del bloque A, etapas de D.
- **SECONDARY** (8 RPC, en paralelo, con esqueleto propio por bloque):
  `ops_kpis` previo, `ops_panorama_resumen` previo, `ops_panorama_series`,
  `ops_evolucion`, `ops_alertas`, `ops_supply_resumen`, y en el tramo tardío
  `ops_equipos` ×2 y `ops_tecnicos_scorecard` ×2 (solo bloque C y asuntos de E).
- **DRILL-DOWN** (bajo demanda): `ops_supply_detalle`, `ops_sla_detalle`,
  `ops_dispersion_detalle`, `ops_sla_evolucion`, `ops_tecnico_ficha`,
  `ops_delegacion_ficha`.

Mientras no llega el previo, los deltas muestran `—` (nunca 0). Las cifras
finales son idénticas: solo cambia el momento en que aparece cada bloque.

## Cambios que producen la mejora

1. **`ops_supply_resumen` / `ops_supply_detalle`**: predicados en línea sobre
   `ops_fact_ot` en vez de `SETOF ops_supply_filtrada` (que impedía el
   *predicate pushdown*); el listado de OTs se pagina bajo demanda.
2. **`ops_panorama_resumen` / `ops_panorama_series`**: el resumen no ejecuta
   `generate_series` de 12 meses; la serie se pide como secundaria.
3. **`ops_sla_resumen`**: CTE `filtrada` materializada con solo las 17 columnas
   usadas; `back_rows` se calcula una vez y de ella derivan evo/evo_deleg/
   evo_tec y `top_tecs`; las series de backlog salen a `ops_sla_evolucion`.
4. **Wrappers SECURITY DEFINER con guardia `is_management`** + funciones
   `PARALLEL SAFE`: evitan reevaluar la política RLS fila a fila
   (ver `security-definer-pattern.md`).
5. **Caché react-query** por `(rpc, params)` con `staleTime` de sesión e
   invalidación explícita: la navegación entre módulos ya cargados no repite
   ninguna RPC.
6. **`placeholderData` (keepPreviousData) global**: al cambiar filtro o
   período el DOM conserva los valores previos; cada bloque marca su propio
   `isFetching` con «Actualizando…», sin spinner global.
7. **Rol management cacheado en `sessionStorage`**: elimina el round-trip en
   serie `getSession → user_roles → primera RPC` en recargas dentro de la
   misma sesión. La autorización real la siguen imponiendo RLS y la guardia
   `is_management` en servidor; la caché solo decide qué se pinta.

## Otras fuentes de latencia revisadas (punto 5)

| Comprobación | Resultado |
|---|---|
| Chunks pesados en el shell de /operaciones | `recharts` no se usa en `/operaciones` (sparklines son SVG inline); `xlsx`/`papaparse` no están en el árbol; `jspdf`/`html2canvas` ya salen en chunks propios cargados con `import()` dinámico y no entran en el shell. |
| Cascada de autenticación | Existía (`getSession` → `user_roles` → RPC). Corregida con caché de rol en `sessionStorage` + revalidación en segundo plano. |
| `ops_cobertura_datos` / `ops_filter_options` | Se lanzan en el proveedor de filtros en paralelo con la tanda crítica; los filtros iniciales vienen de `localStorage`, así que no preceden en serie a ninguna RPC crítica. |
| Doble disparo por StrictMode | react-query deduplica por clave `(rpc, params)`; el doble render de desarrollo no genera segunda petición. En build de producción StrictMode no duplica efectos. |

## Medición en navegador — ESTADO: NO REALIZADA (bloqueada)

**No se declara PASS de navegador.** No ha sido posible ejecutar el protocolo
del punto 0/7 con sesión management real desde este entorno:

- `LOVABLE_BROWSER_AUTH_STATUS = signed_out`: no hay sesión inyectada.
- `lovable auth-session` (sin `--user`) falla: el proyecto tiene 4 usuarios de
  autenticación y exige indicar cuál.
- `lovable auth-session --user <uuid>` requiere una aprobación interactiva que
  no está disponible en este contexto de ejecución.
- No hay `service_role` accesible en Lovable Cloud, por lo que tampoco se puede
  crear un usuario management temporal ni firmar un JWT.

Lo único medible sin sesión (servidor de desarrollo, sin autenticar): el shell
se monta y redirige a `/portal/login`; el chunk de la aplicación y las
dependencias de la barra de filtros resuelven entre 792 ms y 1.010 ms en modo
desarrollo (módulos sin empaquetar, no representativo del build de producción).

### Cómo cerrar el gate

`docs/perf/protocolo-uat.md`: abrir `/operaciones?perf=1` con la sesión
management real, recorrer los 6 escenarios y pulsar «Copiar informe» en el
overlay. El informe exporta los cuatro hitos (shell visible, primeros KPI,
Panorama usable, carga completa) más cada RPC con ms, KB y si vino de caché.
Con ese texto se completa esta sección y se declara PASS o FAIL con evidencia
de navegador.
