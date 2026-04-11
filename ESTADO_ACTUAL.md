# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: último slice broker-only `tenant + capa técnica` dentro de `Provisioning/DLQ` y cierre formal del frente
- estado general: `Provisioning/DLQ broker-only` quedó cerrado para esta etapa después de agregar la matriz visible `tenant + capa técnica`; la prioridad ya debe volver al siguiente bloque central del roadmap

## Resumen ejecutivo en 30 segundos

- el carril broker-only de `Provisioning/DLQ` ya cubre lectura por fila/lote, familias, tenant, diagnóstico técnico y ahora también matriz `tenant + capa técnica`
- el último corte útil quedó validado en `repo`, `staging` y con `skip` coherente en `production`
- seguir creciendo DLQ ya entra en rendimiento decreciente; la prioridad del proyecto debe salir de este frente

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
- `Provisioning` ahora expone además la matriz broker-only `tenant + capa técnica` sobre el subconjunto DLQ visible
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya encapsula el carril published broker-only de `staging`
- `staging` y `production` quedaron republicados otra vez para alinear el último corte funcional visible de `Provisioning`

## Qué archivos se tocaron

- implementación y validación del último slice:
  - [frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
  - [frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)
  - [scripts/dev/run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
- alineación estructural:
  - [docs/architecture/project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md)
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

- la última pieza útil del frente `Provisioning/DLQ broker-only` fue la matriz `tenant + capa técnica`
- `Provisioning/DLQ broker-only` queda marcado como suficientemente endurecido para esta etapa después de ese último slice
- cualquier profundización adicional de DLQ pasa a backlog opcional y deja de ser prioridad activa del roadmap central
- `production` sigue siendo válido como entorno publicado con `skipped_non_broker`; no hace falta forzar broker ahí para cerrar esta etapa
- la estructura canónica ya deja explícito que `frontend/e2e/` y `scripts/dev/` son parte del contrato operativo y que `/opt/...` es espejo de runtime

## Qué falta exactamente

- elegir y arrancar el siguiente bloque central real fuera de DLQ
- dejar explícito en la priorización que DLQ ya no es el foco activo
- mantener la disciplina de handoff y sincronización entre repo, `/opt/platform_paas` y `/opt/platform_paas_staging`

## Qué no debe tocarse

- no reabrir `tenant data portability`; ese frente ya quedó cerrado
- no volver a publicar frontend por entorno usando un `dist` genérico armado para otra URL
- no degradar el gating actual entre `broker` y `database`
- no mezclar seeds E2E published con filtros demasiado abiertos que capturen tenants efímeros viejos
- no abrir nuevos slices DLQ broker-only salvo re-priorización explícita o incidente operativo real

## Validaciones ya ejecutadas

- repo: `cd frontend && npm run build`: `OK`
- repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts --list`: `OK`
- `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target matrix`: `1 passed`
- `production`: `platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts`: `1 skipped`

## Bloqueos reales detectados

- no hay bloqueo técnico real dentro de DLQ
- apareció un bloqueo menor de fixture durante el smoke nuevo: el seed asumía una combinación técnica no inequívoca y quedó corregido
- el riesgo real restante es de priorización, no de implementación: seguir profundizando DLQ ya retrasa el roadmap central

## Mi conclusión

- `Provisioning/DLQ broker-only` ya quedó suficientemente cerrado para esta etapa, ahora sí con la matriz `tenant + capa técnica`
- no conviene seguir profundizando este frente salvo necesidad operativa nueva o incidencia real
- el siguiente paso correcto ya no está dentro de DLQ: toca volver al siguiente bloque central del roadmap
