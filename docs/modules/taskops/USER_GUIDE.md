# TaskOps User Guide

Guía operativa del módulo `taskops` (`TaskOps`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre el frente de tareas internas del tenant:

- registrar trabajo operativo no estructurado como OT
- asignar tareas a usuarios o grupos
- seguirlas en kanban
- dejar comentarios y adjuntos
- mantener histórico cerrado
- relacionar la tarea con:
  - cliente
  - oportunidad comercial
  - orden de trabajo

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
  - tabla operativa
  - alta y edición
  - detalle con comentarios, adjuntos y trazabilidad
- `Kanban`
  - tablero de estados abiertos
  - cambio rápido de estado
- `Histórico`
  - tareas cerradas

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

1. crear la tarea en `Tareas`
2. asociar cliente, oportunidad u OT si aplica
3. asignar usuario o grupo responsable
4. moverla a `todo` o `in_progress`
5. usar comentarios para seguimiento
6. subir adjuntos si hace falta evidencia
7. cerrar como `done` o `cancelled`
8. revisar luego en `Histórico`

## Cómo usar cada frente

### Tareas

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

### Kanban

Úsalo para trabajo diario visual.

Sirve para:

- ver carga abierta por estado
- abrir el detalle rápido
- mover una tarea entre estados abiertos y cierre

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
  - `tenant.taskops.manage`

Si reporta que no puede asociar clientes:

- revisar clientes activos en `business-core`

Si reporta que no puede adjuntar un archivo:

- revisar tipo de archivo
- revisar tamaño máximo permitido
