# Chat Changelog

## 2026-04-24

`chat` queda cerrado para el alcance operativo actual.

Incluye:

- backend tenant con:
  - conversaciones directas
  - hilos contextuales
  - participantes
  - mensajes
  - lectura y archivado por participante
  - overview y activity
- frontend tenant con:
  - `Resumen`
  - `Conversaciones`
  - `Actividad`
- migración tenant:
  - `0044_chat_base`
- catálogo contractual del módulo `chat`
- integración contextual con:
  - `business-core`
  - `crm`
  - `maintenance`
  - `taskops`
- regresión mínima:
  - `test_chat_services.py`
  - `test_platform_flow.py`
  - `test_migration_flow.py`
- validación repo:
  - `263 tests OK`
  - `npm run build` -> `OK`
- publicación y validación runtime en `staging` y `production` con backup tenant previo obligatorio por carril:
  - `staging` backend redeploy -> `584 tests OK`
  - `production` backend redeploy -> `584 tests OK`
  - `check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias` en ambos carriles
