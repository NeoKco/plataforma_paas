# CRM Roadmap

Estado del módulo `crm`.

## Estado actual

`crm` ya quedó operativo para el alcance comercial actual del PaaS.

El módulo ya cubre:

- catálogo de productos y servicios con características
- oportunidades comerciales
- kanban abierto
- histórico de oportunidades cerradas
- contactos, notas, actividades y adjuntos por oportunidad
- plantillas comerciales reutilizables
- cotizaciones estructuradas con líneas libres y secciones
- resumen comercial con métricas visibles

## Cerrado en el alcance actual

- módulo tenant backend/frontend creado y funcional
- migraciones tenant:
  - `0040_crm_base`
  - `0041_crm_expansion`
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `crm`
- integración con clientes de `business-core`
- regresión de servicios y migración

## Backlog posterior al cierre

Lo siguiente ya no corresponde a “cerrar el módulo”, sino a profundizarlo:

1. render/PDF formal de cotizaciones
2. plantillas visuales comerciales
3. scraping asistido de productos
4. IA comercial/local
5. workflow de aprobación comercial

## Deuda visible no bloqueante

- falta E2E específico del módulo
- falta export comercial formal de propuestas
- falta una presentación visual más rica de cotizaciones

## Criterio de evolución

Lo siguiente sobre `crm` debe tratarse como expansión del módulo, no como corrección de base.
