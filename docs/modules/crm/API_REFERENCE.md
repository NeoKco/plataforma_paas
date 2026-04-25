# CRM API Reference

## Overview

- `GET /tenant/crm/overview`

## Opportunities

- `GET /tenant/crm/opportunities`
- `POST /tenant/crm/opportunities`
- `GET /tenant/crm/opportunities/{opportunity_id}`
- `PUT /tenant/crm/opportunities/{opportunity_id}`
- `PATCH /tenant/crm/opportunities/{opportunity_id}/status`
- `POST /tenant/crm/opportunities/{opportunity_id}/notes`
- `POST /tenant/crm/opportunities/{opportunity_id}/activities`
- `POST /tenant/crm/opportunities/{opportunity_id}/attachments`

## History

- `GET /tenant/crm/history`

## Quotes

- `GET /tenant/crm/quotes`
- `POST /tenant/crm/quotes`
- `GET /tenant/crm/quotes/{quote_id}`
- `PUT /tenant/crm/quotes/{quote_id}`
- `PATCH /tenant/crm/quotes/{quote_id}/status`
- `DELETE /tenant/crm/quotes/{quote_id}`

## Templates

- `GET /tenant/crm/templates`
- `POST /tenant/crm/templates`
- `GET /tenant/crm/templates/{template_id}`
- `PUT /tenant/crm/templates/{template_id}`
- `PATCH /tenant/crm/templates/{template_id}/status`
- `DELETE /tenant/crm/templates/{template_id}`

## Fuera de este módulo

Catálogo e ingesta ya no viven en `crm`:

- ver [products/API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/products/API_REFERENCE.md)

