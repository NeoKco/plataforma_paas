# Tenant Data Portability Model

Modelo funcional y técnico para exportar e importar datos tenant en formato portable.

Este frente nace para resolver dos necesidades distintas:

- respaldo portable por tenant para consulta o migración
- importación controlada de datos hacia un tenant nuevo o existente
- operación del mismo flujo tanto desde `platform_admin` como desde `tenant_portal` admin

No reemplaza el respaldo técnico canónico de PostgreSQL.

## 1. Decisión principal

La plataforma debe manejar dos capas distintas de respaldo:

### Respaldo técnico canónico

- formato: `pg_dump` / `.sql.gz`
- objetivo: recuperación seria ante desastre
- alcance: base tenant completa
- estado actual: ya existe y sigue siendo la fuente de verdad operativa

### Respaldo portable por tenant

- formato: `zip` con `manifest.json` + múltiples `csv`
- objetivo: migración, portabilidad y restauración parcial
- alcance: paquete portable soportado por la plataforma o solo datos funcionales según `export_scope`
- estado actual:
  - export/import `portable_full`: implementado
  - export/import `functional_data_only`: implementado
  - superficie `platform_admin`: implementada
  - superficie `tenant_portal` admin: implementada en repo

Regla cerrada:

- `CSV` no reemplaza `pg_dump`
- `CSV` complementa `pg_dump`

## 2. Casos de uso reales

- sacar datos de un tenant para llevarlos a otra instalación del PaaS
- migrar un cliente desde una instalación antigua o un tenant de pruebas
- reconstruir dominios concretos sin restaurar toda la base
- dejar un paquete auditable por tenant para revisión operativa
- importar datos históricos a un tenant recién provisionado

## 3. Scopes soportados

### `portable_full`

- incluye identidad tenant soportada por el contrato portable
- incluye roles y usuarios
- incluye datos funcionales soportados por dominio

### `functional_data_only`

- excluye identidad tenant
- excluye roles y usuarios
- deja solo datos funcionales soportados por dominio

### Compatibilidad heredada

- `portable_minimum` se mantiene solo para importar paquetes antiguos ya emitidos

## 4. Qué se debe exportar

No conviene exportar la base completa como un solo CSV.

La unidad correcta es:

- un paquete por tenant
- múltiples archivos por tabla o por dominio

Paquete sugerido:

- `manifest.json`
- `core/users.csv`
- `business_core/organizations.csv`
- `business_core/clients.csv`
- `business_core/contacts.csv`
- `business_core/sites.csv`
- `business_core/assets.csv`
- `maintenance/installations.csv`
- `maintenance/work_orders.csv`
- `maintenance/history.csv`
- `maintenance/due_items.csv`
- `finance/accounts.csv`
- `finance/categories.csv`
- `finance/transactions.csv`
- `finance/budgets.csv`
- `finance/loans.csv`

Regla práctica:

- los adjuntos binarios no deben ir dentro del CSV
- los adjuntos deben quedar referenciados en el `manifest` o en un directorio separado del paquete si después se decide soportarlos

## 5. Estructura del paquete

Ejemplo:

```text
tenant-export__ieris-ltda__20260408_221500.zip
  manifest.json
  checksums.json
  core/users.csv
  business_core/organizations.csv
  business_core/clients.csv
  business_core/contacts.csv
  business_core/sites.csv
  maintenance/installations.csv
  maintenance/work_orders.csv
  maintenance/history.csv
  finance/accounts.csv
  finance/categories.csv
  finance/transactions.csv
```

`manifest.json` debe incluir al menos:

- `export_version`
- `platform_version`
- `tenant_slug`
- `tenant_id`
- `tenant_type`
- `plan_code`
- `schema_version`
- `generated_at`
- `generated_by`
- `modules_included`
- `files`
- `row_counts`
- `checksums`

## 6. Estructura de tablas recomendada

Este frente debe vivir en `platform_control`, no dentro de un módulo tenant concreto.

Tablas nuevas sugeridas:

### `tenant_data_transfer_jobs`

- `id`
- `tenant_id`
- `job_type` (`export_csv`, `import_csv`)
- `status` (`pending`, `running`, `completed`, `failed`, `cancelled`)
- `requested_by_platform_user_id`
- `source_kind` (`tenant_live`, `uploaded_package`)
- `target_kind` (`download_package`, `tenant_live`)
- `scope_json`
- `artifact_path`
- `manifest_path`
- `error_code`
- `error_message`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

### `tenant_data_transfer_job_items`

- `id`
- `job_id`
- `module_code`
- `resource_code`
- `source_table`
- `target_table`
- `status`
- `row_count`
- `checksum`
- `error_message`
- `created_at`
- `updated_at`

### `tenant_data_transfer_artifacts`

- `id`
- `job_id`
- `artifact_kind` (`zip`, `manifest`, `csv`, `report`)
- `storage_path`
- `filename`
- `content_type`
- `size_bytes`
- `sha256`
- `expires_at`
- `created_at`

Decisión de ownership:

- `platform_control` gobierna el job y el paquete
- cada módulo tenant expone su propio `export/import contract` interno

## 7. Backend propuesto

Patrón esperado:

- `router`
- `service`
- `repository`

Slices sugeridos:

- `backend/app/apps/platform_control/api/tenant_data_portability_routes.py`
- `backend/app/apps/platform_control/services/tenant_data_portability_service.py`
- `backend/app/apps/platform_control/services/tenant_csv_export_service.py`
- `backend/app/apps/platform_control/services/tenant_csv_import_service.py`
- `backend/app/apps/platform_control/repositories/tenant_data_transfer_job_repository.py`
- `backend/app/apps/platform_control/repositories/tenant_data_transfer_artifact_repository.py`

Contratos HTTP sugeridos:

- `POST /platform/tenants/{tenant_id}/data-export-jobs`
- `GET /platform/tenants/{tenant_id}/data-export-jobs`
- `GET /platform/tenants/{tenant_id}/data-export-jobs/{job_id}`
- `GET /platform/tenants/{tenant_id}/data-export-jobs/{job_id}/download`
- `POST /platform/tenants/{tenant_id}/data-import-jobs`
- `GET /platform/tenants/{tenant_id}/data-import-jobs`
- `GET /platform/tenants/{tenant_id}/data-import-jobs/{job_id}`
- `POST /tenant/data-export-jobs`
- `GET /tenant/data-export-jobs`
- `GET /tenant/data-export-jobs/{job_id}`
- `GET /tenant/data-export-jobs/{job_id}/download`
- `POST /tenant/data-import-jobs`
- `GET /tenant/data-import-jobs`
- `GET /tenant/data-import-jobs/{job_id}`

## 8. Flujo UI sugerido

Superficies operativas:

- `Platform Admin > Tenants`
- `Tenant Portal > Resumen técnico`, solo para admin tenant

En el detalle del tenant o en el resumen técnico, abrir un bloque nuevo:

- `Datos portables`

Acciones:

- `Exportar paquete portable`
- `Importar paquete portable`
- `Ver historial`
- `Elegir modo: Paquete completo / Solo datos funcionales`

Lectura mínima visible:

- último export
- último import
- estado del último job
- actor
- fecha
- módulos incluidos

## 9. Reglas de negocio

- no permitir import sobre tenants `archived`
- no permitir import sobre tenants no provisionados
- no permitir import si `db_configured=false`
- no permitir import si el esquema tenant está atrasado
- export sí puede correr sobre tenant `active` aun si hay billing en gracia
- el import debe validar `schema_version` antes de escribir
- el import debe soportar `dry_run` antes de `apply`
- el import debe dejar reporte de conflictos y conteos por recurso
- el export debe poder limitarse por módulos o recursos
- el export debe dejar claro qué `export_scope` emitió el paquete
- el import debe ser idempotente o explicitar claramente qué estrategia usa:
  - `skip_existing`
  - `upsert_safe`
  - `replace_allowed_resources`

## 10. Estrategia recomendada de importación

No conviene implementar un import “ciego”.

La primera versión debe exigir:

- tenant destino ya provisionado
- esquema al día
- `dry_run` obligatorio antes de `apply`
- `manifest` válido
- checksums válidos
- compatibilidad de versión declarada

Orden de import recomendado:

1. `business-core`
2. `maintenance`
3. `finance`

Esto respeta dependencias reales del producto.

## 11. Riesgos que hay que evitar

- vender CSV como sustituto de backup técnico
- importar datos sobre un tenant con esquema atrasado
- mezclar adjuntos binarios con export de tablas
- importar IDs crudos sin estrategia de mapeo
- romper ownership entre `business-core` y `maintenance`
- permitir imports destructivos sin `dry_run`

## 12. Cobertura esperada

Backend:

- tests de manifest
- tests de checksums
- tests de `dry_run`
- tests de validación de schema
- tests de export por módulo
- tests de import idempotente

Browser/E2E cuando exista UI:

- alta de job de export desde `Tenants`
- lectura del historial de jobs
- alta de import en `dry_run`
- bloqueo visible cuando el tenant no está listo
- confirmación visible de `apply` tras `dry_run`

Smoke sugerido futuro:

- `platform-admin-tenant-data-export-import.smoke.spec.ts`

## 12. Roadmap por fases

### Fase 1. Export portable mínimo

- jobs de export en `platform_control`
- `manifest.json`
- `zip` por tenant
- CSV para `business-core` y `maintenance`
- descarga desde `platform_admin`

### Fase 2. Import controlado mínimo

Estado: implementada en repo.

- upload de paquete `zip`
- validación de `manifest`
- validación de checksums
- validación de `schema_version`
- `dry_run`
- `apply` con estrategia inicial `skip_existing`
- historial visible de jobs por tenant en `platform_admin > Tenants`

### Fase 3. Cobertura ampliada por dominio

- `finance`
- reportes de conflicto más ricos
- historial visual completo

### Fase 4. Integración operativa

- almacenamiento externo opcional
- caducidad de artefactos
- observabilidad y métricas

## 13. Estado de esta decisión

Este frente ya dejó de estar solo en diseño:

- Fase 1: implementada
- Fase 2 mínima: implementada en repo

El siguiente paso recomendado ya no es abrir el frente, sino validar browser/despliegue y luego endurecer Fase 3.

No está implementado aún.

Su implementación debe respetar:

- backup PostgreSQL como canónico
- CSV como portabilidad
- `dry_run` antes de `apply`
- `platform_control` como dueño del workflow
