# TaskOps Changelog

## 2026-04-24

- se abre y se cierra el módulo `taskops` como siguiente frente de expansión post-`crm`
- backend tenant nuevo en [backend/app/apps/tenant_modules/taskops](/home/felipe/platform_paas/backend/app/apps/tenant_modules/taskops)
- migración tenant nueva en [v0042_taskops_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0042_taskops_base.py)
- frontend tenant nuevo en [frontend/src/apps/tenant_portal/modules/taskops](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/taskops)
- el módulo ya queda operativo con:
  - `Resumen`
  - `Tareas`
  - `Kanban`
  - `Histórico`
- `taskops` ya soporta:
  - comentarios
  - adjuntos con descarga
  - trazabilidad de cambios de estado
  - referencias cruzadas a cliente, oportunidad, OT, usuario y grupo
- el módulo ya entra al catálogo contractual de módulos tenant como add-on `taskops`
- la plataforma ya expone:
  - dependencia técnica `taskops -> core`
  - labels visibles para el nuevo módulo
- validación runtime final:
  - backups tenant previos ejecutados antes de mutar `staging` y `production`
  - `staging` backend redeployado con `582 tests OK`, convergencia `processed=4, synced=4, failed=0`
  - `production` backend redeployado con `582 tests OK`, convergencia `processed=4, synced=4, failed=0`
  - `staging` frontend publicado con `TaskOpsOverviewPage-rlZhmAVt.js`, `TaskOpsHistoryPage-CcAehJVR.js`, `TaskOpsKanbanPage-ApSgXgqs.js`, `TaskOpsTasksPage-DgEFxY71.js`, `taskopsService-AREnSosS.js`, `TenantsPage-CyTcV9O4.js`, `SettingsPage-D_j7BFu8.js` e `index-CeKZzb_n.js`
  - `production` frontend publicado con `TaskOpsOverviewPage-rlZhmAVt.js`, `TaskOpsHistoryPage-CcAehJVR.js`, `TaskOpsKanbanPage-ApSgXgqs.js`, `TaskOpsTasksPage-DgEFxY71.js`, `taskopsService-AREnSosS.js`, `TenantsPage-CyTcV9O4.js`, `SettingsPage-D_j7BFu8.js` e `index-CeKZzb_n.js`
  - `check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias` en ambos carriles
- regresión ampliada en:
  - [test_taskops_services.py](/home/felipe/platform_paas/backend/app/tests/test_taskops_services.py)
  - [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
