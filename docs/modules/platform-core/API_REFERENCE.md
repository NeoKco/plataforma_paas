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

- `GET /platform/auth-audit/`
- `GET /platform/tenants/policy-history/recent`

Capabilities:

- `GET /platform/capabilities`
- `GET /platform/ai-runtime-config`
- `POST /platform/ai-runtime-config`
- `POST /platform/ai-runtime-config/validate`
- `GET /platform/security-posture`
- `GET /platform/security-posture/runtime-secret-plan`
- `GET /platform/security-posture/runtime-secret-campaigns`

Payload operativo actual de `GET /platform/capabilities`:

- `plan_modules`
- `module_dependency_catalog`
- `ui_label_catalog`
- `legacy_plan_fallback_available`
- `subscription_activation_model`
- `subscription_billing_cycles`
- `base_plan_catalog`
- `module_subscription_catalog`
- `legacy_plan_catalog` solo si todavía existe algún tenant realmente legacy
- `current_provisioning_dispatch_backend`

Claves relevantes nuevas dentro de `ui_label_catalog`:

- `subscription_statuses`
- `subscription_item_kinds`

Payload operativo actual de `GET /platform/security-posture`:

- `app_env`
- `production_ready`
- `findings_count`
- `findings`
- `tenant_secrets_runtime`
- `tenant_secrets_legacy`
- `tenant_secrets_isolated_from_legacy`
- `tenant_secret_distribution_summary`

Payload operativo actual de `GET /platform/ai-runtime-config`:

- `app_env`
- `runtime_secret_file`
- `legacy_env_file`
- `isolated_from_legacy`
- `source`
- `api_url`
- `model_id`
- `max_tokens`
- `temperature`
- `timeout`
- `api_key_configured`
- `api_key_masked`

Mutaciones nuevas del carril IA runtime:

- `POST /platform/ai-runtime-config`
- `POST /platform/ai-runtime-config/validate`

Regla operativa:

- la key de la API IA se administra desde consola `superadmin`
- se persiste backend-side en `AI_RUNTIME_SECRETS_FILE`
- el navegador nunca vuelve a recibir la key completa

Payload operativo actual de `GET /tenant/info`:

- `tenant`
- `user`
- `ui_label_catalog`

Lectura contractual visible actual de `GET /platform/tenants` / `GET /platform/tenants/{tenant_id}`:

- `subscription_status`
- `subscription_billing_cycle`
- `subscription_current_period_starts_at`
- `subscription_current_period_ends_at`
- `subscription_next_renewal_at`
- `subscription_grace_until`
- `subscription_is_co_termed`
- `subscription_items[]` con:
  - `item_kind`
  - `module_key`
  - `billing_cycle`
  - `status`
  - `starts_at`
  - `renews_at`
  - `ends_at`
  - `is_prorated`

Regla visible nueva del frontend:

- `ui_label_catalog` es la fuente de verdad backend-driven para labels visibles de:
  - modulos
  - tipos de tenant
  - estados
  - ciclos billing
  - scopes
  - eventos `policy/auth`
  - `changed_fields`
  - claves de limites
- `platform_admin -> Tenants`, `platform_admin -> Actividad` y `tenant_portal -> Resumen tecnico` ya consumen ese catalogo en vez de depender de codigos internos o heuristicas locales

Lectura operativa actual de `GET /platform/auth-audit/`:

- filtros:
  - `limit`
  - `subject_scope`
  - `outcome`
  - `event_type`
  - `tenant_slug`
  - `request_id`
  - `search`
- campos por evento:
  - `id`
  - `event_type`
  - `subject_scope`
  - `outcome`
  - `subject_user_id`
  - `tenant_slug`
  - `email`
  - `token_jti`
  - `request_id`
  - `request_path`
  - `request_method`
  - `detail`
  - `created_at`

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
- `POST /platform/security-posture/sync-runtime-secrets`

Esta mutación:

- replica el secreto DB tenant al `TENANT_SECRETS_FILE` runtime
- reutiliza el valor ya runtime-managed si el tenant ya estaba bien sincronizado
- ya no debe rescatar desde `/.env` como camino normal de consola
- si el secreto solo sobrevive en `/.env`, responde conflicto operativo y exige rescate controlado
- devuelve:
  - `tenant`
  - `env_var_name`
  - `managed_secret_path`
  - `source`
  - `source_path`
  - `already_runtime_managed`
  - `synced_at`

Mutaciones batch nuevas para el mismo carril:

- `POST /platform/security-posture/sync-runtime-secrets`
- `POST /platform/security-posture/rotate-db-credentials`

Lectura central nueva previa al batch:

- `GET /platform/security-posture/runtime-secret-plan`

Esta lectura:

- recorre tenants activos configurados
- clasifica cada tenant antes de mutar:
  - `runtime_ready`
  - `sync_recommended`
  - `legacy_rescue_required`
  - `missing_secret`
  - `skipped_not_configured`
- devuelve por tenant:
  - `tenant_id`
  - `tenant_slug`
  - `outcome`
  - `recommended_action`
  - `detail`
  - `source`
  - `eligible_for_sync_batch`
  - `eligible_for_rotation_batch`
- resume:
  - `processed`
  - `runtime_ready`
  - `sync_recommended`
  - `skipped_not_configured`
  - `legacy_rescue_required`
  - `missing_secret`
  - `planned_at`

Campañas batch gobernadas:

- `POST /platform/security-posture/sync-runtime-secrets`
- `POST /platform/security-posture/rotate-db-credentials`

Ahora ambas mutaciones aceptan opcionalmente:

- `tenant_slugs[]`
- `excluded_tenant_slugs[]`

Regla actual:

- si no se envía selección, el batch opera sobre todos los tenants activos
- si se envía `tenant_slugs`, el batch queda acotado a ese subconjunto
- si se envía solo `excluded_tenant_slugs`, el batch opera sobre todos los tenants activos excepto ese subconjunto
- si se envían ambos, primero se acota por `tenant_slugs` y luego se excluyen los `excluded_tenant_slugs`
- la consola ya usa esta capacidad para campañas manuales cortas desde `Plan central de secretos runtime`, tanto en modo incluir como en modo excluir

Persistencia formal de campañas:

- `GET /platform/security-posture/runtime-secret-campaigns`

Esta lectura devuelve campañas recientes con:

- `campaign_id`
- `campaign_type`
- `scope_mode`
- `tenant_slugs`
- `excluded_tenant_slugs`
- `processed`
- `success_count`
- `already_runtime_managed`
- `skipped_not_configured`
- `skipped_legacy_rescue_required`
- `failed`
- `actor`
- `recorded_at`
- `items[]` por tenant con:
  - `tenant_id`
  - `tenant_slug`
  - `outcome`
  - `detail`
  - `source`
  - `env_var_name`
  - `managed_secret_path`
  - `already_runtime_managed`
  - `rotated_at`

Esta mutación:

- recorre tenants activos
- solo sincroniza desde fuentes runtime-managed
- no rescata desde `/.env`
- deja a los tenants todavía legacy como `skipped_legacy_rescue_required`
- devuelve:
  - `processed`
  - `synced`
  - `already_runtime_managed`
  - `skipped_not_configured`
  - `skipped_legacy_rescue_required`
  - `failed`
  - `synced_at`
  - `campaign_id`
  - `data[]` por tenant con:
    - `tenant_id`
    - `tenant_slug`
    - `outcome`
    - `detail`
    - `source`
    - `already_runtime_managed`

Mutación batch nueva para rotación centralizada:

- `POST /platform/security-posture/rotate-db-credentials`

Esta mutación:

- recorre tenants activos
- rota la password técnica DB solo para tenants con secreto runtime gestionado
- valida el acceso con la credencial nueva antes de confirmar
- no rescata desde `/.env`
- deja a los tenants todavía legacy como `skipped_legacy_rescue_required`
- devuelve:
  - `processed`
  - `rotated`
  - `skipped_not_configured`
  - `skipped_legacy_rescue_required`
  - `failed`
  - `rotated_at`
  - `campaign_id`
  - `data[]` por tenant con:
    - `tenant_id`
    - `tenant_slug`
    - `outcome`
    - `detail`
    - `env_var_name`
    - `managed_secret_path`
    - `rotated_at`

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
    - sirve para corregir drift de distribución cuando el valor válido ya existe en fuentes runtime-managed
    - si el secreto solo sobrevive en `/.env`, el rescate ya no ocurre aquí; debe usarse tooling controlado
  - `POST /platform/security-posture/sync-runtime-secrets`:
    - ejecuta la misma lógica en batch sobre tenants activos
    - deja visibilidad centralizada desde `Configuración -> Postura de secretos y runtime`
    - no convierte `/.env` en carril normal; los tenants legacy quedan marcados para rescate controlado
  - `POST /platform/security-posture/rotate-db-credentials`:
    - ejecuta rotación centralizada de credenciales técnicas tenant en batch
    - usa el mismo carril runtime-only y no rescata desde `/.env`
    - si un tenant todavía depende de legacy, lo deja como `skipped_legacy_rescue_required`
    - la consola lo expone como `Rotar credenciales central`
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
