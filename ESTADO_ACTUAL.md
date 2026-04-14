# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-13
- foco de iteración: convergencia real por ambiente y tenant para evitar drift entre `development`, `staging` y `production`
- estado general: código endurecido en repo, backend convergido y auditado en `production`; falta saneamiento puntual de credenciales/runtime en algunos tenants de `staging`

## Resumen ejecutivo en 30 segundos

- un cambio en `/home/felipe/platform_paas` no existe por sí solo en `staging` ni en `production`
- los runtimes reales viven en:
  - `staging`: `/opt/platform_paas_staging`
  - `production`: `/opt/platform_paas`
- además del deploy de código, cada ambiente necesita convergencia post-deploy sobre tenants activos:
  - sync de schema tenant
  - seed de defaults faltantes
  - reparación `maintenance -> finance`
  - auditoría activa por tenant
- `empresa-demo` funcionó antes que `ieris-ltda` porque ya había sido reparado/backfilleado; `ieris-ltda` seguía con drift técnico en su BD tenant
- la causa técnica concreta detectada en `ieris-ltda` fue colisión de secuencia `finance_transactions_pkey`, lo que impedía insertar movimientos sincronizados desde Mantenciones
- `production` ya quedó verificado con convergencia real: los 4 tenants activos pasan la auditoría crítica
- frontend runtime verificado en ambos ambientes con bundles nuevos:
  - `MaintenanceHistoryPage-CdHJKpQP.js`
  - `MaintenanceInstallationsPage-CjIp0KB9.js`
  - `MaintenanceReportsPage-B4R_FsLR.js`

## Qué ya quedó hecho

- [transaction_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/repositories/transaction_repository.py) repara automáticamente la secuencia `finance_transactions` cuando detecta colisión PK
- [transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py) aplica la misma autocorrección en `stage_system_transaction`, que es la ruta real usada por `maintenance -> finance`
- [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py) ahora:
  - procesa solo tenants `active` por defecto
  - no aborta toda la corrida si un tenant falla
  - devuelve resumen `processed/changed/failed`
- [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py) ahora opera solo sobre tenants `active` por defecto en barridos masivos
- [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) nuevo:
  - audita política efectiva `maintenance -> finance`
  - detecta OT completadas con costo/cobro sin sync financiero
  - valida forma del payload de historial (`finance_summary`)
  - deja visibles los tenants con drift crítico después del deploy
- [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ahora ejecuta, por defecto:
  - sync de schema tenant
  - seed de defaults faltantes
  - reparación `maintenance -> finance`
  - auditoría activa por tenant
- el gate post-deploy quedó no-bloqueante por defecto para convergencia (`BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=false`), de modo que un tenant roto no tumbe un servicio sano
- `production` quedó verificado con auditoría crítica en tenants activos:
  - `condominio-demo`: OK
  - `empresa-bootstrap`: OK
  - `empresa-demo`: OK
  - `ieris-ltda`: OK
- validación directa en `production` para `ieris-ltda`:
  - política efectiva: `auto_on_close`
  - existen ingresos/egresos sincronizados desde mantenciones cerradas
  - ejemplo real: OT `#2` -> ingreso `#202`, egreso `#203`

## Qué explica la diferencia entre `empresa-demo` e `ieris-ltda`

- no era un problema de “la mejora se aplicó solo a un tenant”
- era una mezcla de dos capas distintas:
  - código desplegado por ambiente
  - estado técnico local de cada tenant
- `empresa-demo` ya venía con:
  - política válida
  - datos convergidos
  - secuencias sanas
- `ieris-ltda` todavía arrastraba drift en su BD tenant, por eso la misma funcionalidad no se comportaba igual

## Qué archivos se tocaron en este corte

- [backend/app/apps/tenant_modules/finance/repositories/transaction_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/repositories/transaction_repository.py)
- [backend/app/apps/tenant_modules/finance/services/transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py)
- [backend/app/scripts/seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
- [backend/app/scripts/repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
- [backend/app/scripts/audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)
- [deploy/verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts)
- [docs/deploy/backend-post-deploy-verification.md](/home/felipe/platform_paas/docs/deploy/backend-post-deploy-verification.md)
- [docs/deploy/backend-release-and-rollback.md](/home/felipe/platform_paas/docs/deploy/backend-release-and-rollback.md)

## Qué decisiones quedaron cerradas

- editar el repo no equivale a tener el cambio activo en `staging` o `production`
- todo cambio backend que afecte tenants debe pasar por deploy y convergencia post-deploy
- el criterio correcto de consistencia es por ambiente y por tenant, no por “el código compila”
- la reparación tenant-local debe existir en runtime para secuencias financieras y no depender de intervención manual
- la auditoría activa por tenant pasa a ser la capa visible para detectar drift real después de cada release

## Qué falta exactamente

- en `staging` todavía hay drift técnico en algunos tenants:
  - `condominio-demo`: credenciales DB tenant inválidas
  - `ieris-ltda`: password DB tenant no configurada en el runtime de `staging`
- republicar frontend cuando el bundle publicado quede atrasado respecto del repo, para evitar errores como `finance_summary undefined`
- mantener la disciplina operativa:
  - test local
  - deploy `staging`
  - convergencia
  - auditoría
  - promoción a `production`

## Qué no debe tocarse

- no usar `ieris-ltda` para E2E ni seeds de prueba
- no asumir que un tenant “hereda” reparaciones solo por compartir el mismo código
- no saltarse la auditoría post-deploy en cambios multi-tenant

## Validaciones ya ejecutadas

- backend targeted tests locales: `35 OK`
- frontend build local: `OK`
- deploy backend `staging`: `OK` con warnings de runtime tenant en algunos slugs
- deploy backend `production`: `OK`
- publish frontend `staging`: `OK`
- publish frontend `production`: `OK`
- auditoría activa directa en `production`: `processed=4, warnings=0, failed=0`

## Bloqueos reales detectados

- `staging` todavía no representa a todos los tenants reales porque:
  - `condominio-demo` falla autenticación DB
  - `ieris-ltda` no tiene password tenant configurada en ese runtime

## Mi conclusión

- el comportamiento distinto entre `empresa-demo` e `ieris-ltda` no se debía a que la mejora fuese “solo para un tenant”
- se debía a drift entre runtime y estado técnico tenant-local
- la corrección estructural ya quedó definida:
  - deploy por ambiente
  - convergencia post-deploy
  - auditoría activa por tenant
- con eso se evita repetir el patrón de “funciona en un tenant, no en otro” sin visibilidad operativa
