# Estructura Raiz del Proyecto

Este documento describe la estructura actual de la carpeta raiz `platform_paas` para contextualizar el repositorio y sus areas principales.

Tambien deja una regla nueva para la siguiente etapa del proyecto:

- `finance` queda como modulo base del SaaS
- los modulos nuevos deben pensarse como slices completos, aunque el repo actual siga separado por backend, frontend, migraciones y docs

## Vista General

```text
platform_paas/
├── .github/
│   └── workflows/
│       ├── backend-deploy.yml
│       └── backend-tests.yml
├── backend/
│   ├── app/
│   │   ├── apps/
│   │   │   ├── installer/
│   │   │   ├── platform_control/
│   │   │   ├── provisioning/
│   │   │   └── tenant_modules/
│   │   ├── bootstrap/
│   │   ├── common/
│   │   │   ├── adapters/
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   ├── exceptions/
│   │   │   ├── feature_flags/
│   │   │   ├── middleware/
│   │   │   ├── observability/
│   │   │   ├── policies/
│   │   │   ├── security/
│   │   │   ├── services/
│   │   │   ├── shared_kernel/
│   │   │   └── utils/
│   │   ├── module_registry/
│   │   ├── scripts/
│   │   ├── seeds/
│   │   │   ├── control/
│   │   │   └── tenant/
│   │   ├── tests/
│   │   ├── workers/
│   │   └── main.py
│   ├── migrations/
│   │   ├── control/
│   │   ├── tenant/
│   │   ├── tenant_core/
│   │   └── tenant_modules/
│   │       ├── condos/
│   │       ├── finance/
│   │       └── iot/
│   └── requirements/
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── apps/
│       │   ├── platform_admin/
│       │   │   ├── layout/
│       │   │   ├── pages/
│       │   │   │   ├── activity/
│       │   │   │   ├── auth/
│       │   │   │   ├── billing/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── install/
│       │   │   │   ├── provisioning/
│       │   │   │   ├── settings/
│       │   │   │   ├── tenant_history/
│       │   │   │   ├── tenants/
│       │   │   │   └── users/
│       │   │   └── routes/
│       │   └── tenant_portal/
│       │       ├── layout/
│       │       ├── modules/
│       │       │   └── finance/
│       │       ├── pages/
│       │       ├── routes/
│       │       └── store/
│       ├── components/
│       │   ├── common/
│       │   ├── data-display/
│       │   ├── feedback/
│       │   └── forms/
│       ├── services/
│       ├── store/
│       ├── styles/
│       ├── App.tsx
│       ├── main.tsx
│       └── types.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── deploy/
│   ├── install/
│   ├── modules/
│   └── runbooks/
├── infra/
│   ├── docker/
│   ├── env/
│   │   ├── backup.external.example.env
│   │   ├── backend.development.example.env
│   │   ├── backend.production.example.env
│   │   ├── backend.staging.example.env
│   │   ├── pgtest.example.env
│   │   ├── restore.drill.example.env
│   │   └── restore.drill.tenants.example.env
│   ├── nginx/
│   │   ├── platform-paas-backend.conf
│   │   └── platform-paas-backend-ssl.conf
│   ├── postgres/
│   │   ├── backups/
│   │   │   ├── backup_platform_control.sh
│   │   │   ├── restore_platform_control.sh
│   │   │   ├── restore_drill_platform_control.sh
│   │   │   └── sync_backup_archives.sh
│   │   └── init/
│   └── systemd/
│       ├── platform-paas-backup-sync.service
│       ├── platform-paas-backup-sync.timer
│       ├── platform-paas-control-backup.service
│       ├── platform-paas-control-backup.timer
│       ├── platform-paas-backend.service
│       ├── platform-paas-certbot-renew.service
│       ├── platform-paas-certbot-renew.timer
│       ├── platform-paas-provisioning-worker@.service
│       ├── platform-paas-provisioning-worker@.timer
│       ├── platform-paas-provisioning-worker-profile-<name>.service
│       ├── platform-paas-provisioning-worker-profile-<name>.timer
│       ├── platform-paas-provisioning-worker.service
│       ├── platform-paas-provisioning-worker.timer
│       ├── platform-paas-restore-drill.service
│       ├── platform-paas-restore-drill.timer
│       ├── platform-paas-tenant-backup.service
│       ├── platform-paas-tenant-backup.timer
│       ├── platform-paas-tenant-restore-drill.service
│       └── platform-paas-tenant-restore-drill.timer
├── deploy/
│   ├── collect_backend_operational_evidence.sh
│   ├── deploy_backend_production.sh
│   ├── deploy_backend_staging.sh
│   ├── deploy_backend.sh
│   ├── install_provisioning_worker_profile_units.sh
│   ├── rollback_backend.sh
│   ├── run_provisioning_worker_profile.sh
│   ├── validate_backend_env.sh
│   └── verify_backend_deploy.sh
├── generated/
├── scripts/
│   ├── db/
│   ├── dev/
│   └── maintenance/
├── tools/
├── .env
├── .platform_installed
└── estructura_proyecto.txt
```

Referencia de esta politica:

- [Convencion modular por slice](./module-slice-convention.md)

## Estructura de `tenant_modules`

```text
tenant_modules/
├── core/
├── condos/
├── finance/
├── iot/
├── integrations/
├── shared/
│   ├── enums/
│   ├── mixins/
│   └── validators/
└── _templates/
    ├── backend_module_basic/
    └── backend_module_full/
```

## Backend en Estado Actual

El backend ya no esta solo en una fase de estructura base. Hoy tiene capas reales agregadas sobre esa estructura.

```text
backend/
├── app/
│   ├── apps/
│   │   ├── installer/
│   │   │   ├── api/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   ├── platform_control/
│   │   │   ├── api/
│   │   │   │   ├── auth_routes.py
│   │   │   │   ├── billing_webhook_routes.py
│   │   │   │   ├── provisioning_job_routes.py
│   │   │   │   ├── routes.py
│   │   │   │   └── tenant_routes.py
│   │   │   ├── models/
│   │   │   │   ├── auth_audit_event.py
│   │   │   │   ├── auth_token.py
│   │   │   │   ├── platform_user.py
│   │   │   │   ├── provisioning_job.py
│   │   │   │   ├── provisioning_job_metric_snapshot.py
│   │   │   │   ├── provisioning_operational_alert.py
│   │   │   │   ├── provisioning_worker_cycle_trace.py
│   │   │   │   ├── tenant.py
│   │   │   │   ├── tenant_billing_sync_event.py
│   │   │   │   ├── tenant_policy_change_event.py
│   │   │   │   └── tenant_retirement_archive.py
│   │   │   ├── repositories/
│   │   │   │   ├── auth_audit_event_repository.py
│   │   │   │   ├── auth_token_repository.py
│   │   │   │   ├── platform_user_repository.py
│   │   │   │   ├── provisioning_job_metric_snapshot_repository.py
│   │   │   │   ├── provisioning_operational_alert_repository.py
│   │   │   │   ├── provisioning_job_repository.py
│   │   │   │   ├── provisioning_worker_cycle_trace_repository.py
│   │   │   │   ├── tenant_billing_sync_event_repository.py
│   │   │   │   ├── tenant_policy_change_event_repository.py
│   │   │   │   └── tenant_repository.py
│   │   │   └── services/
│   │   │       ├── auth_audit_service.py
│   │   │       ├── auth_service.py
│   │   │       ├── billing_provider_adapter_service.py
│   │   │       ├── platform_capability_service.py
│   │   │       ├── platform_runtime_service.py
│   │   │       ├── provisioning_metrics_export_service.py
│   │   │       ├── provisioning_metrics_service.py
│   │   │       ├── provisioning_alert_service.py
│   │   │       ├── provisioning_job_service.py
│   │   │       ├── provisioning_worker_cycle_trace_service.py
│   │   │       ├── stripe_webhook_signature_service.py
│   │   │       ├── tenant_billing_sync_service.py
│   │   │       ├── tenant_policy_event_service.py
│   │   │       └── tenant_service.py
│   │   ├── provisioning/
│   │   │   ├── api/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   │   ├── provisioning_dispatch_service.py
│   │   │   │   ├── provisioning_service.py
│   │   │   │   ├── tenant_db_bootstrap_service.py
│   │   │   │   └── tenant_schema_service.py
│   │   │   └── workers/
│   │   └── tenant_modules/
│   │       ├── core/
│   │       │   ├── api/
│   │       │   │   ├── auth_routes.py
│   │       │   │   └── tenant_routes.py
│   │       │   ├── models/
│   │       │   ├── repositories/
│   │       │   │   ├── tenant_info_repository.py
│   │       │   │   └── user_repository.py
│   │       │   ├── services/
│   │       │   │   ├── tenant_auth_service.py
│   │       │   │   ├── tenant_connection_service.py
│   │       │   │   └── tenant_data_service.py
│   │       │   ├── permissions.py
│   │       │   └── schemas.py
│   │       ├── finance/
│   │       │   ├── api/
│   │       │   ├── docs/
│   │       │   ├── models/
│   │       │   ├── repositories/
│   │       │   ├── services/
│   │       │   └── schemas/
│   │       ├── condos/
│   │       ├── iot/
│   │       ├── integrations/
│   │       ├── shared/
│   │       └── _templates/
│   ├── bootstrap/
│   │   └── app_factory.py
│   ├── common/
│   │   ├── auth/
│   │   │   ├── auth_token_service.py
│   │   │   ├── dependencies.py
│   │   │   ├── jwt_service.py
│   │   │   └── role_dependencies.py
│   │   ├── db/
│   │   │   ├── migration_runner.py
│   │   │   ├── migration_service.py
│   │   │   ├── session_manager.py
│   │   │   ├── control_database.py
│   │   │   └── engine_factory.py
│   │   ├── middleware/
│   │   │   ├── request_observability_middleware.py
│   │   │   └── tenant_context_middleware.py
│   │   ├── observability/
│   │   │   └── logging_service.py
│   │   ├── policies/
│   │   │   └── tenant_rate_limit_service.py
│   │   ├── services/
│   │   │   └── redis_client_service.py
│   │   └── security/
│   │       ├── runtime_security_service.py
│   │       └── tenant_secret_service.py
│   ├── scripts/
│   │   ├── export_provisioning_metrics.py
│   │   ├── init_control_db.py
│   │   ├── run_backend_tests.py
│   │   ├── run_control_migrations.py
│   │   ├── run_provisioning_worker.py
│   │   ├── run_tenant_backups.py
│   │   ├── run_tenant_migrations.py
│   │   ├── run_tenant_restore.py
│   │   └── run_tenant_restore_drills.py
│   ├── workers/
│   │   └── provisioning_worker.py
│   └── tests/
│       ├── fixtures.py
│       ├── test_http_smoke.py
│       ├── test_migration_flow.py
│       ├── test_observability.py
│       ├── test_platform_flow.py
│       ├── test_platform_integration_flow.py
│       ├── test_platform_postgres_integration_flow.py
│       ├── test_provisioning_worker.py
│       ├── test_security_hardening.py
│       ├── test_tenant_finance_flow.py
│       ├── test_tenant_flow.py
│       ├── test_tenant_integration_flow.py
│       └── test_tenant_postgres_integration_flow.py
├── migrations/
│   ├── control/
│   │   ├── v0001_initial.py
│   │   ├── v0002_auth_tokens.py
│   │   ├── v0003_auth_audit_events.py
│   │   ├── v0004_tenant_maintenance_mode.py
│   │   ├── v0005_provisioning_job_retries.py
│   │   ├── v0006_tenant_maintenance_windows.py
│   │   ├── v0007_tenant_maintenance_policy.py
│   │   ├── v0008_provisioning_metric_snapshots.py
│   │   ├── v0009_provisioning_worker_cycle_traces.py
│   │   ├── v0010_provisioning_operational_alerts.py
│   │   └── v0024_tenant_retirement_archives.py
│   └── tenant/
│       ├── v0001_core.py
│       ├── v0002_finance_entries.py
│       ├── v0003_finance_catalogs.py
│       ├── v0004_finance_seed_clp.py
│       ├── v0005_finance_transactions.py
│       ├── v0006_finance_budgets.py
│       ├── v0007_finance_loans.py
│       └── v0008_finance_loan_installments.py
```

## Frontend en Estado Actual

El frontend ya no esta vacio: existe una base real de `platform_admin` y `tenant_portal` alineada con el backend ya operativo.

```text
frontend/
├── package.json
├── vite.config.ts
├── .env.example
├── index.html
└── src/
    ├── apps/
    │   ├── platform_admin/
    │   │   ├── layout/
    │   │   │   ├── AppShell.tsx
    │   │   │   ├── SidebarNav.tsx
    │   │   │   └── Topbar.tsx
    │   │   ├── pages/
    │   │   │   ├── activity/PlatformActivityPage.tsx
    │   │   │   ├── auth/LoginPage.tsx
    │   │   │   ├── billing/BillingPage.tsx
    │   │   │   ├── dashboard/DashboardPage.tsx
    │   │   │   ├── install/InstallPage.tsx
    │   │   │   ├── provisioning/ProvisioningPage.tsx
    │   │   │   ├── settings/SettingsPage.tsx
    │   │   │   ├── tenant_history/TenantHistoryPage.tsx
    │   │   │   ├── tenants/TenantsPage.tsx
    │   │   │   └── users/PlatformUsersPage.tsx
    │   │   └── routes/
    │   │       ├── AppRouter.tsx
    │   │       └── RequireAuth.tsx
    │   └── tenant_portal/
    │       ├── layout/
    │       ├── modules/
    │       │   └── finance/
    │       ├── pages/
    │       ├── routes/
    │       └── store/
    ├── components/
    │   ├── common/
    │   │   ├── PageHeader.tsx
    │   │   ├── PanelCard.tsx
    │   │   └── StatusBadge.tsx
    │   ├── data-display/
    │   │   └── DataTableCard.tsx
    │   └── feedback/
    │       ├── ErrorState.tsx
    │       └── LoadingBlock.tsx
    ├── services/
    │   ├── api.ts
    │   └── platform-api.ts
    ├── store/
    │   └── auth-context.tsx
    ├── styles/
    │   ├── bootstrap-overrides.css
    │   ├── platform-admin.css
    │   └── tokens.css
    ├── App.tsx
    ├── main.tsx
    └── types.ts
```

Hoy esta base cubre:

- `platform_admin` ya operable con `Resumen`, `Usuarios de plataforma`, `Actividad`, `Tenants`, `Provisioning`, `Facturación`, `Configuración` y `Histórico tenants`
- `tenant_portal` ya operable con login, overview, usuarios y slice `finance`
- `finance` ya no es solo placeholder: ya tiene catálogos, settings, pantalla moderna de `Transacciones`, primera pantalla real de `Presupuestos` y una pantalla real de `Préstamos` con cronograma base

## Documentacion en Estado Actual

Hoy `docs/` ya tiene contenido real y no solo carpetas reservadas.

```text
docs/
├── api/
│   └── index.md
├── architecture/
│   ├── authentication-and-authorization.md
│   ├── backend-current-flow.md
│   ├── development-roadmap.md
│   ├── multi-tenant-model.md
│   ├── project-structure.md
│   └── index.md
├── deploy/
│   ├── operational-acceptance-checklist.md
│   ├── backend-post-deploy-verification.md
│   ├── backend-release-and-rollback.md
│   ├── backend-https-nginx.md
│   ├── backend-debian.md
│   ├── environment-strategy.md
│   ├── external-backup-sync.md
│   ├── index.md
│   ├── postgres-backup-and-restore.md
│   ├── provisioning-worker.md
│   ├── restore-drill-platform-control.md
│   └── restore-drill-tenants.md
├── runbooks/
│   ├── backend-error-handling.md
│   ├── backend-ci.md
│   ├── backend-migrations.md
│   ├── backend-observability.md
│   ├── backend-tests.md
│   ├── finance-module-implementation.md
│   ├── platform-backend-implementation.md
│   ├── platform-bootstrap.md
│   ├── security-hardening.md
│   ├── tenant-backend-implementation.md
│   └── index.md
└── index.md
```

## Lectura Rapida

- `backend/`: nucleo funcional principal del sistema.
- `backend/app/apps/installer/`: instalacion inicial de la plataforma.
- `backend/app/apps/platform_control/`: administracion central de la plataforma.
- `backend/app/apps/provisioning/`: aprovisionamiento tecnico de tenants y bases de datos.
- `backend/app/apps/tenant_modules/`: modulos de negocio por tenant.
- `backend/app/common/`: componentes compartidos, autenticacion, base de datos, seguridad, middleware y observabilidad.
- `backend/app/tests/`: suites unitarias, de integracion, smoke HTTP, seguridad y observabilidad.
- `backend/migrations/`: migraciones versionadas de control DB y tenant DB.
- `frontend/`: interfaces web reales de `platform_admin` y `tenant_portal`, ya con slice moderno de `finance` y vista propia `Histórico tenants`.
- `docs/`: documentacion organizada por tema, ya con arquitectura, API y runbooks reales.
- `infra/`: soporte de infraestructura, entorno, nginx, postgres y servicios; ya incluye plantillas base por entorno, backend, backup local y sincronizacion externa.
- `.github/workflows/`: automatizacion del repositorio; hoy ya incluye un workflow base de pruebas backend.
- `deploy/`: scripts de despliegue y operacion; hoy ya incluye una base de actualizacion backend.
- `generated/`: salida para archivos generados.
- `scripts/`: automatizaciones operativas fuera del backend.
- `tools/`: utilidades auxiliares del repositorio.
- `.env`: configuracion del entorno actual.
- `.platform_installed`: bandera local para indicar que la plataforma ya fue instalada.
- `estructura_proyecto.txt`: snapshot textual de la estructura del proyecto.
