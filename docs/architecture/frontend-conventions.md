# Convenciones de Frontend

Este documento define como debe consumir el frontend de `platform_paas` al backend ya implementado.

La idea es simple:

- el backend es la fuente de verdad
- el frontend no debe reimplementar politicas centrales
- la UI debe reflejar estados y capacidades reales descubiertas por API

## Principio general

El frontend debe encargarse de:

- presentacion
- navegacion
- persistencia de sesion en cliente
- manejo de estados visuales
- composicion de pantallas

El frontend no debe encargarse de:

- inventar reglas de negocio
- redefinir permisos
- redefinir lifecycle tenant
- redefinir billing o mantenimiento
- crear listas estaticas de cuotas cuando backend ya las expone

## Endpoints que deben consumirse desde el inicio

### Auth platform

- `POST /platform/auth/login`
- `POST /platform/auth/refresh`
- `POST /platform/auth/logout`

### Catalogo de capacidades

- `GET /platform/capabilities`

### Operacion tenant en platform

- `GET /platform/tenants/{tenant_id}/access-policy`
- `GET /platform/tenants/{tenant_id}/module-usage`

## Regla clave: usar `GET /platform/capabilities`

El frontend no debe hardcodear listas como:

- `core.users.admin`
- `finance.entries.monthly.income`
- `maintenance_access_mode`
- `tenant_status`

En vez de eso debe usar:

- `tenant_statuses`
- `tenant_billing_statuses`
- `maintenance_scopes`
- `maintenance_access_modes`
- `module_limit_capabilities`

## Sesion y autenticacion

### Tokens

El frontend `platform` debe manejar:

- `access_token`
- `refresh_token`
- `token_type`

### Regla de renovacion

- si una request devuelve `401`, intentar refresh una sola vez
- si refresh falla, cerrar sesion y redirigir a login

### Logout

- el logout debe llamar al endpoint backend, no solo limpiar storage local

## Manejo de errores

El backend ya devuelve un formato uniforme:

```json
{
  "success": false,
  "detail": "mensaje",
  "request_id": "..."
}
```

Y a veces tambien:

- `errors`
- `error_type`

El frontend debe:

- mostrar `detail` al usuario
- conservar `request_id` para soporte
- no ignorar `422`
- distinguir errores operativos (`403`, `423`, `429`, `503`) de errores de validacion

## Manejo de estados reales

### Tenant status

Usar siempre badges y labels estables para:

- `active`
- `pending`
- `suspended`
- `error`
- `archived`

### Billing status

Usar siempre badges y labels estables para:

- `trialing`
- `active`
- `past_due`
- `suspended`
- `canceled`

### Provisioning

Usar siempre badges y labels estables para:

- `pending`
- `retry_pending`
- `running`
- `completed`
- `failed`

## Tablas y detalles

### Listados

Los listados administrativos deben preferir:

- tabla principal
- filtros arriba
- badges semanticos
- acciones al extremo derecho

### Detalles

Los detalles deben usar:

- secciones o tabs
- `KeyValueGrid`
- `TimelineCard`
- tablas de uso
- acciones separadas por criticidad

## Quotas y module usage

El frontend debe tratar `module_limit_capabilities` como metadata de presentacion.

Para cada fila de uso:

- `module_key` identifica la cuota
- `module_limit_capabilities` entrega `module_name`, `resource_name`, `period`, `segment` y `description`

Con eso la UI puede:

- agrupar por modulo
- construir labels
- ordenar secciones

## Acciones peligrosas

Acciones como:

- cambiar `status`
- mantenimiento
- billing
- requeue
- reconcile

deben pasar por confirmacion explicita.

## Regla de implementacion

Si el frontend necesita una regla nueva, primero preguntar:

1. ya existe en backend y solo falta consumirla?
2. existe pero falta un contrato mas comodo?
3. realmente falta backend?

No agregar logica en frontend solo para tapar un hueco de contrato sin dejarlo documentado.

## Resumen ejecutivo

La regla base es:

- frontend presenta
- backend decide

Y cuando el backend ya expone capacidades o estados, el frontend debe descubrirlos por API en vez de hardcodearlos.
