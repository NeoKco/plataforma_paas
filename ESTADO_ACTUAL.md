# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-13
- foco de iteración: mantenimiento -> finanzas (claridad UX entre histórico y cierre operativo)
- estado general: flujo validado en `production` sobre `empresa-demo`; UX aclarada, compilada y publicada en `production`

## Resumen ejecutivo en 30 segundos

- `empresa-demo` ya sincroniza correctamente cierre de mantenciones hacia Finanzas en `production`
- se verificó en DB que las OT `#321`, `#322` y `#323` tienen `income_transaction_id`, `expense_transaction_id` y `finance_synced_at`
- la glosa final queda como `Ingreso/Egreso mantención #XXX · trabajo · cliente`
- la vista `Ver costos` desde `Historial` es lectura consolidada; no es el punto de disparo del sync
- la UX ahora renombra esa acción a `Ver costos (hist.)` y muestra estado visible de sincronización en el modal readonly
- el sync real ocurre al:
  - guardar costo real sobre una OT ya `completed`
  - cerrar la OT desde el flujo operativo
  - ejecutar sincronización manual a Finanzas

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
- script `repair_maintenance_finance_sync.py` validado en `empresa-demo`; no quedan OT completadas pendientes de sync
- `MaintenanceHistoryPage`, `MaintenanceWorkOrderDetailModal` y `MaintenanceCostingModal` aclaran visualmente la diferencia entre consulta histórica y ajuste/sync operativo
- validación productiva real:
  - OT `#321` -> ingreso `#196`, egreso `#202`
  - OT `#322` -> ingreso `#203`, egreso `#204`
  - OT `#323` -> ingreso `#205`, egreso `#206`

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

- mejorar señal visual/UX para dejar explícito que:
  - `Ver costos (hist.)` en historial es lectura
  - `Editar cierre` o el cierre desde bandeja activa es la acción operativa
- mantener validación funcional:
  - precio sugerido editable sin sobreescribir margen objetivo y hint de margen calculado visible
  - confirmar que desmarcar una línea la excluye del egreso y del total real
- opcional: publicar también en `staging` si se quiere mantener ambos carriles alineados

## Qué no debe tocarse

- no desactivar la regla E2E: jamás usar `ieris-ltda`
- no cambiar seeds de categorías fuera del catálogo default

## Validaciones ya ejecutadas

- `deploy_backend_staging.sh` ejecutó 523 tests OK (2026-04-13)
- `deploy_backend_production.sh` ejecutó 523 tests OK (2026-04-13)
- frontend build OK para staging y production (2026-04-13)

## Bloqueos reales detectados

- ninguno técnico en `empresa-demo`; el gap actual es de UX/comprensión operativa

## Mi conclusión

- el puente `maintenance -> finance` sí está funcionando en producción para `empresa-demo`
- el problema reportado quedó explicado por la diferencia entre la vista histórica y el flujo real de cierre/sync
- el siguiente trabajo correcto es endurecer UX y seguir con el slice pendiente de ergonomía operativa
