# Matriz de Politicas y Precedencias del Backend

Este documento consolida en una sola vista las reglas que gobiernan acceso tenant, mantenimiento, billing, cuotas y precedencias efectivas.

La intencion es evitar que frontend, soporte o developers tengan que reconstruir estas reglas leyendo servicios y middleware por separado.

## Orden de Evaluacion por Request Tenant

En runtime, una request tenant pasa por esta secuencia efectiva:

| Orden | Regla | Fuente principal | Resultado posible |
| --- | --- | --- | --- |
| 1 | JWT, audience, token type y revocacion | `AuthContextMiddleware`, `JWTService`, `AuthTokenService` | `401` si el token es invalido, revocado o no es `access` |
| 2 | Scope tenant y claims requeridos | `AuthContextMiddleware` | `403` si faltan `tenant_slug`, `sub`, `email` o `role` |
| 3 | Existencia del tenant | `TenantRepository` | `404` si el tenant no existe |
| 4 | Access policy por lifecycle y billing | `TenantService.get_tenant_access_policy()` | `403`, `423` o `503` segun `status` o billing |
| 5 | Maintenance | `AuthContextMiddleware` + `TenantService` | `503` si la request cae dentro del scope y modo de mantenimiento |
| 6 | Entitlements por modulo | `AuthContextMiddleware` | `403` si el modulo no esta habilitado por plan o billing grace |
| 7 | Rate limiting tenant | `TenantRateLimitService` | `429` si supera la cuota efectiva |
| 8 | Cuotas funcionales del modulo | servicios de modulo (`tenant_data_service`, `finance_service`) | `403` si supera el limite efectivo del recurso |

## Estados de Tenant y Efecto de Acceso

| `tenant.status` | Codigo | Efecto |
| --- | --- | --- |
| `active` | `200` | El tenant puede operar, sujeto a billing, maintenance, entitlements y cuotas |
| `pending` | `503` | Tenant aun no disponible por provisioning pendiente |
| `suspended` | `423` | Tenant suspendido operativamente |
| `error` | `503` | Tenant no disponible por error operacional |
| `archived` | `403` | Tenant archivado, acceso denegado |

Fuente: `TenantService.get_tenant_access_policy()`.

## Billing y Efecto de Acceso

| `billing_status` | Condicion adicional | Codigo | Efecto |
| --- | --- | --- | --- |
| `trialing` | ninguna | `200` | permitido |
| `active` | ninguna | `200` | permitido |
| `past_due` | dentro de `billing_grace_until` | `200` | permitido con `billing_in_grace=true` |
| `past_due` | fuera de gracia | `423` | suspendido por deuda |
| `suspended` | ninguna | `423` | suspendido por politica de billing |
| `canceled` | dentro de `billing_current_period_ends_at` | `200` | permitido hasta fin de periodo |
| `canceled` | fuera de periodo | `403` | suscripcion cancelada |

Fuentes: `TenantService.get_tenant_access_policy()` y `TenantService.get_tenant_billing_error()`.

## Maintenance

### Scopes validos

- `all`
- `core`
- `users`
- `finance`

### Access modes validos

- `write_block`
- `full_block`

### Efecto

| Scope | Access mode | Resultado |
| --- | --- | --- |
| `all` | `write_block` | bloquea escrituras en cualquier modulo tenant |
| `all` | `full_block` | bloquea lecturas y escrituras tenant |
| `users` o `finance` | `write_block` | bloquea escrituras solo en ese modulo |
| `users` o `finance` | `full_block` | bloquea cualquier request del modulo afectado |

Excepciones:

- `tenant/auth/*`
- `tenant/health`

## Precedencia de Rate Limits

Para cuota HTTP tenant, la precedencia efectiva es:

1. `billing_grace`
2. override del tenant
3. plan
4. configuracion global del entorno

Interpretacion:

- si hay billing grace activa y la politica define cuota, esa cuota manda
- si no hay cuota de gracia, se usa primero el override del tenant
- si no hay override, se usa el plan
- si no hay plan, se usa la configuracion global
- `0` significa sin limite para esa categoria

## Precedencia de Modulos Habilitados

Las fuentes principales son:

- `TENANT_PLAN_ENABLED_MODULES`
- `TENANT_BILLING_GRACE_ENABLED_MODULES`

Regla efectiva:

| Caso | Resultado |
| --- | --- |
| solo plan | usa modulos del plan |
| solo billing grace | usa modulos de grace |
| plan + grace | se aplica la interseccion mas restrictiva |
| plan contiene `all` | manda lo definido por grace |
| grace contiene `all` | se conservan los modulos del plan |

Esto evita que billing grace amplie modulos por encima de lo que el plan ya permite.

## Precedencia de Module Limits

Fuentes:

- override persistido del tenant
- limites por plan
- limites por billing grace

Regla base:

1. base = override tenant, si existe
2. si no existe override, base = plan
3. si hay billing grace, se toma el limite mas estricto entre base y grace, por clave

Reglas importantes:

- `tenant_override` desplaza al plan como base
- billing grace no amplifica capacidad: solo puede mantener o endurecer
- `0` se interpreta como sin limite; si se compara contra un limite positivo, prevalece el positivo por ser mas estricto
- la fuente efectiva por clave puede ser:
  - `tenant_override`
  - `plan`
  - `billing_grace`

## Claves de Cuota Funcional Reales

Hoy el backend entiende, entre otras, estas claves:

- `core.users`
- `core.users.active`
- `core.users.admin`
- `core.users.manager`
- `core.users.operator`
- `core.users.monthly`
- `finance.entries`
- `finance.entries.monthly`
- `finance.entries.monthly.income`
- `finance.entries.monthly.expense`

La lista completa y canonical debe consumirse desde `GET /platform/capabilities`.

## Donde Vive Cada Regla

| Tipo de regla | Capa recomendada |
| --- | --- |
| acceso por request, JWT, lifecycle, maintenance, entitlements, rate limiting | middleware |
| politicas configurables por plan o billing grace | `common/policies/` |
| reglas funcionales de usuarios tenant | `tenant_data_service.py` |
| reglas funcionales de `finance` | `finance_service.py` |
| conteos y consultas para soportar reglas | repositorios |

## Uso Recomendado

Usa este documento cuando necesites:

- entender por que una request tenant dio `403`, `423`, `429` o `503`
- saber que fuente manda en una cuota efectiva
- decidir si una regla nueva debe ir en middleware, policy o service
- diseñar frontend sin duplicar la logica del backend
