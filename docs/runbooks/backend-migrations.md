# Migraciones Backend

Este runbook resume el mecanismo de migraciones versionadas actual del proyecto.

## Objetivo

Dejar una base reproducible para evolucionar esquema sin depender solo de `create_all()` o de sync implicito.

## Estado actual

Hoy existen migraciones versionadas para:

- `control`
- `tenant`

Ubicacion:

- `backend/migrations/control/`
- `backend/migrations/tenant/`

Tabla de tracking:

- `control_schema_migrations`
- `tenant_schema_migrations`

## Runner actual

El backend usa un runner simple en:

- `backend/app/common/db/migration_runner.py`

Y wrappers operativos en:

- `backend/app/common/db/migration_service.py`

## Migraciones disponibles

### Control

- cadena actual:
  - `v0001_initial`
  - `v0002_auth_tokens`
  - `v0003_auth_audit_events`
  - `v0004_tenant_maintenance_mode`
  - `v0005_provisioning_job_retries`
  - `v0006_tenant_maintenance_windows`
  - `v0007_tenant_maintenance_policy`
  - `v0008_provisioning_metric_snapshots`
  - `v0009_provisioning_worker_cycle_traces`
  - `v0010_provisioning_operational_alerts`
  - `v0011_provisioning_job_error_code`
  - `v0012_provisioning_operational_alert_error_code`
  - `v0013_tenant_rate_limit_overrides`
  - `v0014_tenant_status_reason`
  - `v0015_tenant_plan_code`
  - `v0016_tenant_billing_state`
  - `v0017_tenant_policy_change_events`
  - `v0018_tenant_billing_sync_events`
  - `v0019_tenant_billing_identity`
  - `v0020_billing_operational_alerts`
  - `v0021_tenant_module_limits`
  - `v0022_tenant_schema_tracking`
  - `v0023_tenant_db_credentials_tracking`
  - `v0024_tenant_retirement_archives`
  - `v0025_tenant_bootstrap_admin`
  - `v0026_tenant_data_transfer_jobs`
  - `v0027_tenant_module_subscription_model`
  - `v0028_tenant_runtime_secret_campaigns`
  - `v0029_auth_audit_observability_fields`

### Tenant

- cadena actual:
  - `v0001_core`
  - `v0002_finance_entries`
  - `v0003_finance_catalogs`
  - `v0004_finance_seed_clp`
  - `v0005_finance_transactions`
  - `v0006_finance_budgets`
  - `v0007_finance_loans`
  - `v0008_finance_loan_installments`
  - `v0009_finance_loan_installment_payment_split`
  - `v0010_finance_loan_installment_reversal_reason`
  - `v0011_finance_loan_source_account`
  - `v0012_finance_transaction_voids`
  - `v0013_finance_transaction_voids_repair`
  - `v0014_finance_default_category_catalog`
  - `v0015_business_core_base`
  - `v0016_maintenance_base`
  - `v0017_business_core_taxonomy`
  - `v0018_business_core_site_commune`
  - `v0019_core_user_timezones`
  - `v0020_work_group_members_and_maintenance_assignments`
  - `v0021_maintenance_schedules_and_due_items`
  - `v0022_maintenance_costing_and_finance_sync`
  - `v0023_maintenance_cost_lines`
  - `v0024_maintenance_finance_sync_policy`
  - `v0025_maintenance_schedule_estimate_defaults`
  - `v0026_maintenance_cost_templates`
  - `v0027_maintenance_schedule_template_links`
  - `v0028_maintenance_field_reports`
  - `v0029_business_task_type_function_profiles`
  - `v0030_business_core_merge_audits`
  - `v0032_business_core_assets`
  - `v0033_business_organization_addresses`
  - `v0034_maintenance_actual_template_trace`
  - `v0035_maintenance_visit_type`
  - `v0036_maintenance_visit_result`
  - `v0037_maintenance_cost_line_expense_flag`
  - `v0038_maintenance_work_order_task_type`
  - `v0039_social_community_groups`

## Scripts operativos

### Migrar control DB

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_control_migrations.py
```

### Migrar una tenant DB

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_tenant_migrations \
  --host 127.0.0.1 \
  --port 5432 \
  --database tenant_empresa_bootstrap \
  --username user_empresa_bootstrap \
  --password TU_PASSWORD
```

### Sincronizar todos los tenants activos en linea

Usa este script cuando cambió el esquema tenant y quieres dejar `platform_control` y las tenant DB alineadas sin depender del worker:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/sync_active_tenant_schemas.py
```

Opcionalmente puedes restringirlo:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/sync_active_tenant_schemas.py --slug empresa-demo
```

Estado local validado al cierre actual:

- `staging` y `production` convergen 4/4 sobre `0039_social_community_groups`

## Integracion con el backend

Hoy las migraciones tambien entran por estas vias:

- `init_control_db.py` ejecuta migraciones de control
- `TenantSchemaService` ejecuta migraciones tenant
- el provisioning de un tenant nuevo ya usa ese servicio
- `POST /platform/tenants/{tenant_id}/sync-schema` permite sincronizar una tenant DB existente
- `GET /platform/tenants/{tenant_id}/schema-status` deja leer version actual, ultima version disponible y migraciones pendientes
- `POST /tenant/sync-schema` ya deja a un `tenant admin` sincronizar su propio esquema desde el portal
- `GET /tenant/schema-status` ya deja leer ese estado desde el propio tenant

## Trazabilidad actual por tenant

Hoy ya existe trazabilidad minima de esquema tenant en dos capas:

- en la tenant DB:
  - `tenant_schema_migrations`
- en `platform_control.tenants`:
  - `tenant_schema_version`
  - `tenant_schema_synced_at`

Eso permite que `Tenants` muestre:

- version actual aplicada
- ultima version disponible
- cantidad de migraciones pendientes
- ultima sincronizacion registrada

Importante:

- `sync-schema` solo funciona si el tenant ya tiene completa su configuracion de DB
- si falta `db_host`, `db_port`, `db_name` o `db_user`, primero hay que ejecutar el provisioning `create_tenant_database`
- la via tenant-side ya encola un job asíncrono visible en vez de ejecutar inline
- el provisioning inicial ya deja encolado un follow-up `sync_tenant_schema`
- para post-deploy masivo ya existe `POST /platform/tenants/schema-sync/bulk`
- como respaldo operativo también existe `backend/app/scripts/enqueue_active_tenant_schema_sync.py`
- para una sincronizacion inmediata y directa sin cola ahora existe `backend/app/scripts/sync_active_tenant_schemas.py`
- el wrapper `deploy/verify_backend_deploy.sh` ya ejecuta esa corrida masiva post-deploy por defecto, salvo que `BACKEND_AUTO_SYNC_POST_DEPLOY=false`
- si una migracion tenant queda marcada como aplicada pero faltan columnas fisicas, la correccion debe entrar como nueva migracion reparadora; por ejemplo, `0013_finance_transaction_voids_repair` repara tenants que hubieran quedado en `0012_finance_transaction_voids` sin las columnas reales de anulacion

## Estrategia vigente por modulo

- la cadena tenant es global y acumulativa; no existen ramas paralelas de migraciones por modulo
- cada modulo nuevo entra como nuevas versiones sobre `backend/migrations/tenant/`
- las dependencias entre modulos se resuelven por orden de la cadena, no por runners separados
- activar o desactivar un modulo por contrato no sube ni baja esquema; la habilitación contractual y el esquema son capas distintas
- si una migracion requiere repair o backfill para tenants existentes, ese cierre entra como:
  - nueva migración reparadora
  - o tooling explícito de convergencia documentado

## Politica de downgrade y recovery

- no existe downgrade destructivo in-place como camino normal
- rollback de código no revierte migraciones ni datos
- si una migración falla a mitad de camino:
  - recovery preferido = fix forward
  - o restore drill / restore documentado cuando haga falta
- si una migracion deja tracking adelantado pero columnas faltantes:
  - la correccion entra como nueva migración reparadora
  - no se edita la migración vieja ya aplicada en runtime

## Cierre actual

- la `Etapa 10` ya queda suficientemente cerrada para el alcance actual:
  - migraciones versionadas reales en `control` y `tenant`
  - sync administrativo por tenant y post-deploy masivo
  - trazabilidad de versión en `platform_control.tenants`
  - estrategia formal por módulo
  - política explícita de downgrade/recovery forward-only

## Regla para developers

Cuando agregues una tabla o cambio de esquema:

1. crear la migracion correspondiente en `backend/migrations/...`
2. agregar o actualizar pruebas de migracion
3. actualizar el runbook o la doc del modulo afectado
4. validar como entra el cambio para tenants nuevos y tenants existentes
