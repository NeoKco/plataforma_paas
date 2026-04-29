# Tareas Module

Documentación canónica del módulo `taskops`.

Nombre funcional visible:

- `Tareas`

Estado actual:

- módulo tenant ya operativo dentro del PaaS
- backend tenant ya expone:
  - tareas internas propias o asignadas
  - permisos separados para crear tareas propias o asignarlas a otros
  - kanban por estado
  - histórico cerrado
  - comentarios
  - adjuntos
  - trazabilidad de cambios de estado
- frontend tenant ya entrega lectura y captura para:
  - `Resumen`
  - `Asignación`
  - `Kanban`
  - `Histórico`
- el detalle operativo ya vive en modal desde `Tareas`, `Kanban` e `Histórico`
- el módulo reutiliza `business-core` para clientes y grupos de trabajo
- el módulo puede referenciar también:
  - oportunidades de `crm`
  - OT de `maintenance`
- el módulo ya entra al catálogo contractual como add-on tenant (`taskops`)
- la carga del modal de alta/edición ya no exige `tenant.users.read` cuando el usuario solo puede operar tareas propias
- el tenant admin ya puede ajustar permisos usuario por usuario desde `Usuarios`, sin depender solo del rol base

Objetivo del módulo:

- cubrir el frente faltante de tareas internas respecto de `ieris_app`
- unificar seguimiento operativo interno sin mezclarlo con:
  - `maintenance`
  - `crm`
  - identidad base de `business-core`
- dejar una base reusable para comentarios, adjuntos e histórico operativo

## Alcance actual

El módulo hoy incluye:

- tareas internas con:
  - cliente opcional
  - oportunidad CRM opcional
  - OT de maintenance opcional
  - usuario asignado opcional
  - grupo de trabajo opcional
  - prioridad
  - fecha compromiso
  - estado operativo
  - orden manual
- creación rápida desde `Kanban`
- apertura de detalle por modal al pinchar la tarea
- cierre con confirmación y envío a `Histórico`
- visibilidad de vínculo con agenda cuando la tarea referencia una OT de `maintenance`
- kanban visible sobre estados abiertos:
  - `backlog`
  - `todo`
  - `in_progress`
  - `blocked`
  - `done`
- histórico de tareas cerradas:
  - `done`
  - `cancelled`
- comentarios por tarea
- adjuntos por tarea con descarga
- eventos de estado con trazabilidad mínima
- resumen con métricas visibles de:
  - abiertas
  - en progreso
  - bloqueadas
  - por vencer
  - cerradas

Permisos visibles del módulo:

- `tenant.taskops.read`
- `tenant.taskops.create_own`
- `tenant.taskops.assign_others`
- `tenant.taskops.manage`

Lectura práctica:

- `tenant.taskops.read`
  - ve `Resumen`, `Asignación`, `Kanban` e `Histórico`
- `tenant.taskops.create_own`
  - crea y opera tareas propias
- `tenant.taskops.assign_others`
  - asigna o reasigna tareas a otros usuarios y ve el tenant completo
- `tenant.taskops.manage`
  - hereda capacidad de asignación global y gestión completa

Comportamiento importante:

- si un usuario tiene `tenant.taskops.create_own` pero no `tenant.users.read`, el módulo sigue funcionando para tareas propias
- en ese caso el modal no intenta cargar el catálogo completo de usuarios del tenant
- la asignación a terceros solo aparece cuando el permiso efectivo realmente existe

Queda fuera por ahora:

- subtareas
- dependencias entre tareas
- automatizaciones por reglas
- tableros múltiples o swimlanes
- SLA formal
- notificaciones push o chat embebido

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/taskops/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/taskops/DEV_GUIDE.md)
  Estructura, contratos y criterios de extensión del módulo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/taskops/API_REFERENCE.md)
  Referencia resumida de endpoints del módulo.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/taskops/ROADMAP.md)
  Estado del módulo y backlog posterior al cierre del alcance actual.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/taskops/CHANGELOG.md)
  Hitos funcionales y técnicos del módulo.
- [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas por módulo.

## Código principal

- Backend: [taskops](/home/felipe/platform_paas/backend/app/apps/tenant_modules/taskops)
- Frontend: [taskops](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/taskops)

## Criterio de uso

Si necesitas operar el módulo:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/taskops/USER_GUIDE.md)

Si necesitas modificar o extender el módulo:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/taskops/DEV_GUIDE.md)

Si necesitas revisar estado y backlog posterior:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/taskops/ROADMAP.md)
