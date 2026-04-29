# Tareas User Guide

Guía operativa del módulo `taskops` (`Tareas`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre el frente de tareas internas del tenant:

- registrar trabajo operativo no estructurado como OT
- ver las tareas que el usuario tiene asignadas o creó
- asignar tareas a usuarios o grupos cuando el perfil lo permite
- seguirlas en kanban
- dejar comentarios y adjuntos
- mantener histórico cerrado
- relacionar la tarea con:
  - cliente
  - oportunidad comercial
  - orden de trabajo

Una tarea puede o no estar ligada a agenda:

- si referencia una OT de `maintenance`, el detalle la mostrará como tarea ligada a agenda
- si no referencia OT, sigue siendo una tarea interna válida y no depende de agenda

Base esperada:

- `taskops` usa clientes y grupos de trabajo de `business-core`
- puede apoyarse en oportunidades de `crm`
- puede apoyarse en OT de `maintenance`
- no duplica identidad de cliente ni estructuras de mantenimiento

## Vistas disponibles

- `Resumen`
  - métricas rápidas
  - tareas recientes
  - histórico reciente
- `Tareas`
  - ahora visible como `Asignación`
  - tabla operativa de trabajo
  - alta y edición
  - detalle con comentarios, adjuntos y trazabilidad
- `Kanban`
  - tablero de estados abiertos
  - cambio rápido de estado
  - creación rápida desde el mismo tablero
  - apertura de detalle al pinchar una tarjeta
- `Histórico`
  - tareas cerradas con detalle completo

## Estados actuales

Estados operativos permitidos:

- `backlog`
- `todo`
- `in_progress`
- `blocked`
- `done`
- `cancelled`

Lectura práctica:

- `backlog`
  - tarea capturada pero todavía no preparada
- `todo`
  - tarea lista para tomar
- `in_progress`
  - trabajo ya en ejecución
- `blocked`
  - tarea detenida por dependencia o impedimento
- `done`
  - tarea completada
- `cancelled`
  - tarea cancelada formalmente

## Flujo operativo sugerido

1. crear la tarea desde `Kanban` o `Tareas`
2. asociar cliente, oportunidad u OT si aplica
3. si tu perfil lo permite, asignarla a otro usuario o grupo
4. si tu perfil no permite asignar a otros, la tarea quedará para ti
5. moverla a `todo` o `in_progress`
6. abrir el modal de detalle al pinchar la tarea
7. usar comentarios y adjuntos para seguimiento
8. cerrar con confirmación como `done` o `cancelled`
9. revisar luego el detalle completo en `Histórico`

## Cómo usar cada frente

### Asignación

Úsalo para el CRUD principal.

Cada tarea puede llevar:

- título
- descripción
- prioridad
- fecha compromiso
- cliente opcional
- oportunidad opcional
- OT opcional
- usuario asignado opcional
- grupo asignado opcional
- estado
- orden manual

Notas:

- si el perfil solo tiene permiso para tareas propias, no podrá asignar la tarea a otro usuario
- si el perfil tiene `tenant.taskops.assign_others` o `tenant.taskops.manage`, podrá asignar a otros usuarios y ver el tenant completo
- el detalle de la tarea se abre en modal y desde ahí también puedes:
  - editar
  - subir archivos
  - borrar
  - cerrar

### Kanban

Úsalo para trabajo diario visual.

Sirve para:

- ver carga abierta por estado
- abrir el detalle rápido
- crear tareas en el mismo tablero
- mover una tarea entre estados abiertos y cierre

Al pinchar una tarjeta:

- se abre un modal con todos los datos
- puedes ver relación con agenda si la tarea viene desde una OT
- puedes comentar, adjuntar archivos, editar o cerrar

### Comentarios

Úsalos para seguimiento breve.

Sirven para:

- registrar avances
- dejar contexto operativo
- evitar que la conversación se pierda fuera del sistema

### Adjuntos

Sirven para:

- evidencias rápidas
- imágenes
- PDFs
- textos de apoyo

Límites actuales:

- máximo 8 MB por archivo
- tipos permitidos:
  - PDF
  - JPG
  - PNG
  - WEBP
  - TXT

### Histórico

Úsalo para:

- revisar cierres recientes
- auditar trabajo ya completado o cancelado
- buscar tareas cerradas por texto
- abrir el detalle completo de una tarea ya cerrada

## Qué no hace todavía

Por ahora este módulo no incluye:

- subtareas
- dependencias entre tareas
- automatización por reglas
- SLA formal
- aprobaciones
- notificaciones o chat integrado

## Dependencias visibles

- si no hay clientes en `business-core`, no habrá a quién ligar tareas
- si no hay oportunidades en `crm`, la referencia comercial queda vacía
- si no hay OT en `maintenance`, la relación técnica queda vacía
- la tarea sigue funcionando igual aunque ninguna de esas relaciones exista

## Criterio de soporte

Si el usuario reporta que no ve el módulo:

- revisar que el tenant tenga habilitado `taskops`
- revisar permisos tenant:
  - `tenant.taskops.read`
  - `tenant.taskops.create_own`
  - `tenant.taskops.assign_others`
  - `tenant.taskops.manage`

Si reporta que no puede asignar a otro usuario:

- revisar si su perfil tiene `tenant.taskops.assign_others`
- o `tenant.taskops.manage`
- si no lo tiene, el comportamiento correcto es permitirle solo tareas propias

Si reporta que no puede asociar clientes:

- revisar clientes activos en `business-core`

Si reporta que no puede adjuntar un archivo:

- revisar tipo de archivo
- revisar tamaño máximo permitido
