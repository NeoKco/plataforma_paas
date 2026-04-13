# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: mantenimiento -> finanzas (precio sugerido editable + margen objetivo con hint + glosa con cliente + egreso por líneas seleccionadas)
- estado general: cambios desplegados en `staging` y `production`; falta validar en UI

## Resumen ejecutivo en 30 segundos

- costeo estimado permite editar `precio sugerido` sin sobreescribir el `margen objetivo`; se muestra hint de margen calculado según el precio sugerido
- la glosa de ingresos/egresos queda como `Ingreso mantención #XXX · trabajo · cliente` (sin equipo/sitio); backend agrega fallback de cliente cuando falta
- al sincronizar ingresos, si hay costos reales > 0 se genera egreso automáticamente (evita utilidades infladas) usando solo líneas marcadas como egreso
- script aplicado en `empresa-demo` para normalizar glosas antiguas ya existentes
- cambios publicados en staging y production; glosa forzada en backend; build frontend valida `.env.production` y bloquea API staging por defecto

## Qué ya quedó hecho

- [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) mantiene sync accountless y glosa sin sitio
- [tenant_data_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/services/tenant_data_service.py) retorna `auto_on_close` cuando no hay defaults explícitos
- [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) habilita edición de precio sugerido sin sobreescribir margen objetivo y muestra hint de margen calculado
- [MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx) ajusta copy y default a auto
- defaults de `maintenance_finance_sync_mode` pasan a `auto_on_close` en core
- backend y frontend desplegados en `staging` y `production` con este corte
- deploy backend ejecutó suite completa y recreó `empresa-bootstrap` en staging/production (comportamiento actual del script)
- frontend staging/production re-publicado con API_BASE_URL correcta
- sync a finanzas ahora fuerza egreso si hay costos reales y se sincroniza el ingreso
- script `repair_maintenance_finance_expenses.py` aplicado en `empresa-demo` para backfill de egresos
- líneas de costeo ahora permiten marcar qué items cuentan como egreso (`include_in_expense`)

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/maintenance/schemas/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py)
- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/apps/tenant_modules/finance/services/transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py)
- [backend/app/apps/tenant_modules/core/services/tenant_data_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/services/tenant_data_service.py)
- [backend/app/apps/tenant_modules/core/models/tenant_info.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/models/tenant_info.py)
- [backend/app/apps/tenant_modules/core/schemas.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/schemas.py)
- [backend/app/apps/tenant_modules/core/api/tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/tenant_routes.py)
- [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx)
- [backend/app/tests/fixtures.py](/home/felipe/platform_paas/backend/app/tests/fixtures.py)
- [backend/app/tests/test_tenant_flow.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_flow.py)
- [docs/modules/maintenance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)
- [docs/modules/maintenance/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/USER_GUIDE.md)
- [docs/modules/maintenance/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- maintenance -> finance debe crear ingresos/egresos aun cuando no existan cuentas definidas
- la glosa por defecto debe incluir mantención + trabajo + cliente (sin equipo/sitio)
- el modo efectivo sin política explícita pasa a `auto_on_close`
- el precio sugerido del estimado es editable y no sobreescribe el margen objetivo
- el margen objetivo muestra hint calculado cuando el usuario edita el precio sugerido
- si hay costos reales > 0, el egreso debe sincronizarse siempre que se sincronice el ingreso
- las líneas de costeo controlan qué ítems impactan el egreso

## Qué falta exactamente

- validar en empresa-demo:
  - precio sugerido editable sin sobreescribir margen objetivo y hint de margen calculado visible
  - glosa en Finanzas con formato `Ingreso mantención #XXX · trabajo · cliente`
  - confirmar que se crea egreso con costos cuando hay monto cobrado y costos reales > 0
  - confirmar que desmarcar una línea la excluye del egreso y del total real

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

- el ajuste está publicado; falta validar en empresa-demo la edición de precio sugerido y la glosa final.
- el ajuste de egreso forzado ya está publicado; falta validar en empresa-demo el control por línea y el egreso junto al ingreso.
