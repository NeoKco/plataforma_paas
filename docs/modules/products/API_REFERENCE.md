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

## Sources and Price History

- `GET /tenant/products/sources`
- `POST /tenant/products/catalog/{product_id}/sources`
- `PUT /tenant/products/sources/{source_id}`
- `GET /tenant/products/price-history`
- `POST /tenant/products/catalog/{product_id}/price-history`

## Connectors

- `GET /tenant/products/connectors`
- `POST /tenant/products/connectors`
- `PUT /tenant/products/connectors/{connector_id}`
- `PATCH /tenant/products/connectors/{connector_id}/status`
- `DELETE /tenant/products/connectors/{connector_id}`
- `POST /tenant/products/connectors/{connector_id}/sync`

## Comparison

- `GET /tenant/products/comparisons`

Notas del contrato actual:

- las respuestas de borradores ya incluyen:
  - `duplicate_summary`
  - `duplicate_candidates`
  - `enrichment_state`
  - `connector_id`
  - `connector_name`
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
- `POST /tenant/products/ingestion/drafts`
  - acepta opcionalmente `connector_id`
- `POST /tenant/products/ingestion/extract-url`
  - acepta opcionalmente `connector_id`
- `POST /tenant/products/ingestion/runs`
  - acepta opcionalmente `connector_id`
- `POST /tenant/products/connectors/{connector_id}/sync`
  - request:
    - `product_id` opcional
    - `limit`
  - ejecuta sync real sobre fuentes persistidas del conector
  - registra eventos `connector_sync` cuando cambia el precio observado
- `GET /tenant/products/comparisons`
  - acepta filtros:
    - `product_id`
    - `connector_id`
    - `limit`
  - devuelve:
    - `recommended_source_id`
    - `recommended_price`
    - `recommended_reason`
    - `lowest_price`
    - `highest_price`
    - `price_spread`
    - `price_spread_percent`
    - ranking de `sources`
