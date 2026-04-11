# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya con `row`, `batch`, `filters`, `guided`, `family focus`, `family requeue`, `family batch requeue`, `family recommendation`, `tenant focus` y `technical diagnosis` cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir si el próximo slice broker-only profundiza:
    - una consolidación visible `tenant + capa técnica`
    - o si el frente `Provisioning/DLQ` ya quedó suficientemente endurecido para esta etapa y conviene volver al roadmap central siguiente

## Próximo paso correcto

- usar como carril base el helper institucionalizado:
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
  - published `staging` con backend `broker`
  - `production` solo como confirmación `skipped_non_broker` si sigue en `database`
- abrir un slice broker-only que reutilice lo ya cerrado:
  - prioridad por tenant visible
  - diagnóstico técnico visible DLQ/BD
  - familias visibles
  - recomendación operativa visible
  - selección homogénea por `tenant + job type`
- si se sigue profundizando, el mejor siguiente corte es:
  - una matriz visible `tenant + capa técnica`
  - con foco rápido para aislar el tenant o la capa dominante sin rehacer filtros manualmente
- cerrar ese slice con:
  - implementación visible
  - smoke dedicado
  - validación `repo + staging + production`

## Si el escenario principal falla

- si el smoke falla antes del flujo, revisar primero el build publicado por entorno y su `API_BASE_URL`
- si el smoke falla sembrando backend, contrastar el payload contra el contrato real del modelo y no solo contra el helper local
- si el smoke nuevo asume dominancia de una capa técnica, endurecer el seed antes de culpar a la UI
- si `staging` deja de correr con backend `broker`, detener el slice y corregir entorno antes de seguir

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar otro slice broker-only de `Provisioning/DLQ` cerrado con:
  - código implementado
  - smoke dedicado
  - `staging published` validado
  - `production` validado o explícitamente `skipped_non_broker`
