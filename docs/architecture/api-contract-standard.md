# Estándar de Contratos API

Este documento fija la norma mínima para diseñar, revisar y cerrar contratos API en `platform_paas`.

Aplica a:

- `platform_admin`
- `tenant_portal`
- endpoints `platform/*`
- endpoints `tenant/*`
- integraciones internas entre modulos cuando exponen contrato HTTP

## Objetivo

Evitar contratos ambiguos, cambios silenciosos y desalineacion entre:

- backend
- frontend
- otra IA o sesion futura

## Regla base

Todo endpoint nuevo o modificado debe dejar claro:

- request esperado
- response esperada
- errores esperados
- side effects
- ownership del dato que toca

## Versionado y compatibilidad

- evitar romper contratos existentes sin justificacion explicita
- si un campo cambia de semantica, documentarlo como cambio de contrato
- si un endpoint deja de ser valido, dejar reemplazo explicito y periodo de convivencia si aplica
- no introducir campos legacy como contrato nuevo salvo razon documentada

## Request

La request debe definir:

- método HTTP correcto
- parámetros de ruta
- query params soportados
- body esperado
- validaciones mínimas
- defaults explícitos si existen

Regla:

- no depender de magia frontend para completar datos obligatorios del backend

## Response

La response debe definir:

- shape estable
- campos obligatorios y opcionales
- objetos anidados relevantes
- ids y etiquetas humanas si la UI las necesita

Regla:

- si el frontend necesita renderizar un dato crítico, no asumir que otra llamada lo completará después

## Errores

Todo endpoint debe dejar claro:

- `400` para request inválida
- `401/403` para auth o permisos
- `404` para recurso inexistente
- `409` para conflicto funcional
- `422` para validación de negocio si aplica
- `500` solo para fallas no previstas

Siempre que sea posible:

- incluir `request_id`
- dejar mensaje operativo legible

## Side effects

Si un endpoint produce efectos secundarios, deben quedar explícitos.

Ejemplos:

- crear una OT puede crear logs iniciales
- cerrar una mantención puede sincronizar con `finance`
- borrar o archivar un tenant puede disparar jobs de provisioning

Regla:

- no esconder side effects críticos como detalle de implementación no documentado

## Ownership y escritura

Todo contrato debe respetar la gobernanza de datos.

Antes de cerrar un endpoint que escribe:

- confirmar dominio dueño en [data-ownership-matrix.md](./data-ownership-matrix.md)
- confirmar que no se está permitiendo escribir desde un modulo que solo debería consumir

## Checklist mínimo por endpoint

- problema real resuelto
- request clara
- response clara
- errores claros
- side effects explícitos
- ownership respetado
- test o evidencia proporcional
- documentación canónica actualizada
