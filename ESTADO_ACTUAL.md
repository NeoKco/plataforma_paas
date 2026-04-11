# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: cierre del slice broker-only `Provisioning/DLQ technical diagnosis`
- estado general: `Provisioning` ya muestra una lectura técnica visible del subconjunto DLQ broker-only para distinguir si el problema dominante viene de rol postgres, base postgres, esquema tenant o drop de base tenant, con validación real en `repo`, `staging` y confirmación `skipped_non_broker` en `production`

## Resumen ejecutivo en 30 segundos

- `Provisioning` ahora agrega una lectura técnica visible `DLQ / BD` dentro de `Familias DLQ visibles`
- el operador ya puede ver rápidamente si el atasco dominante cae en rol postgres, base postgres, esquema tenant u otra capa, y enfocar el código dominante desde la misma consola
- el slice quedó validado de punta a punta: `repo` OK, `staging published` OK y `production` publicado con smoke `skipped` por backend no `broker`

## Qué ya quedó hecho

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega:
  - bloque `Diagnóstico DLQ / BD visible`
  - clasificación técnica visible por capa:
    - `postgres-role`
    - `postgres-database`
    - `tenant-schema`
    - `tenant-database-drop`
    - `other`
  - tarjetas técnicas con filas visibles, tenants afectados y código dominante
  - acción `Enfocar código dominante`
- la lectura técnica visible se comporta así:
  - sin filas visibles: deja diagnóstico neutro
  - con subconjunto visible: detecta la capa técnica dominante
  - si existe código dominante, permite aislarlo y relanzar la lectura sobre ese patrón
- se agregó el smoke [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ahora soporta `--target technical`
- `staging` quedó republicado con `VITE_API_BASE_URL=http://192.168.7.42:8081`
- `production` quedó republicado con `VITE_API_BASE_URL=https://orkestia.ddns.net`

## Qué archivos se tocaron

- frontend funcional:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
- soporte E2E:
  - [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
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

- la lectura broker-only del subconjunto visible ya no se queda solo en familias ni en tenants; ahora también existe una capa técnica visible sobre DLQ/BD
- el siguiente paso sano cuando aparecen fallos mezclados ya no depende solo de leer error codes sueltos; la consola clasifica la capa dominante y permite enfocarla con un click
- el helper published broker-only de `staging` ya debe considerarse completo también para el target `technical`
- `production` sigue siendo válido como entorno publicado con `skipped_non_broker`; no hace falta forzar broker ahí para cerrar estos slices

## Qué falta exactamente

- elegir y abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`
- decidir si el siguiente corte debe:
  - consolidar una matriz visible `tenant + capa técnica`
  - o dar por suficientemente endurecido el frente DLQ broker-only para esta etapa
- mantener la disciplina de cierre:
  - `repo build/list`
  - `build por entorno`
  - `publish por entorno`
  - `staging published smoke`
  - `production smoke/skipped`
- seguir sincronizando repo, `/opt/platform_paas` y `/opt/platform_paas_staging` al cerrar cada corte

## Qué no debe tocarse

- no reabrir `tenant data portability`; ese frente ya quedó cerrado
- no volver a publicar frontend por entorno usando un `dist` genérico armado para otra URL
- no degradar el gating actual entre `broker` y `database`
- no mezclar seeds E2E published con filtros demasiado abiertos que capturen tenants efímeros viejos

## Validaciones ya ejecutadas

- repo:
  - `cd frontend && npm run build`: `OK`
  - `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list`: `OK`
- `staging` publicado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical`: `1 passed`
- `production` publicado:
  - `E2E_BASE_URL=https://orkestia.ddns.net ... platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts`: `1 skipped`
- release:
  - build `staging` con `API_BASE_URL=http://192.168.7.42:8081`: `OK`
  - build `production` con `API_BASE_URL=https://orkestia.ddns.net`: `OK`
  - publish frontend en `/opt/platform_paas_staging/frontend/dist`: `OK`
  - publish frontend en `/opt/platform_paas/frontend/dist`: `OK`

## Bloqueos reales detectados

- no queda bloqueo funcional del slice
- durante la iteración aparecieron dos fallos reales y quedaron cerrados:
  - `ProvisioningPage.tsx` quedó inicialmente con `tone` tipado como `string` genérico; se corrigió a `AppBadgeTone` real
  - el smoke nuevo asumía una categoría dominante inestable; se endureció el seed para que `tenant-schema` domine de forma inequívoca

## Mi conclusión

- el slice `technical diagnosis` ya quedó realmente cerrado
- `Provisioning/DLQ` ya cubre lectura y acción por fila, batch, familia, recomendación por familia, prioridad por tenant visible y ahora diagnóstico técnico DLQ/BD
- el siguiente paso correcto sigue estando dentro de `Provisioning/DLQ`, pero ya sobre consolidación final o cierre del frente, no sobre faltantes básicos
