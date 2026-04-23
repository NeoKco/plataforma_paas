# CRM Changelog

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
