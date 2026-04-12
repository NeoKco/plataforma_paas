# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: cerrar el primer corte de autollenado fino `maintenance -> finance` y publicarlo en `staging`
- estado general: slice implementado, validado en repo y ya publicado en `staging`; pendiente validación visual funcional y eventual promoción a `production`

## Resumen ejecutivo en 30 segundos

- el puente base `maintenance -> finance` ya existía; no hubo que reinventar la integración
- este corte agrega una fuente de verdad backend para defaults efectivos de sync: `GET /tenant/maintenance/finance-sync-defaults`
- `Resumen técnico` y `Costos y cobro` ya consumen ese contrato, y el corte ya quedó desplegado en `staging`

## Qué ya quedó hecho

- [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) ahora resuelve defaults efectivos de:
  - moneda
  - cuenta ingreso
  - cuenta egreso
  - categoría ingreso
  - categoría egreso
- esa resolución ya prioriza:
  - política tenant activa
  - moneda base o `CLP`
  - categorías de mantención
  - cuenta favorita o única compatible por moneda
- [finance_sync.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/finance_sync.py) agrega `GET /tenant/maintenance/finance-sync-defaults`
- [MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx) ahora precarga la política editable desde defaults efectivos resueltos por backend
- [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) ahora precarga sync manual/automático con esa misma fuente y muestra una pista corta de sugerencia efectiva
- [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py) cubre defaults efectivos con y sin política explícita
- el backend ya quedó desplegado en `/opt/platform_paas_staging` con `523 tests ... OK`
- el frontend de `staging` ya quedó reconstruido con `API_BASE_URL=http://192.168.7.42:8081` y `check_frontend_static_readiness.sh` en `OK`

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/maintenance/api/finance_sync.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/finance_sync.py)
- [backend/app/apps/tenant_modules/maintenance/api/router.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/router.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/__init__.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/__init__.py)
- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/tests/test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx)
- [docs/modules/maintenance/API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/maintenance/API_REFERENCE.md)
- [docs/modules/maintenance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)
- [docs/modules/maintenance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)
- [docs/modules/maintenance/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- el problema real no era ausencia de integración `maintenance -> finance`; era falta de una fuente de verdad común para defaults efectivos
- los defaults efectivos deben resolverse en backend, no repartirse entre `Resumen técnico` y `Costos y cobro`
- la selección automática de cuentas debe respetar compatibilidad por moneda para no sugerir combinaciones inválidas a `finance`
- este primer corte no cambia el momento del sync ni el modelo contable; endurece el prellenado y la ergonomía

## Qué falta exactamente

- validar visualmente en tenant real de `staging`:
  - `Resumen técnico`
  - `Costos y cobro`
  - sync manual
  - `auto_on_close`
- si `staging` queda correcto, promover a `production`
- después abrir el siguiente refinamiento `maintenance -> finance` si todavía hace falta mejorar glosas, cuentas por tenant o reglas contables más finas

## Qué no debe tocarse

- no volver a duplicar lógica de defaults entre frontend y backend
- no romper el puente existente `sync_to_finance` mientras se publiquen estos cambios de ergonomía
- no mezclar este corte con cambios nuevos de bootstrap contractual o de DLQ
- no cambiar el contrato de `finance` sobre moneda/cuenta compatible sin revisar a la vez `transaction_service.py`

## Validaciones ya ejecutadas

- repo:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `10 tests OK`
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m py_compile app/apps/tenant_modules/maintenance/api/finance_sync.py app/apps/tenant_modules/maintenance/api/router.py app/apps/tenant_modules/maintenance/services/costing_service.py app/apps/tenant_modules/maintenance/schemas/costing.py` -> `OK`
  - `cd frontend && npm run build` -> `OK`
- staging:
  - `cd /opt/platform_paas_staging && bash deploy/deploy_backend_staging.sh` -> `523 tests OK`, servicio `platform-paas-backend-staging` activo y `healthcheck` OK
  - `cd /opt/platform_paas_staging && API_BASE_URL=http://192.168.7.42:8081 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
  - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `OK`

## Bloqueos reales detectados

- no hay bloqueo técnico abierto
- falta solo validación browser funcional en `staging` antes de decidir promoción a `production`

## Mi conclusión

- este slice ya quedó cerrado en repo, documentación y despliegue `staging`
- el siguiente paso correcto es validación visible en `staging` y, si no aparecen hallazgos, promoción a `production`
