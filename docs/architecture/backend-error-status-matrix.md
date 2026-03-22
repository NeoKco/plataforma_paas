# Matriz de Errores y Estados Backend

Este documento resume los estados y codigos mas relevantes que hoy expone el backend, para que frontend y soporte no tengan que reconstruirlos desde muchos archivos.

## Formato de error HTTP

El backend responde errores con este formato base:

```json
{
  "success": false,
  "detail": "mensaje",
  "request_id": "..."
}
```

Y cuando aplica:

- `errors`
- `error_type`

## Codigos comunes

### `400`

Uso actual:

- request valida en forma, pero invalida para la regla llamada
- payload de negocio incorrecto

Ejemplos:

- datos invalidos en mantenimiento
- cambio de plan invalido
- payload Stripe invalido

### `401`

Uso actual:

- token ausente o invalido
- access token revocado
- credenciales invalidas
- firma de webhook invalida

### `403`

Uso actual:

- permiso insuficiente
- token de scope incorrecto
- tenant archivado
- modulo no habilitado
- accion bloqueada por politica

### `404`

Uso actual:

- tenant no encontrado
- user tenant no encontrado
- recurso puntual inexistente

### `422`

Uso actual:

- validacion de schema FastAPI/Pydantic

### `423`

Uso actual:

- tenant suspendido
- billing `past_due` sin gracia
- billing `suspended`

### `429`

Uso actual:

- cuota de API por tenant excedida

### `500`

Uso actual:

- error interno no controlado

### `503`

Uso actual:

- tenant `pending`
- tenant `error`
- mantenimiento activo en operaciones bloqueadas
- backend interno auxiliar fallando en runtime policy

## Tenant status

Estados actuales:

- `active`
- `pending`
- `suspended`
- `error`
- `archived`

Lectura operativa:

- `active`: opera normal
- `pending`: backend tenant bloqueado con `503`
- `suspended`: backend tenant bloqueado con `423`
- `error`: backend tenant bloqueado con `503`
- `archived`: backend tenant bloqueado con `403`

## Billing status

Estados actuales:

- `trialing`
- `active`
- `past_due`
- `suspended`
- `canceled`

Lectura operativa:

- `trialing`: acceso permitido
- `active`: acceso permitido
- `past_due` con gracia: acceso permitido con degradacion posible
- `past_due` sin gracia: `423`
- `suspended`: `423`
- `canceled` fuera de periodo: `403`

## Maintenance

Campos relevantes:

- `maintenance_mode`
- `maintenance_starts_at`
- `maintenance_ends_at`
- `maintenance_scopes`
- `maintenance_access_mode`

Modos actuales:

- `write_block`
- `full_block`

Lectura operativa:

- puede bloquear por scope
- `GET` puede seguir disponible cuando no corresponde bloqueo total
- auth tenant sigue separada del bloqueo funcional

## Prioridad de bloqueo tenant

La lectura correcta hoy es:

1. auth/token invalido
2. lifecycle tenant
3. billing efectivo
4. mantenimiento
5. modulos habilitados
6. rate limit
7. regla de negocio del caso de uso

## Access policy consolidada

El backend ya expone una politica efectiva con:

- `access_allowed`
- `access_blocking_source`
- `access_status_code`
- `access_detail`
- `billing_in_grace`

Esto debe preferirse en frontend antes de intentar inferir estados mezclando campos por separado.

## Provisioning job statuses

Estados actuales:

- `pending`
- `retry_pending`
- `running`
- `completed`
- `failed`

## Billing sync processing results

Resultados actuales:

- `applied`
- `duplicate`
- `ignored`
- `reconciled`

## Recomendacion para frontend

Frontend no debe:

- inferir bloqueos manualmente si ya existe `access_policy`
- inventar mensajes propios para cada estado sin conservar `detail`
- ocultar `request_id` en flujos de soporte

Frontend si debe:

- mapear `status` y `billing_status` a badges consistentes
- tratar `423`, `429` y `503` como estados operativos reales, no como errores genericos
- exponer `detail` y `request_id` en errores relevantes

## Resumen ejecutivo

La app ya no trabaja solo con `200` o `401`.

Hoy existen varios estados operativos reales y el frontend debe reflejarlos como parte del producto, no como excepciones raras.
