# Waterfall ANTES — /operaciones (base f28294c)

Medición en servidor (mediana de 2 pasadas en caliente, snapshot 125.752 OTs).
El navegador añade a cada RPC latencia de red + parseo JSON.

## RPC del Panorama (bloqueantes: una sola tanda de 11 RPC)

| RPC | Parámetros | ms |
|---|---|---|
| `ops_panorama` (12 meses) | mes en curso | 1.954 – 5.889 |
| `ops_supply` | mes en curso | 5.167 – 5.616 |
| `ops_supply` | 12 meses | 2.957 – 4.147 |
| `ops_kpis` | mes en curso | 170 |
| `ops_sla_resumen` | mes en curso | 996 – 1.632 |
| `ops_sla_resumen` | 12 meses | 1.147 – 1.170 |
| `ops_dispersion_resumen` | mes en curso | 232 – 295 |

## Comportamiento observado en la interfaz

- **Panorama**: spinner global a pantalla completa hasta que resolvían las 11
  RPC. La cifra visible más rápida (KPIs, 170 ms) quedaba retenida por
  `ops_supply` (>5 s) → primera pintura útil ≈ 5–6 s.
- **SLA**: `ops_sla_resumen` incluía las series de backlog de 12 meses
  (`back_rows`: 46.515 filas expandidas por `generate_series`), ~600 ms de los
  ~1.000 ms totales, aunque el usuario ve primero las tarjetas de cabecera.
- **Repuestos / Logística**: `ops_supply` completo (>5 s) en la carga inicial.
- **Cambio de filtro o período**: la pantalla se vaciaba mientras se resolvía
  la nueva clave de caché (sin `placeholderData`).
