# CRM Module

Documentación canónica del módulo `crm`.

Nombre funcional visible:

- `CRM comercial`

Estado actual:

- módulo tenant ya operativo dentro del PaaS
- backend tenant ya expone:
  - productos con características
  - oportunidades activas e históricas
  - detalle comercial con contactos, notas, actividades y adjuntos
  - plantillas comerciales reutilizables
  - cotizaciones estructuradas con líneas libres y secciones
- frontend tenant ya entrega lectura y captura para:
  - `Resumen`
  - `Ingesta`
  - `Oportunidades`
  - `Histórico`
  - `Cotizaciones`
  - `Plantillas`
  - `Productos`
- el módulo reutiliza `business-core` como base de clientes
- el módulo ya entra al catálogo contractual como add-on tenant (`crm`)

Objetivo del módulo:

- cubrir el frente comercial faltante respecto de `ieris_app`
- unificar pipeline comercial, catálogo reusable, plantillas y propuestas dentro del tenant
- dejar preparada una base seria para futuras extensiones comerciales sin mezclar conceptos con `business-core`

## Alcance actual

El módulo hoy incluye:

- productos y servicios con:
  - `sku`
  - tipo `product/service`
  - precio unitario
  - características técnicas/comerciales
- oportunidades comerciales con:
  - etapas abiertas y cerradas
  - kanban
  - cierre formal `won/lost`
  - contactos
  - notas
  - actividades
  - adjuntos
  - historial de cambios de etapa
- histórico de oportunidades cerradas
- plantillas comerciales con:
  - secciones
  - ítems base
  - productos del catálogo o ítems libres
- cotizaciones con:
  - cliente
  - oportunidad opcional
  - plantilla opcional
  - líneas libres
  - secciones estructuradas
  - totales recalculados
- resumen comercial con métricas de:
  - productos
  - ingesta asistida
  - pipeline
  - históricas
  - cotizaciones
  - plantillas
- ingesta de productos con:
  - borradores manuales
  - extracción rápida por URL
  - corridas batch por URLs
  - normalización mínima previa
  - características
  - aprobación al catálogo `crm_products`
  - descarte y reapertura de borradores

Queda fuera por ahora:

- render visual avanzado de cotización
- PDF formal/export comercial
- IA comercial local
- deduplicación/enriquecimiento más avanzados

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/DEV_GUIDE.md)
  Estructura, contratos y criterios de extensión del módulo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/crm/API_REFERENCE.md)
  Referencia resumida de endpoints del módulo.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/crm/ROADMAP.md)
  Estado del módulo y backlog posterior al cierre del alcance actual.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/crm/CHANGELOG.md)
  Hitos funcionales y técnicos del módulo.
- [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas por módulo.

## Código principal

- Backend: [crm](/home/felipe/platform_paas/backend/app/apps/tenant_modules/crm)
- Frontend: [crm](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/crm)

## Criterio de uso

Si necesitas operar el módulo:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/USER_GUIDE.md)

Si necesitas modificar o extender el módulo:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/DEV_GUIDE.md)

Si necesitas revisar estado y backlog posterior:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/crm/ROADMAP.md)
