# Products API Reference

## Overview

- `GET /tenant/products/overview`

## Catalog

- `GET /tenant/products/catalog`
- `POST /tenant/products/catalog`
- `PUT /tenant/products/catalog/{product_id}`
- `PATCH /tenant/products/catalog/{product_id}/status`
- `DELETE /tenant/products/catalog/{product_id}`
- `POST /tenant/products/catalog/{product_id}/images`
- `PATCH /tenant/products/catalog/{product_id}/images/{image_id}/primary`
- `DELETE /tenant/products/catalog/{product_id}/images/{image_id}`
- `GET /tenant/products/catalog/{product_id}/images/{image_id}/download`
- `POST /tenant/products/catalog/{product_id}/refresh`

## Ingestion

- `GET /tenant/products/ingestion/overview`
- `GET /tenant/products/ingestion/drafts`
- `POST /tenant/products/ingestion/drafts`
- `PUT /tenant/products/ingestion/drafts/{draft_id}`
- `DELETE /tenant/products/ingestion/drafts/{draft_id}`
- `POST /tenant/products/ingestion/drafts/{draft_id}/enrich`
- `POST /tenant/products/ingestion/drafts/{draft_id}/resolve-duplicate`
- `PATCH /tenant/products/ingestion/drafts/{draft_id}/status`
- `POST /tenant/products/ingestion/drafts/{draft_id}/approve`
- `POST /tenant/products/ingestion/extract-url`
- `GET /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs`
- `POST /tenant/products/ingestion/runs/{run_id}/cancel`

Notas nuevas del catálogo:

- `POST /tenant/products/catalog/{product_id}/images`
  - acepta solo:
    - `image/webp`
    - `image/jpeg`
    - `image/png`
  - tamaño máximo backend:
    - `5 MB`
  - pensado para recibir ya la imagen comprimida desde el navegador
- `PATCH /tenant/products/catalog/{product_id}/images/{image_id}/primary`
  - deja una foto marcada como principal
- `DELETE /tenant/products/catalog/{product_id}/images/{image_id}`
  - borra la foto del almacenamiento y de la BD

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
- `POST /tenant/products/connectors/{connector_id}/schedule/run`
- `POST /tenant/products/connectors/{connector_id}/validate`

## Scheduler Automation

- `GET /tenant/products/scheduler/overview`
- `POST /tenant/products/scheduler/run-due`

## Live Refresh

- `GET /tenant/products/refresh-runs`
- `POST /tenant/products/refresh-runs`
- `GET /tenant/products/refresh-runs/{run_id}`
- `POST /tenant/products/refresh-runs/{run_id}/cancel`

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
  - usa scraping genérico + IA como carril principal
  - puede tardar varios minutos según `API_IA_TIMEOUT`
  - si falta `API_IA_URL` o `MANAGER_API_IA_KEY`, responde error explícito
- `POST /tenant/products/ingestion/runs`
  - acepta opcionalmente `connector_id`
  - cada item URL reutiliza el mismo pipeline IA genérico del `extract-url`
- `POST /tenant/products/connectors/{connector_id}/sync`
  - request:
    - `product_id` opcional
    - `limit`
  - ejecuta sync real sobre fuentes persistidas del conector
  - registra eventos `connector_sync` cuando cambia el precio observado
- `POST /tenant/products/connectors/{connector_id}/schedule/run`
  - ejecuta inmediatamente la política programada del conector
  - hoy el alcance formal soportado es:
    - `due_sources`
  - devuelve la corrida de refresh creada/ejecutada
- `POST /tenant/products/connectors`
  - ya acepta además:
    - `provider_key`
    - `provider_profile`
    - `auth_mode`
    - `auth_reference`
    - `request_timeout_seconds`
    - `retry_limit`
    - `retry_backoff_seconds`
    - `schedule_enabled`
    - `schedule_scope`
    - `schedule_frequency`
    - `schedule_batch_limit`
- `PUT /tenant/products/connectors/{connector_id}`
  - ya permite actualizar:
    - preset/proveedor
    - perfil runtime
    - auth/reference
    - timeout y reintentos
    - scheduler del conector
    - parámetros de sync/extracción
- `POST /tenant/products/connectors/{connector_id}/validate`
  - intenta validar el conector usando:
    - `base_url` si existe
    - o la última fuente activa del conector
  - actualiza:
    - `last_validation_at`
    - `last_validation_status`
    - `last_validation_summary`
  - devuelve un preview corto con:
    - `name`
    - `sku`
    - `brand`
    - `category_label`
    - `unit_price`
    - `currency_code`
    - `characteristic_count`
- `GET /tenant/products/scheduler/overview`
  - devuelve:
    - `due_connectors`
    - `recent_runs`
    - `due_connector_count`
    - `due_source_count`
- `POST /tenant/products/scheduler/run-due`
  - ejecuta en el tenant actual todos los conectores habilitados con alcance `due_sources`
  - devuelve:
    - `triggered_at`
    - `triggered_connector_count`
    - detalle por conector ejecutado
- `POST /tenant/products/catalog/{product_id}/refresh`
  - request:
    - `prefer_ai`
  - refresca el artículo existente desde sus fuentes activas
  - aplica merge por `refresh_merge_policy`
- `POST /tenant/products/refresh-runs`
  - request:
    - `scope`
    - `connector_id`
    - `product_ids`
    - `limit`
    - `prefer_ai`
  - `scope` soportado:
    - `due_sources`
    - `active_sources`
    - `selected_products`
  - crea corrida batch con progreso visible por item/fuente
- runner formal fuera del request path:
  - `backend/app/scripts/run_products_refresh_scheduler.py`
  - soporta:
    - `--tenant-slug`
    - `--tenant-limit`
    - `--connector-limit`
    - `--dry-run`
    - `--json-output`
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
