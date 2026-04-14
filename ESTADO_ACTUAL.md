# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-14
- foco de iteración: endurecer el cierre `maintenance -> finance` para que el `PATCH /status` aplique la configuración financiera elegida en el modal y corregir el drift repo/runtime del slice completo
- estado general: `production` y `staging` quedaron alineados otra vez para el slice `maintenance -> finance`, con convergencia activa `4/4` en ambos ambientes; además quedó explícito como regla que un cambio correcto debe promoverse, convergerse, auditarse y documentarse en todos los ambientes/tenants afectados

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
- desde este corte queda explícito que un cambio declarado correcto no se cierra si solo funciona en un tenant o en un ambiente:
  - debe promocionarse al runtime afectado
  - debe converger tenants activos afectados
  - debe validarse con pruebas proporcionales
  - debe documentarse en la memoria viva del repo
- `empresa-demo` funcionó antes que `ieris-ltda` porque ya había sido reparado/backfilleado; `ieris-ltda` seguía con drift técnico en su BD tenant
- la causa técnica concreta detectada en `ieris-ltda` fue colisión de secuencia `finance_transactions_pkey`, lo que impedía insertar movimientos sincronizados desde Mantenciones
- `production` ya quedó verificado con convergencia real: los 4 tenants activos pasan la auditoría crítica
- `staging` volvió a quedar verificado con convergencia real: los 4 tenants activos pasan la auditoría crítica tras reparar credenciales DB tenant de `condominio-demo` e `ieris-ltda`
- el slice nuevo de `maintenance -> finance` ya quedó promovido en ambos ambientes:
  - el modal de costeo reutiliza cuenta/categoría/moneda/fecha/glosa/notas desde las transacciones financieras ya vinculadas
  - al reabrir una OT ya sincronizada no vuelve a defaults ciegos del tenant, sino al snapshot real de Finanzas
  - `Cerrar con costos` ahora envía la configuración financiera elegida dentro del mismo `PATCH /status`, evitando que el cierre dependa de defaults ciegos o de un segundo request separado
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
- [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) ahora incluye snapshots de `income/expense` vinculados al devolver el detalle de costeo real
- [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/costing.py) serializa snapshots financieros vinculados para consumo del frontend
- [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) ya reutiliza cuenta/categoría/moneda/fecha/glosa/notas desde la transacción financiera vinculada cuando existe
  - además, al cerrar la OT desde el mismo modal, ahora envía la configuración financiera elegida dentro del mismo `PATCH /status`, para que el balance por cuenta y la categoría nazcan correctamente en Finanzas
- [work_order_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/work_order_service.py) ahora prioriza `payload.finance_sync` al completar una OT y solo cae al auto-sync por política si el cierre no trae configuración financiera explícita
- [common.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/common.py) extiende `MaintenanceStatusUpdateRequest` con `finance_sync`
- [workOrdersService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/workOrdersService.ts) soporta `finance_sync` en `PATCH /status`
- [repair_maintenance_finance_dimensions.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_dimensions.py) fue reejecutado en ambos ambientes para completar cuentas/categorías faltantes en transacciones históricas de mantenciones
- la regla de promoción completa quedó escrita en:
  - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md)
  - [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md)
  - [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- el gate post-deploy quedó no-bloqueante por defecto para convergencia (`BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=false`), de modo que un tenant roto no tumbe un servicio sano
- `production` quedó verificado con auditoría crítica en tenants activos:
  - `condominio-demo`: OK
  - `empresa-bootstrap`: OK
  - `empresa-demo`: OK
  - `ieris-ltda`: OK
- `staging` quedó verificado con auditoría crítica en tenants activos:
  - `condominio-demo`: OK
  - `empresa-bootstrap`: OK
  - `empresa-demo`: OK
  - `ieris-ltda`: OK
- `production` quedó re-convergido después de reparar `condominio-demo`:
  - `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=4, failed=0`
  - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- `condominio-demo` en `staging` fue reparado rotando credenciales DB tenant desde [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py), lo que dejó alineados:
  - password PostgreSQL del rol tenant
  - secreto runtime en `TENANT_SECRETS_FILE`
  - metadata de rotación en control
- `ieris-ltda` en `staging` fue reparado creando y validando el secreto DB runtime que faltaba, quedando otra vez auditable junto al resto de tenants activos
- `condominio-demo` en `production` también fue reparado rotando credenciales DB tenant desde el mismo servicio antes del rerun final de convergencia
- validación directa en `production` para `ieris-ltda`:
  - defaults efectivos: ingreso `account_id=1`, egreso `account_id=1`, categorías `39/40`
  - existen ingresos/egresos sincronizados desde mantenciones cerradas
  - ejemplo real: OT `#7` -> ingreso `#204`, egreso `#205`, ambos con `account_id=1`

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
- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/apps/tenant_modules/maintenance/services/work_order_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/work_order_service.py)
- [backend/app/apps/tenant_modules/maintenance/api/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/costing.py)
- [backend/app/apps/tenant_modules/maintenance/api/history.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/history.py)
- [backend/app/apps/tenant_modules/maintenance/services/history_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/history_service.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/common.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/common.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/history.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/history.py)
- [backend/app/scripts/repair_maintenance_finance_dimensions.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_dimensions.py)
- [backend/app/scripts/seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
- [backend/app/scripts/repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
- [backend/app/scripts/audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)
- [deploy/verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/workOrdersService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/workOrdersService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx)
- [docs/deploy/backend-post-deploy-verification.md](/home/felipe/platform_paas/docs/deploy/backend-post-deploy-verification.md)
- [docs/deploy/backend-release-and-rollback.md](/home/felipe/platform_paas/docs/deploy/backend-release-and-rollback.md)

## Qué decisiones quedaron cerradas

- editar el repo no equivale a tener el cambio activo en `staging` o `production`
- todo cambio backend que afecte tenants debe pasar por deploy y convergencia post-deploy
- el criterio correcto de consistencia es por ambiente y por tenant, no por “el código compila”
- la reparación tenant-local debe existir en runtime para secuencias financieras y no depender de intervención manual
- la auditoría activa por tenant pasa a ser la capa visible para detectar drift real después de cada release

## Qué falta exactamente

- mantener la disciplina operativa como estándar permanente:
  - test local
  - deploy `staging`
  - convergencia
  - auditoría
  - promoción a `production`
- seguir afinando el slice `maintenance -> finance` ya sobre una base convergida, especialmente:
  - hints/UX de selección de egreso
  - navegación directa desde Mantenciones a la transacción exacta en Finanzas
  - estrategia explícita para corregir transacciones históricas que quedaron creadas antes del fix con `account/category = null`
- seguir endureciendo la visibilidad de drift runtime vs repo para que futuras incidencias no dependan de investigación manual
- mantener republicación controlada del frontend cuando cambien bundles o contratos del payload para evitar errores de caché o shape inconsistente

## Qué no debe tocarse

- no usar `ieris-ltda` para E2E ni seeds de prueba
- no asumir que un tenant “hereda” reparaciones solo por compartir el mismo código
- no saltarse la auditoría post-deploy en cambios multi-tenant
- no declarar un cambio “cerrado para el PaaS” si solo fue verificado en un tenant o en un solo ambiente

## Validaciones ya ejecutadas

- backend focalizado:
  - `test_maintenance_work_order_service` + `test_maintenance_costing_service`: `35 OK`
- frontend build local: `OK`
- republish frontend `staging` con fix de `Cerrar con costos`: `OK`
- republish frontend `production` con fix de `Cerrar con costos`: `OK`
- promoción manual del slice backend `maintenance` a `/opt/platform_paas` y `/opt/platform_paas_staging`: `OK`
- publish frontend `staging`: `OK`
- publish frontend `production`: `OK`
- `repair_maintenance_finance_dimensions.py --all-active --limit 100 --apply`
  - `production`: `processed=4, updated=0, failed=0`
  - `staging`: `processed=4, updated=0, failed=0`
- rerun convergencia `staging`:
  - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- rerun convergencia `production`:
  - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- auditoría activa directa en `production`: `processed=4, warnings=0, failed=0`
- auditoría activa directa en `staging`: `processed=4, warnings=0, failed=0`

## Bloqueos reales detectados

- no hay bloqueo crítico abierto en la convergencia activa de `staging` ni `production`
- sigue vigente el riesgo estructural conocido:
  - cambios correctos en repo no se replican solos al runtime
  - tenants distintos pueden divergir si no se corre convergencia post-deploy

## Mi conclusión

- el comportamiento distinto entre `empresa-demo` e `ieris-ltda` no se debía a que la mejora fuese “solo para un tenant”
- se debía a drift entre runtime y estado técnico tenant-local
- la corrección estructural ya quedó definida:
  - deploy por ambiente
  - convergencia post-deploy
  - auditoría activa por tenant
- el slice nuevo de autollenado desde transacciones vinculadas también quedó promovido bajo esa misma regla
- además, desde ahora la regla queda escrita: cuando un cambio se declara correcto para la PaaS, debe quedar promovido, convergido, probado y documentado en todos los ambientes/tenants afectados
- con eso se evita repetir el patrón de “funciona en un tenant, no en otro” sin visibilidad operativa
