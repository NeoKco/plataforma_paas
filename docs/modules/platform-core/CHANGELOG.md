# Platform Core Changelog

## 2026-04-11

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega la capa broker-only `Diagnóstico DLQ / BD visible` dentro de `Familias DLQ visibles`:
  - clasifica el subconjunto visible entre `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - resume filas visibles, tenants afectados y código dominante por capa técnica
  - expone acción directa `Enfocar código dominante`
- se agrega el smoke [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) agrega el target `technical`
- durante la validación real aparecieron y quedaron resueltos dos hallazgos operativos:
  - el `tone` del badge técnico quedó inicialmente tipado como `string` genérico y rompía `build`
  - el smoke nuevo asumía una dominancia técnica inestable y hubo que endurecer el seed para que `tenant-schema` dominara de forma inequívoca
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped` por backend no `broker`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega la capa broker-only `Prioridad por tenant visible` dentro de `Familias DLQ visibles`:
  - resume tenants visibles por filas, familias y tipos de job
  - recomienda cuándo conviene aislar un tenant antes de operar familias
  - expone acción directa `Enfocar tenant`
- se agrega el smoke [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) agrega el target `tenant-focus`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped` por backend no `broker`
- hallazgo operativo del cierre:
  - el render del tenant activo quedó endurecido para no romper `build` por nullability al comparar contra `dlqTenantSlug`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega el bloque broker-only `Plan operativo sugerido` dentro de `Familias DLQ visibles`:
  - sin selección, pide elegir una familia visible
  - con una familia de una sola fila, recomienda `Enfocar fila`
  - con una familia multi-fila, recomienda `Reencolar familia`
  - con varias familias homogéneas, recomienda `Reencolar batch`
  - con selección mixta, recomienda `Limpiar selección`
- las tarjetas de familia ahora muestran además una lectura corta de `Acción sugerida`
- se agrega el smoke [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) agrega el target `family-recommendation`
- durante la validación real aparecieron y quedaron resueltos dos hallazgos operativos:
  - el seed E2E excedía el límite real `varchar(100)` de `provisioning_jobs.error_code`
  - `staging` fue republicado accidentalmente con un build genérico apuntando a `http://192.168.7.42:8100`; se corrigió rehaciendo el build por entorno con `deploy/build_frontend.sh`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped` por backend no `broker`

## 2026-04-10

- se corrige el layout del catálogo en [platform-admin > Tenants](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) desde [platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css):
  - la columna izquierda ya no se expande por slugs largos o nombres efímeros
  - las tarjetas del catálogo quedan contenidas dentro del panel y del grid central
  - el texto de título/meta ahora corta y envuelve sin empujar el detalle derecho
- validación cerrada:
  - repo: `cd frontend && npm run build` OK
  - `production`: frontend publicado con la corrección CSS
  - `staging`: frontend publicado con la corrección CSS

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega el batch broker-only sobre múltiples `Familias DLQ visibles`:
  - cada tarjeta visible ahora puede entrar en una selección explícita
  - el resumen `Batch homogéneo por familias visibles` valida `tenant + job_type`
  - la acción `Reencolar selección` exige al menos `2` familias homogéneas y ejecuta requeue secuencial por familia
- se agrega el smoke [platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) agrega el target `family-batch`
- durante el cierre apareció y quedó resuelto un problema real de release:
  - `staging` había sido republicado con un build genérico apuntando al API incorrecto; el deploy correcto vuelve a exigir `build por entorno + publish por entorno`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-batch` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped` por backend no `broker`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega la acción broker-only `Reencolar familia` dentro de `Familias DLQ visibles`:
  - permite devolver a cola una familia homogénea del subconjunto visible sin pasar antes por `Enfocar familia`
  - reutiliza el contrato backend DLQ ya cerrado con `tenant_slug + job_type + error_code/error_contains`
- se agrega el smoke [platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts)
- durante la validación real aparecieron y quedaron cerrados tres hallazgos operativos del smoke:
  - el tenant efímero del escenario debía crearse en el mismo backend publicado del helper E2E, no por UI contra un entorno potencialmente desalineado
  - el helper [backend-control.ts](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) no debía asumir `planCode="anual"` por defecto
  - la aserción del diálogo debía fijar la redacción real `Filas visibles de la familia`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-requeue` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped` por backend no `broker`
- hallazgo operativo del cierre:
  - los smokes published broker-only deben crear el estado efímero en el mismo backend publicado del entorno objetivo; si mezclan UI y seeds entre árboles distintos, el fallo ya no es de producto sino de wiring E2E

- se agrega el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) para encapsular la validación published broker-only de `Provisioning/DLQ` sobre `staging`:
  - copia el env real del servicio a `/tmp/platform_paas_staging.env`
  - valida que `staging` siga corriendo con `dispatch backend = broker`
  - exporta `E2E_BASE_URL`, `E2E_BACKEND_ROOT`, `E2E_BACKEND_PYTHON` y `E2E_BACKEND_ENV_FILE`
  - ejecuta el target broker-only pedido (`batch`, `row`, `filters`, `guided`, `family` o `all`)
- validación cerrada del helper:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --help` OK
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family`: `1 passed`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega el subfrente broker-only `familias DLQ visibles` dentro de `Operación DLQ`:
  - agrupa el subconjunto broker visible por `tenant + job_type + error`
  - expone tarjetas operativas con conteo, último registro y acción `Enfocar familia`
  - exporta esas familias también dentro del snapshot JSON del workspace de `Provisioning`
- el mismo corte corrige una regresión real en `Provisioning`: la sincronización `URL -> filtros locales` ya no debe vaciar `dlqTenantSlug` ni otros filtros broker-only cuando una acción in-page como `Enfocar familia` cambia el estado local antes de que la URL se actualice
- se agrega el smoke [platform-admin-provisioning-dlq-family-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts) para fijar el flujo browser `familia DLQ visible -> Enfocar familia -> filtros coherentes`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts --list` OK
  - `staging`: frontend publicado + smoke nuevo `1 passed`
  - `production`: frontend publicado + smoke nuevo `1 skipped` por backend `database/non-broker`
- hallazgo operativo del cierre:
  - los smokes broker-only publicados no deben sembrar contra el backend del repo local por defecto; cuando apuntan a `staging` o `production`, deben usar `E2E_BACKEND_ROOT`, `E2E_BACKEND_PYTHON` y, si aplica, `E2E_BACKEND_ENV_FILE`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) profundiza el corte `DLQ broker-only` para que la propia superficie `Operación DLQ` se alinee al backend activo del entorno:
  - en `broker`, mantiene visibles filtros DLQ, reencolado en lote, requeue guiado y acciones por fila
  - en `database`, reemplaza esas acciones por un estado broker-only no activo y deriva la operación al entorno correcto
- se agrega el smoke [platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts) para fijar ese gating visible en `staging` y `production`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts --list` OK
  - `staging`: frontend publicado + smoke nuevo `1 passed`
  - `production`: frontend publicado + smoke nuevo `1 passed`
- hallazgo operativo del cierre:
  - una vez visible el `dispatch backend` activo, la consola también debe retirar o reemplazar acciones broker-only en entornos `database`; no basta con un aviso global si el panel local sigue sugiriendo acciones que ahí no aplican

- [platform_capability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/platform_capability_service.py) y [schemas.py](/home/felipe/platform_paas/backend/app/apps/platform_control/schemas.py) ahora exponen `current_provisioning_dispatch_backend` dentro del catálogo de capacidades de `platform_control`
- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega la tarjeta `Capacidad activa de provisioning`, que deja visible:
  - backend actual `broker` o `database`
  - backends soportados
  - lectura operativa explícita de si el entorno puede o no ejecutar recorridos DLQ broker-only
- se agrega el smoke [platform-admin-provisioning-dispatch-capability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts) para fijar esa capacidad visible tanto en `staging` como en `production`
- validación cerrada de este corte:
  - repo: backend unit específico OK
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts --list` OK
  - `staging`: backend desplegado, frontend publicado y smoke nuevo `1 passed`
  - `production`: backend desplegado, frontend publicado y smoke nuevo `1 passed`
- hallazgo operativo del cierre:
  - la decisión de si un smoke DLQ broker-only corresponde o no ya no debería inferirse desde fuera; la propia consola `Provisioning` expone esa capacidad activa y la deja verificable por browser

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega el subfrente de `requeue guiado` dentro de `Operación DLQ`:
  - resumen visible del subconjunto DLQ actual
  - recomendación operativa entre requeue individual, batch o afinación previa de filtros
  - acción `Guiar requeue` por fila para acotar tenant, tipo de job y error antes de reintentar
  - CTA visible `Reencolar job sugerido` o `Reencolar lote sugerido` reutilizando los contratos backend ya cerrados
- se agrega el smoke [platform-admin-provisioning-guided-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts) para fijar el flujo browser `fila DLQ -> guiar requeue -> confirmación -> requeue individual`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts --list` OK
  - `staging`: frontend publicado + smoke nuevo `1 passed`
  - `production`: frontend publicado; el smoke broker-only quedó `skipped` porque el dispatch backend actual del host no resuelve como `broker`
- hallazgo operativo del cierre:
  - cuando el smoke nuevo depende de DLQ real del broker, la validación publicada canónica debe hacerse en un entorno cuyo `PROVISIONING_DISPATCH_BACKEND` sea efectivamente `broker`; si `production` opera con otro backend, el publish sigue siendo válido pero el smoke debe registrarse como `skipped`, no como `passed`

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) suma el subfrente de `observabilidad visible`, mostrando filtros y tablas de:
  - snapshots recientes por tenant
  - historial de alertas operativas persistidas
  - reutilizando el foco tenant actual de `Provisioning`
- [platform-api.ts](/home/felipe/platform_paas/frontend/src/services/platform-api.ts) y [types.ts](/home/felipe/platform_paas/frontend/src/types.ts) exponen los contratos frontend para `metrics/history` y `alerts/history`
- [backend-control.ts](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) acepta ahora `E2E_BACKEND_ENV_FILE`, útil para sembrar datos browser contra árboles publicados como `/opt/platform_paas_staging` o `/opt/platform_paas`
- se agrega el smoke [platform-admin-provisioning-observability-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-history.smoke.spec.ts) para fijar la lectura visible de snapshots recientes + historial de alertas en `Provisioning`
- validación cerrada de este corte:
  - repo: `npm run build` OK
  - repo: `npx playwright test e2e/specs/platform-admin-provisioning-observability-history.smoke.spec.ts --list` OK
  - `staging`: frontend publicado + smoke nuevo `1 passed`
  - `production`: frontend publicado + smoke nuevo `1 passed`
- hallazgo operativo del cierre:
  - cuando el árbol publicado protege su `.env` real, el smoke browser debe usar `E2E_BACKEND_ENV_FILE` apuntando a una copia temporal legible, por ejemplo en `/tmp`, para que `backend-control` siembre sobre el backend correcto sin depender de lectura directa sobre `/opt/.../.env*`

- la portabilidad tenant deja de ofrecer un solo scope operativo y ahora soporta dos modos visibles en [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) y [TenantOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/pages/overview/TenantOverviewPage.tsx):
  - `portable_full`
  - `functional_data_only`
- [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py) se generaliza para exportar e importar ambos scopes, manteniendo `portable_minimum` solo como compatibilidad de import para paquetes heredados
- [tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/tenant_routes.py) y [schemas.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/schemas.py) exponen ahora jobs de export/import portable también desde `tenant_portal`, restringidos a admin tenant
- se agregan contratos frontend tenant-side en [tenant-api.ts](/home/felipe/platform_paas/frontend/src/services/tenant-api.ts) y [types.ts](/home/felipe/platform_paas/frontend/src/types.ts) para crear, listar, descargar e importar paquetes portables desde el propio tenant
- se amplía el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) para fijar el modo `functional_data_only`
- se agrega el smoke [tenant-portal-data-portability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-data-portability.smoke.spec.ts) para cubrir export + download + dry_run desde `tenant_portal`
- validación cerrada en repo para este corte:
  - backend `unittest`: `294 OK`
  - frontend `npm run build`: OK
  - `npx playwright test --list`: OK (`44 tests`)
- estado de despliegue de este corte:
  - `repo`: actualizado y validado
  - `staging`: backend desplegado, frontend publicado y smokes `platform_admin` + `tenant_portal` aprobados
  - `production`: backend desplegado, frontend publicado y smokes `platform_admin` + `tenant_portal` aprobados
- evidencia operativa de deploy backend:
  - `staging`: `/opt/platform_paas_staging/operational_evidence/backend_operational_evidence_20260410_131857.log`
  - `production`: `/opt/platform_paas/operational_evidence/backend_operational_evidence_20260410_132248.log`
- hallazgo operativo del cierre:
  - en este entorno de agente, el smoke browser tenant-side puede fallar al lanzar Chromium dentro del sandbox con `SIGTRAP`; la reejecución fuera de sandbox dejó ambos entornos verdes sin cambios funcionales adicionales

# 2026-04-10

- hotfix de portabilidad tenant: [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py) amplía `PORTABLE_FULL_TABLES` y `FUNCTIONAL_DATA_ONLY_TABLES` para incluir tablas de soporte con FK reales:
  - `maintenance_equipment_types`
  - `finance_beneficiaries`
  - `finance_people`
  - `finance_projects`
- el import portable `skip_existing` deja además de depender solo de PK y pasa a omitir también filas que ya existen por constraints únicos simples o compuestos, evitando fallos reales como `uq_finance_categories_name_type`
- se agrega cobertura de regresión en [test_tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_data_portability_service.py) para impedir que esos catálogos vuelvan a quedar fuera del contrato portable
- origen del hotfix: un import real `empresa-demo -> ieris-ltda` con `functional_data_only` falló en `apply` porque `maintenance_installations.equipment_type_id` referenciaba `maintenance_equipment_types` fuera del paquete; el mismo análisis detectó además referencias de `finance_transactions` hacia `finance_beneficiaries`, `finance_people` y `finance_projects`

## 2026-04-09

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega la acción visible `Investigar en DLQ` dentro de `Fallos por código` y `Alertas activas`, precargando filtros DLQ, enfocando el tenant asociado y desplazando la lectura hacia el panel operativo correspondiente
- [action-feedback.ts](/home/felipe/platform_paas/frontend/src/utils/action-feedback.ts) suma el scope `focus-dlq` para que esa navegación asistida deje confirmación visible en la misma consola
- [backend-control.ts](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) deja de asumir siempre el backend del repo local y ahora acepta `E2E_BACKEND_ROOT` + `E2E_BACKEND_PYTHON`, útil para seeds browser sobre `staging` o `production`
- se agrega el smoke [platform-admin-provisioning-dlq-investigation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-investigation.smoke.spec.ts) para fijar la navegación asistida desde `Fallos por código` hacia filtros DLQ
- este corte queda validado en `repo` con `npm run build` y `npx playwright test --list`, validado en `staging` con el smoke específico y ya publicado en `production`
- el cierre operativo del smoke publicado exigió usar el env real del servicio `staging` (`/opt/platform_paas_staging/.env.staging`) en vez de `/opt/platform_paas_staging/.env`; eso ya queda documentado para evitar seeds falsamente verdes contra el backend equivocado
- después de publicar el frontend en `production`, se revalida la superficie segura con [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts) sobre `https://orkestia.ddns.net`
- `Tenants` ahora abre [Provisioning](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) con `tenantSlug` precargado y, cuando existe job vigente, con `operation` alineada al tipo de job del tenant seleccionado
- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega foco tenant visible por URL/UI, filtra jobs, métricas, alertas y lectura DLQ en forma client-side, y deja exportaciones CSV/JSON coherentes con ese foco
- se agrega el smoke [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts) para validar el salto `Tenants -> Provisioning` con contexto tenant en `staging` y `production`
- la Fase 2 mínima de `tenant data portability CSV` queda validada end-to-end en browser sobre `staging` y `production`, usando el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) ya ampliado para cubrir `export + dry_run + apply`
- el backend portable corrige la inserción de tipos desde CSV en [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py), convirtiendo según tipo de columna destino antes de insertar y evitando fallos como booleanos `'True'` sobre columnas `BOOLEAN`
- [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) queda endurecido para crear y dejar escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` al usuario real del servicio antes del restart
- [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py) deja de traer `TENANT_BOOTSTRAP_DB_PASSWORD_*` inseguros embebidos como defaults de código, evitando reinicios fallidos del backend productivo por hardening al arrancar
- `production` vuelve a requerir explícitamente rebuild de frontend cuando el cambio toca UI visible de `platform_admin`; en esta iteración se redeployan backend y frontend en `/opt/platform_paas` y el smoke público queda `1 passed`

## 2026-04-08

- se implementa la Fase 2 mínima de portabilidad tenant en `platform_control`: import controlado desde paquete `zip + manifest + csv`, con `dry_run`, validación de checksums, validación de `schema_version` y estrategia inicial `skip_existing`
- `platform_admin > Tenants` agrega el bloque `Import portable controlado` en [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx), con carga de archivo `zip`, simulación `dry_run` y aplicación explícita
- se extiende el contrato frontend/backend con [tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/platform_control/api/tenant_routes.py), [platform-api.ts](/home/felipe/platform_paas/frontend/src/services/platform-api.ts) y [types.ts](/home/felipe/platform_paas/frontend/src/types.ts) para exponer `data-import-jobs`
- la batería backend del frente queda cubierta por [test_tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_data_portability_service.py) y [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
- el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) se amplía para fijar la visibilidad del bloque de import controlado
- el siguiente paso del frente deja de ser “implementar Fase 2” y pasa a “validar browser + staging/prod del import portable mínimo antes de endurecer Fase 3”

- se implementa la Fase 1 de portabilidad tenant en `platform_control`: [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py), [tenant_data_transfer_job.py](/home/felipe/platform_paas/backend/app/apps/platform_control/models/tenant_data_transfer_job.py), [tenant_data_transfer_artifact.py](/home/felipe/platform_paas/backend/app/apps/platform_control/models/tenant_data_transfer_artifact.py) y migración [v0026_tenant_data_transfer_jobs.py](/home/felipe/platform_paas/backend/migrations/control/v0026_tenant_data_transfer_jobs.py)
- `platform_admin > Tenants` agrega el bloque `Portabilidad tenant` en [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) para generar y descargar exports portables `CSV + manifest + zip`
- el contrato frontend/backend queda expuesto en [platform-api.ts](/home/felipe/platform_paas/frontend/src/services/platform-api.ts), [api.ts](/home/felipe/platform_paas/frontend/src/services/api.ts), [types.ts](/home/felipe/platform_paas/frontend/src/types.ts) y [tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/platform_control/api/tenant_routes.py)
- se agrega el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) para validar wiring browser del export portable en `Tenants`
- se agrega el runbook [tenant-data-portability.md](/home/felipe/platform_paas/docs/runbooks/tenant-data-portability.md) y se documenta `TENANT_DATA_EXPORT_ARTIFACTS_DIR` en el catálogo backend/env examples
- el siguiente paso explícito del frente deja de ser “abrir export CSV” y pasa a “import controlado con dry_run”

- `Nuevo tenant` en [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) ahora exige `admin_full_name`, `admin_email` y `admin_password`, en vez de dejar que provisioning cree siempre `admin@<slug>.local / TenantAdmin123!`
- el backend guarda bootstrap admin explícito en [tenant.py](/home/felipe/platform_paas/backend/app/apps/platform_control/models/tenant.py), lo migra con [v0025_tenant_bootstrap_admin.py](/home/felipe/platform_paas/backend/migrations/control/v0025_tenant_bootstrap_admin.py) y lo usa en provisioning desde [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
- `platform_control` expone ahora un `plan_catalog` en capacidades para que `platform_admin` muestre qué módulos habilita cada plan, sin romper el modelo plan-driven
- el bloque de operación tenant cambia de hecho a `Plan y módulos`, para que quede visible dónde se habilitan módulos y no se confunda con un toggle manual inexistente
- se agrega el smoke [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts) para validar admin inicial explícito + preview de módulos por plan
- el frente ya quedó desplegado y validado en `staging` (`http://192.168.7.42:8081`) y en `production` (`https://orkestia.ddns.net`)
- la documentación operativa queda alineada para tratar `staging` como espejo instalado por defecto, usando `bootstrap reset` solo cuando se necesite revalidar `/install`
- el paquete de release deja explícito como invariante que `/opt/platform_paas/.env` debe permanecer en modo productivo real (`APP_ENV=production`, `DEBUG=false`, `INSTALL_FLAG_FILE=/opt/platform_paas/.platform_installed`)
- el sidebar de [tenant_portal](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/layout/TenantSidebarNav.tsx) deja de ser hardcodeado y pasa a leer [effective_enabled_modules](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/utils/module-visibility.ts) desde `/tenant/info`
- la visibilidad tenant queda alineada a la matriz efectiva ya aplicada en backend: `users -> users`, `business-core/maintenance -> core`, `finance -> finance`, `overview -> siempre`
- se relaja [loginTenant](/home/felipe/platform_paas/frontend/e2e/support/auth.ts) para no asumir que `Finanzas` siempre aparece después del login
- se agrega el smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) para validar que `Finanzas` desaparece cuando `billing grace` reduce los módulos efectivos a `core,users`
- se agrega [setTenantPlan](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) a backend-control para futuras pruebas tenant-side de contratos o entitlements
- se alinea el carril local `dev` con la convención actual: [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py) añade orígenes locales esperados en `development`, `.env` y `.env.example` quedan en `5173`, y `.env` declara explícitamente `TENANT_BILLING_GRACE_*` para que el baseline local reproduzca la política visible esperada
- `provisioning` y `deprovision` dejan de depender de escritura runtime sobre el `.env` principal: [TenantSecretService](/home/felipe/platform_paas/backend/app/common/security/tenant_secret_service.py) ahora usa `TENANT_SECRETS_FILE` como archivo de secretos tenant escribible y mantiene compatibilidad de lectura/limpieza con el `.env` legado
- el catálogo de entorno y los ejemplos `.env` ya documentan `TENANT_SECRETS_FILE` como parte del runtime productivo para evitar fallos tipo `Permission denied: '/opt/platform_paas/.env'`
- el ciclo operativo de `Tenants` y `Provisioning` queda documentado para llevar cualquier tenant nuevo o desalineado hasta `active`, `db_configured=true`, esquema al dia y acciones visibles `Archivar tenant` / `Abrir portal tenant`
- se abre como siguiente frente explícito de `platform-core` el modelo [TENANT_DATA_PORTABILITY_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md), separando backup PostgreSQL canónico de export/import portable tenant en `CSV + manifest`

## 2026-04-07

- se normaliza la convención local de puertos para no pisar la producción del mini PC: desarrollo pasa a backend `8100` y frontend `5173`, mientras producción mantiene backend `8000` detrás de `nginx`
- se agrega [platform-paas-backend-staging.service](/home/felipe/platform_paas/infra/systemd/platform-paas-backend-staging.service) y [platform-paas-staging-local.conf](/home/felipe/platform_paas/infra/nginx/platform-paas-staging-local.conf) para montar un entorno `staging/test` separado en el mismo mini PC, con backend `8200` y frontend `8081`
- se endurece [run_backend_tests.py](/home/felipe/platform_paas/backend/app/scripts/run_backend_tests.py) y [fixtures.py](/home/felipe/platform_paas/backend/app/tests/fixtures.py) para que la baseline backend siga siendo determinística aunque el shell herede variables reales de `staging` o `production`
- el entorno `staging` queda levantado y validado localmente en `http://192.168.7.42:8081`, con `health` operativo en `8200/8081`
- se agrega [reset_staging_bootstrap.sh](/home/felipe/platform_paas/deploy/reset_staging_bootstrap.sh) para devolver `staging` al modo instalador inicial sin tocar `production`
- se documenta el carril `bootstrap reset` del mini PC en [staging-bootstrap-reset.md](/home/felipe/platform_paas/docs/deploy/staging-bootstrap-reset.md)
- se agrega el smoke opt-in [platform-admin-installer-availability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-installer-availability.smoke.spec.ts) para validar la visibilidad del instalador cuando `staging` se resetea a bootstrap
- se corrige [AppRouter.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/routes/AppRouter.tsx) para que `/install` quede protegido por [RequireNotInstalled.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/routes/RequireNotInstalled.tsx) y no por `RequireInstalled`
- el reset bootstrap de `staging` queda validado también en browser real con el smoke opt-in del instalador (`1 passed`)
- se agrega [restore_staging_mirror.sh](/home/felipe/platform_paas/deploy/restore_staging_mirror.sh) para devolver `staging` desde bootstrap a espejo instalado usando migraciones + `seed_frontend_demo_baseline`
- se ejecuta la restauración real de `staging` a espejo instalado y queda validada con `health` en `installed=true` y `/login` sirviendo la SPA normal
- se ejecuta la primera salida productiva técnica sobre mini PC Debian en `/opt/platform_paas`, con backend real bajo `systemd`, frontend Vite publicado por `nginx` y topología single-host inicial en `orkestia.ddns.net`
- se agrega [platform-paas-single-host.conf](/home/felipe/platform_paas/infra/nginx/platform-paas-single-host.conf) para operar SPA + backend por rutas sobre un único dominio cuando todavía no existe separación `app/api`
- se agrega [platform-paas-single-host-ssl.conf](/home/felipe/platform_paas/infra/nginx/platform-paas-single-host-ssl.conf) y se activa HTTPS real para `orkestia.ddns.net` con certificado Let's Encrypt
- se endurece [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) para exportar `PYTHONPATH` en migraciones y pruebas, evitando fallos de import al desplegar fuera del workspace de desarrollo
- se endurece [validate_backend_env.sh](/home/felipe/platform_paas/deploy/validate_backend_env.sh) para rechazar `TENANT_BOOTSTRAP_DB_PASSWORD_*` inseguros antes del restart del servicio
- se actualiza [backend.production.example.env](/home/felipe/platform_paas/infra/env/backend.production.example.env) para declarar explícitamente los overrides de passwords bootstrap requeridos en producción
- se valida externamente `https://orkestia.ddns.net` desde navegador real y se ejecuta smoke remoto completo `all` contra la URL pública con `7/7` checks OK
- el frente central pasa de `cutover pendiente de validación externa` a `producción inicial validada`

## 2026-04-04

- se agrega [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md) como canon transversal de estandares, revisiones, estructura minima, documentacion viva y handoff para continuidad con otra IA
- se actualizan [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md), [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md), [developer-onboarding.md](/home/felipe/platform_paas/docs/runbooks/developer-onboarding.md), [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) y [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md) para dejar un marco único de implementación y validación browser
- se endurece la política oficial de continuidad: todo cambio visible debe actualizar documentación canónica, revisar cobertura E2E existente y dejar handoff explícito para el siguiente developer o IA
- se alinea [platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md) para dejar explícito que el cierre funcional central ya está logrado y que el pendiente real del bloque central es el cutover productivo sobre un host real

## 2026-04-03

- se agrega el script operativo [sync_active_tenant_schemas.py](/home/felipe/platform_paas/backend/app/scripts/sync_active_tenant_schemas.py) para sincronizar en linea los esquemas tenant activos sin depender del worker
- se actualiza [backend-migrations.md](/home/felipe/platform_paas/docs/runbooks/backend-migrations.md) para dejar explicito el flujo de migracion masiva y directa de tenants existentes

Resumen curado del bloque central.

## Base cerrada

- instalador web operativo
- base `platform_control`
- cuenta raíz de plataforma
- autenticación y separación por scope
- DB dinámica por tenant

## Operación visible

- `platform_admin` con dashboard, tenants, provisioning, billing, settings y actividad
- gestión de usuarios de plataforma
- ciclo base de tenants desde UI

## Endurecimiento

- política de lifecycle más explícita
- matriz de permisos visible
- actividad operativa
- exportaciones operativas en varias vistas
- primer stack Playwright browser base
- smoke browser de `platform_admin` ampliado a `create`, `archive` y `restore` de tenants
- smoke browser ampliado para validar acceso rápido desde `Tenants` al login de `tenant_portal`
- smoke browser ampliado para validar el bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant todavía no es elegible
- smoke browser ampliado para verificar que los jobs nuevos aparezcan en `Provisioning`
- smoke browser ampliado para ejecutar manualmente jobs `pending` desde `Provisioning`
- smoke browser ampliado para validar enforcement visible de límites de usuarios activos en `tenant_portal`
- smoke browser ampliado para validar enforcement visible de límites de `finance` en `tenant_portal`
- smoke browser ampliado para reencolar jobs `failed` desde `Provisioning`
- smoke browser ampliado para disparar `schema auto-sync` desde `Provisioning`
- smoke browser broker-only agregado para reencolar individualmente filas DLQ desde `Provisioning`
- smoke browser broker-only agregado para reencolar en lote filas DLQ filtradas desde `Provisioning`
- smoke browser broker-only agregado para validar filtros DLQ por texto de error y opciones visibles de requeue individual
- baseline E2E tenant actualizado y validado sobre `empresa-bootstrap` en vez de `empresa-demo`
- el baseline E2E tenant se mantiene sobre `empresa-bootstrap` como tenant reservado para pruebas browser, dejando `empresa-demo` para trabajo funcional con datos reales
- smokes browser de límites tenant endurecidos para fijar y limpiar overrides por control DB
- enforcement backend agregado al endpoint moderno de creación de transacciones `finance` para respetar `finance.entries`
- smoke browser agregado para validar precedencia visible de `finance.entries` sobre `finance.entries.monthly` en `tenant_portal`
- smoke browser agregado para validar bloqueo mensual de `finance.entries.monthly` en `tenant_portal`
- smoke browser agregado para validar bloqueo mensual por tipo de `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- smoke browser agregado para validar cuentas y categorías `finance` con `create`, `deactivate` y `delete` en `tenant_portal`
- smoke browser agregado para validar presupuestos `finance` con alta mensual y clonación al mes visible en `tenant_portal`
- smoke browser agregado para validar préstamos `finance` con alta y pago simple de cuota en `tenant_portal`
- smoke browser agregado para validar préstamos `finance` con pago en lote y reversa en lote sobre cuotas seleccionadas
- baseline de permisos tenant corregido para incluir acceso `maintenance` en roles operativos que ya navegan ese módulo dentro de `tenant_portal`
- se agrega [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py) para barrer tenants efímeros `e2e-*` con lifecycle seguro y evitar acumulación en `platform_control`
- la alta de `Tenants` y de `Usuarios de plataforma` pasa a abrirse solo bajo demanda en modal, evitando formularios de creación desplegados por defecto en la lectura principal
- la vista de `Usuarios de plataforma` deja de usar una grilla desbalanceada tras mover el alta a modal: el catálogo ahora toma el ancho útil completo y la ficha/acciones del usuario seleccionado quedan en un segundo nivel más armónico
- `Tenant Portal > Usuarios` también pasa a alta bajo demanda: el catálogo queda primero, `Nuevo usuario` abre modal y el bloque de operador actual queda como contexto secundario
- `Tenant Portal > Usuarios` suma acciones de `Editar` y `Eliminar` en la tabla; el borrado queda endurecido para bloquear autoeliminación y la eliminación del último admin activo del tenant
- `Tenant Portal > Usuarios` pasa a administrar también la zona horaria: el tenant define una zona por defecto y cada usuario puede heredarla o sobrescribirla
- `/tenant/info` expone `timezone`, `user_timezone` y `effective_timezone`, y las vistas del portal pasan a reutilizar esa zona efectiva para leer/capturar fechas operativas
- `sync_tenant_schema` deja de reintentarse cuando la configuracion DB del tenant esta incompleta; ese caso ahora termina en fallo terminal para evitar loops sobre tenants no provisionados
- `seed_frontend_demo_baseline.py` neutraliza jobs tecnicos vivos cuando resetea `empresa-demo` a `pending` sin DB, para no dejar `retry_pending` inconsistentes en `platform_control`

## Documentación

- se consolidó una convención canónica por módulo/dominio en `docs/modules/`
- `finance` y `platform-core` quedan como referencia para siguientes módulos
