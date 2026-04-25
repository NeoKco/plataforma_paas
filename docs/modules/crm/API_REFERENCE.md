# CRM API Reference

Referencia resumida del módulo `crm`.

## Overview

- `GET /tenant/crm/overview`
  - métricas del módulo
  - oportunidades recientes
  - cotizaciones recientes

## Products

- `GET /tenant/crm/products`
- `POST /tenant/crm/products`
- `GET /tenant/crm/products/{product_id}`
- `PUT /tenant/crm/products/{product_id}`
- `PATCH /tenant/crm/products/{product_id}/status`
- `DELETE /tenant/crm/products/{product_id}`

Notas:

- cada producto puede traer `characteristics[]`

## Product Ingestion

- `GET /tenant/crm/product-ingestion/overview`
- `GET /tenant/crm/product-ingestion/drafts`
- `POST /tenant/crm/product-ingestion/drafts`
- `POST /tenant/crm/product-ingestion/extract-url`
- `GET /tenant/crm/product-ingestion/drafts/{draft_id}`
- `PUT /tenant/crm/product-ingestion/drafts/{draft_id}`
- `PATCH /tenant/crm/product-ingestion/drafts/{draft_id}/status`
- `POST /tenant/crm/product-ingestion/drafts/{draft_id}/approve`
- `GET /tenant/crm/product-ingestion/runs`
- `POST /tenant/crm/product-ingestion/runs`
- `GET /tenant/crm/product-ingestion/runs/{run_id}`
- `POST /tenant/crm/product-ingestion/runs/{run_id}/cancel`

Notas:

- la ingesta no crea productos automáticamente por solo capturar el borrador
- la publicación al catálogo ocurre recién en `approve`
- la extracción rápida por URL crea un borrador revisable, no un producto final
- las corridas batch dejan trazabilidad por URL y permiten cancelación explícita
- los estados válidos de borrador son:
  - `draft`
  - `approved`
  - `discarded`
- los estados válidos de corrida son:
  - `queued`
  - `running`
  - `completed`
  - `cancelled`
  - `failed`

## Opportunities

- `GET /tenant/crm/opportunities`
- `GET /tenant/crm/opportunities/kanban`
- `GET /tenant/crm/opportunities/historical`
- `POST /tenant/crm/opportunities`
- `GET /tenant/crm/opportunities/{opportunity_id}`
- `GET /tenant/crm/opportunities/{opportunity_id}/detail`
- `PUT /tenant/crm/opportunities/{opportunity_id}`
- `POST /tenant/crm/opportunities/{opportunity_id}/close`
- `PATCH /tenant/crm/opportunities/{opportunity_id}/status`
- `DELETE /tenant/crm/opportunities/{opportunity_id}`

### Opportunity Contacts

- `POST /tenant/crm/opportunities/{opportunity_id}/contacts`
- `PUT /tenant/crm/opportunities/{opportunity_id}/contacts/{contact_id}`
- `DELETE /tenant/crm/opportunities/{opportunity_id}/contacts/{contact_id}`

### Opportunity Notes

- `POST /tenant/crm/opportunities/{opportunity_id}/notes`
- `PUT /tenant/crm/opportunities/{opportunity_id}/notes/{note_id}`
- `DELETE /tenant/crm/opportunities/{opportunity_id}/notes/{note_id}`

### Opportunity Activities

- `POST /tenant/crm/opportunities/{opportunity_id}/activities`
- `PUT /tenant/crm/opportunities/{opportunity_id}/activities/{activity_id}`
- `PATCH /tenant/crm/opportunities/{opportunity_id}/activities/{activity_id}/status`
- `DELETE /tenant/crm/opportunities/{opportunity_id}/activities/{activity_id}`

### Opportunity Attachments

- `POST /tenant/crm/opportunities/{opportunity_id}/attachments`
- `DELETE /tenant/crm/opportunities/{opportunity_id}/attachments/{attachment_id}`
- `GET /tenant/crm/opportunities/{opportunity_id}/attachments/{attachment_id}/download`

## Quotes

- `GET /tenant/crm/quotes`
- `POST /tenant/crm/quotes`
- `GET /tenant/crm/quotes/{quote_id}`
- `PUT /tenant/crm/quotes/{quote_id}`
- `PATCH /tenant/crm/quotes/{quote_id}/status`
- `DELETE /tenant/crm/quotes/{quote_id}`

Notas:

- las cotizaciones aceptan:
  - `lines[]`
  - `sections[]`
  - `template_id`

## Templates

- `GET /tenant/crm/templates`
- `POST /tenant/crm/templates`
- `GET /tenant/crm/templates/{template_id}`
- `PUT /tenant/crm/templates/{template_id}`
- `PATCH /tenant/crm/templates/{template_id}/status`
- `DELETE /tenant/crm/templates/{template_id}`

Notas:

- cada plantilla acepta:
  - `sections[]`
  - `items[]` dentro de cada sección

## Permisos

- lectura:
  - `tenant.crm.read`
- escritura:
  - `tenant.crm.manage`
