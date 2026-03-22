# Manejo de Errores Backend

Esta guia resume el manejo centralizado de errores implementado hoy en el backend.

## Objetivo

Dejar un formato de error consistente y trazable para soporte tecnico y debugging.

La idea es que cuando algo falle:

- el cliente reciba un payload uniforme
- exista `request_id`
- soporte pueda correlacionar ese `request_id` con logs y auditoria

## Formato actual de error

Las respuestas de error ahora siguen esta base:

```json
{
  "success": false,
  "detail": "mensaje de error",
  "request_id": "uuid-o-header-reutilizado"
}
```

Campos adicionales segun el caso:

- `errors`: para validacion `422`
- `error_type`: para errores inesperados `500`

## Casos cubiertos

### 1. Errores HTTP controlados

Ejemplos:

- credenciales invalidas
- token faltante o invalido
- acceso prohibido
- recursos no encontrados

### 2. Errores de validacion

Ejemplo:

- request body incompleto o con estructura invalida

En este caso la respuesta agrega `errors`.

### 3. Errores inesperados

Ejemplo:

- excepciones no controladas del backend

En este caso la respuesta:

- usa `detail = "Internal server error"`
- agrega `error_type`

## Componentes principales

Handlers globales:

- `backend/app/common/exceptions/handlers.py`

Middleware de request id:

- `backend/app/common/middleware/request_observability_middleware.py`

Registro en app:

- `backend/app/bootstrap/app_factory.py`

## Relacion con auth middleware

El middleware de auth ya no devuelve cuerpos JSON manuales con formato propio.

Ahora normaliza sus errores usando el mismo builder central, para que respuestas como:

- `401 Authorization Bearer token requerido`
- `401 Token inválido`
- `403 scope incorrecto`

salgan con `request_id` y estructura uniforme.

## Pruebas

Suites relevantes:

- `backend/app/tests/test_error_handling.py`
- `backend/app/tests/test_http_smoke.py`

## Lo que aun falta

Lo pendiente para una capa mas madura es:

- catalogo mas formal de codigos de error
- serializacion uniforme tambien para errores de negocio complejos
- correlacion mas fuerte entre errores, logs y auditoria funcional
- exposicion controlada de `request_id` en frontend
