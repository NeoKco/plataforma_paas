# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-10
- foco de iteración: cierre del slice broker-only `Provisioning/DLQ family batch requeue`
- estado general: el panel `Operación DLQ` ya soporta selección múltiple homogénea sobre `Familias DLQ visibles`, con validación real en `staging` y confirmación `skipped_non_broker` en `production`

## Resumen ejecutivo en 30 segundos

- `Provisioning` ya permite seleccionar varias familias DLQ visibles y reencolarlas en lote si comparten `tenant + job type`
- el smoke nuevo quedó verde en `repo` y `staging`; en `production` quedó `skipped` porque el dispatch backend sigue siendo `database/non-broker`
- durante el cierre se corrigió un problema real de release: `staging` había quedado publicado con `API_BASE_URL` incorrecta y ya se republicó con build por entorno

## Qué ya quedó hecho

- se agregó selección explícita por tarjeta en `Familias DLQ visibles`
- se agregó un resumen operativo `Batch homogéneo por familias visibles` con:
  - conteo de familias y filas seleccionadas
  - validación de homogeneidad por `tenant` y `job type`
  - acción `Reencolar selección`
  - acción `Limpiar selección`
- el batch nuevo exige al menos `2` familias visibles y homogéneas; si la selección mezcla tenants o tipos de job, la UI lo bloquea y lo explica
- se agregó el smoke [platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ahora soporta `--target family-batch`
- se corrigió el feedback del nuevo scope para que muestre el resumen real del lote reencolado y no un mensaje fijo que ocultaba cantidades
- se republicó el frontend correctamente por entorno:
  - `staging` con `VITE_API_BASE_URL=http://192.168.7.42:8081`
  - `production` con `VITE_API_BASE_URL=https://orkestia.ddns.net`

## Qué archivos se tocaron

- frontend funcional:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
  - [action-feedback.ts](/home/felipe/platform_paas/frontend/src/utils/action-feedback.ts)
- soporte E2E:
  - [platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
- documentación y handoff:
  - [docs/modules/platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
  - [docs/modules/platform-core/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)
  - [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
  - [docs/runbooks/frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)
  - [ESTADO_ACTUAL.md](/home/felipe/platform_paas/ESTADO_ACTUAL.md)
  - [SIGUIENTE_PASO.md](/home/felipe/platform_paas/SIGUIENTE_PASO.md)
  - [SESION_ACTIVA.md](/home/felipe/platform_paas/SESION_ACTIVA.md)
  - [HANDOFF_STATE.json](/home/felipe/platform_paas/HANDOFF_STATE.json)
  - [HISTORIAL_ITERACIONES.md](/home/felipe/platform_paas/HISTORIAL_ITERACIONES.md)

## Qué decisiones quedaron cerradas

- el siguiente batch broker-only sobre DLQ ya no necesita operar sólo a nivel fila o subconjunto filtrado completo; ahora existe también el nivel intermedio `familias visibles seleccionadas`
- la homogeneidad operativa del batch por familias queda definida por:
  - mismo `tenant`
  - mismo `job type`
  - al menos `2` familias visibles
- diferencias de `error_code` o `error_message` entre familias ya no bloquean este batch mientras se mantenga la homogeneidad anterior
- el release frontend publicado debe reconstruirse por entorno con `API_BASE_URL` explícita; copiar un `dist` genérico rompe `staging`

## Qué falta exactamente

- elegir y abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`
- mantener la disciplina de `build por entorno -> publish por entorno -> smoke por entorno`
- seguir sincronizando repo, `/opt/platform_paas` y `/opt/platform_paas_staging` al cerrar cada corte

## Qué no debe tocarse

- no reabrir `tenant data portability`; ese frente ya quedó cerrado para este ciclo
- no tocar backend de provisioning si el siguiente slice puede resolverse solo en superficie operativa broker-only
- no volver a publicar `staging` con un build que apunte al API equivocado
- no degradar el gating actual entre `broker` y `database`; `production` puede seguir quedando `skipped_non_broker`

## Validaciones ya ejecutadas

- repo:
  - `cd frontend && npm run build`: `OK`
  - `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts --list`: `OK`
- `staging` publicado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-batch`: `1 passed`
- `production` publicado:
  - `E2E_BASE_URL=https://orkestia.ddns.net ... platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts`: `1 skipped`
- release:
  - build `staging` con `API_BASE_URL=http://192.168.7.42:8081`: `OK`
  - build `production` con `API_BASE_URL=https://orkestia.ddns.net`: `OK`
  - publish frontend en `/opt/platform_paas_staging/frontend/dist`: `OK`
  - publish frontend en `/opt/platform_paas/frontend/dist`: `OK`
  - `curl -k https://orkestia.ddns.net/health`: `OK`

## Bloqueos reales detectados

- no queda bloqueo funcional del slice
- durante la iteración hubo dos incidencias operativas ya resueltas:
  - `staging` quedó publicado con `API_BASE_URL` incorrecta y el smoke cayó en la pantalla de instalación
  - el sandbox local impedía validar `production` con Playwright; la reejecución fuera del sandbox confirmó el resultado esperado

## Mi conclusión

- el slice `family batch requeue` ya quedó cerrado con evidencia real
- `Provisioning/DLQ` ya cubre fila, batch filtrado, foco guiado, foco por familia, requeue por familia y batch homogéneo sobre múltiples familias visibles
- el siguiente paso correcto sigue siendo profundizar broker-only en `Provisioning/DLQ`, pero ya sobre recomendación o consolidación operativa, no sobre faltantes básicos de acción
