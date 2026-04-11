# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: cierre formal del frente `Provisioning/DLQ broker-only`
- estado general: `Provisioning/DLQ` ya quedó suficientemente endurecido para esta etapa; el frente deja de estar activo como prioridad del roadmap central y pasa a backlog de profundización opcional

## Resumen ejecutivo en 30 segundos

- el carril broker-only de `Provisioning/DLQ` ya cubre lectura, foco, recomendación y requeue con suficiente profundidad operativa para esta etapa
- no quedan faltantes básicos dentro de DLQ; lo que sigue ya es profundización fina o refinamiento operador-senior
- la prioridad del proyecto deja de ser DLQ y vuelve al siguiente bloque central del roadmap

## Qué ya quedó hecho

- el frente broker-only de `Provisioning/DLQ` quedó cubierto por estos slices ya cerrados:
  - `row`
  - `batch`
  - `filters`
  - `guided requeue`
  - `dispatch capability`
  - `surface gating`
  - `family focus`
  - `family requeue`
  - `family batch requeue`
  - `family recommendation`
  - `tenant focus`
  - `technical diagnosis`
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya encapsula el carril published broker-only de `staging`
- `staging` y `production` ya quedaron republicados y validados en el último corte funcional

## Qué archivos se tocaron

- documentación y handoff:
  - [ESTADO_ACTUAL.md](/home/felipe/platform_paas/ESTADO_ACTUAL.md)
  - [SIGUIENTE_PASO.md](/home/felipe/platform_paas/SIGUIENTE_PASO.md)
  - [SESION_ACTIVA.md](/home/felipe/platform_paas/SESION_ACTIVA.md)
  - [HANDOFF_STATE.json](/home/felipe/platform_paas/HANDOFF_STATE.json)
  - [HISTORIAL_ITERACIONES.md](/home/felipe/platform_paas/HISTORIAL_ITERACIONES.md)
  - [docs/modules/platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
  - [docs/modules/platform-core/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)
  - [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
  - [docs/runbooks/frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

## Qué decisiones quedaron cerradas

- `Provisioning/DLQ broker-only` queda marcado como suficientemente endurecido para esta etapa
- cualquier profundización adicional de DLQ pasa a backlog opcional y deja de ser prioridad activa del roadmap central
- `production` sigue siendo válido como entorno publicado con `skipped_non_broker`; no hace falta forzar broker ahí para cerrar esta etapa

## Qué falta exactamente

- sacar `Provisioning/DLQ` del foco activo del roadmap central
- definir el siguiente bloque central real fuera de DLQ
- mantener la disciplina de handoff y sincronización entre repo, `/opt/platform_paas` y `/opt/platform_paas_staging`

## Qué no debe tocarse

- no reabrir `tenant data portability`; ese frente ya quedó cerrado
- no volver a publicar frontend por entorno usando un `dist` genérico armado para otra URL
- no degradar el gating actual entre `broker` y `database`
- no mezclar seeds E2E published con filtros demasiado abiertos que capturen tenants efímeros viejos
- no abrir nuevos slices DLQ broker-only salvo re-priorización explícita

## Validaciones ya ejecutadas

- el último corte funcional de DLQ quedó validado así:
  - repo: `cd frontend && npm run build`: `OK`
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list`: `OK`
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical`: `1 passed`
  - `production`: `platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts`: `1 skipped`
- no se ejecutó validación funcional nueva en este corte porque la decisión fue de cierre de etapa y repriorización, no de implementación

## Bloqueos reales detectados

- no hay bloqueo técnico real para cerrar este frente
- el único riesgo real era de gobernanza: seguir abriendo slices DLQ ya entra en rendimiento decreciente y podía retrasar el avance del roadmap central

## Mi conclusión

- `Provisioning/DLQ broker-only` ya quedó suficientemente cerrado para esta etapa
- no conviene seguir profundizando este frente salvo necesidad operativa nueva o incidencia real
- el siguiente paso correcto ya no está dentro de DLQ: toca volver al siguiente bloque central del roadmap
