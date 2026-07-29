
# Iteración 2 — /operaciones/tecnicos

## FASE A · Auditoría (hallazgos que corrijo)

Datos reales disponibles hoy en `ops_tecnicos_scorecard` (por técnico y período):
`tecnico, delegacion, grupo, gama_principal, activo, motivo_inactivo, cerradas, cerradas_prev, delta_pct, pct_bajas, pct_bajas_esp (media benchmark por su mix familia×cliente), pct_nff, pct_nff_esp, dias_medio, pct_sla20, mix_top, score (0-100)`.

Problemas detectados en la UI actual:
1. **Score 0-100 opaco** — mezcla 4 factores con pesos ocultos (30/30/30/10). Viola "prohibido score oculto". → lo retiro de la tabla y detalle; queda como campo interno no mostrado.
2. **Media de bajas de la delegación no se muestra** aunque es el peer group correcto → añadida como columna y como base del clasificador.
3. **Umbral <10 cerradas** para "sin contexto" es débil → configurable en UI, por defecto 15 (spec).
4. **Estado 1-D** (`estadoTecnico`) mezcla producción, calidad y volumen en un solo semáforo → sustituido por modelo multidimensional (producción, calidad, SLA, global).
5. **SLA20 y abiertas+30 por técnico**: SLA20 ya existe. **Abiertas+30 por técnico NO existe** → amplío `ops_tecnicos_scorecard` con `abiertas_total, abiertas_30`.
6. **Bajas absolutas por marca / abiertas+30 por provincia** en la ficha: los campos existen en `ops_fact_ot` → amplío `ops_tecnico_ficha` con `bajas_marca` y `abiertas_prov`.
7. **Grupos Central/Delegaciones**: se mantienen como agrupación visual pero el ranking de atención es una única tabla plana (spec fase B). Mantengo el filtro por gama y la sección inactivos.
8. **Consistencia con alertas del Dashboard**: dashboard usa el mismo `estadoTecnico` de `ops-performance.ts`; migrando a modelo multidimensional, expongo `estadoGlobalTecnico` y actualizo `Dashboard.tsx` para consumir el mismo motor → coherencia garantizada.

## FASE B · Tabla (una fila por técnico, columnas y orden)

Columnas exactas, todas con tooltip de definición:
`Técnico · Delegación · Cerradas · Ant. · Δ % · Bajas abs · Bajas ant · %Bajas · Media deleg. · Δ pp vs deleg · SLA≤20d · Abiertas +30d · Estado · Observación`.

- Búsqueda por nombre (input controlado, filtra en cliente).
- Sticky `<thead>`, `overflow-x-auto`, móvil OK.
- Orden por defecto = prioridad de atención:
  1. `estadoGlobal = critico`
  2. `Δ pp vs deleg ≥ +5 pp` (calidad peor que peer group)
  3. `Δ cierres ≤ −15%` (deterioro)
  4. `abiertas_30 ≥ 5`
  5. resto (equilibrados/positivos)
- Ordenación clickable por producción / calidad / SLA / nombre (asc-desc).

## FASE C · Ficha del técnico (usa `ops_tecnico_ficha` ampliada)

Panel drawer existente, reestructurado:
1. Identidad: nombre, delegación, gama principal, período seleccionado (from/to del contexto).
2. Resumen: cerradas, bajas, %bajas, SLA20, abiertas+30, Δ vs anterior.
3. Benchmarks (3 columnas): técnico | media delegación | media empresa | período anterior propio.
4. Dimensiones diagnósticas SEPARADAS: Producción, Calidad (proxy), SLA, Backlog, Contexto.
5. Evolución 12 meses con **selector segmentado** cerradas / %bajas / SLA (una sola serie a la vez → no mezcla escalas).
6. Drivers: mix familia×cliente con bajas obs vs esp (ya existe), canal, abiertas con días, **bajas por marca (nuevo)**, **abiertas+30 por provincia (nuevo)**.

## FASE D · Modelo de estado provisional (en `ops-performance.ts`)

Cuatro dimensiones independientes + estado global, todas con reglas expuestas:

- **Producción** (usa `cerradas`, `cerradas_prev`, mediana del grupo):
  `sobre_benchmark` (≥ p66 grupo o Δ ≥ +15%) · `en_linea` · `bajo_benchmark` (≤ p33 y Δ ≤ −15%) · `insuficiente`.
- **Calidad (proxy bajas)**: compara `pct_bajas` contra `mediaDelegacion` y `pct_bajas_esp`:
  `mejor_que_benchmark` (Δpp ≤ −5) · `en_linea` · `atencion` (Δpp ≥ +5) · `critico` (Δpp ≥ +10 y ≥ 1,5× esp) · `insuficiente`.
- **SLA**: `pct_sla20`:
  `sobre_objetivo` (≥ 0,80) · `en_linea` (≥ 0,60) · `atencion` (≥ 0,40) · `critico` (< 0,40) · `no_disponible`.
- **Estado global**:
  - `informacion_insuficiente` si cerradas < umbral (muestra insuficiente).
  - `atencion_requerida` si Calidad=`atencion`/`critico` **o** SLA=`atencion`/`critico` **o** Producción=`bajo_benchmark` **o** `abiertas_30 ≥ 5`.
  - `reconocimiento_potencial` si Producción ∈ {sobre, en_linea} **y** Calidad ∈ {mejor, en_linea} **y** SLA ∈ {sobre, en_linea} **y** cerradas ≥ mediana del grupo.
  - `rendimiento_equilibrado` en el resto.
  - `requiere_validacion` reservado para casos con inconsistencia de datos (fase G).

Umbral de muestra mínima **configurable en UI** (input numérico, default 15). Persistido en URL/estado local.

Tooltip por cada semáforo con la regla exacta que lo produjo, sin ocultar cifras.

## FASE E · Evaluación provisional para incentivos

Sección renombrada. Por técnico con estado ≠ `insuficiente`:
`Producción · Calidad · SLA · Completitud de datos · Elegibilidad provisional (reconocimiento_potencial | revision_estandar | requiere_validacion | informacion_insuficiente) · Motivo con cifras · Datos de validación pendientes`.

Para `requiere_validacion` se listan literalmente: carga asignada · días/horas trabajadas · mix producto/marca · territorio/desplazamientos · motivos bajas · demoras repuestos · cancelaciones cliente · causas externas · reincidencias · FTF · reclamaciones.

Aviso obligatorio visible en cabecera de la sección (literal del spec). Sin importes.

## FASE F · Hallazgos automáticos (máx 5)

Generados en `ops-performance.ts` (`generarHallazgosTecnicos`) con formato fijo: `técnico · hecho · cifras · benchmark · relevancia · validación requerida`. Ejemplos válidos según spec. Prohibido "vigilar/mejorar/rinde mal".

## FASE G · Validaciones de calidad de datos

Nuevo `validarCalidadDatosTecnicos(rows, rowsPrev)` → `Aviso[]`. Detecta: duplicados, técnico en >1 delegación, delegación ausente, cerradas=0 con bajas>0, bajas>cerradas, sin período anterior, muestra baja, valores idénticos entre períodos, inconsistencia tabla vs alertas dashboard. Cuando alguno afecta a un técnico → estado global `requiere_validacion` con aviso y sin clasificación definitiva.

## FASE H · Encabezado del período

Banner superior con `from-to actual` y `from-to anterior`, número de días naturales de cada uno. Si difieren → warning literal del spec.

## Cambios SQL (ampliaciones no invasivas)

- `ops_tecnicos_scorecard`: añadir a la SELECT/RETURNS `abiertas_total bigint, abiertas_30 bigint` calculadas desde `ops_fact_ot situacion='Abierto'`.
- `ops_tecnico_ficha`: añadir `bajas_marca` (top 10) y `abiertas_prov` (top 10 con dias_abierta>30) al `jsonb_build_object`.
- Sin cambios de esquema, sin nuevas tablas, sin cambios de RLS.

## Ficheros a tocar

- `src/lib/ops-performance.ts` — ampliar con: `EstadoProduccion`, `EstadoCalidad`, `EstadoSLA`, `EstadoGlobalTecnico`, `estadoProduccion`, `estadoCalidad`, `estadoSLA`, `estadoGlobalTecnico`, `elegibilidadIncentivo`, `generarHallazgosTecnicos`, `validarCalidadDatosTecnicos`, `diasEntre(from,to)`, `p33/p66`. Se conservan las funciones existentes (`estadoTecnico`, `indicadorProvisionalIncentivo`) marcadas como legacy para compat de tests.
- `src/lib/__tests__/ops-performance.test.ts` — añadir tests: ratio bajas, Δpp, Δperíodo, umbral mínimo (5/10/15/20), cada clasificador, consistencia tabla↔alertas.
- `src/pages/ops/Tecnicos.tsx` — reescrito: banner de períodos, selector de umbral, buscador, tabla plana ordenable con las 14 columnas, sección Evaluación provisional, sección Hallazgos, sección Avisos de calidad, drawer con dimensiones separadas y selector de serie. Mantiene protección de rol y filtros existentes.
- `src/pages/ops/Dashboard.tsx` — sustituye `estadoTecnico` legacy por `estadoGlobalTecnico` en las alertas para garantizar consistencia con la tabla.
- Migración SQL: `ALTER FUNCTION` / `CREATE OR REPLACE FUNCTION` de `ops_tecnicos_scorecard` y `ops_tecnico_ficha` con los campos adicionales.

## Detalles técnicos

- TS estricto, sin `any` nuevos.
- Sin dependencias nuevas (usa vitest ya presente).
- Cálculos puros en `ops-performance.ts`, presentación en `Tecnicos.tsx`.
- Verificación final: `bunx tsgo --noEmit` y `bunx vitest run`.

## Deliverable de cierre

Al terminar responderé con: problemas encontrados, reglas exactas del clasificador, ficheros modificados, campos disponibles vs faltantes para el modelo definitivo (RRHH, satisfacción, reclamaciones, FTF, motivos de baja codificados), inconsistencias detectadas y resultado de build/tests.
