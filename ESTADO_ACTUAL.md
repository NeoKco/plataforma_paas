# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: cierre del slice broker-only `Provisioning/DLQ tenant focus`
- estado general: el panel broker-only ya resume tenants visibles y permite aislar un tenant antes de operar familias, con validación real en `repo` y `staging`, y confirmación `skipped_non_broker` en `production`

## Resumen ejecutivo en 30 segundos

- `Provisioning` ahora agrega una lectura ejecutiva por tenant visible dentro de `Familias DLQ visibles`
- el operador ya puede enfocar el tenant sugerido antes de bajar a familias o batch homogéneo
- el slice quedó validado de punta a punta: `repo` OK, `staging published` OK y `production` publicado con smoke `skipped` por backend no `broker`

## Qué ya quedó hecho

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega:
  - bloque `Prioridad por tenant visible`
  - tarjetas `tenant` visibles con filas, familias y tipos de job
  - acción `Enfocar tenant`
- la recomendación por tenant se comporta así:
  - sin tenant visible: estado neutro
  - un solo tenant visible: indica que ya está aislado
  - varios tenants visibles: sugiere enfocar el tenant con mayor carga visible
- se agregó el smoke [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ahora soporta `--target tenant-focus`
- `staging` quedó republicado con `VITE_API_BASE_URL=http://192.168.7.42:8081`
- `production` quedó republicado con `VITE_API_BASE_URL=https://orkestia.ddns.net`

## Qué archivos se tocaron

- frontend funcional:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
- soporte E2E:
  - [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
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

- la lectura broker-only del subconjunto visible ya no se queda solo en familias; ahora también existe una capa ejecutiva por tenant visible
- el siguiente paso sano cuando hay mezcla de tenants ya no depende de lectura manual de tarjetas familiares; la consola sugiere y ejecuta el aislamiento por tenant
- el helper published broker-only de `staging` ya debe considerarse completo también para el target `tenant-focus`
- `production` sigue siendo válido como entorno publicado con `skipped_non_broker`; no hace falta forzar broker ahí para cerrar estos slices

## Qué falta exactamente

- elegir y abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`
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
  - `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts --list`: `OK`
- `staging` publicado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus`: `1 passed`
- `production` publicado:
  - `E2E_BASE_URL=https://orkestia.ddns.net ... platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts`: `1 skipped`
- release:
  - build `staging` con `API_BASE_URL=http://192.168.7.42:8081`: `OK`
  - build `production` con `API_BASE_URL=https://orkestia.ddns.net`: `OK`
  - publish frontend en `/opt/platform_paas_staging/frontend/dist`: `OK`
  - publish frontend en `/opt/platform_paas/frontend/dist`: `OK`

## Bloqueos reales detectados

- no queda bloqueo funcional del slice
- durante la iteración solo apareció un problema menor de nullability en TypeScript al renderizar el highlight del tenant activo; quedó corregido antes del publish

## Mi conclusión

- el slice `tenant focus` ya quedó realmente cerrado
- `Provisioning/DLQ` ya cubre lectura y acción por fila, batch, familia, recomendación por familia y ahora priorización ejecutiva por tenant visible
- el siguiente paso correcto sigue estando dentro de `Provisioning/DLQ`, pero ya sobre consolidación operativa más fina y no sobre faltantes básicos
