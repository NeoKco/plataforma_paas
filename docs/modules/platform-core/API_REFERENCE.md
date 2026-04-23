# Platform Core API Reference

Referencia resumida del bloque central.

Detalle ampliado:

- [index.md](/home/felipe/platform_paas/docs/api/index.md)
- [frontend-contract-stability.md](/home/felipe/platform_paas/docs/api/frontend-contract-stability.md)

## Áreas principales

- autenticación `platform`
- tenants
- provisioning
- billing
- platform users
- activity
- capabilities

## Endpoints clave

Autenticación:

- `/login`
- `/platform/*` protegidos por JWT `platform`

Tenants:

- `GET /platform/tenants`
- `POST /platform/tenants`
- `GET /platform/tenants/{tenant_id}`
- `POST /platform/tenants/{tenant_id}/data-export-jobs`
- `GET /platform/tenants/{tenant_id}/data-export-jobs`
- `GET /platform/tenants/{tenant_id}/data-export-jobs/{job_id}`
- `GET /platform/tenants/{tenant_id}/data-export-jobs/{job_id}/download`
- `POST /platform/tenants/{tenant_id}/data-import-jobs`
- `GET /platform/tenants/{tenant_id}/data-import-jobs`
- `GET /platform/tenants/{tenant_id}/data-import-jobs/{job_id}`
- mutaciones de identity, lifecycle, maintenance, access policy y billing

Tenant portal:

- `POST /tenant/data-export-jobs`
- `GET /tenant/data-export-jobs`
- `GET /tenant/data-export-jobs/{job_id}`
- `GET /tenant/data-export-jobs/{job_id}/download`
- `POST /tenant/data-import-jobs`
- `GET /tenant/data-import-jobs`
- `GET /tenant/data-import-jobs/{job_id}`

Provisioning:

- `GET /platform/provisioning-jobs/`
- endpoints de métricas y ejecución de jobs

Billing:

- endpoints `platform/billing/*`

Activity:

- endpoints `platform/activity/*`

Capabilities:

- `GET /platform/capabilities`

Payload operativo actual de `GET /platform/capabilities`:

- `plan_catalog`
- `plan_modules`
- `module_dependency_catalog`
- `current_provisioning_dispatch_backend`

## Notas

- la referencia detallada de contratos sigue viviendo en la documentación API general
- `module_dependency_catalog` hoy expone filas tipo:
  - `module_key`
  - `requires_modules`
  - `reason`
- el payload `export_scope` hoy soporta:
  - `portable_full`
  - `functional_data_only`
  - `portable_minimum` solo para compatibilidad de import heredado
- este archivo existe para que `platform-core` mantenga el mismo patrón documental que los módulos funcionales
