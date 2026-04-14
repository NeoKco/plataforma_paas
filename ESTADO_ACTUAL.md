# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-14
- foco de iteración: promoción completa del slice `maintenance -> finance` para autollenado desde transacciones vinculadas y convergencia real por ambiente/tenant
- estado general: código endurecido en repo, slice nuevo desplegado en `staging` y `production`, y convergencia crítica cerrada en ambos ambientes para tenants activos; la regla de promoción completa ya quedó fijada como estándar obligatorio del PaaS

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
- `staging` también quedó verificado con convergencia real: los 4 tenants activos pasan la auditoría crítica tras rotar la credencial DB tenant de `condominio-demo`
- el slice nuevo de `maintenance -> finance` ya quedó promovido en ambos ambientes:
  - el modal de costeo reutiliza cuenta/categoría/moneda/fecha/glosa/notas desde las transacciones financieras ya vinculadas
  - al reabrir una OT ya sincronizada no vuelve a defaults ciegos del tenant, sino al snapshot real de Finanzas
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
  - `bootstrap-condominio-20260412002354`: OK
  - `bootstrap-empresa-20260412002354`: OK
  - `condominio-demo`: OK
  - `empresa-bootstrap`: OK
- `production` quedó re-convergido después de reparar `condominio-demo`:
  - `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=4, failed=0`
  - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- `condominio-demo` en `staging` fue reparado rotando credenciales DB tenant desde [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py), lo que dejó alineados:
  - password PostgreSQL del rol tenant
  - secreto runtime en `TENANT_SECRETS_FILE`
  - metadata de rotación en control
- `condominio-demo` en `production` también fue reparado rotando credenciales DB tenant desde el mismo servicio antes del rerun final de convergencia
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
- [backend/app/apps/tenant_modules/maintenance/services/costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py)
- [backend/app/apps/tenant_modules/maintenance/api/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/costing.py)
- [backend/app/apps/tenant_modules/maintenance/schemas/costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py)
- [backend/app/scripts/seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
- [backend/app/scripts/repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
- [backend/app/scripts/audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)
- [deploy/verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh)
- [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/historyService.ts)
- [frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts)
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
- seguir endureciendo la visibilidad de drift runtime vs repo para que futuras incidencias no dependan de investigación manual
- mantener republicación controlada del frontend cuando cambien bundles o contratos del payload para evitar errores de caché o shape inconsistente

## Qué no debe tocarse

- no usar `ieris-ltda` para E2E ni seeds de prueba
- no asumir que un tenant “hereda” reparaciones solo por compartir el mismo código
- no saltarse la auditoría post-deploy en cambios multi-tenant
- no declarar un cambio “cerrado para el PaaS” si solo fue verificado en un tenant o en un solo ambiente

## Validaciones ya ejecutadas

- backend targeted tests locales: `35 OK`
- backend targeted tests locales del slice nuevo: `12 OK`
- frontend build local: `OK`
- deploy backend `staging`: `OK`
- deploy backend `production`: `OK`
- publish frontend `staging`: `OK`
- publish frontend `production`: `OK`
- rerun convergencia `staging`:
  - `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=2, failed=0`
  - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- rerun convergencia `production`:
  - `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=4, failed=0`
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
