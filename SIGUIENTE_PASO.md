# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` en `Provisioning/DLQ`, ya con `row`, `batch`, `filters`, `guided`, `family focus`, `family requeue` y `family batch requeue` cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir si el siguiente slice broker-only será:
    - consolidación operativa de recomendaciones por familia
    - o una lectura ejecutiva del subconjunto visible para decidir entre `single`, `family` y `family-batch`

## Próximo paso correcto

- usar como base el carril ya institucionalizado:
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
  - published `staging` con backend `broker`
  - `production` solo como confirmación `skipped_non_broker` si sigue en `database`
- abrir el siguiente slice broker-only reutilizando `Familias DLQ visibles` y el batch homogéneo ya cerrado, por ejemplo:
  - recomendación operativa por familia visible
  - o consolidación de recomendaciones sobre el subconjunto ya seleccionado
- cerrar ese siguiente slice con:
  - implementación visible
  - smoke dedicado
  - validación `repo + staging + production`

## Si el escenario principal falla

- si el smoke vuelve a fallar antes de llegar al flujo, revisar primero el `API_BASE_URL` del build publicado por entorno
- si `staging` deja de correr con `dispatch backend = broker`, detener el slice y corregir entorno antes de seguir
- si el siguiente cambio no justifica UI nueva, convertirlo en endurecimiento de helper/runbook en vez de agregar otra acción artificial

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar otro slice broker-only de `Provisioning/DLQ` cerrado con:
  - código implementado
  - smoke dedicado
  - `staging` published validado
  - `production` validado o explícitamente `skipped_non_broker`
