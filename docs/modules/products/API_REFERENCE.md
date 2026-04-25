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
- `POST /tenant/products/ingestion/drafts/{draft_id}/enrich`
- `POST /tenant/products/ingestion/drafts/{draft_id}/resolve-duplicate`
- `PATCH /tenant/products/ingestion/drafts/{draft_id}/status`
- `POST /tenant/products/ingestion/drafts/{draft_id}/approve`
- `POST /tenant/products/ingestion/extract-url`
- `GET /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs/{run_id}/cancel`

Notas del contrato actual:

- las respuestas de borradores ya incluyen:
  - `duplicate_summary`
  - `duplicate_candidates`
  - `enrichment_state`
- `POST /tenant/products/ingestion/drafts/{draft_id}/enrich`
  - usa heurística base siempre
  - intenta IA solo si el runtime expone `API_IA_URL`
- `POST /tenant/products/ingestion/drafts/{draft_id}/resolve-duplicate`
  - request:
    - `target_product_id`
    - `resolution_mode`
    - `review_notes`
  - `resolution_mode` soportado:
    - `update_existing`
    - `link_existing`
