# TaskOps Roadmap

Estado del módulo `taskops`.

## Estado actual

`taskops` ya quedó operativo para el alcance actual de tareas internas del PaaS.

El módulo ya cubre:

- tareas internas con referencias cruzadas a cliente, oportunidad y OT
- kanban por estado
- histórico de cerradas
- comentarios
- adjuntos
- trazabilidad de cambios de estado
- resumen operativo visible

## Cerrado en el alcance actual

- módulo tenant backend/frontend creado y funcional
- migración tenant:
  - `0042_taskops_base`
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `taskops`
- dependencia técnica visible con `core`
- integración con:
  - clientes y grupos de trabajo de `business-core`
  - oportunidades de `crm`
  - OT de `maintenance`
- regresión de servicios, migración y catálogo de plataforma
- publicación y validación runtime en `staging` y `production`
- convergencia tenant confirmada en los 4 tenants activos de ambos carriles

## Backlog posterior al cierre

Lo siguiente ya no corresponde a “cerrar el módulo”, sino a profundizarlo:

1. subtareas y checklists
2. dependencias entre tareas
3. SLA y vencimientos más ricos
4. automatizaciones simples por cambio de estado
5. notificaciones y colaboración más rica
6. E2E específico del módulo

## Deuda visible no bloqueante

- falta E2E propio del módulo
- falta búsqueda más avanzada por relación cruzada
- falta presentación más rica del tablero y filtros persistentes

## Criterio de evolución

Lo siguiente sobre `taskops` debe tratarse como expansión del módulo, no como corrección de base.
