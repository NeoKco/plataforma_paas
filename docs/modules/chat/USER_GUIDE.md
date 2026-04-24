# Chat User Guide

Guía operativa del módulo `chat` (`Chat interno`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre la coordinación interna del tenant:

- conversación directa entre usuarios
- hilos internos ligados a contexto operativo
- seguimiento rápido de actividad reciente
- lectura de pendientes sin salir del portal tenant

Base esperada:

- `chat` usa usuarios tenant ya existentes
- no reemplaza:
  - comentarios de `taskops`
  - notas comerciales de `crm`
  - evidencia o auditoría de `techdocs`

## Vistas disponibles

- `Resumen`
  - métricas del módulo
  - conversaciones recientes
  - mensajes recientes
- `Conversaciones`
  - listado de hilos visibles para el usuario
  - detalle de participantes
  - lectura de mensajes
  - redacción de mensajes
  - creación de chat directo
  - creación de hilo por contexto
- `Actividad`
  - historial reciente de mensajes visibles
  - búsqueda por texto

## Flujo operativo sugerido

1. usar `Chat directo` cuando el intercambio sea entre dos usuarios
2. usar `Hilo interno` cuando la conversación deba quedar ligada a:
   - cliente
   - oportunidad
   - OT
   - tarea
3. mantener el hilo en el contexto que realmente corresponde
4. archivar una conversación cuando ya no haga falta verla en la bandeja activa
5. revisar `Actividad` para seguimiento rápido del pulso reciente

## Cómo usar cada frente

### Resumen

Úsalo para saber:

- cuántas conversaciones tienes visibles
- cuántas siguen no leídas
- cuántos mensajes pendientes arrastras
- cuántos hilos son contextuales y no solo directos

### Conversaciones

Aquí vive la operación diaria.

Puedes:

- abrir un chat directo con otro usuario activo
- crear un hilo general con más de un participante
- crear un hilo de contexto asociado a:
  - cliente
  - oportunidad
  - OT
  - tarea
- escribir mensajes
- leer trazabilidad básica
- archivar o reactivar una conversación para tu propia bandeja

### Actividad

Úsala para:

- buscar texto reciente en mensajes
- revisar rápidamente conversaciones con movimiento
- detectar seguimiento pendiente sin abrir hilo por hilo

## Reglas visibles del módulo

- un chat directo siempre es entre el usuario actual y otro usuario activo
- un hilo general requiere título visible
- un hilo contextual solo debe apuntar a un contexto principal por vez
- archivar una conversación la oculta solo para ese participante
- marcar como leído no elimina mensajes; solo mueve el cursor de lectura

## Qué no hace todavía

Por ahora este módulo no incluye:

- envío de archivos por mensaje
- notificaciones push o en tiempo real
- canales públicos
- respuestas anidadas
- reacciones o menciones

## Dependencias visibles

- si el tenant no tiene usuarios activos, no habrá con quién abrir chats
- si falta el módulo de contexto origen, el hilo ya creado sigue siendo legible, pero no conviene depender de ese contexto para nuevos hilos

## Criterio de soporte

Si el usuario reporta que no ve el módulo:

- revisar que el tenant tenga habilitado el módulo `chat`
- revisar permisos tenant:
  - `tenant.chat.read`
  - `tenant.chat.manage`

Si reporta que no puede iniciar un chat directo:

- revisar que el usuario destino exista y siga activo

Si reporta que no puede crear un hilo general:

- revisar que haya al menos dos participantes
- revisar que el título no esté vacío

Si reporta que no ve mensajes recientes:

- revisar si la conversación quedó archivada solo para ese participante
