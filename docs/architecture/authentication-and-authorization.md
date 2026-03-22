# Autenticacion y Autorizacion

Este documento resume el esquema actual de autenticacion y autorizacion implementado en el backend de `platform_paas`.

## Objetivo

El sistema diferencia dos contextos de acceso:

- usuarios de plataforma
- usuarios tenant

Cada contexto tiene login propio y usa JWT para transportar identidad y claims basicos.

Ademas, hoy existe un ciclo basico de sesion:

- login con `access_token` y `refresh_token`
- refresh rotatorio
- logout con revocacion basica

## Autenticacion de Plataforma

La autenticacion de plataforma funciona contra la base `platform_control`.

Flujo actual:

1. el usuario envia `email` y `password`
2. el backend busca el usuario en `platform_users`
3. valida que el usuario exista
4. valida que este activo
5. valida el password
6. emite un JWT

Claims actuales del token de plataforma:

- `sub`
- `email`
- `role`
- `token_scope=platform`
- `jti`
- `iss`
- `aud=platform-api`
- `token_type=access`
- `nbf`
- `iat`
- `exp`

Este token esta pensado para proteger endpoints administrativos como:

- rutas de plataforma
- creacion de tenants
- jobs de provisionamiento

El login de plataforma hoy devuelve:

- `access_token`
- `refresh_token`
- `token_type=bearer`

## Autenticacion Tenant

La autenticacion tenant ocurre contra la base de datos propia del tenant.

Flujo actual:

1. el cliente envia `tenant_slug`, `email` y `password`
2. el backend busca el tenant en `platform_control`
3. valida que exista y este `active`
4. abre sesion hacia la DB del tenant
5. busca el usuario tenant
6. valida estado y password
7. emite un JWT tenant

Claims actuales del token tenant:

- `sub`
- `email`
- `role`
- `tenant_slug`
- `token_scope=tenant`
- `jti`
- `iss`
- `aud=tenant-api`
- `token_type=access`
- `nbf`
- `iat`
- `exp`

La presencia de `tenant_slug` y `token_scope` permite distinguir este token del token de plataforma.

El login tenant hoy devuelve:

- `access_token`
- `refresh_token`
- `token_type=bearer`

## Generacion y Validacion de JWT

El backend usa JWT firmados con:

- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ISSUER`
- `JWT_PLATFORM_AUDIENCE`
- `JWT_TENANT_AUDIENCE`
- expiracion basada en `ACCESS_TOKEN_EXPIRE_MINUTES`

La generacion del token:

- copia el payload recibido
- agrega `jti`
- agrega `iss`
- agrega `aud`
- agrega `token_type=access`
- agrega `iat`
- agrega `nbf`
- agrega `exp`
- firma el token

La validacion:

- verifica firma
- verifica expiracion
- verifica issuer
- verifica audience segun la ruta protegida
- exige claims minimos del token
- devuelve error `401` si el token expiro o es invalido

## Refresh y Revocacion

El backend ya no trabaja solo con access tokens de vida fija.

Hoy existe esta base:

- el refresh token se persiste en `platform_control.auth_tokens`
- el refresh rota el token anterior y emite un nuevo par
- el logout revoca la sesion actual
- el middleware rechaza access tokens revocados

Endpoints actuales:

- `POST /platform/auth/refresh`
- `POST /platform/auth/logout`
- `POST /tenant/auth/refresh`
- `POST /tenant/auth/logout`

## Auditoria de Auth

La capa de autenticacion ya deja trazabilidad basica en `platform_control`.

Actualmente se registran eventos de:

- login exitoso y fallido
- refresh exitoso y fallido
- logout exitoso

Scopes cubiertos:

- `platform`
- `tenant`

Esto da una base minima para:

- investigar accesos fallidos
- seguir rotacion de sesiones
- preparar observabilidad y auditoria mas rica despues

## Middleware Actual

Existe middleware comun para rutas tenant y platform.

Su comportamiento actual es:

1. intercepta rutas que comienzan con `/tenant` y `/platform`
2. deja pasar rutas publicas como login tenant, health tenant y login de plataforma
3. exige header `Authorization: Bearer <token>`
4. decodifica el JWT
5. valida la audiencia esperada para la ruta
6. valida el scope correcto para la ruta
7. valida la presencia de claims requeridos
8. guarda el contexto en `request.state`

Datos cargados en `request.state`:

- `platform_user_id`
- `platform_email`
- `platform_role`
- `tenant_user_id`
- `tenant_slug`
- `tenant_email`
- `tenant_role`
- `token_scope`
- `jwt_payload`

## Dependencias de Autorizacion

Encima del middleware existen helpers para consumir el contexto autenticado.

### `get_current_token_payload`

Devuelve el payload JWT presente en `request.state`.

Uso esperado:

- endpoints que necesitan leer claims del token actual

### `get_current_tenant_context`

Devuelve un contexto tenant validado con:

- `user_id`
- `email`
- `role`
- `tenant_slug`
- `token_scope`
- `permissions`

Este helper asume que el middleware ya poblo `request.state`.

### `get_current_platform_context`

Devuelve un contexto platform validado con:

- `user_id`
- `email`
- `role`
- `token_scope`

### `require_tenant_admin`

Restringe una ruta a usuarios tenant con rol `admin`.

### `require_tenant_permission`

Restringe una ruta tenant a un permiso concreto, por ejemplo:

- `tenant.users.read`
- `tenant.users.create`
- `tenant.finance.read`
- `tenant.finance.create`

### `require_role`

Restringe una ruta a uno o varios roles permitidos a partir del claim `role`.

Hoy se esta usando para proteger rutas de plataforma con `superadmin`.

## Autorizacion Actual por Ambito

### Ambito tenant

En el ambito tenant la historia esta bastante clara:

- existe login tenant
- existe middleware especifico
- existe contexto tenant en `request.state`
- existen dependencies para validar autenticacion y rol admin tenant

### Ambito plataforma

En el ambito plataforma ahora existe una base consistente de enforcement:

- el login de plataforma si genera JWT
- el token incluye `token_scope=platform`
- las rutas `/platform` pasan por middleware comun
- el payload queda disponible en `request.state`
- `require_role` ya puede usarse sobre ese contexto

## Roles Actuales

Roles observables hoy:

- plataforma: `superadmin`, `support`
- tenant: `admin`, `manager`, `operator`

Ya existe una primera capa de permisos finos por rol en tenant, aunque todavia es simple y esta definida en codigo.

## Limitaciones Actuales

- no hay rotacion de secretos automatizada
- la revocacion actual es basica y no modela dispositivos o familias completas de sesion
- la auditoria actual esta centrada en autenticacion, no en toda la actividad operativa
- los permisos tenant siguen siendo un mapa simple, no un RBAC persistido en DB
- parte del sistema sigue con decisiones temporales de desarrollo

## Recomendaciones Naturales para la Siguiente Etapa

- mover secretos a un almacenamiento seguro
- mantener `platform` y `tenant` con audiencias separadas y sin compatibilidad legacy
- evolucionar desde permisos simples en codigo a RBAC persistido y mas expresivo
- agregar pruebas de integracion de autenticacion y autorizacion

## Resumen

El backend ya separa dos identidades distintas:

- operador de plataforma
- usuario de tenant

Ambos contextos ya tienen enforcement basico en el lifecycle del request. Lo siguiente no es cerrar el modelo base, sino endurecerlo: permisos mas finos, manejo de secretos, revocacion y pruebas.
