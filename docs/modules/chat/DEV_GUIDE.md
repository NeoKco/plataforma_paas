# Chat Dev Guide

Guía de desarrollo del módulo `chat`.

## Objetivo técnico

Cubrir el bloque faltante de mensajería interna sin mezclarlo con:

- comentarios de `taskops`
- notas de `crm`
- trazabilidad técnica de `techdocs`

La frontera correcta es:

- `core` es dueño de usuarios tenant
- `business-core` es dueño de clientes
- `crm` es dueño de oportunidades
- `maintenance` es dueño de OT
- `taskops` es dueño de tareas
- `chat` es dueño de:
  - conversaciones
  - participantes
  - mensajes
  - lectura/archivo por participante

## Estructura

- Backend:
  - [backend/app/apps/tenant_modules/chat](/home/felipe/platform_paas/backend/app/apps/tenant_modules/chat)
- Frontend:
  - [frontend/src/apps/tenant_portal/modules/chat](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/chat)
- Migraciones tenant:
  - [v0044_chat_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0044_chat_base.py)

## Modelo actual

Entidades activas del módulo:

- `chat_conversations`
- `chat_conversation_participants`
- `chat_messages`

## Relaciones clave

- `chat_conversations.client_id -> business_clients.id`
- `chat_conversations.opportunity_id -> crm_opportunities.id`
- `chat_conversations.work_order_id -> maintenance_work_orders.id`
- `chat_conversations.task_id -> taskops_tasks.id`
- `chat_conversation_participants.conversation_id -> chat_conversations.id`
- `chat_messages.conversation_id -> chat_conversations.id`

Notas:

- `sender_user_id`, `created_by_user_id` y `participant.user_id` referencian usuarios tenant lógicamente, pero hoy no están amarrados con FK dura para no tensar bootstrap/migraciones sobre `users`
- el archivado es por participante, no por conversación global

## Contrato funcional actual

### Conversaciones

- directas:
  - reusan el hilo existente entre dos usuarios si ya existe
  - no permiten iniciar chat directo consigo mismo
- contextuales:
  - aceptan contexto `general`, `client`, `opportunity`, `work_order`, `task`
  - validan participantes activos
  - validan que solo exista un contexto principal por hilo
  - exigen título cuando el contexto es `general`

### Mensajes

- hoy solo soportan `message_kind=text`
- actualizan `last_message_at` en la conversación
- marcan al emisor como leído hasta el mensaje recién enviado
- desarchivan al emisor si la conversación estaba archivada para él

### Lectura y archivado

- `mark_conversation_read` mueve `last_read_message_id`
- `set_conversation_archived` afecta solo la membresía del usuario actual

### Overview y actividad

- overview resume mezcla de directos/contexto y no leídos
- activity lista mensajes recientes visibles al usuario actual

## API tenant actual

Prefijo:

- `/tenant/chat/*`

Routers visibles:

- `overview`
- `activity`
- `conversations`

Endpoints relevantes:

- `GET /tenant/chat/overview`
- `GET /tenant/chat/activity`
- `GET /tenant/chat/conversations`
- `POST /tenant/chat/conversations`
- `GET /tenant/chat/conversations/{conversation_id}`
- `GET /tenant/chat/conversations/{conversation_id}/messages`
- `POST /tenant/chat/conversations/{conversation_id}/messages`
- `POST /tenant/chat/conversations/{conversation_id}/read`
- `PATCH /tenant/chat/conversations/{conversation_id}/archive`

## Frontend tenant actual

Rutas:

- `/tenant-portal/chat`
- `/tenant-portal/chat/conversations`
- `/tenant-portal/chat/activity`

Piezas relevantes:

- `ChatModuleNav.tsx`
- `chatService.ts`
- `ChatOverviewPage.tsx`
- `ChatConversationsPage.tsx`
- `ChatActivityPage.tsx`

## Permisos

- lectura:
  - `tenant.chat.read`
- gestión:
  - `tenant.chat.manage`

Lectura actual por rol tenant:

- `admin`
- `manager`
- `operator`

Gestión actual:

- `admin`
- `manager`

## Dependencias contractuales

- `chat` queda como add-on arrendable
- dependencia técnica visible:
  - `core`
  - `users`

## Cobertura de regresión actual

- [test_chat_services.py](/home/felipe/platform_paas/backend/app/tests/test_chat_services.py)
  - validación de creación de hilos y envío de mensajes
- [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
  - presencia del módulo en catálogo contractual y dependencias
- [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - presencia e idempotencia de `0044_chat_base`

## Regla de evolución

No duplicar desde `chat`:

- usuarios
- clientes
- oportunidades
- OT
- tareas

Todo eso sigue resolviéndose desde su módulo dueño.

La siguiente evolución razonable del módulo ya no es “cerrar lo básico”, sino profundizar:

- adjuntos en mensajes
- notificaciones en tiempo real
- canales internos o grupos
- menciones
- búsqueda más rica
