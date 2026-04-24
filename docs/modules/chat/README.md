# Chat Module

Documentación canónica del módulo `chat`.

Nombre funcional visible:

- `Chat interno`

Estado actual:

- módulo tenant ya operativo dentro del PaaS
- backend tenant ya expone:
  - conversaciones directas entre usuarios
  - hilos internos por contexto
  - métricas de resumen
  - actividad reciente
  - lectura y escritura de mensajes
  - archivado por participante
- frontend tenant ya entrega lectura y captura para:
  - `Resumen`
  - `Conversaciones`
  - `Actividad`
- el módulo reutiliza:
  - `core/users` para participantes tenant
  - `business-core` para contexto cliente
  - `crm` para contexto oportunidad
  - `maintenance` para contexto OT
  - `taskops` para contexto tarea
- el módulo ya entra al catálogo contractual como add-on tenant (`chat`)

Objetivo del módulo:

- cubrir el frente de mensajería interna faltante respecto de `ieris_app`
- permitir conversación operativa sin mezclarla con comentarios de `taskops` ni con notas de `crm`
- dejar una base simple pero útil para coordinación interna por usuario o por contexto

## Alcance actual

El módulo hoy incluye:

- conversaciones directas entre usuarios tenant
- hilos internos de contexto:
  - `general`
  - `client`
  - `opportunity`
  - `work_order`
  - `task`
- participantes por conversación
- mensajes de texto
- marcación de leído por participante
- archivado individual por participante
- actividad reciente filtrable por texto
- resumen con métricas visibles de:
  - conversaciones
  - directas
  - por contexto
  - conversaciones no leídas
  - mensajes pendientes

Queda fuera por ahora:

- grupos masivos o canales públicos
- websocket / tiempo real
- notificaciones push
- adjuntos en mensajes
- reacciones, menciones o hilos anidados
- búsqueda global avanzada

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/chat/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/chat/DEV_GUIDE.md)
  Estructura, contratos y criterios de extensión del módulo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/chat/API_REFERENCE.md)
  Referencia resumida de endpoints del módulo.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/chat/ROADMAP.md)
  Estado del módulo y backlog posterior al cierre del alcance actual.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/chat/CHANGELOG.md)
  Hitos funcionales y técnicos del módulo.
- [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas por módulo.

## Código principal

- Backend: [chat](/home/felipe/platform_paas/backend/app/apps/tenant_modules/chat)
- Frontend: [chat](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/chat)

## Criterio de uso

Si necesitas operar el módulo:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/chat/USER_GUIDE.md)

Si necesitas modificar o extender el módulo:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/chat/DEV_GUIDE.md)

Si necesitas revisar estado y backlog posterior:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/chat/ROADMAP.md)
