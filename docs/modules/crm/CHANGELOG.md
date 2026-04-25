# CRM Changelog

## 2026-04-24

- `crm` deja de ser dueño público del catálogo e ingesta de productos
- cotizaciones y plantillas pasan a consumir el módulo independiente `products`
- las rutas públicas de catálogo e ingesta dejan de vivir en `/tenant/crm/*` y pasan a `/tenant/products/*`

## 2026-04-23

- se abre el módulo `crm` como primer frente de expansión post-cierre del roadmap base
- backend tenant nuevo en [backend/app/apps/tenant_modules/crm](/home/felipe/platform_paas/backend/app/apps/tenant_modules/crm)
- migración tenant nueva en [v0040_crm_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0040_crm_base.py)
- frontend tenant nuevo en [frontend/src/apps/tenant_portal/modules/crm](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/crm)
- ya queda operativo el primer slice de:
  - `Productos`
  - `Oportunidades`
  - `Cotizaciones`
  - `Resumen`
- `crm` ya entra al catálogo contractual de módulos tenant

## 2026-04-23

- se cierra la segunda ola del módulo `crm` y el alcance comercial actual queda operativo
- nueva migración tenant en [v0041_crm_expansion.py](/home/felipe/platform_paas/backend/migrations/tenant/v0041_crm_expansion.py)
- productos ahora soportan `characteristics`
- oportunidades ahora soportan:
  - `kanban`
  - `historical`
  - `contacts`
  - `notes`
  - `activities`
  - `attachments`
  - `stage_events`
  - cierre formal `won/lost`
- cotizaciones ahora soportan:
  - `template_id`
  - `sections`
  - `lines` libres y estructuradas
- plantillas comerciales ya quedan operativas con:
  - secciones
  - ítems base
- el overview comercial ya refleja:
  - pipeline abierto
  - históricas
  - monto cotizado
  - plantillas
- regresión ampliada en:
  - [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
- endurecimiento adicional de migraciones:
  - [v0040_crm_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0040_crm_base.py)
  - [v0041_crm_expansion.py](/home/felipe/platform_paas/backend/migrations/tenant/v0041_crm_expansion.py)
  - ahora limpian tipos compuestos huérfanos de PostgreSQL antes de recrear tablas CRM en estados parciales
- el cierre ya queda promovido a runtime:
  - `staging` backend redeployado con `581 tests OK`, convergencia `processed=4, synced=4, failed=0`
  - `production` backend redeployado con `581 tests OK`, convergencia `processed=4, synced=4, failed=0`
  - `staging` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`
  - `production` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`

## 2026-04-24

- se abre y cierra el slice `ingesta asistida de productos` dentro de `crm`
- nueva migración tenant en [v0045_crm_product_ingestion.py](/home/felipe/platform_paas/backend/migrations/tenant/v0045_crm_product_ingestion.py)
- backend tenant nuevo para:
  - `overview` de ingesta
  - borradores de captura
  - cambio de estado `draft/discarded`
  - aprobación al catálogo `crm_products`
- frontend tenant nuevo con la vista `Ingesta`
- el overview comercial ahora también expone:
  - `ingestion_total`
  - `ingestion_draft`
  - `recent_product_drafts`
- regresión ampliada en:
  - [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
- el cierre ya queda promovido a runtime:
  - backup PostgreSQL tenant previo ejecutado en `staging` y `production` antes de converger `0045_crm_product_ingestion`
  - `production` incluye backup previo explícito de `ieris-ltda`
  - `staging` backend redeployado con `585 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `production` backend redeployado con `585 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `staging` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`
  - `production` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`

## 2026-04-24

- se profundiza `crm ingestion` hasta cubrir extracción automática por URL y corridas batch persistidas
- nueva migración tenant en [v0046_crm_product_ingestion_runs.py](/home/felipe/platform_paas/backend/migrations/tenant/v0046_crm_product_ingestion_runs.py)
- backend tenant nuevo para:
  - `POST /tenant/crm/product-ingestion/extract-url`
  - `GET /tenant/crm/product-ingestion/runs`
  - `POST /tenant/crm/product-ingestion/runs`
  - `GET /tenant/crm/product-ingestion/runs/{run_id}`
  - `POST /tenant/crm/product-ingestion/runs/{run_id}/cancel`
- frontend tenant nuevo con:
  - extracción rápida por URL
  - corridas batch por URLs
  - tabla de seguimiento y cancelación de corridas
- regresión ampliada en:
  - [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
- el cierre queda promovido a runtime:
  - backup PostgreSQL tenant previo ejecutado en `staging` y `production` antes de converger `0046_crm_product_ingestion_runs`
  - `production` incluye backup previo explícito de `ieris-ltda`
  - `staging` backend redeployado con `585 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `production` backend redeployado con `585 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `staging` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`
  - `production` frontend publicado y validado con `check_frontend_static_readiness.sh -> 0 fallos, 0 advertencias`
