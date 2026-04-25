# CRM Dev Guide

## Alcance del módulo

`crm` concentra la capa comercial:

- oportunidades
- histórico de cierres
- notas, actividades y adjuntos
- plantillas de cotización
- cotizaciones

No es dueño del catálogo técnico-comercial.  
Ese dominio ya vive en `products`.

## Estructura principal

- backend:
  - `backend/app/apps/tenant_modules/crm`
- frontend:
  - `frontend/src/apps/tenant_portal/modules/crm`

## Persistencia principal

Tablas activas del dominio:

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

Relaciones relevantes:

- `crm_opportunities.client_id -> business_clients.id`
- `crm_quotes.client_id -> business_clients.id`
- `crm_quotes.opportunity_id -> crm_opportunities.id`
- `crm_quote_lines.product_id -> catálogo vigente de products`
- `crm_quote_template_items.product_id -> catálogo vigente de products`

## Contratos públicos

El módulo expone solo rutas de CRM:

- `/tenant/crm/overview`
- `/tenant/crm/opportunities`
- `/tenant/crm/history`
- `/tenant/crm/quotes`
- `/tenant/crm/templates`

Las rutas de catálogo e ingesta ya viven en `/tenant/products/*`.

## Integración con `products`

`crm` consume el catálogo independiente para:

- listar productos activos en cotizaciones
- listar productos activos en plantillas
- resolver `product_id` de líneas y secciones

Si un tenant no tiene contratado `products`, `crm` sigue operando:

- con líneas libres
- sin fallar por ausencia del catálogo

## Criterio de evolución

Cambios futuros sobre catálogo, scraping, enriquecimiento o deduplicación deben abrirse en `products`, no en `crm`.

