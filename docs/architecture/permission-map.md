# Mapa de Permisos

Este documento resume los roles actuales y las acciones que cada uno puede ejecutar.

No describe solo auth; tambien recuerda que mantenimiento, lifecycle, billing y cuotas pueden bloquear acciones aunque el rol tenga permiso.

## Plataforma

Hoy el backend opera con un perfil administrativo principal:

| Rol | Alcance real actual |
| --- | --- |
| `superadmin` | opera rutas `platform`, tenants, provisioning, billing, configuracion y vistas globales |

Observacion:

- los endpoints administrativos de `platform` usan `require_role("superadmin")`
- si en el futuro se agregan mas roles de plataforma, debe tratarse como cambio de backend, no como simple ajuste visual

## Tenant

Permisos definidos hoy en `backend/app/apps/tenant_modules/core/permissions.py`:

| Rol tenant | Permisos |
| --- | --- |
| `admin` | `tenant.users.read`, `tenant.users.create`, `tenant.users.update`, `tenant.users.change_status`, `tenant.finance.read`, `tenant.finance.create` |
| `manager` | `tenant.users.read`, `tenant.finance.read`, `tenant.finance.create` |
| `operator` | `tenant.finance.read` |

## Vista por Accion

| Accion | admin | manager | operator |
| --- | --- | --- | --- |
| ver usuarios tenant | si | si | no |
| crear usuario tenant | si | no | no |
| actualizar usuario tenant | si | no | no |
| activar o desactivar usuario tenant | si | no | no |
| ver finance | si | si | si |
| crear movimiento finance | si | si | no |

## Bloqueos Adicionales que No Dependen del Rol

Aunque el rol permita la accion, la request puede seguir fallando por:

- `status` del tenant
- billing (`past_due`, `suspended`, `canceled`)
- maintenance
- modulo no habilitado por plan
- rate limiting
- cuota funcional del recurso

Ejemplos:

- un `manager` con permiso de `tenant.finance.create` igual puede recibir `403` si el plan no habilita `finance`
- un `admin` puede recibir `423` si el tenant esta `suspended`
- cualquier rol puede recibir `429` si la cuota HTTP efectiva se agota

## Uso Recomendado en Frontend

Frontend debe usar este mapa para:

- mostrar o esconder acciones
- decidir botones disponibles
- explicar por que una accion puede existir pero fallar en runtime

Pero frontend no debe asumir que el rol es suficiente.

Siempre debe considerar:

- `access policy`
- estado billing
- maintenance
- entitlements por modulo
- cuotas y limites efectivos
