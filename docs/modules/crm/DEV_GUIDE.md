# CRM Dev Guide

Guía de desarrollo del módulo `crm`.

## Objetivo técnico

Cubrir el bloque faltante `CRM + Cotizaciones + Productos` sin mezclarlo con:

- `maintenance`
- `finance`
- identidad base de `business-core`

La frontera correcta es:

- `business-core` es dueño de clientes, organizaciones, grupos sociales, contactos base y sitios
- `crm` es dueño de:
  - productos/servicios comerciales
  - oportunidades
  - detalle comercial de oportunidad
  - cotizaciones
  - plantillas comerciales

## Estructura

- Backend:
  - [backend/app/apps/tenant_modules/crm](/home/felipe/platform_paas/backend/app/apps/tenant_modules/crm)
- Frontend:
  - [frontend/src/apps/tenant_portal/modules/crm](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/crm)
- Migraciones tenant:
  - [v0040_crm_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0040_crm_base.py)
  - [v0041_crm_expansion.py](/home/felipe/platform_paas/backend/migrations/tenant/v0041_crm_expansion.py)
  - [v0045_crm_product_ingestion.py](/home/felipe/platform_paas/backend/migrations/tenant/v0045_crm_product_ingestion.py)

## Modelo actual

Entidades activas del módulo:

- `crm_products`
- `crm_product_characteristics`
- `crm_opportunities`
- `crm_opportunity_contacts`
- `crm_opportunity_notes`
- `crm_opportunity_activities`
- `crm_opportunity_attachments`
- `crm_opportunity_stage_events`
- `crm_quotes`
- `crm_quote_sections`
- `crm_quote_lines`
- `crm_quote_templates`
- `crm_quote_template_sections`
- `crm_quote_template_items`
- `crm_product_ingestion_drafts`
- `crm_product_ingestion_characteristics`

## Relaciones clave

- `crm_opportunities.client_id -> business_clients.id`
- `crm_quotes.client_id -> business_clients.id`
- `crm_quotes.opportunity_id -> crm_opportunities.id`
- `crm_quotes.template_id -> crm_quote_templates.id`
- `crm_quote_sections.quote_id -> crm_quotes.id`
- `crm_quote_lines.quote_id -> crm_quotes.id`
- `crm_quote_lines.section_id -> crm_quote_sections.id`
- `crm_quote_lines.product_id -> crm_products.id`
- `crm_quote_template_sections.template_id -> crm_quote_templates.id`
- `crm_quote_template_items.section_id -> crm_quote_template_sections.id`
- `crm_quote_template_items.product_id -> crm_products.id`
- `crm_product_ingestion_drafts.published_product_id -> crm_products.id`
- `crm_product_ingestion_characteristics.draft_id -> crm_product_ingestion_drafts.id`

## Contrato funcional actual

### Productos

- CRUD completo
- validación de unicidad por `name`
- validación de unicidad case-insensitive por `sku`
- características reemplazables en create/update

### Oportunidades

- CRUD completo
- etapas controladas:
  - `lead`
  - `qualified`
  - `proposal`
  - `negotiation`
  - `won`
  - `lost`
- cierre formal mediante `close_opportunity`
- detalle rico con:
  - contactos
  - notas
  - actividades
  - adjuntos
  - stage events
- kanban abierto separado del histórico cerrado

### Cotizaciones

- CRUD completo
- líneas libres y líneas por sección
- plantilla opcional
- recálculo server-side de subtotal y total
- serialización con nombres auxiliares:
  - cliente
  - oportunidad
  - plantilla
  - producto

### Plantillas

- CRUD completo
- toggle activa/inactiva
- estructura por secciones
- ítems base ligados o no al catálogo

### Ingesta asistida

- borradores de captura con `source_kind`:
  - `manual_capture`
  - `url_reference`
- estados controlados:
  - `draft`
  - `approved`
  - `discarded`
- aprobación server-side mediante `approve_draft(...)`
- publicación al catálogo usando `CRMProductService.create_product(...)`
- características del borrador persistidas aparte y promovidas al producto final
- resumen propio de ingesta para overview y página dedicada

## API tenant actual

Prefijo:

- `/tenant/crm/*`

Routers visibles:

- `overview`
- `products`
- `opportunities`
- `quotes`
- `templates`
- `product-ingestion`

Endpoints relevantes extra:

- `GET /tenant/crm/opportunities/kanban`
- `GET /tenant/crm/opportunities/historical`
- `GET /tenant/crm/opportunities/{id}/detail`
- `POST /tenant/crm/opportunities/{id}/close`
- subrecursos de oportunidad:
  - `contacts`
  - `notes`
  - `activities`
  - `attachments`

## Frontend tenant actual

Rutas:

- `/tenant-portal/crm`
- `/tenant-portal/crm/opportunities`
- `/tenant-portal/crm/history`
- `/tenant-portal/crm/ingestion`
- `/tenant-portal/crm/quotes`
- `/tenant-portal/crm/templates`
- `/tenant-portal/crm/products`

Piezas relevantes:

- `CRMModuleNav.tsx`
- `crmService.ts`
- páginas CRUD específicas

## Permisos

- lectura:
  - `tenant.crm.read`
- gestión:
  - `tenant.crm.manage`

## Cobertura de regresión actual

- [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - reglas de productos, ingesta, oportunidades, cotizaciones estructuradas y plantillas
- [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - presencia e idempotencia de `0040_crm_base`, `0041_crm_expansion` y `0045_crm_product_ingestion`

## Regla de evolución

No duplicar desde `crm`:

- clientes
- organizaciones
- grupos sociales
- sitios

Todo eso sigue resolviéndose desde `business-core`.

La siguiente evolución razonable del módulo ya no es “cerrar lo básico”, sino profundizar:

- render/PDF
- plantillas visuales
- scraping automático multi-fuente
- IA comercial
