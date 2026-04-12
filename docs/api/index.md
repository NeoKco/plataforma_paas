# API Actual

Este documento resume los endpoints expuestos actualmente por el backend segun el codigo implementado.

Referencias complementarias:

- [Contratos backend estables para frontend](./frontend-contract-stability.md)
- snapshot generado de OpenAPI: [openapi.snapshot.json](./openapi.snapshot.json)

Para regenerar el snapshot actual:

```bash
cd /home/felipe/platform_paas/backend
DEBUG=false /home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/export_openapi_snapshot.py
```

## Notas de Contexto

- `GET /health` esta disponible siempre.
- si la plataforma no esta instalada, se exponen solo rutas del instalador
- si la plataforma ya esta instalada, se exponen rutas de plataforma y tenant
- en el estado actual del repositorio, la plataforma ya figura como instalada
- el backend devuelve `X-Request-ID` en las respuestas para trazabilidad tecnica
- los errores HTTP incluyen `request_id` en el payload

## Endpoints Base

### `GET /health`

Devuelve estado general del servicio.

Respuesta esperada:

```json
{
  "status": "healthy",
  "app": "Platform Backend",
  "version": "0.1.0",
  "installed": true
}
```

### `GET /`

Disponible cuando la plataforma ya esta instalada.

Respuesta esperada:

```json
{
  "status": "ok",
  "message": "Platform backend running"
}
```

## Instalacion

Estas rutas aplican cuando la plataforma no esta instalada.

### `GET /install/`

Consulta si el instalador esta disponible o si la plataforma ya fue instalada.

### `POST /install/setup`

Ejecuta la instalacion inicial.

Request body:

```json
{
  "admin_db_host": "127.0.0.1",
  "admin_db_port": 5432,
  "admin_db_name": "postgres",
  "admin_db_user": "postgres",
  "admin_db_password": "secret",
  "control_db_name": "platform_control",
  "control_db_user": "platform_owner",
  "control_db_password": "secret",
  "app_name": "Platform Backend",
  "app_version": "0.1.0"
}
```

## Plataforma

Estas rutas se registran cuando la plataforma ya esta instalada.

Nota de implementacion:

- los routers `platform` actuales siguen un patron delgado y delegan la logica reutilizable a servicios dentro de `backend/app/apps/platform_control/services/`

### `POST /platform/auth/login`

Login de usuario de plataforma.

Request body:

```json
{
  "email": "admin@platform.local",
  "password": "AdminTemporal123!"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Login successful",
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "user_id": 1,
  "full_name": "Felipe Hormazabal",
  "email": "admin@platform.local",
  "role": "superadmin"
}
```

Notas:

- el JWT emitido incluye `token_scope=platform`

### `POST /platform/auth/refresh`

Rota el refresh token de plataforma y devuelve un nuevo par.

Request body:

```json
{
  "refresh_token": "jwt"
}
```

### `POST /platform/auth/logout`

Revoca la sesion actual de plataforma.

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/ping-db`

Prueba de conexion a la base de control.

Respuesta esperada:

```json
{
  "status": "ok",
  "control_database": "platform_control",
  "token_payload": {
    "sub": "1",
    "email": "admin@platform.local",
    "role": "superadmin",
    "token_scope": "platform"
  }
}
```

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/admin-only`

Ruta administrativa pensada para `superadmin`.

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/capabilities`

Devuelve el catalogo operativo del backend para frontend, soporte y validaciones administrativas.

Respuesta esperada:

```json
{
  "success": true,
  "message": "Catalogo de capacidades de backend recuperado correctamente",
  "tenant_statuses": ["active", "archived", "error", "pending", "suspended"],
  "tenant_billing_statuses": ["active", "canceled", "past_due", "suspended", "trialing"],
  "maintenance_scopes": ["all", "core", "finance", "maintenance", "users"],
  "maintenance_access_modes": ["full_block", "write_block"],
  "plan_modules": ["all", "core", "finance", "users"],
  "supported_module_limit_keys": [
    "core.users",
    "core.users.active",
    "core.users.admin",
    "core.users.manager",
    "core.users.monthly",
    "core.users.operator",
    "finance.entries",
    "finance.entries.monthly",
    "finance.entries.monthly.expense",
    "finance.entries.monthly.income"
  ],
  "module_limit_capabilities": [
    {
      "key": "core.users",
      "module_name": "core",
      "resource_name": "users",
      "period": "current",
      "segment": null,
      "unit": "count",
      "description": "Total de usuarios tenant"
    },
    {
      "key": "finance.entries.monthly.income",
      "module_name": "finance",
      "resource_name": "entries",
      "period": "monthly",
      "segment": "income",
      "unit": "count",
      "description": "Ingresos creados en el mes actual"
    }
  ],
  "billing_providers": ["stripe"],
  "billing_sync_processing_results": ["applied", "duplicate", "ignored", "reconciled"],
  "provisioning_dispatch_backends": ["database", "broker"]
}
```

Uso esperado:

- frontend puede poblar selects y badges sin hardcodear estados o claves de cuota
- frontend puede construir labels y agrupaciones a partir de `module_limit_capabilities`
- soporte puede verificar rapidamente que combinaciones entiende el backend actual

Requiere:

- `Authorization: Bearer <platform_token>`

### `POST /platform/tenants/`

Crea un tenant en `platform_control` con estado inicial `pending`.

Request body:

```json
{
  "name": "Condominio Demo",
  "slug": "condominio-demo",
  "tenant_type": "condos"
}
```

Respuesta esperada:

```json
{
  "id": 1,
  "name": "Condominio Demo",
  "slug": "condominio-demo",
  "tenant_type": "condos",
  "plan_code": null,
  "status": "pending",
  "status_reason": null,
  "maintenance_mode": false,
  "maintenance_starts_at": null,
  "maintenance_ends_at": null,
  "maintenance_reason": null,
  "maintenance_scopes": null,
  "maintenance_access_mode": "write_block",
  "api_read_requests_per_minute": null,
  "api_write_requests_per_minute": null
}
```

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/tenants/`

Devuelve el catalogo base de tenants para frontend y soporte.

Respuesta esperada:

```json
{
  "success": true,
  "message": "Tenants recuperados correctamente",
  "total_tenants": 2,
  "data": [
    {
      "id": 1,
      "name": "Condominio Demo",
      "slug": "condominio-demo",
      "tenant_type": "condos",
      "plan_code": "pro",
      "billing_status": "active",
      "status": "active",
      "maintenance_mode": false
    }
  ]
}
```

Uso esperado:

- listado inicial de tenants en `platform_admin`
- seleccion de tenant antes de cargar vistas operativas mas profundas

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/tenants/{tenant_id}`

Devuelve el detalle base de un tenant, incluyendo plan, billing, maintenance y overrides persistidos.

Uso esperado:

- panel de detalle tenant en `platform_admin`
- lectura operativa rapida antes de consultar `access-policy` o `module-usage`

Requiere:

- `Authorization: Bearer <platform_token>`

### `PATCH /platform/tenants/{tenant_id}/status`

Actualiza el lifecycle operativo del tenant.

Request body:

```json
{
  "status": "suspended",
  "status_reason": "billing overdue"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Estado de tenant actualizado correctamente",
  "tenant_id": 1,
  "tenant_slug": "condominio-demo",
  "tenant_status": "suspended",
  "tenant_status_reason": "billing overdue"
}
```

Notas:

- estados validos: `pending`, `active`, `suspended`, `error`, `archived`
- `status_reason` es opcional y sirve para dejar contexto operativo

Requiere:

- `Authorization: Bearer <platform_token>`

Notas:

- hoy la creacion del job inicial de provisioning pasa por `ProvisioningDispatchService`
- el backend de dispatch puede ser `database` o `broker`
- si usas `broker`, el job inicial queda tambien agendado en Redis para el worker

### `POST /platform/tenants/{tenant_id}/sync-schema`

Sincroniza el esquema tenant actual sobre una DB tenant ya activa.

Uso esperado:

- crear tablas faltantes de `core`
- crear tablas faltantes de modulos ya registrados, como `finance`

Requiere:

- `Authorization: Bearer <platform_token>`

### `PATCH /platform/tenants/{tenant_id}/maintenance`

Activa o desactiva modo mantenimiento para un tenant y opcionalmente programa una ventana.

Request body:

```json
{
  "maintenance_mode": false,
  "maintenance_starts_at": "2026-03-18T02:00:00Z",
  "maintenance_ends_at": "2026-03-18T03:00:00Z",
  "maintenance_reason": "postgres maintenance",
  "maintenance_scopes": ["finance"],
  "maintenance_access_mode": "full_block"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Politica de mantenimiento actualizada correctamente",
  "tenant_id": 1,
  "tenant_slug": "condominio-demo",
  "tenant_status": "active",
  "maintenance_mode": false,
  "maintenance_starts_at": "2026-03-18T02:00:00Z",
  "maintenance_ends_at": "2026-03-18T03:00:00Z",
  "maintenance_reason": "postgres maintenance",
  "maintenance_scopes": ["finance"],
  "maintenance_access_mode": "full_block",
  "maintenance_active_now": false
}
```

Notas:

- `maintenance_scopes` acepta `all`, `core`, `users`, `finance` y `maintenance`
- `maintenance_access_mode` acepta `write_block` o `full_block`

Requiere:

- `Authorization: Bearer <platform_token>`

### `PATCH /platform/tenants/{tenant_id}/rate-limit`

Actualiza overrides de cuota por tenant para lecturas y escrituras.

Request body:

```json
{
  "api_read_requests_per_minute": 120,
  "api_write_requests_per_minute": 30
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Politica de rate limit tenant actualizada correctamente",
  "tenant_id": 1,
  "tenant_slug": "condominio-demo",
  "tenant_status": "active",
  "tenant_plan_code": "pro",
  "api_read_requests_per_minute": 120,
  "api_write_requests_per_minute": 30
}
```

Notas:

- `null` limpia el override y hace fallback a la configuracion global
- `0` deja esa categoria sin limite efectivo para ese tenant
- valores negativos se rechazan con `400`

### `PATCH /platform/tenants/{tenant_id}/plan`

Asigna o limpia el `plan_code` del tenant.

Request body:

```json
{
  "plan_code": "pro"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Plan de tenant actualizado correctamente",
  "tenant_id": 1,
  "tenant_slug": "condominio-demo",
  "tenant_status": "active",
  "tenant_plan_code": "pro",
  "tenant_plan_enabled_modules": ["core", "users", "finance"]
}
```

Notas:

- `null` limpia el plan actual
- el valor debe existir en `TENANT_PLAN_RATE_LIMITS` o en `TENANT_PLAN_ENABLED_MODULES`
- si el plan declara modulos en `TENANT_PLAN_ENABLED_MODULES`, el middleware tenant bloquea con `403` las rutas de modulos no habilitados

Requiere:

- `Authorization: Bearer <platform_token>`

### `PATCH /platform/tenants/{tenant_id}/billing`

Actualiza el estado de billing/suscripcion del tenant.

Request body:

```json
{
  "billing_status": "past_due",
  "billing_status_reason": "invoice overdue",
  "billing_grace_until": "2026-03-25T00:00:00Z"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Estado de billing tenant actualizado correctamente",
  "tenant_id": 1,
  "tenant_slug": "condominio-demo",
  "tenant_status": "active",
  "billing_status": "past_due",
  "billing_status_reason": "invoice overdue",
  "billing_current_period_ends_at": null,
  "billing_grace_until": "2026-03-25T00:00:00Z"
}
```

Notas:

- `billing_status` acepta `trialing`, `active`, `past_due`, `suspended`, `canceled` o `null`
- `past_due` sigue operativo mientras `billing_grace_until` siga vigente
- `suspended` bloquea tenant con `423`
- `canceled` bloquea tenant con `403` cuando ya expiro `billing_current_period_ends_at`

### `PATCH /platform/tenants/{tenant_id}/billing-identity`

Actualiza la identidad externa de billing del tenant.

Campos:

- `billing_provider`
- `billing_provider_customer_id`
- `billing_provider_subscription_id`

Notas:

- sirve para ligar el tenant a identidad externa persistida del proveedor
- esa identidad se usa despues para resolver webhooks por `subscription_id` o `customer_id`
- reduce la dependencia operativa de `metadata.tenant_slug`

### `POST /platform/tenants/{tenant_id}/billing/sync-event`

Aplica un evento de billing normalizado e idempotente sobre el tenant.

Notas:

- usa `provider + provider_event_id` como llave de idempotencia
- persiste el evento recibido
- actualiza el estado de billing del tenant
- si el evento ya fue aplicado antes, responde exitoso con `was_duplicate=true`
- el evento persistido puede quedar con `processing_result=applied`, `duplicate`, `ignored` o `reconciled`

### `GET /platform/tenants/{tenant_id}/billing/events`

Lista eventos de billing sincronizados para el tenant.

Query params opcionales:

- `provider`
- `event_type`
- `processing_result`
- `limit`

### `GET /platform/tenants/{tenant_id}/billing/events/summary`

Devuelve un resumen agregado del historial de billing por `provider`, `event_type` y `processing_result`.

Query params opcionales:

- `provider`
- `event_type`
- `processing_result`

Utilidad:

- permite ver rapido que tipos de evento entran mas
- permite distinguir volumen `applied`, `duplicate`, `ignored` y `reconciled`
- evita revisar el historial evento por evento para soporte operativo

### `GET /platform/tenants/billing/events/summary`

Devuelve un resumen global de eventos de billing en toda la plataforma.

Query params opcionales:

- `provider`
- `event_type`
- `processing_result`

Utilidad:

- muestra volumen total de eventos por proveedor
- muestra cuantos tenants distintos participaron en cada grupo
- ayuda a detectar rapido si un proveedor o tipo de evento esta generando demasiados `duplicate` o `ignored`

### `GET /platform/tenants/billing/events/alerts`

Devuelve alertas operativas calculadas en caliente sobre el resumen global de billing.

Query params opcionales:

- `provider`
- `event_type`
- `persist_history`

Notas:

- hoy evalua umbrales simples para `duplicate`, `ignored` y volumen total por proveedor
- usa `BILLING_ALERT_DUPLICATE_EVENTS_THRESHOLD`
- usa `BILLING_ALERT_IGNORED_EVENTS_THRESHOLD`
- usa `BILLING_ALERT_PROVIDER_EVENTS_THRESHOLD`
- si un umbral esta en `0`, esa alerta queda deshabilitada
- esta pensado para soporte rapido sin leer el historial fila por fila
- si `persist_history=true`, tambien guarda las alertas calculadas en historial persistido

### `GET /platform/tenants/billing/events/alerts/history`

Devuelve el historial persistido de alertas operativas de billing.

Query params opcionales:

- `limit`
- `provider`
- `event_type`
- `processing_result`
- `alert_code`
- `severity`

### `POST /platform/tenants/{tenant_id}/billing/events/{sync_event_id}/reconcile`

Reaplica administrativamente un evento de billing ya persistido sobre el estado actual del tenant.

Notas:

- sirve para reconciliar drift entre el estado actual del tenant y el ultimo evento guardado
- no crea un evento nuevo de sync; reutiliza uno ya persistido
- registra `billing_reconcile` en el historial de politica tenant
- deja el evento persistido con `processing_result=reconciled`

### `POST /platform/tenants/{tenant_id}/billing/events/reconcile`

Reconciliacion en lote sobre eventos de billing ya persistidos para el tenant.

Query params opcionales:

- `provider`
- `event_type`
- `processing_result`
- `limit`

Notas:

- permite re-aplicar varios eventos recientes sin hacerlo uno por uno
- cada evento reconciliado termina con `processing_result=reconciled`

### `POST /webhooks/billing/stripe`

Ingesta publica de eventos Stripe hacia el backend.

Notas:

- no usa auth `platform`; entra por una ruta publica separada
- valida `Stripe-Signature` usando `BILLING_STRIPE_WEBHOOK_SECRET`
- usa `BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS` para rechazar firmas fuera de ventana temporal
- intenta resolver el tenant por `subscription_id`
- si no puede, intenta por `customer_id`
- usa `metadata.tenant_slug` como fallback
- acepta eventos sin `metadata.tenant_slug` si el proveedor entrega identidad suficiente
- normaliza el evento antes de aplicarlo al estado interno
- reutiliza el mismo flujo idempotente de `billing/sync-event`
- persiste tambien `provider_customer_id` y `provider_subscription_id` en el tenant cuando llegan normalizados
- si un evento llega sin todos los identificadores externos, conserva la identidad ya conocida del tenant
- si el evento no trae cambio operativo de billing, queda persistido como `ignored`

Eventos Stripe soportados hoy:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.marked_uncollectible`
- `invoice.paid`

### `GET /platform/tenants/{tenant_id}/access-policy`

Devuelve la politica efectiva de acceso del tenant combinando `status` manual y billing.

Notas:

- `access_blocking_source` puede ser `status`, `billing` o `null`
- `billing_in_grace=true` indica que el tenant sigue operativo aunque este en `past_due`

### `GET /platform/tenants/{tenant_id}/policy-history`

Devuelve el historial persistido de cambios operativos del tenant.

Query params opcionales:

- `event_type`
- `limit`

Tipos actuales:

- `maintenance`
- `rate_limit`
- `plan`
- `billing`
- `billing_identity`
- `billing_sync`
- `billing_reconcile`
- `status`

Cada evento expone:

- actor que hizo el cambio
- `previous_state`
- `new_state`
- `changed_fields`
- `recorded_at`

### `GET /platform/provisioning-jobs/`

Lista jobs de provisionamiento.

Notas:

- un job puede estar en `pending`, `running`, `retry_pending`, `completed` o `failed`
- la respuesta puede incluir `attempts`, `max_attempts` y `next_retry_at`
- el procesamiento automatico del worker respeta limites de ciclo y umbral maximo de fallos

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/broker/dlq`

Devuelve la dead-letter queue actual del backend `broker` de provisioning.

Parametros opcionales:

- `limit`: cantidad maxima de jobs a devolver
- `job_type`: filtra por tipo de job
- `tenant_slug`: filtra por tenant
- `error_contains`: filtra por substring dentro de `error_message`
- `error_code`: filtra por codigo estable de error

Notas:

- solo tiene sentido operativo cuando `PROVISIONING_DISPATCH_BACKEND=broker`
- devuelve jobs que terminaron en `failed` y fueron movidos a DLQ por el broker Redis
- si `PROVISIONING_BROKER_DLQ_RETENTION_SECONDS>0`, los jobs muy antiguos se purgan automaticamente al consultar o reencolar
- si `error_code` esta presente, el filtro usa coincidencia exacta sobre ese codigo
- `error_contains` usa coincidencia simple por substring, no regex

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics`

Devuelve una vista agregada de jobs de provisionamiento por tenant.

Respuesta esperada:

```json
{
  "success": true,
  "data": [
    {
      "tenant_id": 1,
      "tenant_slug": "condominio-demo",
      "total_jobs": 4,
      "pending_jobs": 0,
      "retry_pending_jobs": 1,
      "running_jobs": 0,
      "completed_jobs": 2,
      "failed_jobs": 1,
      "max_attempts_seen": 3
    }
  ]
}
```

Notas:

- sirve como vista operativa rapida por tenant
- resume volumen y estado actual de `provisioning_jobs`
- `max_attempts_seen` refleja el mayor valor observado en los jobs del tenant

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/by-job-type`

Devuelve una vista agregada de jobs de provisionamiento por tenant y `job_type`.

Respuesta esperada:

```json
{
  "success": true,
  "message": "Metricas detalladas de provisioning recuperadas correctamente",
  "total_rows": 1,
  "data": [
    {
      "tenant_id": 1,
      "tenant_slug": "condominio-demo",
      "job_type": "create_tenant_database",
      "total_jobs": 4,
      "pending_jobs": 0,
      "retry_pending_jobs": 1,
      "running_jobs": 0,
      "completed_jobs": 2,
      "failed_jobs": 1,
      "max_attempts_seen": 3
    }
  ]
}
```

Notas:

- sirve para distinguir backlog y fallos por tipo de trabajo
- hoy es especialmente util si en el futuro aparecen mas `job_type` ademas de `create_tenant_database`

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/by-error-code`

Devuelve una vista agregada de jobs de provisionamiento por tenant y `error_code`.

Respuesta esperada:

```json
{
  "success": true,
  "message": "Metricas de provisioning por error_code recuperadas correctamente",
  "total_rows": 1,
  "data": [
    {
      "tenant_id": 1,
      "tenant_slug": "condominio-demo",
      "error_code": "postgres_database_bootstrap_failed",
      "total_jobs": 2,
      "pending_jobs": 0,
      "retry_pending_jobs": 1,
      "running_jobs": 0,
      "completed_jobs": 0,
      "failed_jobs": 1,
      "max_attempts_seen": 3
    }
  ]
}
```

Notas:

- sirve para ver rapidamente que causas estables de error aparecen mas por tenant
- solo incluye filas con `error_code` no nulo
- complementa la vista operativa de DLQ y las alertas por `error_code`

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/history`

Devuelve el historial reciente de snapshots de metricas de `provisioning` por tenant.

Parametros opcionales:

- `limit`: cantidad maxima de snapshots a devolver
- `tenant_slug`: filtra el historial para un tenant especifico

Respuesta esperada:

```json
{
  "success": true,
  "message": "Historial de metricas de provisioning recuperado correctamente",
  "total_snapshots": 2,
  "data": [
    {
      "id": 10,
      "capture_key": "b6f9d0b145e14f5d8e52d4f2d4f1f9e7",
      "tenant_id": 1,
      "tenant_slug": "condominio-demo",
      "total_jobs": 4,
      "pending_jobs": 0,
      "retry_pending_jobs": 1,
      "running_jobs": 0,
      "completed_jobs": 2,
      "failed_jobs": 1,
      "max_attempts_seen": 3,
      "captured_at": "2026-03-17T19:10:00Z"
    }
  ]
}
```

Notas:

- cada `capture_key` identifica una captura tomada al final de un ciclo del worker
- esta vista sirve como historial operativo basico dentro de `platform_control`
- el mismo `capture_key` puede usarse para correlacionar este snapshot por tenant con la traza resumida del ciclo completo

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/cycle-history`

Devuelve el historial reciente de ciclos del worker de `provisioning`.

Parametros opcionales:

- `limit`: cantidad maxima de ciclos a devolver
- `worker_profile`: filtra por perfil logico de worker

Respuesta esperada:

```json
{
  "success": true,
  "message": "Historial de ciclos de provisioning recuperado correctamente",
  "total_traces": 1,
  "data": [
    {
      "id": 7,
      "capture_key": "b6f9d0b145e14f5d8e52d4f2d4f1f9e7",
      "worker_profile": "default",
      "selection_strategy": "composite_score",
      "eligible_jobs": 8,
      "aged_eligible_jobs": 2,
      "queued_jobs": 3,
      "processed_count": 3,
      "failed_count": 0,
      "stopped_due_to_failure_limit": false,
      "duration_ms": 842,
      "priority_order": [
        "create_tenant_database",
        "sync_tenant_schema"
      ],
      "tenant_type_priority_order": [
        "condos",
        "empresa"
      ],
      "top_eligible_job_scores": [
        {
          "job_id": 21,
          "job_type": "create_tenant_database",
          "tenant_type": "condos",
          "aged": true,
          "waiting_minutes": 47,
          "total_score": 1000097
        }
      ],
      "captured_at": "2026-03-18T13:40:00Z"
    }
  ]
}
```

Notas:

- esta vista resume el ciclo completo del worker, no un tenant individual
- `capture_key` permite correlacionar la traza del ciclo con los snapshots por tenant capturados al final del mismo ciclo
- `top_eligible_job_scores` sirve para auditar por que el worker priorizo ciertos jobs en esa corrida

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/alerts`

Devuelve alertas operativas activas calculadas sobre los ultimos snapshots por tenant y las ultimas trazas de ciclo del worker.

Parametros opcionales:

- `tenant_slug`: filtra alertas basadas en snapshots de un tenant especifico
- `worker_profile`: filtra alertas basadas en la ultima traza del perfil indicado

Respuesta esperada:

```json
{
  "success": true,
  "message": "Alertas operativas de provisioning recuperadas correctamente",
  "total_alerts": 2,
  "data": [
    {
      "alert_code": "worker_cycle_stopped_due_to_failure_limit",
      "severity": "critical",
      "source_type": "worker_cycle_trace",
      "tenant_slug": null,
      "worker_profile": "default",
      "capture_key": "b6f9d0b145e14f5d8e52d4f2d4f1f9e7",
      "message": "El worker corto el ciclo por alcanzar el limite de fallos",
      "observed_value": true,
      "threshold_value": true,
      "captured_at": "2026-03-18T13:40:00Z"
    },
    {
      "alert_code": "tenant_failed_error_code_threshold_exceeded",
      "severity": "error",
      "source_type": "tenant_failed_jobs",
      "error_code": "postgres_database_bootstrap_failed",
      "tenant_slug": "condominio-demo",
      "worker_profile": null,
      "capture_key": "b6f9d0b145e14f5d8e52d4f2d4f1f9e7",
      "message": "Tenant condominio-demo acumula jobs failed recientes con error_code postgres_database_bootstrap_failed",
      "observed_value": 2,
      "threshold_value": 1,
      "captured_at": "2026-03-18T13:40:00Z"
    }
  ]
}
```

Notas:

- estas alertas no salen de una tabla aparte; se calculan sobre los datos persistidos mas recientes
- `capture_key` sirve para correlacionar una alerta con el snapshot por tenant y la traza de ciclo que la originan
- algunas alertas tenant ya incluyen `error_code` para distinguir fallos repetidos por causa estable
- las alertas se ordenan por severidad y luego por fecha de captura

Requiere:

- `Authorization: Bearer <platform_token>`

### `GET /platform/provisioning-jobs/metrics/alerts/history`

Devuelve el historial persistido de alertas operativas de `provisioning`.

Parametros opcionales:

- `limit`: cantidad maxima de alertas a devolver
- `tenant_slug`: filtra por tenant
- `worker_profile`: filtra por perfil de worker
- `alert_code`: filtra por codigo de alerta
- `severity`: filtra por severidad

Respuesta esperada:

```json
{
  "success": true,
  "message": "Historial de alertas operativas de provisioning recuperado correctamente",
  "total_alerts": 1,
  "data": [
    {
      "id": 12,
      "alert_code": "tenant_failed_error_code_threshold_exceeded",
      "severity": "error",
      "source_type": "tenant_failed_jobs",
      "error_code": "postgres_database_bootstrap_failed",
      "tenant_slug": "condominio-demo",
      "worker_profile": null,
      "capture_key": "b6f9d0b145e14f5d8e52d4f2d4f1f9e7",
      "message": "Tenant condominio-demo acumula jobs failed recientes con error_code postgres_database_bootstrap_failed",
      "observed_value": 2,
      "threshold_value": 1,
      "source_captured_at": "2026-03-18T13:40:00Z",
      "recorded_at": "2026-03-18T13:40:01Z"
    }
  ]
}
```

Notas:

- este endpoint devuelve historial persistido, no solo el estado actual
- `source_captured_at` es la fecha de la captura original del snapshot o traza
- `recorded_at` es la fecha en que la alerta quedo guardada en `platform_control`
- si aplica, la alerta persistida conserva `error_code`

Requiere:

- `Authorization: Bearer <platform_token>`

### `POST /platform/provisioning-jobs/{job_id}/requeue`

Reencola un job fallido de provisioning.

Parametros opcionales:

- `reset_attempts`: por defecto `true`
- `delay_seconds`: por defecto `0`

Notas:

- pensado para soporte operativo sobre jobs en DLQ
- si el job estaba en `failed`, vuelve a `pending`
- limpia `error_code`, `error_message`, reinicia intentos y lo vuelve a dejar elegible
- si `reset_attempts=false`, conserva el contador actual
- si `delay_seconds>0`, se reencola con demora antes de volver a quedar elegible
- si el backend activo es `broker`, tambien lo saca de DLQ y lo agenda nuevamente en Redis

Requiere:

- `Authorization: Bearer <platform_token>`

### `POST /platform/provisioning-jobs/broker/dlq/requeue`

Reencola en lote jobs fallidos desde la DLQ del backend `broker`.

Request body:

```json
{
  "limit": 25,
  "job_type": "create_tenant_database",
  "tenant_slug": "condominio-demo",
  "error_code": "postgres_database_bootstrap_failed",
  "error_contains": "postgres",
  "reset_attempts": true,
  "delay_seconds": 120
}
```

Notas:

- pensado para replay operativo asistido desde soporte
- permite filtrar por `job_type` y por `tenant_slug`
- permite filtrar por `error_code` estable
- permite filtrar por una porcion del `error_message` usando `error_contains`
- `delay_seconds` sirve para replay diferido despues de una correccion externa
- si el backend activo no usa `broker`, el resultado practico sera vacio porque no existe DLQ Redis

Requiere:

- `Authorization: Bearer <platform_token>`

### `POST /platform/provisioning-jobs/{job_id}/run`

Ejecuta un job de provisionamiento.

Respuesta esperada:

```json
{
  "id": 1,
  "tenant_id": 1,
  "job_type": "create_tenant_database",
  "status": "completed",
  "attempts": 1,
  "max_attempts": 3,
  "error_code": null,
  "error_message": null,
  "next_retry_at": null
}
```

Requiere:

- `Authorization: Bearer <platform_token>`

## Tenant

Notas operativas:

- si un tenant esta en `maintenance_mode`, las rutas tenant de escritura responden `503`
- si existe una ventana activa entre `maintenance_starts_at` y `maintenance_ends_at`, tambien responden `503`
- si `maintenance_scopes` no incluye el modulo de la ruta, esa ruta no se ve afectada
- si `maintenance_access_mode=full_block`, tambien se bloquean lecturas del modulo afectado
- las lecturas `GET` y las rutas `tenant/auth/*` siguen disponibles
- si el tenant esta en `suspended`, la API tenant responde `423`
- si el tenant esta en `pending` o `error`, la API tenant responde `503`
- si el tenant esta en `archived`, la API tenant responde `403`
- si el `billing_status` esta en `past_due` sin gracia vigente, la API tenant responde `423`
- si el `billing_status` esta en `suspended`, la API tenant responde `423`
- si el `billing_status` esta en `canceled` y ya expiro el periodo actual, la API tenant responde `403`
- si se configuran `TENANT_API_READ_REQUESTS_PER_MINUTE` o `TENANT_API_WRITE_REQUESTS_PER_MINUTE`, el backend puede responder `429` por tenant
- si el tenant tiene `plan_code` y ese plan existe en `TENANT_PLAN_RATE_LIMITS`, el backend usa primero la cuota del plan
- si el tenant tiene `plan_code` y ese plan existe en `TENANT_PLAN_ENABLED_MODULES`, el backend puede bloquear rutas de modulos no habilitados por plan
- si el tenant tiene overrides persistidos en `platform_control.tenants`, esos valores tienen prioridad sobre la configuracion global
- el orden final de prioridad es: override persistido del tenant > plan > configuracion global
- si `TENANT_API_RATE_LIMIT_BACKEND=redis`, esa cuota ya es compartida entre procesos backend
- cuando una request tenant pasa por cuota activa, la respuesta incluye `X-Tenant-RateLimit-Limit`, `X-Tenant-RateLimit-Remaining`, `X-Tenant-RateLimit-Reset` y `X-Tenant-RateLimit-Operation`

### `POST /tenant/auth/login`

Login de usuario tenant.

Request body:

```json
{
  "tenant_slug": "condominio-demo",
  "email": "admin@condominio-demo.local",
  "password": "TenantAdmin123!"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Tenant login successful",
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "tenant_slug": "condominio-demo",
  "user_id": 1,
  "full_name": "Tenant Admin",
  "email": "admin@condominio-demo.local",
  "role": "admin"
}
```

### `POST /tenant/auth/refresh`

Rota el refresh token tenant y devuelve un nuevo par.

Notas:

- antes de emitir nuevos tokens, el backend revalida el `status` del tenant

Request body:

```json
{
  "refresh_token": "jwt"
}
```

### `POST /tenant/auth/logout`

Revoca la sesion actual tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/health`

Health check del scope tenant.

### `GET /tenant/me`

Devuelve el contexto del usuario tenant autenticado.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/info`

Devuelve informacion del tenant y del usuario autenticado usando la DB real del tenant.

Notas:

- expone `tenant_status` y `tenant_status_reason`
- expone `plan_code`
- expone `plan_enabled_modules` cuando el plan declara modulos habilitados
- expone `plan_module_limits` cuando el plan declara limites de uso por modulo
- expone `module_limits` cuando el tenant tiene override persistido por modulo
- expone `billing_status`, `billing_status_reason`, `billing_current_period_ends_at` y `billing_grace_until`
- expone tambien `billing_in_grace`, `access_allowed`, `access_blocking_source` y `access_detail`
- cuando `billing_in_grace=true`, puede exponer una degradacion temporal de cuotas y modulos con `billing_grace_*`
- cuando `billing_in_grace=true`, puede exponer tambien degradacion temporal de limites por modulo
- expone tambien `maintenance_mode` para el tenant actual
- expone `maintenance_starts_at`, `maintenance_ends_at` y `maintenance_reason` cuando existan
- expone tambien `maintenance_scopes` y `maintenance_access_mode`
- expone `plan_api_read_requests_per_minute` y `plan_api_write_requests_per_minute` cuando el tenant tiene un plan con cuota declarada
- expone `api_read_requests_per_minute` y `api_write_requests_per_minute` como overrides persistidos del tenant
- expone `effective_enabled_modules` como resultado final de plan y billing grace
- expone `effective_module_limits` como resultado final de plan y billing grace
- expone `effective_module_limit_sources` para indicar si cada limite efectivo viene de `plan`, `tenant_override` o `billing_grace`
- expone `effective_api_read_requests_per_minute` y `effective_api_write_requests_per_minute` con el valor final aplicado por el middleware

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/db-info`

Verifica que la conexion dinamica al tenant fue resuelta correctamente y devuelve `tenant_info`.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/users/me-db`

Devuelve el usuario autenticado, pero leido directamente desde la tabla `users` del tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/users`

Lista usuarios del tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.users.read`

### `GET /tenant/users/{user_id}`

Recupera un usuario tenant por id.

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.users.read`

### `POST /tenant/users`

Crea un nuevo usuario dentro del tenant actual.

Request body:

```json
{
  "full_name": "Operador Uno",
  "email": "operador@empresa-bootstrap.local",
  "password": "Operador123!",
  "role": "operator",
  "is_active": true
}
```

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.users.create`

### `PUT /tenant/users/{user_id}`

Actualiza datos basicos de un usuario tenant.

Request body:

```json
{
  "full_name": "Operador Uno Editado",
  "email": "operador@empresa-bootstrap.local",
  "role": "manager",
  "password": null
}
```

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.users.update`

### `PATCH /tenant/users/{user_id}/status`

Activa o desactiva un usuario tenant.

Request body:

```json
{
  "is_active": false
}
```

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.users.change_status`

Notas:

- no se permite desactivar el propio usuario autenticado
- si el tenant esta en mantenimiento, esta ruta responde `503`

## Tenant Finance

### `GET /tenant/finance/entries`

Lista movimientos financieros del tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.finance.read`

### `POST /tenant/finance/entries`

Crea un movimiento financiero.

Request body:

```json
{
  "movement_type": "expense",
  "concept": "Internet oficina",
  "amount": 45.5,
  "category": "services"
}
```

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.finance.create`

Notas:

- si el plan o billing grace definen un limite efectivo para `finance.entries`, el backend bloquea con `403` cuando el tenant alcanza ese total

### `GET /tenant/finance/usage`

Devuelve el uso actual de `finance.entries` contra el limite efectivo del tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.finance.read`

Notas:

- expone `used_entries`, `max_entries`, `remaining_entries`, `unlimited` y `at_limit`
- expone `limit_source` para indicar si el limite efectivo viene de `plan`, `tenant_override` o `billing_grace`

### `GET /tenant/module-usage`

Devuelve una vista generica de uso por modulo para el tenant autenticado.

Requiere:

- `Authorization: Bearer <tenant_token>`

Notas:

- hoy expone al menos `core.users`, `core.users.active`, `core.users.monthly`, `core.users.admin`, `core.users.manager`, `core.users.operator`, `finance.entries`, `finance.entries.monthly`, `finance.entries.monthly.income` y `finance.entries.monthly.expense`
- la salida ya queda preparada para crecer a mas modulos sin cambiar el contrato base
- expone `module_name`, `module_key`, `used_units`, `max_units`, `remaining_units` y `limit_source`

### `GET /tenant/finance/summary`

Devuelve un resumen simple del modulo financiero:

- total ingresos
- total egresos
- balance
- cantidad de movimientos

Requiere:

- `Authorization: Bearer <tenant_token>`
- permiso `tenant.finance.read`

### `PATCH /platform/tenants/{tenant_id}/module-limits`

Actualiza overrides persistidos de limites por modulo para un tenant.

Request body:

```json
{
  "module_limits": {
    "finance.entries": 40,
    "finance.entries.monthly": 200,
    "finance.entries.monthly.income": 120,
    "finance.entries.monthly.expense": 80,
    "core.users": 15,
    "core.users.active": 10,
    "core.users.monthly": 6,
    "core.users.admin": 1
  }
}
```

Notas:

- hoy las claves soportadas incluyen `finance.entries`, `finance.entries.monthly`, `finance.entries.monthly.income`, `finance.entries.monthly.expense`, `core.users`, `core.users.active`, `core.users.monthly`, `core.users.admin`, `core.users.manager` y `core.users.operator`
- `null` limpia el override y vuelve al valor del plan
- `0` deja esa clave sin limite para ese tenant

### `GET /platform/tenants/{tenant_id}/finance/usage`

Consulta uso real de `finance.entries` en la DB del tenant y lo compara con su limite efectivo.

Notas:

- expone `tenant_plan_module_limits`, `tenant_module_limits` y `billing_grace_module_limits`
- expone `effective_module_limit` y `effective_module_limit_source`
- sirve para soporte operativo sin necesitar un token tenant

### `GET /platform/tenants/{tenant_id}/module-usage`

Devuelve una vista generica de uso por modulo para soporte operativo desde `platform`.

Notas:

- hoy expone al menos `core.users`, `core.users.active`, `core.users.monthly`, `core.users.admin`, `core.users.manager`, `core.users.operator`, `finance.entries`, `finance.entries.monthly`, `finance.entries.monthly.income` y `finance.entries.monthly.expense`
- expone `tenant_plan_code`, `billing_in_grace`, `total_modules` y una lista de usos por modulo
- reutiliza el mismo contrato base que la vista tenant, pero desde contexto `platform`

Recupera al usuario autenticado directamente desde la tabla `users` de la DB tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/users`

Lista usuarios del tenant. Solo disponible para `admin` tenant.

Requiere:

- `Authorization: Bearer <tenant_token>`

### `GET /tenant/admin-only`

Ruta restringida a usuarios tenant con rol `admin`.

Requiere:

- `Authorization: Bearer <tenant_token>`

## Resumen de Estado

La API actual ya cubre:

- instalacion inicial
- login de plataforma
- alta y provisionamiento de tenants
- login tenant
- endpoints tenant protegidos
- resolucion dinamica de DB tenant por request
- consultas reales a `tenant_info` y `users` del tenant
- endpoints platform protegidos por JWT
