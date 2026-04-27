# Products Dev Guide

## Alcance del módulo

`products` es el dominio independiente de catálogo técnico-comercial e ingesta.

Responsabilidades:

- catálogo reusable de productos/servicios
- scraping/ingesta asistida
- actualización viva por artículo desde sus fuentes
- corridas batch con progreso para refresh del catálogo
- scheduler formal por tenant para corridas `due_sources`
- perfil runtime del conector y validación operativa
- revisión previa a publicación
- base de consumo para `crm` y futuros `projects`

## Estructura principal

- backend:
  - `backend/app/apps/tenant_modules/products`
- frontend:
  - `frontend/src/apps/tenant_portal/modules/products`

## Contratos públicos

Rutas públicas del módulo:

- `/tenant/products/overview`
- `/tenant/products/catalog`
- `/tenant/products/ingestion/*`
- `/tenant/products/sources`
- `/tenant/products/price-history`
- `/tenant/products/connectors`
- `/tenant/products/refresh-runs`
- `/tenant/products/comparisons`
- `/tenant/products/scheduler/overview`
- `/tenant/products/scheduler/run-due`
- `/tenant/products/connectors/{connector_id}/schedule/run`
- `/tenant/products/connectors/{connector_id}/validate`

Permisos:

- `tenant.products.read`
- `tenant.products.manage`

## Persistencia

En este corte, la superficie pública ya quedó desacoplada y el módulo es independiente a nivel contractual, de rutas, UI y permisos.

Nota de implementación:

- la persistencia física sigue reutilizando la capa ya validada de catálogo/ingesta que originalmente nació dentro de `crm`
- eso evita un rename destructivo inmediato y deja lista una migración física posterior si se decide separar tablas

Esa compatibilidad interna no cambia la regla pública:

- `products` es el dueño funcional del catálogo e ingesta
- `crm` solo consume ese catálogo

En este slice el módulo también pasa a ser dueño funcional de:

- conectores de ingesta
- fuentes por producto
- eventos de precio por producto

## Slice nuevo ya cerrado

La ingesta ahora ya expone:

- análisis de duplicados en runtime sobre:
  - catálogo publicado
  - otros borradores
- endpoint de enriquecimiento por borrador
- endpoint de resolución accionable contra catálogo:
  - `POST /tenant/products/ingestion/drafts/{draft_id}/resolve-duplicate`
- pipeline IA genérico principal para `extract-url` y corridas batch por URL
- sin fallback silencioso al heurístico cuando el carril IA está requerido
- extracción técnica más profunda desde texto libre y scraping:
  - `Potencia`
  - `Voltaje`
  - `Corriente`
  - `Capacidad`
  - `Presión`
  - `Temperatura`
  - `Peso`
  - `Dimensiones`
  - `Modelo`

La resolución accionable hoy soporta:

- `update_existing`
  actualiza el producto ya publicado con la mejor información del borrador y lo vincula como resuelto
- `link_existing`
  resuelve el borrador contra un producto ya publicado sin modificar el catálogo

Además, este cierre suma:

- conectores multi-fuente persistidos
- metadatos de automatización por conector:
  - `sync_mode`
  - `fetch_strategy`
  - `run_ai_enrichment`
  - `last_sync_summary`
- borradores y corridas con `connector_id`
- persistencia automática de fuentes y eventos de precio al aprobar o vincular borradores
- sincronización automática runtime por conector:
  - `POST /tenant/products/connectors/{connector_id}/sync`
- scheduler formal por conector:
  - `provider_key`
  - `schedule_enabled`
  - `schedule_scope`
  - `schedule_frequency`
  - `schedule_batch_limit`
  - `next_scheduled_run_at`
  - `last_scheduled_run_at`
  - `last_schedule_status`
  - `last_schedule_summary`
- ejecución manual del scheduler:
  - `POST /tenant/products/connectors/{connector_id}/schedule/run`
- perfil runtime/validación por conector:
  - `provider_profile`
  - `auth_mode`
  - `auth_reference`
  - `request_timeout_seconds`
  - `retry_limit`
  - `retry_backoff_seconds`
  - `last_validation_at`
  - `last_validation_status`
  - `last_validation_summary`
- validación explícita del conector:
  - `POST /tenant/products/connectors/{connector_id}/validate`
- comparación multi-fuente por producto:
  - `GET /tenant/products/comparisons`
- actualización viva del catálogo:
  - `POST /tenant/products/catalog/{product_id}/refresh`
  - `GET /tenant/products/refresh-runs`
  - `POST /tenant/products/refresh-runs`
  - `POST /tenant/products/refresh-runs/{run_id}/cancel`
- estado de sync por fuente:
  - `sync_status`
  - `last_sync_attempt_at`
  - `last_sync_error`
- metadatos de refresh por fuente:
  - `refresh_mode`
  - `refresh_merge_policy`
  - `refresh_prompt`
  - `next_refresh_at`
  - `last_refresh_success_at`
- CRUD visible de conectores
- CRUD visible de fuentes manuales
- registro manual de eventos de precio
- overview con:
  - fuentes recientes
  - precios recientes
  - conectores recientes
  - comparaciones recientes
  - corridas recientes de refresh

Variables runtime compatibles con el carril IA existente:

- `API_IA_URL`
- `MANAGER_API_IA_KEY`
- `API_IA_MODEL_ID`
- `API_IA_MAX_TOKENS`
- `API_IA_TEMPERATURE`
- `API_IA_TIMEOUT`

Regla nueva de implementación:

- `Products > Ingesta > URL` y sus corridas batch deben usar scraping genérico + IA como carril principal
- el parser HTML/base puede seguir aportando SKU/marca/categoría como soporte, pero no reemplaza el paso IA
- si falta `API_IA_URL` o `MANAGER_API_IA_KEY`, el backend debe responder error explícito y no “simular éxito” con heurística pobre

Regla de implementación:

- `products` sigue siendo dueño funcional del catálogo e ingesta
- la persistencia interna reutilizada no cambia el contrato público del módulo
- la actualización viva ya no debe tratarse como “enriquecimiento accesorio”; es el carril que mantiene vigente el catálogo consumido por cotizaciones y futuros proyectos

## Reconstrucción de los slices `0050` y `0051`

Artefactos mínimos:

- migración:
  - `v0050_products_connector_scheduler_and_provider_profiles`
  - `v0051_products_connector_runtime_profiles`
- servicios:
  - `connector_service.py`
  - `connector_scheduler_service.py`
  - `connector_sync_service.py`
  - `connector_validation_service.py`
  - `ingestion_run_service.py`
- runner:
  - `backend/app/scripts/run_products_refresh_scheduler.py`
- frontend:
  - `ProductsConnectorsPage.tsx`
  - `ProductsOverviewPage.tsx`
  - `productsService.ts`

Secuencia de reconstrucción:

1. agregar campos provider/scheduler al modelo `products_connectors`
2. agregar campos runtime/validación al mismo modelo
3. exponerlos en schemas, serializers y API
4. agregar ejecución manual del scheduler desde `connectors.py`
5. agregar validación explícita del conector desde `connectors.py`
6. mantener runner cross-tenant separado del request path normal
7. cablear primero el carril base `URL genérica + IA`:
   - `generic_ai_extraction_service.py`
   - prompt técnico
   - `/analyze`
   - postproceso estructurado
8. reutilizar `ingestion runs` también para la URL única:
   - corrida asíncrona
   - progreso visible
   - apertura automática del borrador al terminar
9. exponer trazabilidad IA visible en el borrador:
   - badge
   - estrategia
   - resumen
10. cablear presets por proveedor y perfil runtime en UI como mejora adicional
11. profundizar extractores específicos (`mercadolibre`, `sodimac`, `easy`) encima del carril genérico
12. revalidar tests + build + deploy con backup tenant previo

## Operación programada

Runner formal del slice:

- `backend/app/scripts/run_products_refresh_scheduler.py`

Uso típico:

- todos los tenants activos:
  - `PYTHONPATH=backend ./platform_paas_venv/bin/python backend/app/scripts/run_products_refresh_scheduler.py`
- un tenant específico:
  - `... --tenant-slug ieris-ltda`
- preview sin ejecutar:
  - `... --dry-run`
- salida JSON para evidencia/automatización:
  - `... --json-output /tmp/products_refresh_scheduler.json`

Además del runner cross-tenant, el módulo ya expone una superficie gobernada por tenant:

- `GET /tenant/products/scheduler/overview`
- `POST /tenant/products/scheduler/run-due`

Esa superficie no reemplaza al runner del entorno; lo complementa:

- tenant UI/API para operación controlada dentro del workspace
- runner para cron/worker/operación cross-tenant fuera del request path

La regla operativa sigue siendo:

- antes de mutar `staging` o `production`, backup PostgreSQL tenant previo obligatorio
- `ieris-ltda` requiere backup explícito adicional y validación reforzada

## Criterio de evolución

Las siguientes profundizaciones deben abrirse aquí:

- conectores específicos por marketplace/proveedor con autenticación propietaria
- scheduler automático gobernado por worker/cron del entorno ya institucionalizado más allá del runner manual
- comparación multi-moneda/unidad más profunda
- mejor reutilización del catálogo en `projects`
- clasificación/categorización más profunda por IA
- versionado más rico de atributos técnicos por fuente
