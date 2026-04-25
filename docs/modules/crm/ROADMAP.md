# CRM Roadmap

Estado del módulo `crm`.

## Estado actual

`crm` ya quedó operativo para el alcance comercial actual del PaaS.

El módulo ya cubre:

- catálogo de productos y servicios con características
- ingesta de productos previa a publicación:
  - borradores manuales
  - extracción rápida por URL
  - corridas batch por URLs
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
  - `0045_crm_product_ingestion`
  - `0046_crm_product_ingestion_runs`
- migraciones CRM endurecidas para estados parciales de PostgreSQL
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `crm`
- integración con clientes de `business-core`
- regresión de servicios y migración
- publicación y validación runtime en `staging` y `production`
- convergencia tenant confirmada en los 4 tenants activos de ambos carriles
- backup PostgreSQL tenant previo ejecutado antes de converger `0045` en `staging` y `production`
- backup PostgreSQL tenant previo ejecutado antes de converger `0046` en `staging` y `production`
- extracción automática por URL y corridas batch ya publicadas en `staging` y `production`

## Backlog posterior al cierre

Lo siguiente ya no corresponde a “cerrar el módulo”, sino a profundizarlo:

1. render/PDF formal de cotizaciones
2. plantillas visuales comerciales
3. deduplicación sugerida sobre borradores y catálogo
4. múltiples fuentes más ricas o conectores específicos
5. IA comercial/local
6. workflow formal de aprobación comercial

## Deuda visible no bloqueante

- falta E2E específico del módulo
- falta export comercial formal de propuestas
- falta una presentación visual más rica de cotizaciones

## Criterio de evolución

Lo siguiente sobre `crm` debe tratarse como expansión del módulo, no como corrección de base.
