# CRM Module

Documentación canónica del módulo `crm`.

Nombre funcional visible:

- `CRM comercial`

Estado actual:

- módulo tenant operativo en repo y runtime
- enfocado en:
  - oportunidades abiertas e históricas
  - contactos, notas, actividades y adjuntos comerciales
  - plantillas de cotización
  - cotizaciones estructuradas
- consume:
  - `business-core` para clientes y organizaciones
  - `products` para catálogo técnico-comercial reusable
- entra al catálogo contractual como add-on tenant (`crm`)

Objetivo del módulo:

- cubrir el frente comercial y de pipeline faltante respecto de `ieris_app`
- separar correctamente:
  - `products` = catálogo base reusable
  - `crm` = gestión comercial y propuestas
- dejar preparada la base para futuros `projects` sin mezclar catálogo con pipeline

## Alcance actual

El módulo hoy incluye:

- oportunidades comerciales con:
  - etapas abiertas y cerradas
  - kanban
  - cierre formal `won/lost`
  - contactos
  - notas
  - actividades
  - adjuntos
  - historial de cambios
- histórico de oportunidades cerradas
- plantillas comerciales con:
  - secciones
  - ítems base
  - líneas ligadas al catálogo `products` o ítems libres
- cotizaciones con:
  - cliente
  - oportunidad opcional
  - plantilla opcional
  - líneas libres
  - secciones estructuradas
  - totales recalculados
- resumen comercial con métricas de:
  - pipeline
  - históricas
  - cotizaciones
  - plantillas

Queda fuera por ahora:

- render visual avanzado de cotización
- PDF formal/export comercial
- workflow formal de aprobación comercial
- IA comercial local

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

## Código principal

- Backend: [crm](/home/felipe/platform_paas/backend/app/apps/tenant_modules/crm)
- Frontend: [crm](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/crm)

