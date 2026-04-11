# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya con `row`, `batch`, `filters`, `guided`, `family focus`, `family requeue`, `family batch requeue`, `family recommendation` y `tenant focus` cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir si el próximo slice broker-only profundiza:
    - consolidación operativa sobre el subconjunto ya aislado
    - o lectura ejecutiva adicional para priorizar patrón/error antes del requeue final

## Próximo paso correcto

- usar como carril base el helper institucionalizado:
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
  - published `staging` con backend `broker`
  - `production` solo como confirmación `skipped_non_broker` si sigue en `database`
- abrir un slice broker-only que reutilice lo ya cerrado:
  - prioridad por tenant visible
  - familias visibles
  - recomendación operativa visible
  - selección homogénea por `tenant + job type`
- cerrar ese slice con:
  - implementación visible
  - smoke dedicado
  - validación `repo + staging + production`

## Si el escenario principal falla

- si el smoke falla antes del flujo, revisar primero el build publicado por entorno y su `API_BASE_URL`
- si el smoke falla sembrando backend, contrastar el payload contra el contrato real del modelo y no solo contra el helper local
- si `staging` deja de correr con backend `broker`, detener el slice y corregir entorno antes de seguir

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar otro slice broker-only de `Provisioning/DLQ` cerrado con:
  - código implementado
  - smoke dedicado
  - `staging published` validado
  - `production` validado o explícitamente `skipped_non_broker`
