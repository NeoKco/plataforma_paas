# Implementacion Backend Tenant

Este documento esta pensado para desarrolladores que quieran entender e implementar el flujo tenant dentro de `platform_paas` siguiendo la estructura real del proyecto.

## Donde conviene dejar esta documentacion

La recomendacion es esta:

- `docs/architecture/`: para explicar el por que del diseno
- `docs/api/`: para describir endpoints y contratos
- `docs/runbooks/`: para guias paso a paso como esta

Por eso este documento queda en `docs/runbooks/`, porque describe una secuencia concreta de implementacion.

## Objetivo de esta etapa

Pasar de:

- login tenant funcionando

a:

- request tenant autenticado
- contexto tenant disponible por request
- resolucion de DB tenant segun `tenant_slug`
- primeras consultas reales a tablas del tenant

## Estructura real usada

Los archivos clave de esta etapa viven en:

- `backend/app/common/auth/`
- `backend/app/common/middleware/`
- `backend/app/common/db/`
- `backend/app/apps/tenant_modules/core/api/`
- `backend/app/apps/tenant_modules/core/services/`

## Paso 1. JWT tenant

El login tenant genera un JWT que incluye:

- `sub`
- `email`
- `role`
- `tenant_slug`
- `token_scope=tenant`
- `jti`
- `iss`
- `aud=tenant-api`
- `token_type=access`

Eso permite saber:

- quien es el usuario
- a que tenant pertenece
- que scope de API puede usar

Ademas, hoy el login tenant devuelve:

- `access_token`
- `refresh_token`

Y existen rutas:

- `POST /tenant/auth/refresh`
- `POST /tenant/auth/logout`

Ademas, la capa auth tenant ya deja auditoria persistente para:

- login exitoso y fallido
- refresh exitoso y fallido
- logout exitoso

Y antes de emitir login o refresh tenant:

- revalida el `status` del tenant en `platform_control`
- no emite nuevos tokens para tenants `suspended`, `pending`, `error` o `archived`

## Paso 2. Middleware de contexto

El middleware de auth:

- intercepta rutas `/tenant/*`
- valida el Bearer token
- decodifica JWT
- valida `iss`, `aud` y `token_type=access`
- valida el scope
- verifica si el access token fue revocado
- guarda contexto en `request.state`

Datos disponibles despues del middleware:

- `tenant_slug`
- `tenant_user_id`
- `tenant_email`
- `tenant_role`
- `token_scope`
- `jwt_payload`
- `tenant_plan_code`
- `tenant_plan_enabled_modules`
- `tenant_plan_module_limits`
- `tenant_billing_status`
- `tenant_billing_status_reason`
- `tenant_billing_current_period_ends_at`
- `tenant_billing_grace_until`
- `tenant_billing_grace_api_read_requests_per_minute`
- `tenant_billing_grace_api_write_requests_per_minute`
- `tenant_billing_grace_enabled_modules`
- `tenant_billing_grace_module_limits`
- `tenant_status`
- `tenant_status_reason`
- `tenant_maintenance_mode`
- `tenant_maintenance_starts_at`
- `tenant_maintenance_ends_at`
- `tenant_maintenance_reason`
- `tenant_maintenance_scopes`
- `tenant_maintenance_access_mode`
- `tenant_api_read_requests_per_minute`
- `tenant_api_write_requests_per_minute`
- `tenant_module_limits`
- `tenant_effective_module_limits`
- `tenant_effective_module_limit_sources`

Ademas, en el estado actual:

- el middleware revalida que el tenant siga `active`
- si el tenant esta en `suspended`, bloquea la API tenant con `423`
- si el tenant esta en `pending` o `error`, bloquea la API tenant con `503`
- si el tenant esta en `archived`, bloquea la API tenant con `403`
- si el tenant esta en `past_due` sin gracia vigente, bloquea la API tenant con `423`
- si el tenant esta en `billing_status=suspended`, bloquea la API tenant con `423`
- si el tenant esta en `billing_status=canceled` y ya expiro su periodo, bloquea la API tenant con `403`
- si el tenant esta en mantenimiento manual o dentro de una ventana activa, bloquea operaciones tenant de escritura con `503`
- la decision final depende del modulo de la ruta y del `maintenance_access_mode`
- lecturas `GET` y rutas de auth tenant siguen disponibles
- si se configuran cuotas, el middleware puede aplicar rate limiting por tenant separando lecturas y escrituras
- cuando la cuota tenant esta activa, las respuestas exitosas incluyen headers `X-Tenant-RateLimit-*`
- cuando una cuota tenant se excede, la API responde `429` sin llegar al router

## Paso 3. Dependencias tenant

Las dependencias de auth tenant leen `request.state` y exponen helpers reutilizables:

- `get_current_tenant_context`
- `require_tenant_admin`
- `require_tenant_permission("<permiso>")`

Con eso las rutas no repiten validaciones de seguridad.

La logica de cuota tenant vive en:

- `backend/app/common/policies/tenant_rate_limit_service.py`
- `backend/app/common/middleware/tenant_context_middleware.py`

Variables relevantes:

- `TENANT_API_READ_REQUESTS_PER_MINUTE`
- `TENANT_API_WRITE_REQUESTS_PER_MINUTE`
- `TENANT_PLAN_RATE_LIMITS`
- `TENANT_PLAN_ENABLED_MODULES`
- `TENANT_PLAN_MODULE_LIMITS`
- `TENANT_BILLING_GRACE_RATE_LIMITS`
- `TENANT_BILLING_GRACE_ENABLED_MODULES`
- `TENANT_BILLING_GRACE_MODULE_LIMITS`

Las claves canonicas de cuotas por modulo ya no quedan repartidas entre servicios:

- `backend/app/common/policies/module_limit_catalog.py`

Si agregas una cuota nueva, ese archivo es el punto canonico para declararla antes de usarla en middleware, servicios o vistas de uso.

Alcance actual:

- en `memory` es una cuota base `best effort`
- en `redis` pasa a ser una cuota compartida entre procesos backend
- separa buckets por `tenant_slug` y por tipo de operacion (`read` o `write`)
- se activa con `TENANT_API_RATE_LIMIT_BACKEND=redis`
- si el tenant sigue realmente legacy y tiene `plan_code`, el middleware puede tomar la cuota `read/write` desde `TENANT_PLAN_RATE_LIMITS`
- si el tenant sigue realmente legacy y tiene `plan_code`, el middleware tambien puede habilitar o bloquear modulos segun `TENANT_PLAN_ENABLED_MODULES`
- `maintenance` ya no hereda acceso desde `core`; si la ruta cae bajo `/tenant/maintenance`, el plan o la gracia de billing deben incluir explícitamente `maintenance`
- si el tenant sigue realmente legacy y tiene `plan_code`, el middleware tambien puede resolver limites de uso por modulo desde `TENANT_PLAN_MODULE_LIMITS`
- si el tenant esta en `billing_in_grace`, el middleware puede degradar cuotas y modulos con `TENANT_BILLING_GRACE_*`
- si existe `TENANT_BILLING_GRACE_MODULE_LIMITS`, tambien puede degradar el limite efectivo por modulo
- si el tenant tiene override persistido, ese valor tiene prioridad sobre la configuracion global
- la prioridad final de cuota es `gracia billing > override tenant > baseline legacy por plan_code > global`
- los modulos efectivos salen de la interseccion `plan` y `billing grace` cuando ambas politicas existen
- si una ruta tenant pertenece a un modulo no habilitado por plan, la API responde `403`
- si una ruta tenant pertenece a un modulo excluido por la politica de gracia vigente, la API responde `403`
- `null` hace fallback a la configuracion global
- `0` deja esa categoria sin limite efectivo para ese tenant

## Paso 3.1 Permisos tenant mas finos

Despues del CRUD basico de usuarios, el control por `role == admin` ya quedaba corto.

Por eso se agrego un mapa simple de permisos por rol en:

- `backend/app/apps/tenant_modules/core/permissions.py`

Permisos actuales:

- `tenant.users.read`
- `tenant.users.create`
- `tenant.users.update`
- `tenant.users.change_status`
- `tenant.finance.read`
- `tenant.finance.create`

Eso permite dejar algunas operaciones para `manager` y otras solo para `admin`, en vez de proteger todo el backend tenant con una sola regla fija.

## Paso 4. Resolver la DB tenant por request

La dependency `get_tenant_db()` hace el puente importante entre autenticacion y operacion real:

1. toma `tenant_slug` desde `request.state`
2. valida que el scope sea `tenant`
3. abre sesion a `platform_control`
4. busca el tenant activo
5. resuelve la session factory tenant
6. entrega una sesion SQLAlchemy a la ruta

Ese es el momento en que la request deja de trabajar solo con JWT y empieza a trabajar con la base real del tenant.

## Paso 5. Primeras rutas reales tenant

Rutas disponibles en esta etapa:

- `GET /tenant/me`
- `GET /tenant/info`
- `GET /tenant/db-info`
- `GET /tenant/users/me-db`
- `GET /tenant/users`
- `GET /tenant/admin-only`
- `GET /tenant/module-usage`

Credenciales bootstrap tenant de desarrollo:

- email: `admin@<tenant_slug>.local`
- password: `TenantAdmin123!`

Ejemplo:

- `admin@empresa-demo.local`
- `TenantAdmin123!`

En `GET /tenant/info` ahora tambien se expone:

- `plan_code`
- `plan_enabled_modules`
- `plan_module_limits`
- `module_limits`
- `billing_status`
- `billing_status_reason`
- `billing_current_period_ends_at`
- `billing_grace_until`
- `billing_in_grace`
- `billing_grace_enabled_modules`
- `billing_grace_module_limits`
- `billing_grace_api_read_requests_per_minute`
- `billing_grace_api_write_requests_per_minute`
- `tenant_status`
- `tenant_status_reason`
- `access_allowed`
- `access_blocking_source`
- `access_detail`
- cuota `read/write` declarada por plan, cuando existe
- override persistido de cuota `read/write`
- modulos efectivos despues de aplicar billing grace, cuando corresponde
- limites efectivos por modulo despues de aplicar billing grace, cuando corresponde
- fuente efectiva de cada limite por modulo (`plan`, `tenant_override` o `billing_grace`)
- cuota efectiva final `read/write` aplicada al tenant actual

En el estado actual, el primer limite de uso real por modulo ya aplica sobre:

- `core.users`
- `core.users.active`
- `core.users.monthly`
- `core.users.admin`
- `core.users.manager`
- `core.users.operator`
- `finance.entries`
- `finance.entries.monthly`
- `finance.entries.monthly.income`
- `finance.entries.monthly.expense`

Regla:

- `0` significa sin limite
- un valor positivo bloquea nuevas creaciones cuando el tenant alcanza ese total
- hoy el enforcement aplica sobre `POST /tenant/finance/entries`
- hoy tambien aplica sobre `POST /tenant/finance/entries` para `finance.entries.monthly`
- hoy tambien aplica sobre `POST /tenant/finance/entries` para cuotas segmentadas como `finance.entries.monthly.income` y `finance.entries.monthly.expense`
- hoy tambien aplica sobre `POST /tenant/users` para `core.users`
- hoy tambien aplica sobre activacion de usuarios en `POST /tenant/users` y `PATCH /tenant/users/{user_id}/status` para `core.users.active`
- hoy tambien aplica sobre `POST /tenant/users` para `core.users.monthly`
- hoy tambien aplica sobre `POST /tenant/users` y `PUT /tenant/users/{user_id}` para cuotas por rol como `core.users.admin`
- `GET /tenant/finance/usage` expone `used_entries`, `max_entries`, `remaining_entries`, `unlimited`, `at_limit` y `limit_source`
- `GET /tenant/module-usage` expone una vista generica por modulo con `used_units`, `max_units`, `remaining_units`, `unlimited`, `at_limit` y `limit_source`

## Paso 6. Primer CRUD real del tenant

Una vez validado el contexto tenant y la conexion dinamica a su DB, el siguiente caso de uso natural fue implementar un CRUD basico de usuarios tenant.

Rutas agregadas:

- `POST /tenant/users`
- `GET /tenant/users/{user_id}`
- `PUT /tenant/users/{user_id}`
- `PATCH /tenant/users/{user_id}/status`

Reglas aplicadas:

- el CRUD ya no depende solo de `admin`; usa permisos por accion
- no se permiten emails duplicados dentro del mismo tenant
- al crear o actualizar password se usa `hash_password`
- un admin no puede desactivarse a si mismo por error

## Paso 7. Separar router y servicio

Para no dejar consultas SQLAlchemy directamente mezcladas en el router, se agrego un servicio:

- `tenant_data_service.py`

Ese servicio encapsula:

- lectura de `tenant_info`
- busqueda de usuario por `id`
- listado de usuarios

La idea es que el router quede enfocado en:

- recibir request
- declarar dependencies
- devolver respuesta HTTP

y que la logica de acceso a datos quede moviendose gradualmente hacia servicios.

Ademas de lectura, `tenant_data_service.py` ahora encapsula:

- creacion de usuarios tenant
- actualizacion de datos basicos
- cambio de estado activo/inactivo

## Paso 8. Introducir una capa repository

Despues del primer paso `router -> service`, se agrego una capa minima de acceso a datos en:

- `backend/app/apps/tenant_modules/core/repositories/tenant_info_repository.py`
- `backend/app/apps/tenant_modules/core/repositories/user_repository.py`

Estos repositorios encapsulan operaciones concretas:

- obtener `tenant_info`
- buscar usuario por `id`
- listar usuarios del tenant

Con eso `TenantDataService` deja de depender directamente de `tenant_db.query(...)` y queda mas facil de testear y extender.

## Paso 9. Formalizar respuestas con schemas

Despues de validar el flujo tenant, el siguiente refinamiento fue dejar contratos explicitos de respuesta en:

- `backend/app/apps/tenant_modules/core/schemas.py`

Eso permite:

- usar `response_model` en rutas
- documentar mejor la API
- reducir errores de estructura en respuestas
- preparar el terreno para una API mas estable

Nota practica:

- como los usuarios seed tenant actuales usan correos tipo `admin@empresa-bootstrap.local`, los schemas de respuesta tenant usan `str` para email en vez de `EmailStr`
- eso evita que Pydantic rechace dominios reservados `.local` durante el desarrollo

Tambien se agregaron schemas de request para el CRUD de usuarios tenant:

- `TenantUserCreateRequest`
- `TenantUserUpdateRequest`
- `TenantUserStatusUpdateRequest`

## Paso 10. Agregar tests del flujo tenant

Una vez estabilizado el flujo tenant, conviene congelar el comportamiento con tests.

En esta etapa se agrego una suite basica en:

- `backend/app/tests/test_tenant_flow.py`

La idea de estos tests es:

- validar dependencies, session manager y rutas tenant sin depender de una DB real
- probar funciones de ruta y servicios con `unittest`
- mockear el servicio `tenant_data_service`

Escenarios cubiertos:

- `get_current_tenant_context`
- `require_tenant_admin`
- `get_tenant_db()`
- `TenantDataService` con repositories fake
- validaciones del CRUD tenant
- `tenant_me`
- `tenant_info`
- `tenant_me_db`
- `tenant_users`
- `tenant_user_detail`
- `tenant_create_user`
- `tenant_update_user`
- `tenant_update_user_status`
- bloqueo de escrituras tenant en modo mantenimiento
- propagacion del flag `maintenance_mode` en el contexto tenant

Como correrlos:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_flow
```

## Flujo completo actual

El flujo tenant hoy queda asi:

1. login tenant devuelve JWT
2. cliente envia Bearer token a una ruta `/tenant/*`
3. middleware valida y deja contexto en `request.state`
4. dependency `get_tenant_db()` resuelve la DB correcta del tenant
5. la ruta usa un servicio para consultar datos reales
6. para operaciones CRUD, el servicio aplica validaciones y persiste cambios
7. la respuesta vuelve con contexto auth mas datos de la DB tenant

## Archivos clave

- `backend/app/common/middleware/tenant_context_middleware.py`
- `backend/app/common/auth/dependencies.py`
- `backend/app/common/db/session_manager.py`
- `backend/app/apps/tenant_modules/core/schemas.py`
- `backend/app/apps/tenant_modules/core/api/tenant_routes.py`
- `backend/app/apps/tenant_modules/core/services/tenant_connection_service.py`
- `backend/app/apps/tenant_modules/core/services/tenant_data_service.py`
- `backend/app/apps/tenant_modules/core/repositories/tenant_info_repository.py`
- `backend/app/apps/tenant_modules/core/repositories/user_repository.py`
- `backend/app/tests/test_tenant_flow.py`

## Limitaciones actuales

- la password tecnica de la DB tenant sigue resuelta de forma temporal por `slug`
- la logica de datos aun es basica
- los permisos tenant siguen siendo simples y definidos en codigo
- aun no hay integracion con auditoria o eventos de dominio
- el upgrade de esquema tenant existe por sync basico, pero aun no por migraciones versionadas

## Siguiente paso recomendado

La siguiente mejora natural es una de estas dos:

1. sumar pruebas de integracion con DB temporal por tenant
2. endurecer el modelo de permisos tenant hacia RBAC persistido
3. cerrar migraciones del modulo `finance` y los siguientes modulos

Si el objetivo es seguir aprendiendo por capas, el siguiente salto natural ya no es arquitectura base sino empezar casos de uso reales del tenant.
