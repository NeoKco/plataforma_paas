# TaskOps API Reference

Referencia resumida del módulo `taskops`.

## Overview

- `GET /tenant/taskops/overview`
  - métricas del módulo
  - tareas abiertas recientes
  - histórico reciente

## Tasks

- `GET /tenant/taskops/tasks`
- `POST /tenant/taskops/tasks`
- `GET /tenant/taskops/tasks/{task_id}`
- `GET /tenant/taskops/tasks/{task_id}/detail`
- `PUT /tenant/taskops/tasks/{task_id}`
- `PATCH /tenant/taskops/tasks/{task_id}/status`
- `PATCH /tenant/taskops/tasks/{task_id}/active`
- `DELETE /tenant/taskops/tasks/{task_id}`

Notas:

- filtros soportados en listado:
  - `include_inactive`
  - `include_closed`
  - `status`
  - `assigned_user_id`
  - `client_id`
  - `q`

## Kanban

- `GET /tenant/taskops/tasks/kanban`

Notas:

- soporta `include_inactive`
- no muestra `cancelled` como columna abierta del tablero

## History

- `GET /tenant/taskops/tasks/history`

Notas:

- lista tareas cerradas
- soporta filtro `q`

## Task Comments

- `POST /tenant/taskops/tasks/{task_id}/comments`
- `DELETE /tenant/taskops/tasks/{task_id}/comments/{comment_id}`

## Task Attachments

- `POST /tenant/taskops/tasks/{task_id}/attachments`
- `DELETE /tenant/taskops/tasks/{task_id}/attachments/{attachment_id}`
- `GET /tenant/taskops/tasks/{task_id}/attachments/{attachment_id}/download`

Restricciones actuales:

- máximo 8 MB
- content types permitidos:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `text/plain`

## Permisos

- lectura:
  - `tenant.taskops.read`
- escritura:
  - `tenant.taskops.manage`
