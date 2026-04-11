# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya con `row`, `batch`, `filters`, `guided`, `family focus`, `family requeue`, `family batch requeue` y `family recommendation` cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir si el próximo slice broker-only va a profundizar:
    - consolidación operativa del subconjunto visible
    - o lectura ejecutiva para priorizar tenant/familia antes de disparar acciones

## Próximo paso correcto

- usar como carril base el helper ya institucionalizado:
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
  - published `staging` con backend `broker`
  - `production` como confirmación `skipped_non_broker` si sigue en `database`
- abrir un slice broker-only que reutilice las estructuras ya cerradas:
  - `Familias DLQ visibles`
  - recomendación operativa visible
  - selección homogénea por `tenant + job type`
- cerrar ese slice otra vez con:
  - implementación visible
  - smoke dedicado
  - `repo + staging + production` validados

## Si el escenario principal falla

- si el smoke falla antes del flujo, revisar primero el build publicado por entorno y su `API_BASE_URL`
- si reaparece un error de seed E2E, contrastar inmediatamente el payload contra los límites reales del modelo o migración destino
- si `staging` deja de correr con backend `broker`, detener el slice y corregir entorno antes de seguir

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar otro slice broker-only de `Provisioning/DLQ` cerrado con:
  - código implementado
  - smoke dedicado
  - `staging published` validado
  - `production` validado o explícitamente `skipped_non_broker`
