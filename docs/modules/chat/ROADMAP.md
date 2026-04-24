# Chat Roadmap

Estado del módulo `chat`.

## Estado actual

`chat` ya quedó operativo para el alcance actual de mensajería interna del PaaS.

El módulo ya cubre:

- conversaciones directas entre usuarios
- hilos internos por contexto
- actividad reciente filtrable
- marcación de lectura
- archivado por participante
- resumen operativo visible

## Cerrado en el alcance actual

- módulo tenant backend/frontend creado y funcional
- migración tenant:
  - `0044_chat_base`
- permisos tenant propios
- visibilidad por módulo en tenant portal
- catálogo contractual del módulo `chat`
- dependencia técnica visible con:
  - `core`
  - `users`
- integración con:
  - clientes de `business-core`
  - oportunidades de `crm`
  - OT de `maintenance`
  - tareas de `taskops`
- regresión de servicios, migración y catálogo de plataforma
- publicación y validación runtime en `staging` y `production`
- convergencia tenant confirmada en los 4 tenants activos de ambos carriles
- backup PostgreSQL tenant previo ejecutado por carril antes de mutar esquemas, incluyendo `ieris-ltda` en `production`
- backend redeployado con `584 tests OK` en ambos carriles
- frontend publicado con readiness `0 fallos, 0 advertencias` en `staging` y `production`

## Backlog posterior al cierre

Lo siguiente ya no corresponde a “cerrar el módulo”, sino a profundizarlo:

1. adjuntos en mensajes
2. canales o grupos internos
3. realtime/websocket
4. menciones y notificaciones
5. búsqueda global más rica
6. E2E específico del módulo

## Deuda visible no bloqueante

- falta E2E propio del módulo
- falta búsqueda por participante además del texto del mensaje
- falta vista más rica de unread/pending por usuario o por contexto

## Criterio de evolución

Lo siguiente sobre `chat` debe tratarse como expansión del módulo, no como corrección de base.
