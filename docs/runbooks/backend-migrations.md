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

- `0001_initial`

Crea:

- `platform_installation`
- `platform_users`
- `tenants`
- `provisioning_jobs`

### Tenant

- `0001_core`
- `0002_finance_entries`

Crea:

- `tenant_info`
- `roles`
- `users`
- `finance_entries`

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

- `empresa-demo` -> `0021_maintenance_schedules_and_due_items`
- `condominio-demo` -> `0021_maintenance_schedules_and_due_items`
- `empresa-bootstrap` -> `0021_maintenance_schedules_and_due_items`

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

## Limitaciones actuales

Todavia falta:

- estrategia de downgrade
- dependencias entre migraciones por modulo
- metadata de version por modulo activado
- integracion formal con CI/CD y despliegue

## Regla para developers

Cuando agregues una tabla o cambio de esquema:

1. crear la migracion correspondiente en `backend/migrations/...`
2. agregar o actualizar pruebas de migracion
3. actualizar el runbook o la doc del modulo afectado
4. validar como entra el cambio para tenants nuevos y tenants existentes
