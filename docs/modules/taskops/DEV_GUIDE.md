# Tareas Dev Guide

Guía de desarrollo del módulo `taskops`.

## Objetivo técnico

Cubrir el bloque faltante de tareas internas con:

- tareas operativas
- kanban
- comentarios
- adjuntos
- histórico
- permisos separados para tarea propia vs asignación a otros
- detalle modal reutilizable entre vistas

sin mezclarlo con:

- `maintenance` como fuente única de trabajo
- `crm` como workflow comercial
- identidad base de `business-core`

La frontera correcta es:

- `business-core` es dueño de clientes, organizaciones y grupos de trabajo
- `crm` es dueño de oportunidades comerciales
- `maintenance` es dueño de OT
- `taskops` es dueño de:
  - tareas internas
  - comentarios
  - adjuntos
  - trazabilidad de estado

## Estructura

- Backend:
  - [backend/app/apps/tenant_modules/taskops](/home/felipe/platform_paas/backend/app/apps/tenant_modules/taskops)
- Frontend:
  - [frontend/src/apps/tenant_portal/modules/taskops](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/taskops)
- Migraciones tenant:
  - [v0042_taskops_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0042_taskops_base.py)

## Modelo actual

Entidades activas del módulo:

- `taskops_tasks`
- `taskops_task_comments`
- `taskops_task_attachments`
- `taskops_task_status_events`

## Relaciones clave

- `taskops_tasks.client_id -> business_clients.id`
- `taskops_tasks.opportunity_id -> crm_opportunities.id`
- `taskops_tasks.work_order_id -> maintenance_work_orders.id`
- `taskops_tasks.assigned_work_group_id -> business_work_groups.id`
- `taskops_task_comments.task_id -> taskops_tasks.id`
- `taskops_task_attachments.task_id -> taskops_tasks.id`
- `taskops_task_status_events.task_id -> taskops_tasks.id`

Nota:

- `assigned_user_id`, `created_by_user_id` y `updated_by_user_id` quedan como referencias blandas a usuario tenant
- no se forzó FK directa porque el modelo `core.users` actual no expone una tabla relacional rígida equivalente a las otras referencias del dominio

## Contrato funcional actual

### Tareas

- CRUD completo
- lectura restringida a tareas propias/creadas cuando el usuario no tiene gestión global
- estados controlados:
  - `backlog`
  - `todo`
  - `in_progress`
  - `blocked`
  - `done`
  - `cancelled`
- prioridades controladas:
  - `low`
  - `normal`
  - `high`
  - `urgent`
- cierre automático de timestamps:
  - `started_at` al entrar en `in_progress`
  - `completed_at` al cerrar en `done` o `cancelled`
- reactivación limpia al volver a estado abierto
- si el actor no puede asignar a otros:
  - la creación nueva cae a `assigned_user_id = actor_user_id`
  - no puede reasignar a otro usuario
- el detalle expone:
  - `agenda_linked`
  - `agenda_source_label`
  para mostrar si la tarea está ligada a agenda vía OT

### Comentarios

- alta y borrado
- ligados al detalle de tarea

### Adjuntos

- alta, descarga y borrado
- validación por:
  - content type
  - tamaño máximo
- almacenamiento filesystem local bajo `TASKOPS_ATTACHMENTS_DIR`

### Trazabilidad

- cada create y cambio de estado persiste evento en `taskops_task_status_events`
- el histórico visible del detalle sale desde esa tabla

### Resumen

- métricas:
  - abiertas
  - en progreso
  - bloqueadas
  - por vencer
  - cerradas
- para usuarios sin gestión global, el overview filtra solo tareas propias/creadas

## API tenant actual

Prefijo:

- `/tenant/taskops/*`

Routers visibles:

- `overview`
- `tasks`

Endpoints relevantes extra:

- `GET /tenant/taskops/tasks/kanban`
- `GET /tenant/taskops/tasks/history`
- `GET /tenant/taskops/tasks/{id}/detail`
- subrecursos de tarea:
  - `comments`
  - `attachments`

## Frontend tenant actual

Rutas:

- `/tenant-portal/taskops`
- `/tenant-portal/taskops/tasks`
- `/tenant-portal/taskops/kanban`
- `/tenant-portal/taskops/history`

Piezas relevantes:

- `TaskOpsModuleNav.tsx`
- `taskopsService.ts`
- `TaskOpsTaskModal.tsx`
- páginas:
  - `TaskOpsOverviewPage.tsx`
  - `TaskOpsTasksPage.tsx`
  - `TaskOpsKanbanPage.tsx`
  - `TaskOpsHistoryPage.tsx`

## Permisos

- lectura:
  - `tenant.taskops.read`
- creación propia:
  - `tenant.taskops.create_own`
- asignación a otros:
  - `tenant.taskops.assign_others`
- gestión global:
  - `tenant.taskops.manage`

Lectura práctica:

- `read` habilita visibilidad del módulo
- `create_own` permite crear y operar tareas propias
- `assign_others` permite asignar o reasignar a otros usuarios
- `manage` habilita lectura/operación global sobre todas las tareas del tenant

## Contrato comercial y dependencias

- módulo contractual:
  - `taskops`
- activation kind:
  - `addon`
- dependencia técnica visible:
  - `taskops -> core`

Razón:

- `TaskOps` reutiliza clientes y grupos de trabajo de `business-core`

## Cobertura de regresión actual

- [test_taskops_services.py](/home/felipe/platform_paas/backend/app/tests/test_taskops_services.py)
  - reglas de estados y adjuntos
  - tarea propia por defecto para perfiles sin asignación a otros
  - bloqueo de acceso a tareas ajenas sin gestión global
- [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - presencia e idempotencia de `0042_taskops_base`
- [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
  - catálogo contractual y dependencias visibles del módulo

## Regla de evolución

No duplicar desde `taskops`:

- clientes
- organizaciones
- oportunidades
- OT
- grupos de trabajo

Todo eso sigue resolviéndose desde sus módulos dueños.

La siguiente evolución razonable del módulo ya no es “cerrar lo básico”, sino profundizar:

- subtareas
- automatizaciones
- SLA
- dependencias entre tareas
- notificaciones y colaboración más rica
