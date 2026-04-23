# Platform Core Developer Guide

Guía de desarrollo para la parte central de la app.

Referencias transversales obligatorias:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

## Alcance

`platform-core` cubre:

- instalador
- `platform_admin`
- base de control
- lifecycle tenant
- provisioning
- billing
- actividad
- autenticación `platform`

## Estructura relevante

Backend:

- `backend/app/apps/platform_control/`
- `backend/app/common/`
- `backend/app/bootstrap/`

Frontend:

- `frontend/src/apps/platform_admin/`
- `frontend/src/apps/installer/`

Documentación base:

- [backend-current-flow.md](/home/felipe/platform_paas/docs/architecture/backend-current-flow.md)
- [authentication-and-authorization.md](/home/felipe/platform_paas/docs/architecture/authentication-and-authorization.md)
- [multi-tenant-model.md](/home/felipe/platform_paas/docs/architecture/multi-tenant-model.md)

## Contratos y decisiones importantes

- `platform_control` es la fuente de verdad central
- el lifecycle tenant es explícito y no debe mutarse informalmente
- `archive` es la baja operativa preferida
- `restore` es flujo explícito, no cambio manual de estado
- `delete` físico de tenants sigue fuera del alcance normal de operación
- frontend y backend deben consumir el catálogo de capacidades como fuente de verdad cuando aplique
- si `Provisioning` muestra o condiciona recorridos broker-only, la fuente de verdad visible del entorno debe salir del catálogo de capacidades y no de inferencias locales; hoy eso se expone como `current_provisioning_dispatch_backend`
- la apertura formal de `Etapa 15` también queda backend-driven:
  - `plan_catalog` y `plan_modules` de `GET /platform/capabilities` son la fuente de verdad del catálogo de módulos y planes
  - `module_dependency_catalog` de ese mismo endpoint es la fuente de verdad de las dependencias explícitas entre módulos
  - `Tenants > Plan y módulos` sigue siendo la superficie de activación tenant-side
  - `Configuración` ya expone tanto el catálogo de planes/módulos como el catálogo de dependencias
  - `Configuración` y `Tenants > Plan y módulos` ya quedaron adaptados al lenguaje visible `Plan Base + add-ons`
  - no reintroducir toggles de módulos sueltos
  - la dirección aprobada ya no es `plan-driven puro` ni `overrides libres por tenant`
  - el primer corte técnico ya modela `Plan Base + módulos arrendables por suscripción` en `platform_control`
  - la separación obligatoria del diseño queda así:
    - catálogo comercial
    - suscripción tenant
    - habilitación técnica efectiva
  - tablas nuevas ya presentes en repo:
    - `tenant_base_plan_catalog`
    - `tenant_module_catalog`
    - `tenant_module_price_catalog`
    - `tenant_subscriptions`
    - `tenant_subscription_items`
  - `GET /platform/capabilities` ya expone:
    - `subscription_activation_model`
    - `subscription_billing_cycles`
    - `base_plan_catalog`
    - `module_subscription_catalog`
  - el estado visible actual debe respetar esta secuencia:
    - catálogo comercial aprobado visible en consola
    - activación técnica efectiva visible desde `tenant_subscriptions`
    - fallback legacy por `plan_code` solo mientras siga existiendo compatibilidad
    - contratación formal de add-ons desde consola sobre `tenant_subscriptions`
    - siguiente corte: retiro gradual del fallback legacy y conexión de billing/grace sobre el modelo nuevo
  - referencia formal:
    - [TENANT_MODULE_SUBSCRIPTION_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_MODULE_SUBSCRIPTION_MODEL.md)
- en `platform_admin`, las capturas de alta más sensibles (`Tenants`, `Usuarios de plataforma`) no deberían quedar abiertas por defecto; la lectura principal debe mostrarse primero y la creación abrirse bajo demanda en modal
- en `tenant_portal`, `Usuarios` debe seguir el mismo patrón: catálogo visible primero y alta solo bajo demanda desde botón
- `tenant_portal > Usuarios` ya expone además edición y borrado seguro: el backend bloquea autoeliminación y protege al último admin activo antes de aceptar `DELETE /tenant/users/{id}` o degradaciones equivalentes
- `tenant_portal > Usuarios` también es la fuente de verdad para la zona horaria operativa del tenant:
  - `tenant_info.timezone` define la zona por defecto del tenant
  - `users.timezone` permite override por usuario
  - la precedencia efectiva es `users.timezone -> tenant_info.timezone -> default plataforma`
  - los módulos del tenant deben consumir la zona efectiva desde `/tenant/info` y no asumir UTC ni el reloj del navegador como única fuente
- `/tenant/info` ya expone además configuración tenant-side consumida por módulos:
  - zona horaria
  - política `maintenance -> finance`
  - la edición de esa política sigue siendo self-service del tenant admin mediante `/tenant/info/maintenance-finance-sync`
- `/tenant/info` ya expone además `effective_enabled_modules` como fuente de verdad de navegación tenant-side:
  - `overview` sigue siempre visible
  - `users` requiere `users`
  - `business-core` requiere `core`
  - `maintenance` requiere `maintenance`
  - `finance` requiere `finance`
  - el sidebar del `tenant_portal` no debe volver a hardcodear estas visibilidades fuera de esa fuente
- backup PostgreSQL y portabilidad CSV son frentes distintos:
  - `pg_dump` sigue siendo el respaldo técnico canónico
  - export/import CSV tenant-side vive en `platform_control`, no dentro de un módulo tenant suelto
  - hoy ya existe export/import portable por tenant con dos scopes:
    - `portable_full`
    - `functional_data_only`
  - `portable_minimum` queda solo como compatibilidad de import para paquetes heredados
- la misma lógica se expone tanto en `platform_admin > Tenants` como en `tenant_portal > Resumen técnico` para admin tenant
- la importación debe ofrecer `dry_run` antes de `apply` y no debe venderse como reemplazo del backup real
- la estrategia actual del import es `skip_existing`
- `platform_admin > Tenants` ahora puede sintetizar la `Postura operativa tenant` usando señales ya disponibles del frontend:
  - `TenantResponse`
  - `TenantAccessPolicy`
  - `TenantSchemaStatusResponse`
  - último `ProvisioningJob`
  - indisponibilidad estructurada de `module usage`
- esa síntesis no reemplaza la evidencia runtime ni la auditoría multi-tenant; solo evita diagnosticar a ciegas desde la consola
- spec del corte visible en [TENANT_OPERATIONAL_POSTURE_SLICE.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_OPERATIONAL_POSTURE_SLICE.md)
- el hardening operativo tenant-side ya tiene además herramienta canónica de reparación por slug:
  - [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py)
  - usar primero [tenant-incident-response.md](/home/felipe/platform_paas/docs/runbooks/tenant-incident-response.md) y no reabrir slices funcionales mientras el problema siga clasificado como drift runtime/schema/credenciales/defaults

## Cómo extender este bloque

1. definir impacto sobre lifecycle, permisos y observabilidad
2. cambiar backend
3. exponer endpoints
4. conectar frontend
5. agregar tests
6. actualizar runbook y documentación canónica de `platform-core`

## Referencias técnicas

- Implementación platform backend: [platform-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/platform-backend-implementation.md)
- Implementación tenant backend: [tenant-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/tenant-backend-implementation.md)
- Error/status matrix: [backend-error-status-matrix.md](/home/felipe/platform_paas/docs/architecture/backend-error-status-matrix.md)
- Mapa de permisos: [permission-map.md](/home/felipe/platform_paas/docs/architecture/permission-map.md)
- E2E browser: [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)
- Modelo de portabilidad tenant: [TENANT_DATA_PORTABILITY_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md)
- Helper published broker-only staging: [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
- Runner compartido broker-only: [run_broker_dlq_playwright_target.sh](/home/felipe/platform_paas/scripts/dev/run_broker_dlq_playwright_target.sh)
- Baseline published curado de Provisioning/DLQ: [run_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_published_provisioning_baseline.sh)
- Equivalente repo/CI del baseline curado: [run_repo_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_repo_provisioning_baseline.sh)
- Wrappers published por ambiente:
  - [run_staging_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_provisioning_baseline.sh)
  - [run_production_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_production_published_provisioning_baseline.sh)

## E2E vigente

Smokes actuales del bloque central:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts)
- [platform-admin-role-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-role-access.smoke.spec.ts)
- [platform-admin-billing-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-reconcile.smoke.spec.ts)
- [platform-admin-billing-batch-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-batch-reconcile.smoke.spec.ts)
- [platform-admin-tenant-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-history.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts)
- [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts)
- [tenant-portal-data-portability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-data-portability.smoke.spec.ts)
- [platform-admin-provisioning-dlq-row.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [platform-admin-provisioning-dlq-filters.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)
- [platform-admin-provisioning-dlq-investigation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-investigation.smoke.spec.ts)
- [platform-admin-provisioning-observability-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-history.smoke.spec.ts)
- [platform-admin-provisioning-observability-visible.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-visible.smoke.spec.ts)
- [platform-admin-provisioning-guided-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dispatch-capability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts)
- [platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
- [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
- [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
- [platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)

Hardening operativo vigente del bloque broker-only:

- el dispatch `target -> specs` ya vive en un único runner compartido:
  - [run_broker_dlq_playwright_target.sh](/home/felipe/platform_paas/scripts/dev/run_broker_dlq_playwright_target.sh)
- lo consumen:
  - [run_local_broker_dlq_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_local_broker_dlq_baseline.sh)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
  - [.github/workflows/frontend-broker-dlq-e2e.yml](/home/felipe/platform_paas/.github/workflows/frontend-broker-dlq-e2e.yml)
- baseline published curado complementario:
  - [run_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_published_provisioning_baseline.sh)
  - corre siempre la capa visible mínima:
    - `dispatch-capability`
    - `surface-gating`
    - `observability-visible`
  - suma broker-only solo si el entorno publicado realmente usa `broker`
  - ya tiene wrappers operativos por ambiente:
    - `staging`: [run_staging_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_provisioning_baseline.sh)
    - `production`: [run_production_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_production_published_provisioning_baseline.sh)
- baseline repo/CI equivalente:
  - [run_repo_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_repo_provisioning_baseline.sh)
  - corre la misma capa visible mínima y acepta `--dispatch-backend broker|database`
  - workflow manual dedicado:
    - [.github/workflows/frontend-provisioning-baseline-e2e.yml](/home/felipe/platform_paas/.github/workflows/frontend-provisioning-baseline-e2e.yml)
- targets hoy institucionalizados:
  - `all`
  - `batch`
  - `row`
  - `filters`
  - `guided`
  - `family`
  - `family-requeue`
  - `family-batch`
  - `family-recommendation`
  - `tenant-focus`
  - `technical`
  - `matrix`

Baseline E2E tenant actualmente validado para continuar pruebas browser:

- `E2E_TENANT_SLUG=empresa-bootstrap`
- `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
- `E2E_TENANT_PASSWORD=TenantAdmin123!`

Nota operativa:

- para esta iteración el baseline validado de tenant browser sigue siendo `empresa-bootstrap`
- los smokes de límites tenant (`core.users.active` y `finance.entries`) ahora preparan y limpian overrides de forma determinista por control DB
- si otro entorno no tiene `empresa-bootstrap` disponible, hay que sobreescribir `E2E_TENANT_*` y revalidar el baseline

Regla vigente para `Nuevo tenant` en `platform_admin`:

- el alta ya debe capturar explícitamente `admin_full_name`, `admin_email` y `admin_password`
- quedó prohibido depender de un bootstrap fijo tipo `admin@<slug>.local / TenantAdmin123!` para tenants nuevos
- los módulos no se habilitan manualmente uno a uno en el alta: se habilitan por `plan`
- el modal de `Nuevo tenant` ya debe mostrar claramente qué módulos habilita el plan seleccionado
- el bloque operativo para cambiar módulos en un tenant existente es `Plan y módulos` dentro de `Tenants`
- ese mismo bloque ya debe dejar visible si el plan cubre o no las dependencias requeridas
- el siguiente corte ya no debe modelarse como excepción libre por tenant:
  - primero debe aparecer el contrato comercial base
  - luego los `subscription items` por módulo
  - y recién después la resolución a `effective_enabled_modules`

Cobertura actual:

- login `platform_admin`
- navegación base a `Tenants` y `Provisioning`
- lifecycle tenant base en UI con `create`, `archive` y `restore`
- acceso rápido desde `Tenants` al login de `tenant_portal` con `slug` precargado
- feedback de bloqueo en `Tenants` cuando el acceso rápido al `tenant_portal` todavía no debe habilitarse
- acceso rápido desde `Tenants` a `Provisioning` con `tenantSlug` y foco operativo precargados
- enforcement visible de que `Nuevo tenant` exige admin inicial explícito y preview de módulos por `plan`
- bloque visible de `Portabilidad tenant` con export portable y superficie inicial de import controlado
- selección visible del scope portable entre `Paquete completo` y `Solo datos funcionales`
- misma portabilidad disponible también en `tenant_portal` para admin tenant
- enforcement visible por rol en `platform_admin` para `admin` y `support`
- workspace de `Billing` con reconcile individual sobre evento tenant persistido
- workspace de `Billing` con reconcile batch sobre eventos filtrados
- `platform_admin > Billing` ya expone además una `Ruta de revalidación del carril`:
  - primero valida señales abiertas + resumen global + historial
  - luego baja al workspace tenant solo cuando ya hay tenant foco o reconcile que ejecutar
  - la referencia repo/CI equivalente sigue siendo:
    - [platform-admin-billing-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-reconcile.smoke.spec.ts)
    - [platform-admin-billing-batch-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-batch-reconcile.smoke.spec.ts)
- `Histórico tenants` con filtros, exportaciones y lectura del detalle archivado
- visibilidad de jobs de provisioning recién disparados desde `Tenants`
- ejecución manual de jobs `pending` desde `Provisioning`
- requeue de jobs `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning` con confirmación y feedback visible
- requeue individual de filas DLQ desde `Provisioning` en entornos con backend `broker`
- requeue batch de filas DLQ filtradas desde `Provisioning` en entornos con backend `broker`
- filtros finos DLQ por texto de error y validación visible de `delay/reset attempts` antes del requeue individual en backend `broker`
- observabilidad visible de `Provisioning` con snapshots recientes por tenant e historial de alertas operativas persistidas
- `requeue guiado` en `Provisioning` para enfocar una fila DLQ y recomendar si corresponde requeue individual o batch
- visibilidad explícita del `dispatch backend` activo dentro de `Provisioning`, para saber si el entorno opera hoy con `broker` o `database`
- gating visible de la propia superficie `Operación DLQ` según el backend activo, retirando acciones broker-only cuando el entorno corre con `database`
- resumen broker-only de `familias DLQ visibles` para agrupar el subconjunto por tenant, tipo de job y error antes de aplicar un foco operativo
- requeue directo de una `familia DLQ visible` desde ese mismo resumen broker-only
- batch broker-only homogéneo sobre múltiples `familias DLQ visibles`, con selección explícita y validación por `tenant + job type`
- recomendación operativa broker-only sobre `familias DLQ visibles`, para decidir entre `focus single`, `requeue family`, `family-batch` o limpieza de selección según el subconjunto actual
- prioridad ejecutiva broker-only por `tenant` visible, para aislar primero un tenant cargado antes de operar sus familias
- diagnóstico técnico broker-only `DLQ / BD visible`, para distinguir si el atasco dominante cae en rol postgres, base postgres, esquema tenant o drop de base tenant
- matriz broker-only `tenant + capa técnica`, para aislar la combinación visible correcta entre tenant y capa técnica sin revisar fila por fila
- helper published broker-only para `staging`, evitando rearmar manualmente `E2E_BACKEND_ROOT`, `E2E_BACKEND_PYTHON` y `E2E_BACKEND_ENV_FILE` en cada validación DLQ
- enforcement visible de límites de usuarios activos en `tenant_portal` con overrides preparados de forma determinista
- visibilidad backend-driven del sidebar `tenant_portal` según `effective_enabled_modules`
- enforcement visible de límites de `finance.entries` en `tenant_portal` con overrides preparados de forma determinista
- precedencia visible de `finance.entries` sobre `finance.entries.monthly` cuando ambos límites aplican a la vez en `tenant_portal`
- enforcement de límites mensuales de `finance.entries.monthly` en `tenant_portal` con overrides preparados de forma determinista
- enforcement de límites mensuales por tipo `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal` con overrides preparados de forma determinista
- mantenimiento operativo de cuentas y categorías `finance` en `tenant_portal` (`create`, `deactivate`, `delete`)
- flujo operativo base de presupuestos `finance` en `tenant_portal` (`create`, `clone`)
- flujo operativo base de préstamos `finance` en `tenant_portal` (`create`, `schedule`, `payment`)
- operaciones batch de préstamos `finance` en `tenant_portal` (`batch payment`, `batch reversal`)
