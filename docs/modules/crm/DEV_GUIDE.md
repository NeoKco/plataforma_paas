# CRM Dev Guide

Guía de desarrollo del módulo `crm`.

## Objetivo técnico del primer slice

Abrir el bloque faltante `CRM + Cotizaciones + Productos` sin mezclarlo con:

- `maintenance`
- `finance`
- identidad base de `business-core`

La frontera correcta es:

- `business-core` es dueño de clientes y organizaciones
- `crm` es dueño de:
  - productos/servicios
  - oportunidades
  - cotizaciones
  - líneas de cotización

## Estructura

- Backend:
  - [backend/app/apps/tenant_modules/crm](/home/felipe/platform_paas/backend/app/apps/tenant_modules/crm)
- Frontend:
  - [frontend/src/apps/tenant_portal/modules/crm](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/crm)
- Migración tenant:
  - [v0040_crm_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0040_crm_base.py)

## Modelo actual

Entidades del primer corte:

- `crm_products`
- `crm_opportunities`
- `crm_quotes`
- `crm_quote_lines`

Relaciones clave:

- `crm_opportunities.client_id -> business_clients.id`
- `crm_quotes.client_id -> business_clients.id`
- `crm_quotes.opportunity_id -> crm_opportunities.id`
- `crm_quote_lines.quote_id -> crm_quotes.id`
- `crm_quote_lines.product_id -> crm_products.id`

## Contrato funcional actual

- productos:
  - CRUD básico
  - validación de `name` y `sku`
- oportunidades:
  - CRUD básico
  - etapas controladas:
    - `lead`
    - `qualified`
    - `proposal`
    - `negotiation`
    - `won`
    - `lost`
- cotizaciones:
  - CRUD básico
  - líneas manuales o ligadas a producto
  - recálculo de subtotal y total

## Permisos

- lectura:
  - `tenant.crm.read`
- gestión:
  - `tenant.crm.manage`

## Integración tenant-side

- router backend:
  - `/tenant/crm/*`
- router frontend:
  - `/tenant-portal/crm`
- visibilidad tenant:
  - `module-visibility.ts`
- ítems laterales:
  - `TenantSidebarNav.tsx`

## Cobertura de regresión actual

- [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - reglas básicas de productos, oportunidades y cotizaciones
- [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - presencia e idempotencia de `0040_crm_base`

## Siguientes slices recomendados

1. notas y actividades por oportunidad
2. estado comercial más rico por cotización
3. archivos y adjuntos
4. plantillas comerciales
5. render/PDF
6. catálogo más rico y scraping

## Regla de evolución

No duplicar:

- clientes
- organizaciones
- contactos
- sitios

Todo eso se sigue resolviendo desde `business-core`.
