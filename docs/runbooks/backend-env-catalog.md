# Catalogo de Variables de Entorno Backend

Este documento resume las variables de entorno principales del backend y como deberian usarse por categoria.

No reemplaza `.env.example`, pero ayuda a developers y operadores a entender que grupo afecta cada variable.

## 1. App y runtime general

- `APP_NAME`: nombre de la app
- `APP_VERSION`: version informativa
- `DEBUG`: modo debug. Valor recomendado: `true` o `false`. Por compatibilidad, el backend tambien tolera alias heredados como `development`, `debug`, `release` o `production`, pero no deberian seguir usandose en nuevos `.env`.
- `APP_ENV`: `development`, `staging`, `production`, `test`
- `PLATFORM_INSTALLED`: marca logica de plataforma instalada
- `INSTALL_FLAG_FILE`: archivo local que marca instalacion
- `BACKEND_CORS_ALLOW_ORIGINS`: lista separada por comas de origenes frontend permitidos

## 2. Base de datos de control

- `CONTROL_DB_HOST`
- `CONTROL_DB_PORT`
- `CONTROL_DB_NAME`
- `CONTROL_DB_USER`
- `CONTROL_DB_PASSWORD`
- `CONTROL_DB_POOL_SIZE`
- `CONTROL_DB_MAX_OVERFLOW`
- `CONTROL_DB_POOL_TIMEOUT_SECONDS`
- `CONTROL_DB_POOL_RECYCLE_SECONDS`

Uso:

- runtime de `platform_control`
- auth de plataforma
- tenants
- billing
- provisioning jobs

## 3. PostgreSQL administrativo

- `POSTGRES_ADMIN_PASSWORD`

Uso:

- instalacion
- provisioning tenant

## 4. JWT y sesion

- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ISSUER`
- `JWT_PLATFORM_AUDIENCE`
- `JWT_TENANT_AUDIENCE`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_MINUTES`

Impacto:

- auth `platform`
- auth `tenant`
- refresh y logout

## 5. Bases tenant

- `TENANT_DB_POOL_SIZE`
- `TENANT_DB_MAX_OVERFLOW`
- `TENANT_DB_POOL_TIMEOUT_SECONDS`
- `TENANT_DB_POOL_RECYCLE_SECONDS`

Y variables dinamicas por tenant, por ejemplo:

- `TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP`

Uso:

- conexiones tenant por request
- bootstrap y runtime tenant

## 6. Redis

- `REDIS_URL`

Uso actual:

- broker de provisioning
- rate limiting distribuido tenant cuando aplica

## 7. Quotas tenant base

- `TENANT_API_READ_REQUESTS_PER_MINUTE`
- `TENANT_API_WRITE_REQUESTS_PER_MINUTE`
- `TENANT_API_RATE_LIMIT_BACKEND`
- `TENANT_API_RATE_LIMIT_REDIS_URL`
- `TENANT_API_RATE_LIMIT_KEY_PREFIX`

Uso:

- rate limiting base por tenant

## 8. Politicas por plan

- `TENANT_PLAN_RATE_LIMITS`
- `TENANT_PLAN_ENABLED_MODULES`
- `TENANT_PLAN_MODULE_LIMITS`

Uso:

- planes
- modulos habilitados
- quotas por modulo

Baseline actual si no se sobreescriben en `.env`:

- `mensual`
- `trimestral`
- `semestral`
- `anual`

En ese baseline todos los planes habilitan los mismos modulos y lo que cambia es:

- cuota `read/write`
- limites de usuarios
- limites de movimientos financieros

## 9. Politicas de billing grace

- `TENANT_BILLING_GRACE_RATE_LIMITS`
- `TENANT_BILLING_GRACE_ENABLED_MODULES`
- `TENANT_BILLING_GRACE_MODULE_LIMITS`

Uso:

- degradacion automatica durante gracia de billing

## 10. Webhook y billing

- `BILLING_STRIPE_WEBHOOK_SECRET`
- `BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS`

Uso:

- validacion de webhook Stripe

## 11. Alertas de billing

- `BILLING_ALERT_DUPLICATE_EVENTS_THRESHOLD`
- `BILLING_ALERT_IGNORED_EVENTS_THRESHOLD`
- `BILLING_ALERT_PROVIDER_EVENTS_THRESHOLD`

Uso:

- alertas operativas de billing

## 12. Worker de provisioning

- `WORKER_POLL_INTERVAL_SECONDS`
- `WORKER_MAX_JOBS_PER_CYCLE`
- `WORKER_MAX_FAILURES_PER_CYCLE`
- `WORKER_RETRY_BASE_SECONDS`
- `WORKER_MAX_RETRY_SECONDS`
- `WORKER_SELECTION_BUFFER_MULTIPLIER`
- `WORKER_BACKLOG_AGING_THRESHOLD_MINUTES`
- `WORKER_JOB_TYPES`
- `WORKER_PROFILES`
- `WORKER_JOB_TYPE_PRIORITIES`
- `WORKER_JOB_TYPE_LIMITS`
- `WORKER_JOB_TYPE_BACKLOG_LIMITS`
- `WORKER_TENANT_TYPE_PRIORITIES`
- `WORKER_TENANT_TYPE_LIMITS`
- `WORKER_TENANT_TYPE_BACKLOG_LIMITS`
- `WORKER_LOCK_FILE`

Uso:

- scheduler del worker
- prioridades
- cuotas
- backlog

## 13. Provisioning y broker

- `PROVISIONING_JOB_MAX_ATTEMPTS`
- `PROVISIONING_DISPATCH_BACKEND`
- `PROVISIONING_BROKER_URL`
- `PROVISIONING_BROKER_KEY_PREFIX`
- `PROVISIONING_BROKER_PROCESSING_LEASE_SECONDS`
- `PROVISIONING_BROKER_DLQ_RETENTION_SECONDS`

Uso:

- dispatch `database` o `broker`
- Redis DLQ

## 14. Alertas de provisioning

- `PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_FAILED_ERROR_CODE_THRESHOLD`
- `PROVISIONING_ALERT_FAILED_ERROR_CODE_SCAN_LIMIT`
- `PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD`

Uso:

- alertas operativas de provisioning

## 15. Observabilidad externa minima

- `OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED`
- `OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH`

Uso:

- exportacion textfile para Prometheus

## Reglas de uso

### 1. Preferencia

Si una politica ya es configurable por `.env`, no hace falta programar una regla nueva solo para cambiar un valor.

### 2. Seguridad

Nunca usar en produccion valores inseguros para:

- `JWT_SECRET_KEY`
- `CONTROL_DB_PASSWORD`
- passwords tenant bootstrap
- secretos de webhook

### 3. Cambios estructurales

Si necesitas una variable nueva porque el backend no soporta cierta politica, eso primero requiere cambio de codigo.

No se debe crear una env var “huérfana” que el backend no consuma.

## Resumen ejecutivo

Este catalogo existe para distinguir:

- variables que solo ajustan valores
- de cambios que realmente requieren nueva logica backend
