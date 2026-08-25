# Protocolo de UAT de rendimiento — /operaciones

Este protocolo permite a Dirección medir la experiencia **real en navegador**
con una sesión de management, algo que el entorno de desarrollo no puede hacer
por sí solo (ver "Por qué no está medido automáticamente").

## 1. Preparación

1. Iniciar sesión en el portal con una cuenta con rol **management**.
2. Abrir el Panorama con el flag de medición:
   `https://<dominio>/operaciones?perf=1`
3. Abajo a la derecha aparece el panel **Perf**. Si no aparece, la sesión no ha
   cargado la sección o falta el `?perf=1`.

## 2. Escenarios a medir (uno por medición)

En cada escenario: pulsar **Limpiar** en el panel antes de empezar y **Copiar
informe** al terminar; pegar el texto en el chat indicando el número de escenario.

| # | Escenario | Cómo ejecutarlo |
|---|-----------|-----------------|
| 1 | Cold | Recarga forzada (Ctrl/Cmd + Shift + R) sobre `/operaciones?perf=1` |
| 2 | Warm | Recarga normal (F5) inmediatamente después del escenario 1 |
| 3 | Cambio de período | Con la página cargada, cambiar el selector a *Trimestre* |
| 4 | Cambio de cliente | Cambiar el filtro Cliente a uno cualquiera |
| 5 | Panorama → HUB | Navegar a *HUB Central* desde el menú lateral |
| 6 | Panorama → Repuestos | Volver al Panorama y navegar a *Repuestos & Stock* |

## 3. Qué recoge el informe

El botón **Copiar informe** exporta, en texto plano:

- **Hitos de escenario** (ms desde el inicio de la navegación):
  - *Shell visible*: el armazón de la sección (menú, cabecera) está en pantalla.
  - *Primeros KPI*: la tanda crítica (KPIs + balance) está resuelta.
  - *Panorama usable*: Situation Line y bloque A ya renderizados.
  - *Carga completa*: los bloques secundarios (series, capacidad, flujo,
    atención, supply) han terminado.
- **Tabla de RPC**: nombre, milisegundos, kB de payload, si vino de caché y si
  hubo error. Las llamadas listadas son siempre red real: si un dato no
  aparece en la tabla es porque se ha servido desde caché de sesión.

## 4. Criterios de aceptación propuestos

| Hito | Objetivo cold | Objetivo warm |
|------|---------------|---------------|
| Shell visible | < 1,5 s | < 0,5 s |
| Primeros KPI | < 2,5 s | < 1,0 s |
| Panorama usable | < 3,0 s | < 1,2 s |
| Carga completa | < 6,0 s | < 3,0 s |

Cambios de filtro o período (escenarios 3 y 4): el Panorama **no debe quedarse
en blanco ni volver al esqueleto**; se mantiene el dato anterior mientras se
refresca y cada bloque muestra su propio "Actualizando…".

## 5. Por qué no está medido automáticamente

La medición en navegador desde el entorno de desarrollo exige una sesión
autenticada con rol management. En este entorno:

- No hay sesión inyectada (`signed_out`).
- El proyecto tiene varias cuentas de auth, por lo que la generación automática
  de sesión exige elegir un usuario concreto, y esa vía requiere una aprobación
  interactiva que no está disponible en la ejecución automatizada.
- No hay acceso a `service_role`, por lo que tampoco se puede crear un usuario
  temporal de management vía Admin API.

Por eso las cifras de servidor están medidas y verificadas (gate SQL), y el
PASS de navegador queda **pendiente de esta prueba de Dirección**.
