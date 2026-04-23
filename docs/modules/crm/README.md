# CRM Module

Documentación canónica del módulo `crm`.

Nombre funcional visible:

- `CRM comercial`

Estado actual:

- primer slice ya operativo dentro del PaaS
- backend tenant ya expone catálogo de productos, oportunidades y cotizaciones
- frontend tenant ya entrega lectura y captura para:
  - `Resumen`
  - `Oportunidades`
  - `Cotizaciones`
  - `Productos`
- el módulo ya reutiliza `business-core` como base de clientes
- el módulo ya entra al catálogo contractual como add-on tenant (`crm`)

Objetivo del módulo:

- cubrir el frente comercial faltante respecto de `ieris_app`
- unificar pipeline comercial, propuestas y catálogo reusable dentro del tenant
- preparar la base para siguientes slices:
  - notas y actividades CRM
  - archivos comerciales
  - plantillas
  - render/PDF
  - productos más ricos

## Alcance del primer corte

Este primer slice ya incluye:

- productos y servicios simples
- pipeline base de oportunidades
- cotizaciones con líneas simples
- relación con clientes de `business-core`
- métricas visibles de pipeline y cotizaciones

Queda fuera por ahora:

- notas y actividades CRM
- adjuntos comerciales
- plantillas de cotización
- render/PDF
- catálogo técnico avanzado
- scraping de productos

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/crm/DEV_GUIDE.md)
  Estructura, contratos y criterios de extensión del módulo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/crm/API_REFERENCE.md)
  Referencia resumida de endpoints del primer corte.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/crm/ROADMAP.md)
  Estado del módulo y siguientes slices recomendados.
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

Si necesitas revisar estado y siguientes slices:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/crm/ROADMAP.md)
