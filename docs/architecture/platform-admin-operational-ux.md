# UX Operativa para Platform Admin

Este documento deja criterios UX para que el panel administrativo use el backend correctamente y no termine siendo una coleccion de tablas sin contexto.

## Principios

- usar el vocabulario real del backend
- mostrar estados y bloqueos antes que acciones
- no esconder errores; explicarlos con `request_id`
- distinguir con claridad lectura, escritura y acciones peligrosas

## Nombres que Deben Repetirse Igual

No inventar sinonimos distintos en UI para estos conceptos:

- `status`
- `billing_status`
- `maintenance`
- `access policy`
- `plan`
- `module usage`
- `module limits`
- `policy history`
- `provisioning jobs`
- `alerts`
- `DLQ`

Frontend puede traducirlos o hacerlos mas legibles, pero manteniendo siempre la misma semantica.

## Estados y Badges

Usar badges consistentes por familia:

### Tenant lifecycle

- `active`: positivo
- `pending`: advertencia
- `suspended`: peligro
- `error`: peligro
- `archived`: neutro

### Billing

- `trialing`: informativo
- `active`: positivo
- `past_due`: advertencia
- `suspended`: peligro
- `canceled`: neutro

### Provisioning

- `pending`: advertencia
- `retry_pending`: advertencia
- `running`: informativo
- `completed`: positivo
- `failed`: peligro

## Estados Vacios Recomendados

### Tenants

Si no hay tenants:

- explicar que aun no existe ningun tenant
- ofrecer CTA claro para crear el primero

### Provisioning

Si no hay jobs:

- indicar que no hay jobs pendientes ni historicos relevantes
- evitar tablas vacias sin mensaje

### Billing

Si no hay eventos:

- indicar si no existen eventos o si el proveedor aun no ha sincronizado

## Errores

Siempre mostrar:

- mensaje corto legible
- detalle tecnico si el backend lo entrega
- `request_id` cuando exista

Si una accion falla con:

- `403`: explicar politica, modulo o permiso
- `423`: explicar suspension o bloqueo operacional
- `429`: explicar cuota y que el usuario reintente
- `503`: explicar indisponibilidad, maintenance o tenant no listo

## Acciones Peligrosas

Pedir confirmacion explicita para:

- cambiar `status`
- archivar tenant
- suspender tenant
- cambiar billing state
- requeue de DLQ en lote
- cambios masivos de limites o plan

La confirmacion debe mostrar:

- nombre del tenant
- accion exacta
- efecto esperado

## Formularios

Reglas:

- usar `GET /platform/capabilities` para poblar estados, scopes y claves
- separar campos core de campos avanzados
- no mostrar claves tecnicas sin label legible cuando ya exista metadata
- si una clave de cuota se muestra, acompañarla con descripcion

## Tablas

Tablas operativas deberian incluir:

- filtros visibles
- estado vacio claro
- columna de estado destacada
- acciones alineadas a la derecha
- timestamps legibles

## Detalle de Tenant

El detalle de tenant deberia abrir con este orden:

1. identidad basica
2. `status`, `billing_status` y `access policy`
3. maintenance
4. plan y modulos habilitados
5. rate limits y module limits
6. module usage
7. billing history
8. policy history

## Provisioning y Billing

Estas vistas deben priorizar:

- alertas activas
- filtros utiles
- motivo del problema
- acciones de recuperacion

No empezar por tablas gigantes sin resumen.

## Objetivo de esta Guia

La meta es que `platform_admin` se vea como consola operativa coherente con el backend, no como CRUD generico.
