# HISTORIAL_ITERACIONES

## 2026-04-12 - Backfill defaults core/finance + cleanup E2E finance + fix Pendientes PK

- objetivo:
  - eliminar 500 en `Pendientes` por secuencias PK desfasadas
  - re-sembrar perfiles, tipos de tarea y categorías default en `ieris-ltda`
  - limpiar basura E2E en finanzas dentro de un tenant real
- cambios principales:
  - [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia `maintenance_due_items` y reintenta insert
  - [seed_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_tenant_defaults.py) agrega backfill core/finance por tenant
  - [cleanup_tenant_e2e_finance_data.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_tenant_e2e_finance_data.py) limpia residuos E2E en finanzas
  - docs: [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) y [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md) actualizados
- validaciones:
  - backend reiniciado en production y staging
  - seed defaults ejecutado en production para `ieris-ltda`
  - cleanup E2E finance ejecutado en production para `ieris-ltda` (45 transacciones)
- validaciones adicionales:
  - backfill masivo aplicado en production (`condominio-demo`, `empresa-bootstrap`, `empresa-demo`, `ieris-ltda`)

## 2026-04-12 - Familias obligatorias en categorías finance

- objetivo:
  - asegurar que todas las categorías default tengan familia (parent) por tipo
  - corregir el catálogo de `ieris-ltda` para que ninguna categoría quede sin familia
- cambios principales:
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) agrega familias `Ingresos`, `Egresos`, `Transferencias` y parent_name en seeds
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) asigna parent a categorías existentes sin familia
  - [repair_finance_category_families.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_category_families.py) repara tenants existentes
- validaciones:
  - `ieris-ltda`: reparación aplicada (`updated_categories=89`)
- bloqueos:
  - pendiente validar en UI que las familias aparecen correctamente
- siguiente paso:
  - abrir `finance/categories` en `ieris-ltda` y confirmar familia visible para todas las categorías

## 2026-04-12 - Reset catálogo finance a baseline default (ieris-ltda)

- objetivo:
  - limpiar categorías no default y dejar solo baseline por familias
- cambios principales:
  - [reset_finance_categories_to_defaults.py](/home/felipe/platform_paas/backend/app/scripts/reset_finance_categories_to_defaults.py) remapea transacciones/presupuestos y elimina categorías fuera de baseline
- validaciones:
  - `ieris-ltda`: `removed_categories=21`, `remapped_transactions=55`
- bloqueos:
  - pendiente confirmar en UI que el catálogo quedó limpio
- siguiente paso:
  - abrir `finance/categories` en `ieris-ltda` y validar

## 2026-04-12 - Regla E2E tenants permitidos

- objetivo:
  - proteger `ieris-ltda` de ejecuciones E2E
- cambios principales:
  - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md) fija que E2E solo use `empresa-bootstrap` y `empresa-demo`
  - [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) replica la regla
- validaciones:
  - no aplica
- bloqueos:
  - ninguno
- siguiente paso:
  - decidir si se agrega enforcement técnico en scripts E2E

## 2026-04-12 - Hotfix deprovision Permission denied runtime env

- objetivo:
  - permitir eliminar tenants aunque el runtime `.env` no sea escribible
- cambios principales:
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ahora ignora `PermissionError` al limpiar secrets runtime en deprovision
- validaciones:
  - backend reiniciado en production y staging
- bloqueos:
  - falta validar eliminación desde UI
- siguiente paso:
  - reintentar desprovision + delete del tenant con error
- bloqueos:
  - falta validar en UI que `Pendientes` carga sin 500
- siguiente paso:
  - abrir `/tenant-portal/maintenance/due-items` y confirmar que el error ya no aparece

## 2026-04-12 - Hotfix deprovision: omitir cleanup de `.env` legacy no escribible

- objetivo:
  - evitar que el deprovision falle por `Permission denied` al intentar escribir `/opt/platform_paas/.env`
- cambios principales:
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) salta el cleanup del `.env` legacy si no es escribible
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md) actualizado con el ajuste
-- validaciones:
  - deploy backend `staging` -> `523 tests OK`
  - deploy backend `production` -> `523 tests OK`
  - deploy backend `staging` (hash invalid fix) -> `523 tests OK`
  - deploy backend `production` (hash invalid fix) -> `523 tests OK`
  - cleanup `cleanup_e2e_tenants.py --apply --prefix e2e-` -> `2 deleted`
-- bloqueos:
  - ninguno
-- siguiente paso:
  - validar login tenant en UI para cerrar el hotfix

## 2026-04-12 - Hotfix login tenant: evitar 500 por sesión no instanciada

- objetivo:
  - evitar `500` en `/tenant/auth/login` cuando la sesión tenant falla antes de instanciarse
- cambios principales:
  - [auth_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/auth_routes.py) ahora protege el cierre de `tenant_db`
  - [password_service.py](/home/felipe/platform_paas/backend/app/common/security/password_service.py) trata hashes inválidos como credenciales inválidas
- validaciones:
  - deploy backend `staging` -> `523 tests OK`
  - deploy backend `production` -> `523 tests OK`
  - deploy backend `staging` (hash invalid fix) -> `523 tests OK`
  - deploy backend `production` (hash invalid fix) -> `523 tests OK`
  - cleanup `cleanup_e2e_tenants.py --apply --prefix debug-` -> `1 deleted`
- bloqueos:
  - pendiente confirmar en UI (sin `500`)
- siguiente paso:
  - probar login tenant con credenciales inválidas o tenant no provisionado

## 2026-04-12 - Acceso rápido portal tenant con contraseña temporal

- objetivo:
  - permitir abrir el portal tenant desde `Tenants` sin copiar manualmente la contraseña
- cambios principales:
  - `TenantsPage` guarda un prefill temporal en `sessionStorage` tras reset
  - `TenantLoginPage` aplica el prefill y lo limpia al abrir el portal
  - `USER_GUIDE` documenta el flujo y aclara que no se exponen contraseñas reales
- validaciones:
  - frontend publish `staging` -> `OK`
  - frontend publish `production` -> `OK`
- bloqueos:
  - falta validar UX en UI
- siguiente paso:
  - publicar frontend y validar UX

## 2026-04-12 - Segundo corte maintenance -> finance (glosa y fecha contable) abierto en repo

- objetivo:
  - abrir el segundo subcorte de llenado fino entre `maintenance` y `finance` sin tocar el contrato base
- cambios principales:
  - `finance-sync` acepta glosas editables (`income_description`, `expense_description`) y `transaction_at` opcional
  - `Costos y cobro` ahora muestra `Referencia OT` y permite ajustar fecha contable solo con toggle explícito
  - se agregan verificaciones de descripción y fecha contable en [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py)
  - documentación actualizada en `API_REFERENCE`, `DEV_GUIDE`, `CHANGELOG` y `ROADMAP`
- validaciones:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `11 tests OK`
  - smoke `tenant-portal-maintenance-finance-defaults` -> `1 passed` en `staging`
  - smoke `tenant-portal-maintenance-finance-defaults` -> `1 passed` en `production`
- bloqueos:
  - sin bloqueo técnico
- siguiente paso:
  - publicar backend + frontend en `staging` y ejecutar smoke antes de promover a `production`

## 2026-04-12 - Hotfix deprovision: tolerar `.env` legacy no legible

- objetivo:
  - evitar que el deprovision falle por `PermissionError` al leer `/opt/platform_paas/.env`
- cambios principales:
  - `tenant_secret_service` ignora `PermissionError` al leer `.env` legacy y continúa con `TENANT_SECRETS_FILE`
- validaciones:
  - backend redeploy en `production` y `staging` con `523 tests OK`
- siguiente paso:
  - reintentar deprovision desde UI y borrar tenant bloqueado

## 2026-04-12 - E2E cleanup y guard de seeds en producción

- objetivo:
  - evitar que los smokes dejen tenants basura en producción
- cambios principales:
  - `backend-control` bloquea seeds en producción salvo `E2E_ALLOW_PROD_SEED=1`
  - `seedPlatformTenantCatalogRecord` registra cleanup automático si `E2E_AUTO_CLEANUP=1`
  - `cleanupTenantCatalogRecord` intenta archivar, deprovisionar y eliminar tenant E2E
  - runbook y README E2E actualizados con las variables nuevas

## 2026-04-12 - Defaults efectivos maintenance -> finance cerrados en staging y production

- objetivo:
  - terminar de validar y promover el primer corte de defaults efectivos `maintenance -> finance`
- cambios principales:
  - se agrega el smoke [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts) como gate específico del slice
  - se actualizan [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md) y [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) para reflejar esa cobertura nueva
  - se detecta un falso negativo real de runtime en `staging`: [TENANT_PLAN_ENABLED_MODULES](/home/felipe/platform_paas/backend/app/common/config/settings.py) estaba sobreescrito en `/opt/platform_paas_staging/.env.staging` con una matriz vieja sin `maintenance`
  - se corrige ese env de `staging`, se redepliega backend y se recupera `empresa-bootstrap` como baseline tenant published válido para el smoke
  - el mismo corte se sincroniza y despliega en `production`
- validaciones:
  - `cd frontend && npx playwright test e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts --list` -> `OK`
  - `staging` smoke published -> `1 passed`
  - `production` smoke published -> `1 passed`
  - `deploy_backend_staging.sh` -> `523 tests OK`
  - `deploy_backend_production.sh` -> `523 tests OK`
  - `deploy/check_frontend_static_readiness.sh` -> `OK` en `staging` y `production`
- bloqueos:
  - sin bloqueo técnico
- siguiente paso:
  - abrir el segundo corte funcional `maintenance -> finance`, ahora sobre llenado fino operativo

## 2026-04-12 - Primer corte de defaults efectivos maintenance -> finance

- objetivo:
  - cerrar el primer corte de autollenado fino `maintenance -> finance` sin duplicar la integración base ya existente
- cambios principales:
  - se confirma que el puente operativo `maintenance -> finance` ya existía y que el gap real era de defaults/sugerencias
  - se agrega [finance_sync.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/finance_sync.py) con `GET /tenant/maintenance/finance-sync-defaults`
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) resuelve defaults efectivos de moneda, cuentas y categorías con prioridad de política tenant y fallbacks seguros
  - [MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx) y [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) pasan a consumir esa misma fuente de verdad
  - se actualiza documentación del módulo para fijar este contrato nuevo como fuente canónica de sugerencias
- validaciones:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `10 tests OK`
  - `cd backend && ... python -m py_compile ...maintenance/api/finance_sync.py ...maintenance/services/costing_service.py ...maintenance/schemas/costing.py` -> `OK`
  - `cd frontend && npm run build` -> `OK`
  - `cd /opt/platform_paas_staging && bash deploy/deploy_backend_staging.sh` -> `523 tests OK`, servicio activo y `healthcheck` OK
  - `cd /opt/platform_paas_staging && API_BASE_URL=http://192.168.7.42:8081 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
  - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente solo validación visual en `staging` antes de decidir promoción a `production`
- siguiente paso:
  - validar `Resumen técnico` y `Costos y cobro` en `staging`, y luego decidir promoción a `production`

## 2026-04-12 - Gobernanza de datos y SRED formalizados

- objetivo:
  - dejar una capa transversal explícita para ownership de datos, contratos entre módulos y criterio uniforme de cierre antes de abrir el siguiente slice `maintenance -> finance`
- cambios principales:
  - se agrega [data-governance.md](/home/felipe/platform_paas/docs/architecture/data-governance.md) como documento canónico de ownership, calidad mínima, seeds/defaults, archivo y portabilidad
  - se agrega [sred-development.md](/home/felipe/platform_paas/docs/architecture/sred-development.md) para formalizar el método `Spec`, `Rules`, `Evidence`, `Documentation`
  - se enlaza ese marco desde contexto raíz, reglas, checklist, prompt maestro, estándar modular y gobernanza de implementación
- validaciones:
  - revisión estructural de enlaces y precedencias documentales: `OK`
  - `HANDOFF_STATE.json` válido por `python3 -m json.tool`: `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente solo aplicar este marco al siguiente slice funcional
- siguiente paso:
  - abrir el autollenado fino `maintenance -> finance` usando `data-governance.md` y `sred-development.md` como marco obligatorio

## 2026-04-12 - Bootstrap contractual por módulos publicado y validado con tenants reales

- objetivo:
  - cerrar el rollout real del baseline contractual por módulos y validar que el bootstrap nuevo siembra correctamente catálogos y defaults de negocio/finanzas
- cambios principales:
  - backend desplegado en `staging` y `production` con el corte que separa `seed_defaults(...)` y permite backfill por cambio de plan
  - validación real en `staging` con tenants nuevos `bootstrap-empresa-20260412002354` y `bootstrap-condominio-20260412002354`
  - confirmación de `CLP` como moneda base efectiva, coexistencia de `Casa - ...` y `Empresa - ...`, perfiles funcionales default y tipos de tarea default
  - sincronización del estado vivo y documentación canónica para mover el foco al siguiente slice `maintenance -> finance`
- validaciones:
  - `deploy_backend_staging.sh` -> `523 tests ... OK`
  - `deploy_backend_production.sh` -> `523 tests ... OK`
  - `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed` en `staging`
  - `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed` en `production`
  - healthcheck `https://orkestia.ddns.net/health` -> `healthy`
- bloqueos:
  - sin bloqueo técnico
  - sólo queda por definir el alcance funcional del autollenado `maintenance -> finance`
- siguiente paso:
  - abrir el slice fino `maintenance -> finance` revisando primero qué parte del puente ya existe y qué parte falta realmente

## 2026-04-11 - Bootstrap contractual por módulos reforzado en repo

- objetivo:
  - endurecer el baseline tenant para que `core` y `finance` siembren por defecto la taxonomía y catálogos mínimos correctos
- cambios principales:
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) ahora separa `seed_defaults(...)` y lo reutiliza para provisioning inicial y backfill posterior
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) ahora siembra baseline mixto con `CLP`, categorías compartidas y familias clasificadas `Casa - ...` / `Empresa - ...`
  - [default_catalog_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py) agrega perfiles funcionales y tipos de tarea default con compatibilidad base
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ya backfillea esos defaults cuando un tenant activo gana `core` o `finance` por cambio de plan
  - se deja explícito en documentación que `maintenance -> finance` ya existe y el siguiente slice será de autollenado fino, no de integración base
- validaciones:
  - `python -m unittest app.tests.test_tenant_db_bootstrap_service app.tests.test_tenant_service_module_seed_backfill` -> `5 tests OK`
  - `python3 -m py_compile ...` sobre los archivos nuevos/modificados -> `OK`
- bloqueos:
  - no hay bloqueo técnico
  - el subcorte todavía no está validado visualmente en `staging`
- siguiente paso:
  - publicar este subcorte en `staging` y validar tenant nuevo con `core` antes de abrir el autollenado fino `maintenance -> finance`

## 2026-04-11 - Promoción a production del contrato maintenance y bootstrap financiero vertical

- objetivo:
  - terminar el rollout del corte contractual `maintenance` + bootstrap financiero por vertical publicándolo también en `production`
- cambios principales:
  - backend `production` desplegado en `/opt/platform_paas` con el mismo corte publicado antes en `staging`
  - frontend `production` reconstruido con `API_BASE_URL=https://orkestia.ddns.net` y publicado en `/opt/platform_paas/frontend/dist`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) validado en `production`
- validaciones:
  - backend production: `deploy_backend_production.sh` -> `523 tests ... OK`, `platform-paas-backend.service active`, post-deploy gate OK
  - frontend production: `deploy/check_frontend_static_readiness.sh` -> `OK`
  - `https://orkestia.ddns.net/health` -> `healthy`
  - smoke production: `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed`
- bloqueos:
  - sin bloqueo técnico
  - la validación visible del bootstrap vertical creando tenants nuevos sigue pendiente; no bloquea el siguiente slice funcional
- siguiente paso:
  - abrir el slice de llenado fino `maintenance -> finance`

## 2026-04-11 - Publicación en staging del contrato maintenance y bootstrap financiero vertical

- objetivo:
  - publicar en `staging` el corte donde `maintenance` pasa a ser módulo contractual independiente y el bootstrap financiero depende del tipo de tenant
- cambios principales:
  - backend `staging` desplegado usando explícitamente `/opt/platform_paas_staging/.env.staging`
  - frontend `staging` reconstruido con `API_BASE_URL=http://192.168.7.42:8081` y publicado en `/opt/platform_paas_staging/frontend/dist`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) validado en `staging`
  - se corrige en repo [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) para que el wrapper use `/opt/platform_paas_staging` por defecto y no el root de producción
- validaciones:
  - backend staging: `deploy_backend.sh` -> `523 tests ... OK`, `platform-paas-backend-staging.service active`, post-deploy gate OK
  - frontend staging: `deploy/check_frontend_static_readiness.sh` -> `OK`
  - smoke staging: `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed`
- bloqueos:
  - sin bloqueo técnico
  - la validación visible del bootstrap vertical creando tenants nuevos sigue pendiente; esa parte quedó cubierta por unit tests y no por smoke browser
- siguiente paso:
  - decidir si este corte se promueve a `production` o si se abre primero el slice `maintenance -> finance`

## 2026-04-11 - Contrato maintenance independiente y bootstrap financiero por vertical

- objetivo:
  - separar `maintenance` de `core` como módulo contractual real y dejar categorías financieras iniciales distintas por vertical de tenant
- cambios principales:
  - `maintenance` deja de heredar visibilidad y entitlement desde `core`; backend y `tenant_portal` lo leen ahora como módulo `maintenance`
  - `settings.py` y ejemplos de env ya reflejan una matriz base de planes donde `maintenance` y `finance` pueden variar por plan
  - el bootstrap tenant agrega [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) y siembra catálogo `empresa` o `condominio/hogar`
  - el bootstrap reemplaza el catálogo neutral solo cuando la DB aún no tiene uso financiero
  - se actualizan docs canónicas, E2E README y runbooks para reflejar el contrato nuevo y el seed vertical
- validaciones:
  - backend: `python -m unittest app.tests.test_platform_flow app.tests.test_tenant_flow app.tests.test_tenant_db_bootstrap_service` -> `OK`
  - frontend: `npm run build` -> `OK`
  - playwright: `tenant-portal-sidebar-modules.smoke.spec.ts --list` -> `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente decidir si este corte se publica ya a `staging/production`
- siguiente paso:
  - decidir rollout de este corte o abrir el siguiente slice de autollenado `maintenance -> finance`

## 2026-04-11 - Alineación estructural de E2E y árboles operativos

- objetivo:
  - dejar explícita en arquitectura la ubicación canónica de smokes E2E, helpers operativos y árboles `/opt/...`
- cambios principales:
  - [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md) ahora documenta `frontend/e2e/specs`, `frontend/e2e/support`, `frontend/e2e/README.md` y `scripts/dev/` como parte del contrato operativo
  - el mismo documento deja explícito el rol de `/opt/platform_paas` y `/opt/platform_paas_staging` como espejos de runtime y no como fuente primaria del proyecto
- validaciones:
  - revisión manual de la estructura actual del repo: OK
  - estructura documental alineada con el estado real del workspace y de los árboles operativos: OK
- bloqueos:
  - sin bloqueo técnico; fue una alineación documental de continuidad
- siguiente paso:
  - seguir fuera de `Provisioning/DLQ` y retomar el siguiente bloque central del roadmap

## 2026-04-11 - Cierre de etapa Provisioning DLQ broker-only

- objetivo:
  - cerrar formalmente `Provisioning/DLQ broker-only` como frente suficientemente endurecido para esta etapa
- cambios principales:
  - se saca DLQ del foco activo del handoff
  - se mueve la prioridad al siguiente bloque central fuera de DLQ
  - se actualizan estado, roadmap y handoff para evitar que otra sesión siga abriendo slices por inercia
- validaciones:
  - se reutiliza la validación funcional del último corte cerrado:
    - repo build OK
    - repo playwright `--list` OK
    - staging smoke `technical` OK
    - production `skipped_non_broker` coherente
- bloqueos:
  - sin bloqueo técnico
  - el motivo del cierre es de priorización: seguir profundizando DLQ ya entra en rendimiento decreciente
- siguiente paso:
  - volver al siguiente bloque central del roadmap fuera de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ tenant technical matrix validado y cierre de etapa

- objetivo:
  - cerrar el último slice broker-only útil de `Provisioning/DLQ` con una matriz visible `tenant + capa técnica` y luego dar por cerrado este frente para la etapa actual
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora expone la matriz `tenant + capa técnica` dentro del bloque broker-only de `Familias DLQ visibles`
  - la nueva capa cruza `tenant` con `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - la consola expone `Enfocar combinación` para aislar rápidamente un `tenant + capa técnica` sin revisar fila por fila
  - se agrega [platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target matrix`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target matrix` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no quedó bloqueo funcional
  - apareció una suposición incorrecta en el seed del smoke y quedó corregida antes del cierre
- siguiente paso:
  - sacar `Provisioning/DLQ` del foco activo y volver al siguiente bloque central del roadmap fuera de DLQ

## 2026-04-11 - Provisioning DLQ technical diagnosis validado

- objetivo:
  - cerrar el slice broker-only `Diagnóstico DLQ / BD visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora clasifica el subconjunto visible entre `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - la UI resume filas visibles, tenants afectados y código dominante por capa técnica
  - la consola expone la acción `Enfocar código dominante`
  - se agrega [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target technical`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos dos detalles reales: `tone` tipado como string genérico y un seed E2E que no garantizaba una capa dominante estable
- siguiente paso:
  - decidir si el próximo corte de `Provisioning/DLQ` será una matriz visible `tenant + capa técnica` o si conviene cerrar pronto este frente y pasar al siguiente bloque del roadmap central

## 2026-04-11 - Provisioning DLQ tenant focus validado

- objetivo:
  - cerrar el slice broker-only `Prioridad por tenant visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora resume tenants visibles por filas, familias y tipos de job
  - la UI recomienda cuándo conviene aislar un tenant visible antes de operar familias
  - se agrega [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target tenant-focus`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - apareció una nulabilidad TypeScript en el render del tenant activo y quedó corregida antes del publish
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ family recommendation validado

- objetivo:
  - cerrar el slice broker-only `Plan operativo sugerido` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora recomienda operativamente cuándo conviene `focus single`, `requeue family`, `family-batch` o limpiar selección
  - se agrega [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target family-recommendation`
  - el smoke se endurece para no exceder el límite real `varchar(100)` de `provisioning_jobs.error_code`
  - el release de `staging` vuelve a quedar alineado con `API_BASE_URL=http://192.168.7.42:8081` después de detectar un publish incorrecto hacia `8100`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos un bug de seed E2E por longitud de `error_code` y un publish erróneo de `staging`
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

## 2026-04-10 - Hotfix visual catálogo Tenants

- objetivo:
  - corregir el overflow visual del catálogo izquierdo en `platform-admin > Tenants`
- cambios principales:
  - [platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css) ahora fuerza contención del grid, `min-width: 0`, ancho máximo del item y wrap seguro para títulos/metadatos largos
  - el catálogo ya no se sale del cuadro central cuando aparecen tenants con slugs extensos
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - `production`: frontend publicado con la corrección
  - `staging`: frontend publicado con la corrección
- bloqueos:
  - sin bloqueo adicional; era un bug visual de layout
- siguiente paso:
  - seguir con el roadmap central sobre `Provisioning/DLQ`
