# Implementacion Backend Platform

Este documento resume como esta organizado hoy el flujo `platform` dentro de `platform_paas` y que decisiones se tomaron para mantenerlo consistente con el flujo `tenant`.

## Objetivo de esta etapa

Pasar de:

- rutas platform funcionales pero con algo de logica dentro del router

a:

- routers mas delgados
- servicios reutilizables
- responsabilidades mas claras entre auth, operaciones platform y provisioning

## Estructura real usada

Los archivos clave de este flujo viven en:

- `backend/app/apps/platform_control/api/`
- `backend/app/apps/platform_control/services/`
- `backend/app/common/auth/`
- `backend/app/common/db/`
- `backend/app/common/middleware/`

## Flujo actual de autenticacion platform

El login de plataforma vive en:

- `backend/app/apps/platform_control/api/auth_routes.py`
- `backend/app/apps/platform_control/services/auth_service.py`

El flujo es este:

1. la ruta recibe `email` y `password`
2. `PlatformAuthService` busca el usuario en `platform_users`
3. valida activo y password
4. genera `access_token` y `refresh_token`
5. registra el refresh token en `platform_control.auth_tokens`
6. devuelve el par de tokens

Ademas, hoy existen:

- `POST /platform/auth/refresh`
- `POST /platform/auth/logout`

Y la capa auth deja auditoria persistente para:

- login exitoso y fallido
- refresh exitoso y fallido
- logout exitoso

## Middleware y contexto platform

El middleware compartido:

- intercepta rutas `/platform/*`
- ignora `/platform/auth/login` y `/platform/auth/refresh`
- valida Bearer token
- decodifica JWT
- valida `iss`, `aud` y `token_type=access`
- exige `token_scope=platform`
- verifica revocacion basica del access token
- deja contexto en `request.state`

Datos relevantes disponibles:

- `platform_user_id`
- `platform_email`
- `platform_role`
- `token_scope`
- `jwt_payload`

## Dependencias platform

Las rutas platform reutilizan:

- `get_current_token_payload`
- `get_current_platform_context`
- `require_role("superadmin")`

Con eso la validacion de seguridad no queda duplicada en cada endpoint.

## Paso de uniformidad aplicado

Para que `platform` siga el mismo patron que `tenant`, los routers quedaron usando servicios instanciados una sola vez a nivel de modulo.

Ejemplos:

- `platform_auth_service` en `auth_routes.py`
- `tenant_service` en `tenant_routes.py`
- `provisioning_job_service` y `provisioning_service` en `provisioning_job_routes.py`
- `platform_runtime_service` en `routes.py`
- `platform_capability_service` en `routes.py`

La idea es simple:

- el router declara dependencies y devuelve respuesta HTTP
- el servicio encapsula la logica reutilizable

## Capa repository introducida

Para seguir desacoplando el backend, se agrego una primera capa de acceso a datos en:

- `backend/app/apps/platform_control/repositories/platform_user_repository.py`
- `backend/app/apps/platform_control/repositories/tenant_repository.py`
- `backend/app/apps/platform_control/repositories/provisioning_job_repository.py`

Estos repositorios encapsulan operaciones basicas:

- buscar `platform_users` por email
- buscar y persistir `tenants`
- crear, listar y buscar `provisioning_jobs`

Con esto los servicios dejaron de depender directamente de consultas `db.query(...)` en varios puntos.

## Servicios adaptados a repository

En esta etapa quedaron adaptados:

- `PlatformAuthService`
- `TenantService`
- `ProvisioningJobService`
- `apps/provisioning/services/ProvisioningService`

La idea no es sobre-ingenieria; es dejar un punto claro donde mover despues filtros, consultas mas complejas y reutilizacion de acceso a datos.

## Servicio nuevo de runtime

Se agrego:

- `backend/app/apps/platform_control/services/platform_runtime_service.py`

Ese servicio encapsula la consulta de bajo nivel a `platform_control` para `GET /platform/ping-db`.

Esto evita dejar acceso directo al engine dentro del router.

## Rutas platform cubiertas en esta etapa

- `POST /platform/auth/login`
- `GET /platform/ping-db`
- `GET /platform/admin-only`
- `GET /platform/capabilities`
- `POST /platform/tenants/`
- `POST /platform/tenants/{tenant_id}/sync-schema`
- `PATCH /platform/tenants/{tenant_id}/maintenance`
- `PATCH /platform/tenants/{tenant_id}/rate-limit`
- `PATCH /platform/tenants/{tenant_id}/module-limits`
- `PATCH /platform/tenants/{tenant_id}/plan`
- `GET /platform/tenants/{tenant_id}/finance/usage`
- `GET /platform/tenants/{tenant_id}/module-usage`
- `PATCH /platform/tenants/{tenant_id}/billing`
- `PATCH /platform/tenants/{tenant_id}/billing-identity`
- `GET /platform/tenants/billing/events/summary`
- `GET /platform/tenants/billing/events/alerts`
- `GET /platform/tenants/billing/events/alerts/history`
- `POST /platform/tenants/{tenant_id}/billing/sync-event`
- `GET /platform/tenants/{tenant_id}/billing/events`
- `GET /platform/tenants/{tenant_id}/billing/events/summary`
- `POST /platform/tenants/{tenant_id}/billing/events/{sync_event_id}/reconcile`
- `POST /platform/tenants/{tenant_id}/billing/events/reconcile`
- `POST /webhooks/billing/stripe`
- `GET /platform/tenants/{tenant_id}/access-policy`
- `GET /platform/tenants/{tenant_id}/policy-history`
- `PATCH /platform/tenants/{tenant_id}/status`
- `GET /platform/provisioning-jobs/`
- `GET /platform/provisioning-jobs/metrics`
- `GET /platform/provisioning-jobs/metrics/by-job-type`
- `GET /platform/provisioning-jobs/metrics/by-error-code`
- `GET /platform/provisioning-jobs/metrics/history`
- `GET /platform/provisioning-jobs/metrics/cycle-history`
- `GET /platform/provisioning-jobs/metrics/alerts`
- `GET /platform/provisioning-jobs/metrics/alerts/history`
- `GET /platform/provisioning-jobs/broker/dlq`
- `POST /platform/provisioning-jobs/broker/dlq/requeue`
- `POST /platform/provisioning-jobs/{job_id}/requeue`
- `POST /platform/provisioning-jobs/{job_id}/run`

## Control operativo por tenant

Ademas, hoy `platform` expone un catalogo estable de capacidades backend con:

- `GET /platform/capabilities`

Ese endpoint resume para frontend y operacion:

- estados validos de tenant
- estados validos de billing
- scopes y modos de mantenimiento
- modulos de plan reconocidos
- claves de cuota soportadas
- metadatos estructurados por cuota en `module_limit_capabilities`
- proveedores de billing y resultados de sync conocidos
- backends validos para dispatch de provisioning

Con esto el cliente ya no necesita hardcodear listas como `core.users.admin` o `finance.entries.monthly.income`.

Y en backend esas claves ya salen de un registro comun:

- `backend/app/common/policies/module_limit_catalog.py`

Con eso `tenant_plan_policy_service`, `tenant_data_service`, `finance_service` y `module_usage_service` comparten la misma fuente canonica.

En el estado actual, `platform` ya puede marcar tenants en mantenimiento desde `platform_control`.

Eso sirve para:

- congelar escrituras tenant sin apagar todo el backend
- preparar ventanas operativas por tenant
- reducir riesgo antes de restores o trabajos tecnicos

La politica actual soporta:

- `maintenance_mode` manual inmediato
- `maintenance_starts_at`
- `maintenance_ends_at`
- `maintenance_reason`
- `maintenance_scopes`
- `maintenance_access_mode`

Y ademas hoy puede persistir cuotas propias por tenant:

- `api_read_requests_per_minute`
- `api_write_requests_per_minute`

Eso permite que `platform` ajuste tenants concretos sin cambiar los limites globales del backend.

Ademas, hoy puede persistir overrides de limites por modulo para tenants concretos:

- `module_limits_json`
- hoy los primeros casos reales son `finance.entries`, `finance.entries.monthly`, cuotas segmentadas como `finance.entries.monthly.income` y `finance.entries.monthly.expense`, `core.users`, `core.users.active`, `core.users.monthly` y cuotas por rol como `core.users.admin`

Y `platform` ya puede inspeccionar uso real versus limite efectivo del modulo financiero con:

- `GET /platform/tenants/{tenant_id}/finance/usage`

Y ademas ya puede exponer una vista generica por modulo para soporte:

- `GET /platform/tenants/{tenant_id}/module-usage`

## Diferencia operativa entre provisioning y sync de esquema

En operacion real conviene distinguir dos pasos distintos:

- `create_tenant_database`: crea la DB tenant, el usuario tecnico, persiste `db_host`, `db_port`, `db_name`, `db_user` y guarda la password tenant en `.env`
- `POST /platform/tenants/{tenant_id}/sync-schema`: solo aplica migraciones tenant sobre una DB tenant ya existente

Regla practica:

- si el tenant responde `Tenant database configuration is incomplete`, falta provisioning
- si el tenant responde que el schema tenant esta incompleto o faltan tablas como `finance_entries`, corresponde `sync-schema`

En otras palabras:

- `sync-schema` no reemplaza el provisioning inicial
- cambiar un tenant a `active` manualmente no completa su configuracion de DB

Referencia tecnica principal:

- `backend/app/apps/provisioning/services/provisioning_service.py`
- `backend/app/apps/platform_control/services/tenant_service.py`

Ademas, hoy `platform` puede asignar `plan_code` al tenant.

Con eso el backend puede resolver cuotas por plan y tambien modulos habilitados por plan desde configuracion, sin depender todavia de un modulo formal de billing.

Ademas, hoy `platform` puede persistir un estado minimo de billing por tenant:

- `billing_status`
- `billing_status_reason`
- `billing_current_period_ends_at`
- `billing_grace_until`

Y tambien puede persistir identidad externa de billing:

- `billing_provider`
- `billing_provider_customer_id`
- `billing_provider_subscription_id`

Ademas, hoy `platform` puede actualizar esa identidad de forma administrativa con:

- `PATCH /platform/tenants/{tenant_id}/billing-identity`

Con eso el lifecycle tenant ya no depende solo del `status` manual: tambien puede bloquear automaticamente login, refresh y runtime cuando el tenant entra en `past_due` sin gracia, `suspended` o `canceled` fuera de periodo.

Ademas, hoy `platform` ya puede recibir eventos de billing normalizados por tenant desde un proveedor externo o un adaptador interno.

Ese flujo:

- persiste el evento recibido
- aplica el estado de billing al tenant
- evita re-aplicar el mismo evento si llega dos veces
- deja historial consultable por tenant
- preserva identidad externa previa si un evento llega sin todos los identificadores del proveedor
- permite calcular alertas operativas simples por exceso de `duplicate`, `ignored` o volumen total por proveedor
- esas alertas tambien pueden persistirse como historial operativo basico para soporte
- permite reconciliar manualmente el estado actual del tenant desde un evento historico ya persistido
- permite tambien reconciliar en lote un subconjunto reciente filtrando por proveedor, tipo de evento o `processing_result`
- clasifica el ultimo resultado operativo del evento como `applied`, `duplicate`, `ignored` o `reconciled`
- expone tambien un resumen agregado por `provider`, `event_type` y `processing_result` para soporte rapido
- expone ademas una vista global cross-tenant para leer volumen y dispersion operativa por proveedor

Con eso billing ya deja de depender solo de `PATCH` manual y pasa a tener una primera base de sincronizacion idempotente.

Ademas, hoy existe un adaptador inicial para Stripe:

- normaliza eventos externos a un formato interno comun
- intenta resolver primero por `billing_provider_subscription_id`
- luego intenta resolver por `billing_provider_customer_id`
- usa `metadata.tenant_slug` como fallback
- valida `Stripe-Signature` sobre el body crudo con tolerancia temporal
- soporta una entrada tipo webhook publica separada de la auth `platform`
- acepta eventos sin `metadata.tenant_slug` cuando el proveedor entrega `customer` o `subscription`

Eso no reemplaza aun un SDK o firma oficial del proveedor, pero deja lista la capa para dar ese salto sin reestructurar todo el backend.

Eventos Stripe cubiertos hoy:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.marked_uncollectible`
- `invoice.paid`

Si el tenant sigue operativo pero esta dentro de `billing_in_grace`, el backend tambien puede degradar automaticamente:

- cuotas `read/write`
- modulos habilitados

Esa degradacion se toma desde configuracion y hoy tiene prioridad operativa sobre las cuotas por plan mientras dure la gracia.

Ademas, `platform` ya puede consultar la politica efectiva de acceso del tenant en una sola respuesta, sin tener que recomponer manualmente `status` y billing.

Ademas, hoy `platform` ya persiste y consulta historial de cambios de politica tenant para:

- `maintenance`
- `rate_limit`
- `plan`
- `billing`
- `status`
- `billing_identity`
- `billing_sync`
- `billing_reconcile`

Ese historial guarda snapshot anterior, snapshot nuevo, actor y campos cambiados, lo que facilita auditoria operativa sin depender solo del estado actual del tenant.

Cuando el cambio viene por billing externo, el historial ya puede registrar tambien eventos `billing_sync`, dejando trazabilidad de la transicion entre el payload recibido y la politica efectiva del tenant.

Ademas, hoy `platform` tambien controla el lifecycle operativo del tenant:

- `pending`
- `active`
- `suspended`
- `error`
- `archived`

Y puede guardar `status_reason` para explicar el motivo operativo del cambio.

La logica vive en:

- `backend/app/apps/platform_control/api/tenant_routes.py`
- `backend/app/apps/platform_control/services/tenant_service.py`
- `backend/app/apps/platform_control/models/tenant.py`

## Visibilidad operativa de provisioning

En el estado actual, `platform` ya expone una vista agregada de `provisioning_jobs` por tenant.

Eso sirve para:

- detectar tenants con backlog pendiente
- distinguir tenants con jobs en `retry_pending` o `failed`
- ver rapidamente si el worker esta drenando o no la cola por tenant
- abrir el detalle por `job_type` cuando se necesita mas granularidad operativa
- abrir el detalle por `error_code` cuando se necesita ver que causas fallan mas

La logica vive en:

- `backend/app/apps/platform_control/api/provisioning_job_routes.py`
- `backend/app/apps/platform_control/services/provisioning_job_service.py`
- `backend/app/apps/platform_control/repositories/provisioning_job_repository.py`

Adicionalmente, hoy existe un historial operativo basico de esas metricas:

- el worker captura snapshots por tenant al final de cada ciclo
- esos snapshots viven en `platform_control.provisioning_job_metric_snapshots`
- `platform` expone lectura reciente del historial via API
- cada snapshot queda correlacionado con el ciclo que lo produjo por medio de `capture_key`

Adicionalmente, hoy existe una traza resumida por ciclo del worker:

- el worker persiste una fila por ciclo en `platform_control.provisioning_worker_cycle_traces`
- esa traza guarda `worker_profile`, `selection_strategy`, volumen elegible, volumen procesado y el top de scores compuestos del ciclo
- la API de `platform` expone lectura reciente de esas trazas para analisis operativo

La logica vive en:

- `backend/app/apps/platform_control/models/provisioning_job_metric_snapshot.py`
- `backend/app/apps/platform_control/repositories/provisioning_job_metric_snapshot_repository.py`
- `backend/app/apps/platform_control/services/provisioning_metrics_service.py`
- `backend/app/apps/platform_control/models/provisioning_worker_cycle_trace.py`
- `backend/app/apps/platform_control/repositories/provisioning_worker_cycle_trace_repository.py`
- `backend/app/apps/platform_control/services/provisioning_worker_cycle_trace_service.py`

Y ademas existe una exportacion externa minima del resumen actual:

- el exportador genera un textfile Prometheus
- el textfile incluye una vista agregada por tenant
- tambien incluye una vista mas fina por tenant, `job_type` y `status`
- ahora tambien incluye alertas activas por severidad, codigo, tenant y perfil de worker

Adicionalmente, hoy existe una capa minima de alertas operativas sobre esos datos persistidos:

- se evaluan umbrales sobre el ultimo snapshot por tenant
- se evaluan tambien patrones recientes de jobs failed por `error_code` estable
- se evaluan umbrales sobre la ultima traza de ciclo por perfil de worker
- `platform` expone lectura de alertas activas via API
- el worker persiste las alertas detectadas en `platform_control.provisioning_operational_alerts`
- `platform` expone tambien lectura del historial persistido de alertas
- el worker registra un resumen estructurado cuando una corrida genera alertas

La logica vive en:

- `backend/app/apps/platform_control/models/provisioning_operational_alert.py`
- `backend/app/apps/platform_control/repositories/provisioning_operational_alert_repository.py`
- `backend/app/apps/platform_control/services/provisioning_alert_service.py`
- `backend/app/common/observability/logging_service.py`

## Operacion de DLQ del broker

En el estado actual, `platform` ya puede operar la DLQ Redis del backend `broker` de provisioning desde API.

Eso cubre tres casos practicos:

- inspeccionar jobs fallidos en DLQ
- reencolar un job puntual
- reencolar en lote una seleccion filtrada

La operacion actual soporta:

- filtro por `job_type`
- filtro por `tenant_slug`
- filtro exacto por `error_code`
- filtro por substring de `error_message` con `error_contains`
- requeue inmediato o diferido con `delay_seconds`
- requeue individual con opcion `reset_attempts`
- replay en lote con `limit`
- retencion opcional por tiempo en la DLQ Redis

La logica vive en:

- `backend/app/apps/provisioning/services/provisioning_dispatch_service.py`
- `backend/app/apps/provisioning/services/provisioning_service.py`
- `backend/app/apps/platform_control/api/provisioning_job_routes.py`

Adicionalmente, hoy `provisioning_jobs` ya guarda `error_code` ademas de `error_message`.

Eso sirve para:

- dejar de depender de texto libre para soporte operativo
- filtrar DLQ por una causa estable
- preparar futuras politicas de replay o alertas por codigo

La clasificacion actual es por etapa del flujo, por ejemplo:

- `postgres_role_bootstrap_failed`
- `postgres_database_bootstrap_failed`
- `tenant_schema_bootstrap_failed`
- `tenant_secret_store_failed`
- `provisioning_completion_persist_failed`

## Dispatch y broker real de provisioning

El backend ya puede operar `provisioning` tanto sobre base de datos como sobre un broker Redis, sin reescribir el flujo de tenants ni el worker.

Hoy existe una capa de dispatch en:

- `backend/app/apps/provisioning/services/provisioning_dispatch_service.py`

Esa capa deja:

- backend actual `database` como implementacion operativa real
- backend `broker` como implementacion real basada en Redis
- `TenantService` desacoplado de `create_job()` directo
- `ProvisioningWorker` desacoplado de `list_pending_jobs()` directo

Variables relevantes:

- `REDIS_URL`
- `PROVISIONING_DISPATCH_BACKEND`
- `PROVISIONING_BROKER_URL`
- `PROVISIONING_BROKER_KEY_PREFIX`
- `PROVISIONING_BROKER_PROCESSING_LEASE_SECONDS`

Estado actual:

- `TenantService` usa `ProvisioningDispatchService` al crear el job inicial de un tenant
- `ProvisioningWorker` usa esa misma capa para obtener jobs elegibles
- `database` es el backend real que hoy se usa en produccion local
- `broker` usa Redis para cola lista, reintentos diferidos y lease basico de procesamiento
- `ProvisioningService` notifica al dispatch el resultado final del job para ack o reprogramacion
- si un job termina en `failed`, el backend `broker` lo mueve a una DLQ por `job_type`
- `platform` ya puede listar esa DLQ y reencolar jobs fallidos desde API

## Tests agregados

La suite actual de platform vive en:

- `backend/app/tests/test_platform_flow.py`

Escenarios cubiertos:

- contexto platform
- role guard
- auth service
- tenant service con repository fake
- provisioning job service con repository fake
- login
- ping a DB control
- create tenant
- listado de provisioning jobs
- ejecucion de provisioning job

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_flow
```

## Que sigue despues

El siguiente refinamiento natural para `platform` es:

1. mover validaciones de negocio mas complejas fuera de los routers
2. preparar pruebas de integracion con una DB temporal
3. endurecer auditoria, observabilidad y manejo de errores operativos
Nota practica:

- como los usuarios seed platform actuales usan correos tipo `admin@platform.local`, el request schema de login platform usa `str` para email en vez de `EmailStr`
- eso evita rechazos `422` en desarrollo por dominios reservados `.local`
