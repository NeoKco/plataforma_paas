# Products API Reference

## Overview

- `GET /tenant/products/overview`

## Catalog

- `GET /tenant/products/catalog`
- `POST /tenant/products/catalog`
- `PUT /tenant/products/catalog/{product_id}`
- `PATCH /tenant/products/catalog/{product_id}/status`
- `DELETE /tenant/products/catalog/{product_id}`

## Ingestion

- `GET /tenant/products/ingestion/overview`
- `GET /tenant/products/ingestion/drafts`
- `POST /tenant/products/ingestion/drafts`
- `PUT /tenant/products/ingestion/drafts/{draft_id}`
- `PATCH /tenant/products/ingestion/drafts/{draft_id}/status`
- `POST /tenant/products/ingestion/drafts/{draft_id}/approve`
- `POST /tenant/products/ingestion/extract-url`
- `GET /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs/{run_id}/cancel`

