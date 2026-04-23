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
- regresión mínima agregada en:
  - [test_crm_services.py](/home/felipe/platform_paas/backend/app/tests/test_crm_services.py)
  - [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
