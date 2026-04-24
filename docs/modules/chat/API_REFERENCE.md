# Chat API Reference

Referencia resumida del módulo `chat`.

## Overview

- `GET /tenant/chat/overview`
  - métricas del módulo
  - conversaciones recientes
  - mensajes recientes

## Activity

- `GET /tenant/chat/activity`

Parámetros relevantes:

- `q`
  búsqueda por texto visible en mensajes

## Conversations

- `GET /tenant/chat/conversations`
- `POST /tenant/chat/conversations`
- `GET /tenant/chat/conversations/{conversation_id}`
- `GET /tenant/chat/conversations/{conversation_id}/messages`
- `POST /tenant/chat/conversations/{conversation_id}/messages`
- `POST /tenant/chat/conversations/{conversation_id}/read`
- `PATCH /tenant/chat/conversations/{conversation_id}/archive`

## Tipos funcionales actuales

### conversation_kind

- `direct`
- `context`

### context_type

- `general`
- `client`
- `opportunity`
- `work_order`
- `task`

### message_kind

- `text`

## Payload relevante para crear conversación

Campos principales:

- `conversation_kind`
- `target_user_id`
- `participant_user_ids[]`
- `context_type`
- `client_id`
- `opportunity_id`
- `work_order_id`
- `task_id`
- `title`
- `description`

Notas:

- `direct` usa `target_user_id`
- `context` usa `participant_user_ids[]`
- un hilo contextual solo debe apuntar a un contexto principal

## Payload relevante para crear mensaje

- `body`

## Payload relevante para marcar leído

- `last_message_id`

Si no se envía, el backend toma el último mensaje del hilo.

## Payload relevante para archivar

- `is_archived`

## Permisos

- lectura:
  - `tenant.chat.read`
- escritura:
  - `tenant.chat.manage`
