# Platform Core Changelog

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
