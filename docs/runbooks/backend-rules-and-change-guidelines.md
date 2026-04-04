# Reglas Backend y Guia de Cambios

Este documento deja por escrito como deben tratarse las reglas de la app en el backend de `platform_paas`.

Marco transversal complementario:

- [Gobernanza de implementacion](../architecture/implementation-governance.md)

La idea es evitar tres problemas comunes:

- meter logica de negocio en routers
- inventar reglas nuevas solo editando datos cuando el backend no las entiende
- duplicar reglas entre middleware, servicios y frontend

## Regla general

Hay dos tipos de cambios posibles:

1. cambiar valores de reglas que el backend ya soporta
2. crear reglas nuevas o cambiar el significado de una regla existente

La diferencia es importante:

- si el backend ya conoce la regla, muchas veces puedes operarla manualmente
- si el backend no conoce la regla, hay que programarla

## Que reglas ya se pueden operar manualmente

Hoy pueden ajustarse sin crear logica nueva, siempre que se usen los mecanismos ya soportados por la app.

### Desde endpoints `platform`

Se pueden operar manualmente cosas como:

- `status` del tenant
- maintenance
- `plan_code`
- `rate-limit`
- `module-limits`
- billing state
- billing identity

Eso existe porque el backend ya tiene:

- modelos
- servicios
- validaciones
- endpoints
- efectos reales sobre middleware y servicios

### Desde configuracion `.env`

Tambien pueden ajustarse reglas configurables ya soportadas, por ejemplo:

- `TENANT_PLAN_RATE_LIMITS`
- `TENANT_PLAN_ENABLED_MODULES`
- `TENANT_PLAN_MODULE_LIMITS`
- `TENANT_BILLING_GRACE_RATE_LIMITS`
- `TENANT_BILLING_GRACE_ENABLED_MODULES`
- `TENANT_BILLING_GRACE_MODULE_LIMITS`
- thresholds de alertas
- politicas operativas del worker

En estos casos no estas inventando una regla nueva; estas cambiando valores de una politica que el backend ya sabe interpretar.

## Que NO se debe hacer solo a mano

No basta con editar la base o una variable si el backend no entiende esa regla.

Ejemplos que requieren programacion:

- un permiso nuevo
- un estado nuevo de lifecycle
- una cuota nueva no declarada por el backend
- una regla nueva de negocio en `users` o `finance`
- un nuevo tipo de validacion funcional
- una nueva politica de billing o mantenimiento

En esos casos, si solo cambias datos:

- el backend no la aplicara
- no la expondra bien por API
- frontend no podra descubrirla correctamente
- puedes generar drift entre datos y comportamiento real

## Donde debe vivir cada tipo de regla

### 1. Router

El router no debe contener la regla de negocio.

Su responsabilidad es:

- recibir request
- resolver dependencies
- llamar un servicio
- devolver respuesta HTTP

Si una regla empieza a vivir en el router, normalmente esta mal ubicada.

### 2. Service

La mayoria de las reglas de negocio nuevas deben vivir en la capa `service`.

Ejemplos:

- crear usuario solo si no supera una cuota
- impedir un cambio de rol por una politica de negocio
- validar que un movimiento financiero cumple una regla funcional

Archivos tipicos:

- `backend/app/apps/tenant_modules/core/services/tenant_data_service.py`
- `backend/app/apps/tenant_modules/finance/services/finance_service.py`
- `backend/app/apps/platform_control/services/tenant_service.py`

### 3. Middleware o dependencies

Si la regla afecta el acceso a la request completa antes del caso de uso, debe vivir en middleware o dependencies.

Ejemplos:

- tenant suspendido
- modulo no habilitado
- token con scope incorrecto
- permiso requerido para una accion

Archivos tipicos:

- `backend/app/common/middleware/tenant_context_middleware.py`
- `backend/app/common/auth/dependencies.py`
- `backend/app/common/auth/role_dependencies.py`

### 4. `common/policies`

Si la regla es transversal, configurable o reusable, debe vivir en `common/policies`.

Ejemplos:

- planes
- cuotas por plan
- billing grace
- rate limiting
- catalogos canonicos de cuotas por modulo

Archivos tipicos:

- `backend/app/common/policies/tenant_plan_policy_service.py`
- `backend/app/common/policies/tenant_billing_grace_policy_service.py`
- `backend/app/common/policies/tenant_rate_limit_service.py`
- `backend/app/common/policies/module_limit_catalog.py`

### 5. Repository

Si lo que necesitas es consultar o persistir datos para soportar una regla, eso va en `repository`.

El repository no decide la politica. Solo provee acceso a datos.

Ejemplos:

- contar usuarios activos
- contar movimientos del mes
- buscar un tenant por identidad de billing

### 6. Schemas

Si la validacion es de forma o contrato HTTP, eso va en `schemas`, no como regla de negocio.

Ejemplos:

- tipos de campos
- campos obligatorios
- estructura de request o response

## Regla especial para cuotas y capacidades por modulo

Las claves canonicas de cuotas no deben inventarse en cualquier archivo.

Hoy el punto canonico es:

- `backend/app/common/policies/module_limit_catalog.py`

Si quieres agregar una cuota nueva, el orden correcto es:

1. declararla en `module_limit_catalog.py`
2. hacer que la politica la soporte si corresponde
3. aplicarla en el `service` o middleware correcto
4. exponerla por API si hace falta
5. agregar tests
6. actualizar documentacion

## Regla especial para cambios manuales

Si una regla ya existe, el orden recomendado para operarla es:

1. endpoint `platform` si existe
2. configuracion `.env` si esa politica ya es configurable
3. cambios directos en DB solo como ultimo recurso controlado

No se recomienda editar la DB directo como forma normal de operar reglas.

## Checklist antes de agregar una regla nueva

Antes de implementar una regla nueva, revisar:

1. si ya existe una politica equivalente en backend
2. si el cambio es de valor o de comportamiento
3. en que capa debe vivir
4. si necesita nuevo contrato HTTP
5. si necesita nuevo conteo o query en repository
6. si debe descubrirse desde `GET /platform/capabilities`
7. que tests deben cubrirla
8. que documentacion debe actualizarse

## Regla de cierre

Si la regla nueva cambia comportamiento visible o flujo operativo, no alcanza con el backend.

Tambien debe revisarse:

- si el frontend necesita ajuste o endurecimiento
- si hay smoke E2E existente que deba actualizarse
- si `docs/modules/<modulo>/DEV_GUIDE.md`, `USER_GUIDE.md`, `ROADMAP.md` y `CHANGELOG.md` deben cambiar
- si el runbook de validacion u onboarding queda desfasado para otra IA

## Ejemplos practicos

### Caso 1. "manager no puede crear admins"

Esto es regla de negocio.

Lugar correcto:

- `tenant_data_service.py`

### Caso 2. "el plan basic no habilita finance"

Esto es politica transversal configurable.

Lugar correcto:

- `tenant_plan_policy_service.py`

### Caso 3. "si el tenant esta suspendido, toda request tenant debe bloquearse"

Esto es regla de acceso por request.

Lugar correcto:

- `tenant_context_middleware.py`

### Caso 4. "agregar una cuota `finance.entries.monthly.refund`"

Esto requiere programacion.

Orden correcto:

1. `module_limit_catalog.py`
2. politica de planes o gracia si aplica
3. `finance_service.py`
4. `module_usage_service.py`
5. tests
6. docs

## Resumen ejecutivo

Puedes cambiar manualmente reglas que el backend ya soporta.

Si quieres crear una regla nueva de verdad, debe hacerse por programacion.

La mayoria de las reglas nuevas deberian entrar por `service`, y solo se mueven a middleware, `common/policies` o repository cuando por naturaleza pertenecen ahi.
