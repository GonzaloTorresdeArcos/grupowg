# Norte de producto — WG Operational Performance Intelligence

Solo análisis. Ninguna escritura, ningún cambio de código, ningún deploy. Todos los gates NO-GO se mantienen.

## 0. Qué he verificado en lectura

Rutas vivas de `/operaciones` (App.tsx): Panorama, técnicos, delegaciones, costes, sla, dispersión, sats, hub, logística, repuestos, calidad-datos, importar. Navegación V2 en `OpsLayout.tsx` con 5 grupos: Visión ejecutiva · Organización · Cadena de suministro · Rendimiento & coste · Datos. Técnicos vive fuera de grupo (`NAV_EXTRA`).

Capa contractual en base de datos (lectura):

| Entidad | Filas |
|---|---|
| Contratos | 19 |
| Programas | 24 |
| Versiones de regla | 8 |
| Aplicabilidad | 8 |
| Resoluciones OT→programa | 176.013 |
| Claims | 20 (todos PENDING, 0 validados) |
| Actos de gobierno | 4 |
| Documentos | 43 |
| Registro SLA (`ops_sla_registry`) | 36 |

Conclusión de estado: la capa contractual tiene ya cobertura de resolución masiva (176k OTs resueltas a programa), pero **cero evidencia validada**. Es exactamente el escenario que el norte describe como "NO EVALUABLE".

## 1. ¿El norte es coherente con lo construido?

Sí, en lo esencial. Tres confirmaciones y tres tensiones reales.

Coherente:
- El frontend actual ya es diagnóstico, no transaccional: no hay alta/edición de OTs, solo importación de hechos y lectura. La regla "no ERP paralelo" ya se cumple de hecho.
- `ops_modelo.ts` ya separa naturalezas: el plazo ≤20/≤30 días está declarado explícitamente como REFERENCIA OPERATIVA, no SLA contractual. Es el mismo eje "obligación / objetivo interno / referencia" del norte.
- La disciplina de "no inventar dato" ya existe: km por técnico está declarado *pendiente de fuente* en vez de mostrarse como 0, y hay una página de Calidad de datos con readiness contractual.

Tensiones a resolver antes de construir:
1. **La capa contractual no tiene superficie visible.** Toda la inteligencia `ctr_*` (contratos, programas, reglas, resoluciones, claims) existe en datos y no aparece en la navegación V2. Hoy el usuario ve rendimiento sin referencia contractual.
2. **Riesgo de doble verdad de SLA.** Conviven `ops_sla_registry` (36 filas), la página "SLA & Flujo" basada en referencia operativa, y las reglas contractuales `ctr_regla_version`. Si la futura superficie contractual muestra cumplimiento sin declarar de qué naturaleza es cada cifra, se generan dos números distintos para "SLA" y el cuadro pierde autoridad. Esto hay que cerrarlo por diseño, no por texto de ayuda.
3. **Cero claims validados.** Cualquier vista de "performance contractual" hoy solo puede devolver NO EVALUABLE con explicación del faltante. Eso es correcto por principio, pero significa que la primera superficie contractual debe estar diseñada para *lucir bien vacía*: su primer trabajo es explicar qué falta, no mostrar porcentajes.

No detecto contradicción de fondo entre el norte y la arquitectura. Detecto una ausencia (superficie) y un riesgo de ambigüedad semántica (naturaleza de la cifra).

## 2. Arquitectura de información futura mínima

Cuatro dominios. La navegación pasa de 5 grupos a 4, absorbiendo lo existente sin renombrar KPIs.

```text
1. PERFORMANCE (qué está pasando)
   Panorama operativo            [existe]
   Organización: HUB / Delegaciones / Red SAT / Técnicos   [existe]
   Rendimiento: SLA & Flujo / Cobertura / Coste & Capacidad [existe]
   Cadena: Logística / Repuestos                            [existe]

2. INTELIGENCIA CONTRACTUAL (contra qué medirlo, y si es evaluable)
   Performance por cliente y programa   [nuevo]
   Contratos & Programas (mapa)         [nuevo]
   Evidencia & Validación               [nuevo, subordinado]

3. DIAGNÓSTICO Y MEJORA (por qué, y qué hacer)
   Diagnóstico de causas                [futuro, depende de §6]
   Concentración e impacto              [futuro]

4. DATOS
   Calidad de datos / Importación       [existe]
```

Regla de separación que atraviesa todo: cada cifra comparada lleva su **naturaleza** explícita — obligación contractual, objetivo interno WG, o referencia operativa — y su **estado de evaluabilidad**. Sin regla aplicable, sin hecho o sin evidencia suficiente ⇒ NO EVALUABLE con el motivo concreto. Nunca cero, nunca cumplimiento supuesto.

Fuera de esta herramienta, por ser ERP o workflow:
- Alta, edición, asignación o cierre de OTs; planificación y rutas; agenda de técnicos.
- Gestión administrativa de contratos: alta de contrato, negociación, renovaciones, avisos de vencimiento como tarea.
- Repositorio documental: subida, versionado y firma de documentos como fin en sí mismo. El documento solo entra como *evidencia referenciada* de una regla.
- Task manager: asignación de acciones, responsables, plazos, estados de tarea. Las medidas de mejora se recomiendan y se miden por su efecto en el hecho operativo, no se gestionan aquí.
- Facturación y cobro.

## 3. Reutilizar D-3 / EER-4A / EER-4B sin nomenclatura técnica

Los tres son mecanismos internos de gobierno; el usuario final nunca debe leer sus nombres, ni "claim", ni "acto de gobierno", ni códigos de gate.

| Interno | Cómo aparece al usuario |
|---|---|
| D-3 (nombramiento de validador) | Un rol de "Validación contractual" visible solo como *quién puede confirmar una evidencia*. Sin mención al registro ni al acto. |
| EER-4A (especificación de validación) | Las condiciones que una evidencia debe cumplir, expresadas como texto de negocio: qué hace falta para que este programa sea evaluable. |
| EER-4B (función de validación construida) | Un botón "Confirmar evidencia" en la pantalla de Evidencia & Validación, disponible solo para el rol de validación. La trazabilidad se muestra como "confirmado por X el día Y", no como acto de gobierno. |

Vocabulario de superficie sugerido: *evidencia* en lugar de claim; *regla aplicable* en lugar de versión de regla; *confirmación* en lugar de validación gobernada; *historial de confirmaciones* en lugar de actos de gobierno.

## 4. Secuencia de gates propuesta (ninguno se ejecuta ahora)

Cada gate requiere orden explícita. Ninguno se abre con este documento.

- **G-A · Cierre semántico.** Documento único que fija, por cada métrica publicable, su naturaleza (obligación / objetivo interno / referencia) y su fuente. Resuelve la tensión de doble SLA. Solo documentación, cero código.
- **G-B · Contrato de lectura contractual.** Definición de las lecturas agregadas que necesita la superficie: cobertura de resolución, evaluabilidad por programa, motivo de no evaluabilidad. Diseño en papel, sin implementar.
- **G-C · Superficie de solo lectura "Contratos & Programas".** Primera pantalla visible: mapa de programas, reglas aplicables, vigencia, y estado de evidencia. Sin cifras de cumplimiento todavía.
- **G-D · Evidencia & Validación.** Expone lo construido en EER-4B con el vocabulario de §3. Requiere que EER-4 real deje de ser NO-GO.
- **G-E · Performance contractual.** Cumple/no cumple, tendencia, concentración y drill-down. Solo tras G-A y con evidencia confirmada real; hasta entonces mostraría NO EVALUABLE en todo.
- **G-F · Diagnóstico causal y medidas.** Depende de §6.

Dependencia dura: G-E no puede preceder a G-A, o se publican dos verdades de SLA.

## 5. Dependencias de datos para diagnóstico y mejora

Para pasar de "qué pasa" a "por qué pasa" sin inventar causalidad hacen falta, por orden de valor:

1. **Motivo/causa por OT** — hoy hay `incidencia` y estado, no una taxonomía de causa raíz estable. Sin ella el diagnóstico solo puede ser correlacional.
2. **Marcas temporales por etapa** — existen creación, primer contacto, primera visita y cierre; falta el reloj de las esperas intermedias (espera de repuesto ya se acerca a esto). Sin etapas no se puede atribuir el retraso a un tramo concreto.
3. **Disponibilidad y carga real** — días trabajados y ausencias (`ops_rrhh`) siguen pendientes; el Performance Score está declarado provisional por esto. Sin esto, atribuir bajo rendimiento a la persona es incorrecto.
4. **Evidencia contractual confirmada** — 0 hoy. Sin ella no hay incumplimiento demostrable, solo desviación frente a referencia interna.
5. **Efecto de medidas** — para recomendar mejoras hay que poder medir el antes/después sobre el mismo hecho operativo; requiere fechar la medida y comparar cohortes, no un estado de tarea.

Norma metodológica: mientras falte 1 o 2, el módulo de Diagnóstico debe declarar la causa como *no determinable con los datos disponibles* y nombrar el dato ausente. Correlación etiquetada como correlación.

## 6. Riesgos de scope creep

- **Hacia ERP**: cualquier petición de "y ya que estamos, asignar la OT desde aquí" o de editar un hecho importado. La herramienta lee hechos; corregir un hecho se hace en origen y se reimporta.
- **Hacia gestor contractual**: alta y edición de contratos, alertas de vencimiento accionables, flujo de renovación. La vigencia se muestra como contexto para interpretar performance, no como bandeja de trabajo.
- **Hacia gestor documental**: la pantalla de Evidencia atrae subidas de PDF. El documento entra por referencia; si aparece un buscador de documentos, se ha cruzado la línea.
- **Hacia task manager**: "Mejora" con responsables, plazos y estados. Se recomienda y se mide el efecto; no se gestiona la ejecución.
- **Riesgo semántico**: publicar cumplimiento contractual antes de G-A produce dos cifras de SLA distintas. Es el riesgo más caro porque destruye la confianza en todo el cuadro, no solo en la pantalla nueva.
- **Riesgo de vacío**: la primera superficie contractual mostrará casi todo NO EVALUABLE. Si no se diseña para explicar el faltante con claridad, se leerá como que la herramienta no funciona.

## Estado

Sin cambios en `src/`, base de datos ni despliegue. EER-4 real, EER-3, I3 y Gate B siguen NO-GO.
