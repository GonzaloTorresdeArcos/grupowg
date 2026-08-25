# Auditoría de performance — /operaciones (solo lectura, sin cambios)

Medido contra la BD real (HEAD actual). Ninguna corrección aplicada.

## 0. Dos fallos funcionales bloqueantes detectados al medir (no corregidos)

| RPC | Error real al ejecutarla | Consecuencia |
|---|---|---|
| `ops_alertas(...)` | `ERROR: column "n_now" does not exist` (CTE `caidas`, `ORDER BY (n_now/n_prev)` sobre alias no visible) | Falla SIEMPRE; el Dashboard recibe `error` y pinta `alertas = null` |
| `ops_delegaciones(...)` | `ERROR: operator does not exist: json \|\| jsonb` (`row_to_json(k) \|\| jsonb_build_object(...)`) | Falla SIEMPRE; Delegaciones pierde el bloque `kpis` |

Ambas tienen una sola sobrecarga y `EXECUTE` para `anon/authenticated`, así que no es un problema de rol: el fallo es del cuerpo SQL. Coste medido: 18–25 ms (aborta pronto), pero el dato no llega nunca.

## 1. Tiempos de RPC (warm cache, junio-2026 y 12M jul25→jun26)

| RPC | Junio 2026 | 12M | Payload jun / 12M |
|---|---|---|---|
| `ops_sla` | **5.782 ms** | 3.835 ms | **193 KB / 194 KB** |
| `ops_evolucion` (sin período; siempre histórica) | **3.246 ms** | — | 18 filas |
| `ops_dispersion` | 499 ms | **2.909 ms** | 249 KB / **847 KB** |
| `ops_supply` (con previo) | 2.303 ms | 2.726 ms | 59 KB / 78 KB |
| `ops_filter_options` | 719 ms | — | 23 KB |
| `ops_equipos` | 495 / 465 ms | | 8–9 filas |
| `ops_costes` | 167 ms | 462 ms | 4–5 KB |
| `ops_data_quality` | 450 ms | — | 13 KB |
| `ops_kpis` | 284 ms (warm) · **5.018 ms en frío** | 197 ms | 0,4 KB |
| `ops_tecnicos_scorecard` | 277 / 232 ms | | 28–38 filas |
| `ops_sats_ranking` | 152 ms | | 16 filas |
| `ops_costes_entidades` | 42 ms | | 5 filas |
| `ops_logistica`, `ops_delegacion_ficha`, `ops_as_of`, `ops_sla_registry_resumen` | 19–28 ms | | <1 KB |
| `ops_panorama` | no medible desde el rol de auditoría (`EXECUTE` solo a `authenticated`) | | |

Buffers: `ops_sla` jun → `shared hit=10.789`, **`temp read=117.550 / written=5.852`** (spill masivo a disco: sorts/hashes sin memoria). `ops_dispersion` 12M → `shared hit=215.720`. `ops_evolucion` → `shared hit=441.193` (recorre la tabla completa varias veces). `ops_kpis` en frío → 5 s con `temp read=1.016`.

Todas las funciones `ops_*` son **STABLE** (`provolatile='s'`); solo `ops_cobertura_datos` es `SECURITY DEFINER`. Ninguna es VOLATILE.

### Índices en `ops_fact_ot`
17 índices (duplicados por pares: `ops_fact_ot_*_idx` completo + `idx_ops_fact_ot_*` parcial `WHERE es_anulado=false`) sobre: `fecha_creacion`, `fecha_cierre`, `tecnico`, `sat`, `cliente_wg`, `familia`, `situacion`, `provincia`, `delegacion`.

Sin índice, pese a ser predicados frecuentes: **`gama_real`**, **`marca`**, **`canal`**, **`estado`**, y no existe ningún índice **compuesto** (`(situacion, fecha_cierre)`, `(fecha_cierre, delegacion)`) que es lo que realmente pide el patrón `situacion IN ('Cerrado','Baja') AND fecha_cierre BETWEEN ...`. Índices duplicados = escritura y mantenimiento doble sin ganancia.

Tabla: **141 MB** total / 84 MB heap / 125.752 filas · `n_dead_tup=5.262` · último `analyze` 26-jul-2026 (un mes de antigüedad; `as_of` del dato = 25-jul-2026, así que las estadísticas están razonablemente alineadas pero sin refresco desde entonces).

## 2. Payloads

- **>200 KB**: `ops_dispersion` 12M = **847 KB** (y 249 KB en un solo mes). Devuelve el detalle territorial completo (provincias × municipios × técnicos × SATs) aunque la página muestre tablas truncadas.
- Cerca del umbral: `ops_sla` = **193 KB** en cualquier período (el tamaño no varía con el rango → devuelve listados completos de OTs envejecidas, no agregados).
- `ops_supply` 59–78 KB con las tablas de supply prácticamente vacías; crecerá linealmente cuando entren datos reales.
- `ops_filter_options` 23 KB en cada cambio de filtro.
- El resto (<15 KB) no es problema.

## 3. Llamadas por página y fan-out

| Página | RPC por carga inicial | Paralelo / cascada |
|---|---|---|
| Dashboard | **11** (`ops_kpis` ×2, `ops_panorama` ×2, `ops_evolucion`, `ops_alertas`, `ops_equipos` ×2, `ops_tecnicos_scorecard` ×2) + `ops_supply` **en cascada tras el `Promise.all`** | 10 en paralelo, 1 secuencial innecesario |
| Tecnicos | 2 (`ops_tecnicos_scorecard` now/prev) + `ops_tecnico_ficha` por drill-down | paralelo |
| Delegaciones | 4 (`ops_delegaciones` ×2, `ops_equipos` ×2) + ficha bajo demanda | paralelo |
| Dispersion | `ops_filter_options` propio + `ops_dispersion` ×2 (now/prev) | el `ops_filter_options` local **duplica** el del contexto global |
| SLA | 2 (`ops_sla`, `ops_kpis`) | paralelo |
| Costes | 2 (`ops_costes`, `ops_costes_entidades`) | |
| Logistica | 2 (`ops_logistica`, `ops_supply`) | paralelo |
| Repuestos | 1 (`ops_supply`) | |
| Hub | 1 (`ops_delegacion_ficha`) | |
| Global (layout) | `ops_cobertura_datos` 1× + `ops_filter_options` en **cada** cambio de filtro (debounce 120 ms) | cascada |

Redundancias reales:
- `ops_equipos` now/prev se recalcula idéntico en Dashboard y Delegaciones (4 llamadas de ~0,5 s para los mismos 8–9 registros).
- `ops_tecnicos_scorecard` now/prev en Dashboard y otra vez en Técnicos con parámetros equivalentes.
- `ops_kpis` en Dashboard y en SLA con **exactamente** `rpcParams`.
- `ops_supply` en Dashboard, Repuestos y Logística.
- `ops_filter_options` en el contexto y otra vez dentro de Dispersión.

Re-disparos: `rpcParams` **sí** está memoizado (`useMemo` con dep `[filters]`), pero el efecto de Dashboard declara `[rpcParams, filters.from, filters.to, prevRange]` — deps redundantes; `filters` es un objeto nuevo en cada `setFilters`, luego cualquier cambio de filtro invalida `rpcParams` aunque el valor efectivo no cambie (p. ej. cambiar y revertir). Además, la corrección en cascada de filtros incompatibles hace `setFiltersState` un segundo tick → **segunda tanda completa de las 11 RPC** cuando un filtro queda invalidado. No hay cancelación (`AbortController`) de la tanda previa, solo el `reqIdRef` de `ops_filter_options`.

## 4. Renders

- `useCallback` = **0** en las 7 páginas auditadas; todos los handlers y sub-componentes definidos en el cuerpo se recrean por render.
- `CalidadDatos.tsx:402`: `readinessRegla(r, medidas, ctxReadiness)` se ejecuta **dentro del `.map` de la tabla**, es decir 36 evaluaciones completas del motor contractual en cada render (además de las ya memoizadas en `resumenReadiness`, que recalcula lo mismo internamente: `reglas.map(readinessRegla)` en `ops-data-quality.ts:962`) → duplicación de trabajo.
- `Dashboard.tsx:288` `construirAsuntos` sí está en `useMemo`; `universosPorCliente` y `resumenReadiness` también (líneas 102 y 109).
- Sub-componentes definidos en módulo pero que llaman `useDataQuality()` cada uno (`DominioChip`): cada chip monta el hook; el fetch está cacheado a nivel de módulo pero el estado se duplica por instancia.
- Volumen real de filas: técnicos 28–38, reglas 36, alias 15, dominios ~10, provincias/municipios en Dispersión es el único listado grande (payload 847 KB). **La virtualización no es necesaria**; el coste está en el payload y en el recálculo, no en el número de nodos.
- Sparkline SVG recalcula `Math.min/max` y el `path` en cada render, sin memo (barato, ~decenas de puntos).
- `key=` presente en todos los `.map` auditados (9–16 por fichero), sin índices como clave en los casos revisados.

## 5. Caché

- `@tanstack/react-query` **está instalado** (`^5.83.0`) y el `QueryClientProvider` envuelve la app, pero **ninguna página de /operaciones lo usa** (0 `useQuery`): todo es `useEffect` + `useState`. No hay deduplicación, ni `staleTime`, ni caché por `(rpc, params)`.
- `useDataQuality`: caché a nivel de módulo (`let cache: Promise|null`) que **nunca se invalida** ni se reintenta si falla (queda `null` para toda la sesión).
- Filtros y modo de comparación persistidos en `localStorage`; `ops_cobertura_datos` se pide una vez por montaje del provider.
- Todas las RPC son STABLE y el dato es un snapshot mensual (`as_of = 25-jul-2026`): son cacheables por `(rpc, params)` durante toda la sesión con riesgo funcional nulo.

## 6. Bundle (vite build, exit 0)

| Chunk | Tamaño |
|---|---|
| `index-*.js` (entry) | **912,7 kB** |
| `Inscripcion-*.js` | 510,8 kB |
| `AreaChart-*.js` (recharts) | 361,9 kB |
| `html2canvas.esm-*.js` | 201,4 kB |
| `Contacto-*.js` | 192,9 kB |
| `index.es-*.js` (jsPDF) | 151,3 kB |
| `types-*.js` (tipos Supabase) | 53,4 kB |
| Páginas ops (Dashboard 46,2 · Dispersion 44,4 · SLA 37,3 · Costes 36,7) | correctas |

Hay code-splitting por ruta con `React.lazy` en `App.tsx` para todas las páginas, incluidas las 12 de /operaciones. El problema es el **entry de 912 kB**, que carga incluso quien solo entra a /operaciones. `html2canvas` + `jsPDF` (~350 kB) los usa exclusivamente la firma/PDF de Inscripción; `recharts` solo lo usan páginas concretas.

## 7. Resumen ejecutivo (ordenado por impacto)

| Hallazgo | Página/RPC | Impacto | Causa | Corrección propuesta (no aplicada) | Esf. | Riesgo |
|---|---|---|---|---|---|---|
| RPC rota | `ops_alertas` | dato nunca llega | alias `n_now` en `ORDER BY` de CTE | reescribir el `ORDER BY` con la expresión completa | S | funcional (recupera función) |
| RPC rota | `ops_delegaciones` | bloque `kpis` vacío | `json \|\| jsonb` | `to_jsonb(k)` en vez de `row_to_json(k)` | S | funcional |
| 5,8 s | `ops_sla` | 5.782 ms + 193 KB + 117k temp | listados completos + sorts en disco | agregar en SQL y devolver top-N por bucket; índice compuesto `(situacion, fecha_cierre)` | M | bajo |
| 3,2 s / 441k buffers | `ops_evolucion` | 3.246 ms en cada carga de Dashboard | recorre histórico completo sin ventana | acotar a los 24 meses del `as_of` + índice compuesto | S | bajo |
| 847 KB | `ops_dispersion` 12M | 2,9 s + 847 KB por carga (×2, now/prev) | devuelve el detalle territorial íntegro | limitar el detalle a top-N y pedir el resto bajo demanda | M | bajo |
| 11 RPC/carga + duplicados | Dashboard | ~6–8 s de espera inicial | sin caché compartida | adoptar react-query (ya instalado) con `staleTime: Infinity` por `(rpc, params)`; dedupe entre páginas | M | nulo (técnico) |
| `ops_supply` en cascada | Dashboard | +2,3 s secuenciales | `await` fuera del `Promise.all` | incluirlo en el `Promise.all` | S | nulo |
| Doble tanda de RPC | todas | ×2 llamadas al invalidar un filtro | `setFiltersState` de la cascada de opciones | aplicar la corrección de filtros antes de publicar `rpcParams` | M | bajo |
| Índices | `ops_fact_ot` | seq/bitmap innecesarios | falta `gama_real`, `marca`, `canal` y compuestos; 8 índices duplicados | crear 2–3 compuestos, retirar los simples redundantes | M | bajo |
| Entry 912 kB | bundle | descarga inicial | `html2canvas`/`jsPDF` y utilidades en el entry | import dinámico dentro del flujo de firma | S | nulo (técnico) |
| 36 `readinessRegla` por render | CalidadDatos | recomputación completa del motor | llamada dentro del `.map` | memoizar el array evaluado y reutilizarlo en el resumen | S | nulo (técnico) |
| `ops_filter_options` duplicado | Dispersión | +719 ms | pide opciones que ya tiene el contexto | consumir el contexto global | S | nulo |
| Caché sin invalidación | `useDataQuality` | error persistente toda la sesión | promesa de módulo sin retry | mover a react-query con retry | S | nulo |
| `n_dead_tup` 5.262 / analyze 26-jul | `ops_fact_ot` | planes subóptimos | sin VACUUM ANALYZE tras la última carga | `ANALYZE` en el pipeline de importación | S | nulo |

### Los 5 cambios de mayor retorno
1. Arreglar `ops_alertas` y `ops_delegaciones` (hoy no devuelven nada).
2. Caché react-query por `(rpc, params)` en todo /operaciones — elimina ~40 % de las llamadas y toda la duplicación entre páginas.
3. Reducir `ops_sla` (5,8 s) y `ops_evolucion` (3,2 s) a agregados acotados + índices compuestos.
4. Acotar el payload de `ops_dispersion` (847 KB → decenas de KB).
5. Meter `ops_supply` en el `Promise.all` del Dashboard y cortar la doble tanda de RPC por cambio de filtro.

**Puramente técnicos, sin cambio funcional**: 2, 5, la memoización de `readinessRegla`, el `ops_filter_options` duplicado de Dispersión, el import dinámico de `html2canvas`/`jsPDF`, los índices y el `ANALYZE`. Los puntos 3 y 4 sí alteran el volumen de detalle devuelto, así que requieren decisión funcional sobre cuánto detalle debe seguir viéndose.
