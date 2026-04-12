# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: abrir el segundo corte de llenado fino `maintenance -> finance` (glosa, referencia OT y fecha contable opcional)
- estado general: slice abierto en repo, pendiente de promoción a `staging` y `production`

## Resumen ejecutivo en 30 segundos

- el puente base `maintenance -> finance` ya existía; el segundo corte se enfoca en ergonomía de glosa y fecha contable
- el repo ya acepta `income_description`, `expense_description` y `transaction_at` en `/tenant/maintenance/work-orders/{id}/finance-sync`
- `Costos y cobro` ya expone referencia OT, glosa ingreso/egreso y un toggle para editar fecha contable

## Qué ya quedó hecho

- [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) acepta:
  - `transaction_at` opcional para fecha contable
  - `income_description` y `expense_description` para glosas editables
- [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py) incorpora los campos nuevos en el request de sync
- [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) ahora muestra:
  - referencia OT derivada
  - glosa ingreso/egreso editable
  - toggle para ajustar fecha contable manualmente
- [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts) valida presencia de las glosas y referencia OT en el modal
- [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py) agrega cobertura de descripción personalizada y fecha contable explícita

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/maintenance/api/finance_sync.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/finance_sync.py)
- [backend/app/apps/tenant_modules/maintenance/api/router.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/router.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/__init__.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/__init__.py)
- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/tests/test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx)
- [frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts)
- [docs/modules/maintenance/API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/maintenance/API_REFERENCE.md)
- [docs/modules/maintenance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)
- [docs/modules/maintenance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)
- [docs/modules/maintenance/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- el segundo corte prioriza ergonomía de glosa/fecha contable sin tocar el contrato contable base
- la fecha contable sigue a `completed_at` por defecto; solo se ajusta si el operador activa el toggle manual
- la glosa por defecto se deriva de OT y cliente, pero siempre queda editable antes del sync

## Qué falta exactamente

- publicar este subcorte en `staging` y validar con smoke browser
- promover a `production` si `staging` queda verde

## Qué no debe tocarse

- no cambiar reglas de defaults efectivos ni política tenant en este subcorte
- no romper el puente existente `sync_to_finance`
- no mezclar este corte con cambios nuevos de bootstrap contractual o de DLQ

## Validaciones ya ejecutadas

- repo:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `11 tests OK`

## Bloqueos reales detectados

- no hay bloqueo técnico abierto
- el único hallazgo operativo de la iteración fue runtime: `staging` estaba con un `TENANT_PLAN_ENABLED_MODULES` atrasado; ya quedó corregido

## Mi conclusión

- el primer corte de defaults efectivos `maintenance -> finance` ya quedó cerrado de punta a punta: repo, `staging`, `production`, smoke browser y documentación
- el siguiente paso correcto ya no es rollout; es abrir el segundo corte funcional de llenado fino entre `maintenance` y `finance`
