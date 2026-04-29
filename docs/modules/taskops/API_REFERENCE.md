# Tareas API Reference

Referencia resumida del módulo `taskops`.

## Overview

- `GET /tenant/taskops/overview`
  - métricas del módulo
  - tareas abiertas recientes
  - histórico reciente

## Assignment / Tasks

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
- si el actor no tiene gestión global, el backend filtra solo tareas propias o creadas por ese usuario
- `POST` y `PUT` respetan permisos separados:
  - `tenant.taskops.create_own`
  - `tenant.taskops.assign_others`
- en la UI tenant esta superficie se presenta como `Asignación`
- la UI ya no debe requerir `tenant.users.read` para abrir el modal si el actor solo crea tareas propias

## Kanban

- `GET /tenant/taskops/tasks/kanban`

Notas:

- soporta `include_inactive`
- no muestra `cancelled` como columna abierta del tablero
- es el punto principal de creación rápida en la UI

## History

- `GET /tenant/taskops/tasks/history`

Notas:

- lista tareas cerradas
- soporta filtro `q`
- el detalle de una tarea histórica se sigue leyendo por `GET /tenant/taskops/tasks/{task_id}/detail`

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
- escritura propia:
  - `tenant.taskops.create_own`
- asignación a otros:
  - `tenant.taskops.assign_others`
- gestión global:
- `tenant.taskops.manage`

Nota de integración:

- `tenant.users.read` ya no debe tratarse como precondición funcional del módulo `taskops`
- solo corresponde cuando realmente se necesita administrar o listar otros usuarios
- un actor con `tenant.taskops.create_own` pero sin `tenant.users.read` debe poder:
  - abrir `Asignación`
  - crear tarea propia
  - abrir detalle de su tarea
  - cerrar su tarea
