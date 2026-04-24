# TechDocs Roadmap

Estado del módulo `techdocs`.

## Estado actual

`techdocs` ya quedó operativo para el alcance actual de expediente técnico del PaaS.

El módulo ya cubre:

- dossiers técnicos con referencias cruzadas a cliente, sitio, instalación, OT, oportunidad y tarea
- secciones técnicas
- mediciones
- evidencias con adjuntos descargables
- auditoría de cambios
- resumen operativo visible

## Cerrado en el alcance actual

- módulo tenant backend/frontend creado y funcional
- migración tenant:
  - `0043_techdocs_base`
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `techdocs`
- dependencia técnica visible con `core`
- integración con:
  - clientes y sitios de `business-core`
  - instalaciones y OT de `maintenance`
  - oportunidades de `crm`
  - tareas de `taskops`
- regresión de servicios, migración y catálogo de plataforma
- publicación y validación runtime en `staging` y `production`
- convergencia tenant confirmada en los 4 tenants activos de ambos carriles
- backup PostgreSQL tenant previo ejecutado por carril antes de mutar esquemas, incluyendo `ieris-ltda` en `production`

## Backlog posterior al cierre

Lo siguiente ya no corresponde a “cerrar el módulo”, sino a profundizarlo:

1. versionado formal de expedientes
2. PDF consolidado o export técnico formal
3. firmas/aprobaciones
4. plantillas técnicas reutilizables
5. checklists de inspección y cumplimiento
6. E2E específico del módulo

## Deuda visible no bloqueante

- falta E2E propio del módulo
- falta búsqueda más avanzada por referencia cruzada
- falta una lectura más rica de evidencias por tipo y vencimiento documental

## Criterio de evolución

Lo siguiente sobre `techdocs` debe tratarse como expansión del módulo, no como corrección de base.
