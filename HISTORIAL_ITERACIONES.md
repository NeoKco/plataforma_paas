# HISTORIAL_ITERACIONES

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
