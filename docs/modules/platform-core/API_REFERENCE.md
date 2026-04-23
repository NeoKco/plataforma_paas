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
- `PATCH /platform/tenants/{tenant_id}/subscription`
- `POST /platform/tenants/{tenant_id}/subscription/migrate-legacy`
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
- `GET /platform/security-posture`

Payload operativo actual de `GET /platform/capabilities`:

- `plan_modules`
- `module_dependency_catalog`
- `legacy_plan_fallback_available`
- `subscription_activation_model`
- `subscription_billing_cycles`
- `base_plan_catalog`
- `module_subscription_catalog`
- `legacy_plan_catalog` solo si todavía existe algún tenant realmente legacy
- `current_provisioning_dispatch_backend`

Payload operativo actual de `GET /platform/security-posture`:

- `app_env`
- `production_ready`
- `findings_count`
- `findings`
- `tenant_secrets_runtime`
- `tenant_secrets_legacy`
- `tenant_secrets_isolated_from_legacy`
- `tenant_secret_distribution_summary`

`tenant_secret_distribution_summary` hoy resume:

- `audited_tenants`
- `runtime_ready_count`
- `missing_runtime_secret_count`
- `legacy_rescue_available_count`
- `runtime_ready_slugs`
- `missing_runtime_secret_slugs`
- `legacy_rescue_available_slugs`

Regla operativa vigente del carril tenant secrets:

- resolución normal:
  - `TENANT_SECRETS_FILE`
  - `os.environ`
  - settings
- `/.env` legacy ya no debe contar como candidato normal si el runtime ya quedó separado
- el fallback legacy queda solo como rescate explícito

Mutación operativa nueva para el carril tenant secrets:

- `POST /platform/tenants/{tenant_id}/sync-db-runtime-secret`

Esta mutación:

- replica el secreto DB tenant al `TENANT_SECRETS_FILE` runtime
- reutiliza el valor ya runtime-managed si el tenant ya estaba bien sincronizado
- permite rescate legacy explícito solo dentro de esta acción cuando el tenant todavía existe en `/.env`
- devuelve:
  - `tenant`
  - `env_var_name`
  - `managed_secret_path`
  - `source`
  - `source_path`
  - `already_runtime_managed`
  - `synced_at`

## Notas

- la referencia detallada de contratos sigue viviendo en la documentación API general
- `module_dependency_catalog` hoy expone filas tipo:
  - `module_key`
  - `requires_modules`
  - `reason`
- `base_plan_catalog` hoy expone filas tipo:
  - `plan_code`
  - `display_name`
  - `included_modules`
  - `default_billing_cycle`
  - `allowed_billing_cycles`
  - `is_default`
  - `compatibility_policy_code`
  - `read_requests_per_minute`
  - `write_requests_per_minute`
  - `module_limits`
- `module_subscription_catalog` hoy expone filas tipo:
  - `module_key`
  - `display_name`
  - `activation_kind`
  - `billing_cycles`
- `subscription_activation_model` hoy queda en:
  - `base_plan_plus_module_subscriptions`
- la consola visible hoy consume este payload así:
  - `Configuración`:
    - `Planes base`
    - `Módulos arrendables`
    - `Ciclos comerciales`
    - `Política efectiva actual por plan`
  - `Tenants > Plan y módulos`:
    - `Plan Base aprobado`
    - `Contrato comercial tenant`
    - `Plan operativo actual`
    - add-ons visibles
    - dependencias visibles
    - activación efectiva visible:
      - incluido por suscripción
      - add-ons arrendados
      - módulos técnicos
      - fallback legacy
      - fuente efectiva
      - `Modelo contractual`
      - `Fuente baseline`
      - `plan_code` / `tenant_plan_code` solo quedan visibles si `legacy_plan_fallback_active=true`
  - `PATCH /platform/tenants/{tenant_id}/subscription` hoy acepta:
    - `base_plan_code`
    - `billing_cycle`
    - `addon_items[]`
  - `POST /platform/tenants/{tenant_id}/sync-db-runtime-secret`:
    - sincroniza el secreto DB tenant al archivo runtime dedicado
    - no rota la credencial PostgreSQL
    - sirve para corregir drift de distribución cuando el valor válido ya existe
  - `POST /platform/tenants` hoy acepta:
    - `base_plan_code`
  - para tenants nuevos:
    - crea `tenant_subscriptions` desde el alta
    - persiste `plan_code = null`
  - `PATCH /platform/tenants/{tenant_id}/plan`:
    - queda como write path legacy
    - para tenants contract-managed responde `409 Tenant is already contract-managed`
    - el camino contractual normal sigue siendo `PATCH /platform/tenants/{tenant_id}/subscription`
  - y devuelve además:
    - `current_period_starts_at`
    - `current_period_ends_at`
    - `next_renewal_at`
    - `grace_until`
    - `is_co_termed`
    - `items[]`
  - `POST /platform/tenants/{tenant_id}/subscription/migrate-legacy`:
    - migra un tenant que todavía depende de `plan_code` al contrato nuevo
    - conserva `Plan Base`, ciclo y add-ons inferidos
    - retira `plan_code` si la migración queda guardada
  - nota:
    - la activación efectiva del tenant ya se resuelve desde `tenant_subscriptions` con fallback legacy por `plan_code`
    - para tenants gestionados por contrato, el baseline de cuotas/límites ya también sale del `Plan Base`
    - en los 4 tenants activos actuales de `staging` y `production`, esa migración legacy ya quedó completada
    - para tenants contract-managed, la API visible ya no expone `plan_code` como baseline normal; ese campo solo debe venir poblado cuando el tenant siga realmente legacy
    - el bootstrap de provisioning para tenants nuevos ya resuelve módulos desde `effective_enabled_modules`, no desde `tenant.plan_code`
    - el alta contractual nueva ya no usa `plan_code` como entrada documentada
- el payload `export_scope` hoy soporta:
  - `portable_full`
  - `functional_data_only`
  - `portable_minimum` solo para compatibilidad de import heredado
- este archivo existe para que `platform-core` mantenga el mismo patrón documental que los módulos funcionales
