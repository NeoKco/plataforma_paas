# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: mantenimiento -> finanzas (sync ingreso/egreso + glosa con cliente)
- estado general: cambios desplegados en `staging` y `production`; falta validar en UI

## Resumen ejecutivo en 30 segundos

- maintenance ahora puede sincronizar ingresos/egresos sin cuenta explícita y la glosa incluye cliente/sitio
- el modo por defecto pasa a `auto_on_close` cuando no hay política explícita
- falta validar en empresa-demo con un cierre real

## Qué ya quedó hecho

- [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) permite sync accountless y glosa con cliente/sitio
- [tenant_data_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/services/tenant_data_service.py) retorna `auto_on_close` cuando no hay defaults explícitos
- [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) no bloquea sync por falta de cuentas
- [MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx) ajusta copy y default a auto
- defaults de `maintenance_finance_sync_mode` pasan a `auto_on_close` en core
- backend y frontend desplegados en `staging` y `production`
- deploy backend ejecutó suite completa y recreó `empresa-bootstrap` en staging/production (comportamiento actual del script)

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/apps/tenant_modules/finance/services/transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py)
- [backend/app/apps/tenant_modules/core/services/tenant_data_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/services/tenant_data_service.py)
- [backend/app/apps/tenant_modules/core/models/tenant_info.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/models/tenant_info.py)
- [backend/app/apps/tenant_modules/core/schemas.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/schemas.py)
- [backend/app/apps/tenant_modules/core/api/tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/tenant_routes.py)
- [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx)
- [backend/app/tests/fixtures.py](/home/felipe/platform_paas/backend/app/tests/fixtures.py)
- [backend/app/tests/test_tenant_flow.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_flow.py)
- [docs/modules/maintenance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)
- [docs/modules/maintenance/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/USER_GUIDE.md)
- [docs/modules/maintenance/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- maintenance -> finance debe crear ingresos/egresos aun cuando no existan cuentas definidas
- la glosa por defecto debe incluir mantención + cliente + sitio
- el modo efectivo sin política explícita pasa a `auto_on_close`

## Qué falta exactamente

- validar en empresa-demo que el ingreso aparece en Finanzas al cerrar OT

## Qué no debe tocarse

- no desactivar la regla E2E: jamás usar `ieris-ltda`
- no cambiar seeds de categorías fuera del catálogo default

## Validaciones ya ejecutadas

- `deploy_backend_staging.sh` ejecutó 523 tests OK
- `deploy_backend_production.sh` ejecutó 523 tests OK
- frontend build OK para staging y production

## Bloqueos reales detectados

- ninguno; falta validar en UI

## Mi conclusión

- el ajuste está publicado; falta validar el flujo real en empresa-demo.
