# CRM API Reference

Referencia resumida del primer corte del módulo `crm`.

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

## Opportunities

- `GET /tenant/crm/opportunities`
- `POST /tenant/crm/opportunities`
- `GET /tenant/crm/opportunities/{opportunity_id}`
- `PUT /tenant/crm/opportunities/{opportunity_id}`
- `PATCH /tenant/crm/opportunities/{opportunity_id}/status`
- `DELETE /tenant/crm/opportunities/{opportunity_id}`

## Quotes

- `GET /tenant/crm/quotes`
- `POST /tenant/crm/quotes`
- `GET /tenant/crm/quotes/{quote_id}`
- `PUT /tenant/crm/quotes/{quote_id}`
- `PATCH /tenant/crm/quotes/{quote_id}/status`
- `DELETE /tenant/crm/quotes/{quote_id}`

## Permisos

- lectura:
  - `tenant.crm.read`
- escritura:
  - `tenant.crm.manage`
