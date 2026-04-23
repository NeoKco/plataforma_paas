# Flujo Actual del Backend

Este documento resume como funciona hoy el backend de `platform_paas` segun el codigo actualmente implementado.

## Vision General

El backend esta construido sobre FastAPI y opera con una arquitectura multi-tenant basada en dos niveles de persistencia:

- una base de datos central de control para la plataforma
- una base de datos independiente por cada tenant

En el estado actual, la evolucion de esquema ya no depende solo de `create_all()`:

- existen migraciones versionadas para control DB y tenant DB
- el provisioning tenant y el sync de esquema usan esa capa

El punto de entrada de la aplicacion crea la app y decide si expone el instalador o las rutas operativas de la plataforma, segun exista la bandera de instalacion local.

## Componentes Principales

- `installer`: prepara la instalacion inicial de la plataforma.
- `platform_control`: administra usuarios de plataforma, tenants y jobs de provisionamiento.
- `provisioning`: crea y bootstrappea bases de datos por tenant.
- `tenant_modules/core`: resuelve autenticacion tenant y endpoints protegidos base.
- `common`: contiene configuracion, JWT, conexiones de base de datos, middleware y utilidades compartidas.

## Flujo de Arranque

Al iniciar la aplicacion:

1. se construye la instancia FastAPI
2. se registra middleware comun
3. se evalua si la plataforma ya fue instalada
4. si no esta instalada, se exponen rutas del instalador
5. si ya esta instalada, se exponen rutas de plataforma, tenant auth y tenant protected

En el estado actual del repositorio, la plataforma ya esta marcada como instalada por la presencia de `.platform_installed` y por la configuracion activa en `.env`.

## Flujo de Instalacion

Cuando la plataforma no esta instalada, el backend ofrece un flujo de setup inicial:

1. recibe credenciales administrativas de PostgreSQL
2. crea el rol y la base de datos de control si no existen
3. escribe el archivo `.env` con configuracion basica
4. crea la bandera `.platform_installed`

Con esto el sistema deja de exponer solo el instalador y pasa a exponer las rutas normales de operacion.

## Modelo de Datos Operativo

Hoy el sistema trabaja con dos ambitos:

- `platform_control`: guarda estado global de la plataforma
- `tenant database`: guarda datos propios de cada tenant

En `platform_control` existen al menos estos conceptos:

- instalacion de plataforma
- usuarios de plataforma
- tenants
- jobs de provisionamiento

Cada tenant, una vez provisionado, recibe:

- una base de datos propia
- un usuario propio de PostgreSQL
- tablas base del tenant
- roles iniciales
- un usuario administrador inicial del tenant

## Flujo de `platform_control`

La capa `platform_control` actua como panel de control del backend y hoy soporta principalmente:

- login de usuario de plataforma
- catalogo operativo de capacidades soportadas por el backend
- creacion de tenants
- listado de jobs de provisionamiento
- visibilidad agregada de jobs de provisionamiento por tenant
- ejecucion manual de jobs de provisionamiento

El flujo actual es:

1. un usuario de plataforma hace login
2. el sistema emite un JWT con `sub`, `email`, `role` y `token_scope=platform`
3. `platform` puede consultar `GET /platform/capabilities` para descubrir estados, modulos y claves de limite soportadas
4. un endpoint de tenants crea el registro del tenant en estado `pending`
5. automaticamente se crea un provisioning job asociado
6. un endpoint administrativo puede ejecutar el job para materializar la base del tenant
7. adicionalmente, hoy existe un worker base que procesa jobs pendientes o reintentables fuera de HTTP

## Flujo de Provisionamiento

El provisionamiento actual hace lo siguiente:

1. toma un job pendiente
2. valida que exista el tenant asociado
3. genera nombre de base de datos y usuario PostgreSQL para el tenant
4. genera una password aleatoria para ese usuario tecnico
5. crea rol y base de datos en PostgreSQL
6. conecta a esa base nueva
7. crea las tablas base del tenant
8. inserta informacion inicial del tenant
9. crea roles base
10. crea un usuario admin inicial del tenant
11. actualiza el tenant a estado `active`
12. marca el job como `completed`

Si algo falla, el flujo actual distingue entre dos escenarios:

- si al job aun le quedan intentos, pasa a `retry_pending` y agenda un nuevo intento con backoff
- si supera `max_attempts`, pasa a `failed` y el tenant queda en `error`
- si la falla es exactamente `Tenant database configuration is incomplete` durante `sync_tenant_schema`, el job ya no reintenta: pasa directo a `failed` porque el problema es de provisioning incompleto y no transitorio

Adicionalmente, en el estado actual:

- el password tecnico tenant se persiste en `.env` bajo una env var por tenant
- el provisioning ya no imprime el password completo por consola
- existe auditoria persistente de eventos de autenticacion en `platform_control`
- el worker continua con otros jobs aunque uno falle en el ciclo actual
- el script del worker usa un lock de proceso para evitar ejecucion concurrente
- el lock del worker puede separarse por `job_type` cuando se ejecuta con filtros
- el ciclo puede detenerse antes si supera un umbral de fallos configurado
- existe una vista agregada por tenant para observar volumen y estado de `provisioning_jobs`
- el worker persiste snapshots de metricas por tenant al final de cada ciclo para dejar historial operativo basico
- el worker persiste tambien una traza resumida del ciclo completo con `selection_strategy`, volumen elegible y top de scores compuestos
- snapshots por tenant y traza de ciclo quedan correlacionados por `capture_key`
- ya existe una capa minima de alertas operativas calculadas sobre esos snapshots y trazas persistidos
- esas alertas tambien pueden persistirse como historial propio dentro de `platform_control`
- opcionalmente, el worker puede exportar el resumen actual a un textfile Prometheus para consumo externo
- esa exportacion ya incluye agregacion por `job_type`, por `error_code` y alertas activas
- esa salida externa ahora tambien incluye alertas activas agregadas
- el flujo de dispatch de `provisioning_jobs` ya esta desacoplado detras de un backend `database` o `broker`
- hoy `database` es la implementacion real y `broker` queda como punto de extension futura
- cuando el backend activo es `broker`, los jobs fallidos se mueven a una DLQ Redis por `job_type`
- `platform` ya puede listar esa DLQ y reencolar jobs fallidos de forma administrativa
- el worker puede limitar su throughput a un subconjunto de `job_type`, dejando la base lista para separar cargas
- el script del worker ya soporta perfiles nombrados para resolver esos filtros de forma estable
- ya existen wrappers y unidades `systemd` plantilla para operar esos perfiles de forma repetible
- el worker ya puede aplicar prioridad por `job_type` antes de procesar el siguiente bloque pendiente
- el worker ya puede aplicar cuotas simples por `job_type` dentro del ciclo para evitar que una sola carga monopolice el throughput disponible
- el worker ya puede elevar dinamicamente esas cuotas cuando detecta backlog suficiente en un `job_type`, dejando una politica base mas adaptativa sin meter aun una cola externa
- el worker ya puede aplicar esa misma idea por clase de tenant usando `tenant_type` como criterio operativo
- el worker ya puede priorizar tambien esas clases de tenant antes de aplicar cuotas, dejando una base simple de SLA operativo
- el worker ya puede adelantar jobs envejecidos para reducir starvation aunque no pertenezcan al tipo o clase preferente del ciclo
- el orden del ciclo ya sale de un score compuesto auditable, no solo de pasos aislados de prioridad

## Flujo de Autenticacion

### Autenticacion de plataforma

El login de plataforma existe y devuelve JWT.

El token de plataforma hoy contiene:

- `sub`
- `email`
- `role`
- `token_scope=platform`
- `jti`
- `iss`
- `aud=platform-api`
- `token_type=access`

Estos endpoints estan pensados para proteger rutas administrativas de plataforma.

Adicionalmente, el login ya devuelve tambien un `refresh_token`.

### Autenticacion tenant

El login tenant funciona sobre la base de datos propia del tenant:

1. recibe `tenant_slug`, `email` y `password`
2. busca el tenant en `platform_control`
3. valida que el tenant este `active`
4. abre sesion contra la base del tenant
5. valida credenciales del usuario tenant
6. emite un JWT con contexto tenant

El token tenant incluye:

- `sub`
- `email`
- `role`
- `tenant_slug`
- `token_scope=tenant`
- `jti`
- `iss`
- `aud=tenant-api`
- `token_type=access`

El login tenant tambien devuelve `refresh_token`.

## Middleware y Contexto de Auth

Las rutas que comienzan con `/tenant` o `/platform` pasan por un middleware comun que:

- exige `Authorization: Bearer <token>`
- decodifica el JWT
- valida audiencia y tipo de token
- detecta el scope de la ruta
- valida claims segun sea contexto tenant o platform
- verifica si el access token fue revocado
- guarda el payload y el contexto normalizado en `request.state`

Ademas, toda request hoy pasa por una capa minima de observabilidad que:

- preserva o genera `X-Request-ID`
- devuelve ese valor en la respuesta
- registra un resumen tecnico de la request
- usa ese mismo `request_id` en los payloads de error centralizados

Desde ahi, los dependencies de autenticacion pueden:

- devolver el payload actual
- devolver el contexto del usuario de plataforma
- devolver el contexto del usuario tenant
- restringir acceso a admin del tenant

Adicionalmente, para requests tenant el middleware hoy tambien:

- revalida que el tenant siga `active` en `platform_control`
- deja `tenant_status` y `tenant_maintenance_mode` en `request.state`
- deja tambien `tenant_status_reason`
- deja tambien `tenant_maintenance_starts_at`, `tenant_maintenance_ends_at` y `tenant_maintenance_reason`
- deja tambien `tenant_maintenance_scopes` y `tenant_maintenance_access_mode`
- deja tambien `tenant_plan_code`
- deja tambien `tenant_plan_enabled_modules` cuando el plan define modulos
- deja tambien `tenant_plan_module_limits` cuando el plan define limites de uso por modulo
- deja tambien `tenant_module_limits` cuando existe override persistido por tenant
- deja tambien `tenant_billing_status`, `tenant_billing_status_reason`, `tenant_billing_current_period_ends_at` y `tenant_billing_grace_until`
- deja tambien `tenant_billing_in_grace` y una vista efectiva de acceso (`tenant_access_*`)
- deja tambien `tenant_billing_grace_api_*`, `tenant_billing_grace_enabled_modules`, `tenant_billing_grace_module_limits`, `tenant_effective_enabled_modules`, `tenant_effective_module_limits` y `tenant_effective_module_limit_sources` cuando aplica degradacion por gracia
- el enforcement actual de limites por modulo ya cubre `finance.entries`, `finance.entries.monthly`, cuotas segmentadas como `finance.entries.monthly.income`, `finance.entries.monthly.expense`, `core.users`, `core.users.active`, `core.users.monthly` y cuotas por rol como `core.users.admin`, `core.users.manager` y `core.users.operator`
- esas claves de cuota ya salen de un registro comun en `backend/app/common/policies/module_limit_catalog.py`, evitando drift entre politicas, servicios y vistas de uso
- `GET /tenant/module-usage` y `GET /platform/tenants/{tenant_id}/module-usage` exponen esos consumos con campos genericos `used_units`, `max_units` y `remaining_units`
- deja tambien `tenant_api_read_requests_per_minute` y `tenant_api_write_requests_per_minute`
- clasifica la request tenant por modulo y tipo de operacion
- bloquea tambien por lifecycle tenant si el estado ya no es `active`
- puede bloquear tambien por politica de billing aunque el `status` manual siga en `active`
- la decision efectiva de acceso tenant ya puede leerse como una politica consolidada, no solo como checks dispersos
- puede bloquear rutas de modulo con `403` si un tenant realmente legacy mantiene `plan_code` y ese baseline no habilita ese modulo
- bloquea con `503` segun mantenimiento manual o ventana activa, respetando scope y access mode configurados
- puede aplicar cuota por tenant separando lecturas y escrituras si se habilitan limites por minuto
- puede resolver primero una cuota por plan solo cuando el tenant sigue realmente legacy y mantiene `plan_code`
- si el tenant esta en gracia de billing, puede degradar antes la cuota y los modulos efectivos
- `finance` ya expone uso contra limite efectivo tanto desde `tenant` como desde `platform`
- tambien existe una vista generica de uso por modulo para no acoplar operacion solo a `finance`
- tambien puede resolver limites de uso por modulo desde el plan y degradarlos adicionalmente durante billing grace
- si el tenant tiene overrides persistidos en `platform_control`, esos valores tienen prioridad sobre los limites globales
- la prioridad final de cuota es `gracia billing > override tenant > plan > global`
- responde `429` cuando una cuota tenant configurada se excede
- devuelve headers `X-Tenant-RateLimit-*` cuando la cuota tenant esta activa

## Estado Actual y Limitaciones

El backend ya tiene una base funcional real, pero todavia esta en una fase inicial. Las limitaciones mas visibles hoy son estas:

- la resolucion de passwords de base de datos tenant es temporal y depende del `slug` en algunos casos
- hay credenciales iniciales y salidas por consola pensadas para desarrollo
- ya existen tests unitarios base, pruebas de integracion con SQLite temporal y smoke tests HTTP, pero falta mas cercania a PostgreSQL
- ya existe una base de migraciones versionadas, pero aun falta llevarla a un nivel mas completo de operacion
- ya existe una politica base de mantenimiento tenant con ventana programable y reglas por modulo/acceso, pero aun falta enriquecerla mas
- la cuota tenant ya puede salir de memoria y pasar a Redis si se configura `TENANT_API_RATE_LIMIT_BACKEND=redis`
- ya existen cuotas por plan y overrides persistidos por tenant para cuota `read/write`, y billing grace ya puede degradar esos valores y modulos de forma automatica
- el lifecycle tenant ya soporta `suspended` y otros estados operativos, y ya existe una primera politica automatica por billing, aunque aun falta un modulo de billing mas formal
- `platform` ya persiste historial de cambios de politica tenant para `maintenance`, `rate_limit`, `plan`, `billing` y `status`
- `platform` ya puede sincronizar eventos de billing idempotentes por tenant y listarlos historicamente
- existe ya una primera capa adaptadora para Stripe y una ruta publica de webhook con firma por cabecera y tolerancia temporal
- el tenant ya puede persistir identidad externa de billing para resolver webhooks por `subscription/customer` antes de caer a metadata
- `platform` ya puede actualizar esa identidad externa manualmente y tambien dejarla sincronizada desde eventos del proveedor
- ya existe reconciliacion administrativa desde eventos de billing persistidos para corregir drift de estado
- los eventos de billing ya distinguen estados operativos como `applied`, `duplicate`, `ignored` y `reconciled`
- el historial de eventos de billing ya puede filtrarse por `event_type` y `processing_result`, y tambien reconciliarse en lote
- existe ya una vista agregada del historial de billing para soporte rapido sin recorrer eventos individuales
- existe tambien una vista global cross-tenant para leer volumen de eventos y dispersion por proveedor
- existe tambien una capa minima de alertas operativas sobre billing usando umbrales de `duplicate`, `ignored` y volumen por proveedor
- esas alertas de billing ya pueden persistirse y consultarse como historial operativo propio
- el backend `broker` de provisioning ya puede operar sobre Redis, aunque aun no tiene DLQ ni politicas avanzadas de orquestacion

## Resumen

Hoy `platform_paas` ya funciona como una base backend para una plataforma SaaS multi-tenant:

- instala una base central
- administra tenants
- provisiona bases dedicadas por tenant
- protege rutas de plataforma y tenant con JWT
- permite login tenant
- separa contexto de plataforma y contexto tenant

Lo que aun falta es endurecer seguridad, cerrar migraciones, completar frontend y llevar la operacion a un nivel mas cercano a produccion.
