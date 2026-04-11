# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` en `Provisioning/DLQ`, ya con `row`, `batch`, `filters`, `guided`, `family focus` y `family requeue` cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir cuál será el próximo slice broker-only real del panel `Operación DLQ`
- recomendación actual:
  - no abrir otro frente transversal
  - no volver a portabilidad tenant
  - seguir en `Provisioning/DLQ` sobre una operación broker-only todavía no visible o no suficientemente endurecida

## Próximo paso correcto

- usar como base el carril ya institucionalizado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh`
  - published `staging` con backend `broker`
  - `production` solo como confirmación `skipped_non_broker` si sigue en `database`
- abrir un siguiente slice broker-only reutilizando `familias DLQ visibles`, por ejemplo:
  - batch homogéneo sobre múltiples familias visibles
  - o consolidación operativa de recomendaciones por familia
- cerrar ese siguiente slice con:
  - implementación visible
  - smoke dedicado
  - validación `repo + staging + production`

## Si el escenario principal falla

- si el siguiente smoke vuelve a mostrar desalineación entre UI y backend published, mover toda la preparación del estado al helper `backend-control` del mismo entorno
- si `staging` deja de correr con `dispatch backend = broker`, detener el slice y corregir entorno antes de seguir
- si el nuevo slice no justifica UI nueva, convertirlo en endurecimiento de helper/runbook en vez de inventar una pantalla o acción innecesaria

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar otro slice broker-only de `Provisioning/DLQ` cerrado con:
  - código implementado
  - smoke dedicado
  - `staging` published validado
  - `production` validado o explícitamente `skipped_non_broker`
