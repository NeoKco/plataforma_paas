# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: cierre del slice broker-only `Provisioning/DLQ family recommendation`
- estado general: el panel broker-only ya recomienda operativamente cuándo conviene `focus single`, `requeue family`, `family-batch` o limpiar selección, y el corte quedó validado en `repo` y `staging`, con confirmación `skipped_non_broker` en `production`

## Resumen ejecutivo en 30 segundos

- `Provisioning` ahora muestra un plan operativo sugerido dentro de `Familias DLQ visibles`, basado en la selección visible actual
- el slice quedó validado de punta a punta: `repo` OK, `staging published` OK, `production` publicado con smoke `skipped` porque el backend productivo sigue sin correr con `broker`
- durante el cierre aparecieron dos hallazgos reales ya resueltos: el seed E2E excedía `varchar(100)` en `error_code` y un publish manual dejó `staging` apuntando a `VITE_API_BASE_URL` incorrecta

## Qué ya quedó hecho

- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega un bloque `Plan operativo sugerido` dentro de `Familias DLQ visibles`
- la recomendación visible cambia según el subconjunto actual:
  - sin selección: pide elegir una familia visible
  - una familia de una sola fila: sugiere `Enfocar fila`
  - una familia con varias filas: sugiere `Reencolar familia`
  - varias familias homogéneas: sugiere `Reencolar batch`
  - varias familias mixtas: sugiere `Limpiar selección`
- las tarjetas de familia ahora exponen además una lectura corta de `Acción sugerida`
- se agregó el smoke [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ahora soporta `--target family-recommendation`
- `staging` quedó republicado correctamente con `VITE_API_BASE_URL=http://192.168.7.42:8081`
- `production` quedó republicado correctamente con `VITE_API_BASE_URL=https://orkestia.ddns.net`

## Qué archivos se tocaron

- frontend funcional:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
- soporte E2E:
  - [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
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

- el siguiente nivel broker-only de `Provisioning/DLQ` ya no es solo ejecutar requeues; la consola ahora también recomienda qué tipo de acción conviene según el subconjunto visible
- los smokes que siembran `provisioning_jobs.error_code` deben respetar el límite real `varchar(100)` y no generar códigos a partir de scopes excesivamente largos
- para `staging` y `production` ya no es aceptable publicar un `dist` generado con `npm run build` genérico si el carril necesita `API_BASE_URL` distinta; el release correcto debe pasar por `deploy/build_frontend.sh` con `API_BASE_URL` explícita
- `production` sigue siendo un entorno válido para confirmar estos slices como `skipped_non_broker`; no hace falta forzar `broker` allí solo para poner en verde smokes que hoy no aplican

## Qué falta exactamente

- elegir y abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`
- mantener la disciplina de cierre:
  - `repo build/list`
  - `build por entorno`
  - `publish por entorno`
  - `staging published smoke`
  - `production smoke/skipped`
- sincronizar el cierre documental también hacia `/opt/platform_paas` y `/opt/platform_paas_staging`

## Qué no debe tocarse

- no reabrir `tenant data portability`; ese frente ya quedó cerrado para este ciclo
- no mezclar seeds E2E con contratos de DB más laxos que los reales del entorno publicado
- no volver a copiar a `staging` o `production` un `dist` armado para otro `API_BASE_URL`
- no degradar el gating actual entre `broker` y `database`

## Validaciones ya ejecutadas

- repo:
  - `cd frontend && npm run build`: `OK`
  - `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts --list`: `OK`
- `staging` publicado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation`: `1 passed`
- `production` publicado:
  - `E2E_BASE_URL=https://orkestia.ddns.net ... platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts`: `1 skipped`
- release:
  - build `staging` con `API_BASE_URL=http://192.168.7.42:8081`: `OK`
  - build `production` con `API_BASE_URL=https://orkestia.ddns.net`: `OK`
  - publish frontend en `/opt/platform_paas_staging/frontend/dist`: `OK`
  - publish frontend en `/opt/platform_paas/frontend/dist`: `OK`

## Bloqueos reales detectados

- no queda bloqueo funcional del slice
- durante la iteración aparecieron y quedaron resueltos dos problemas operativos reales:
  - el smoke sembraba `error_code` más largo que el contrato real de `provisioning_jobs`
  - un publish manual a `staging` dejó la app apuntando a `http://192.168.7.42:8100` y el smoke cayó en la pantalla de instalación

## Mi conclusión

- el slice `family recommendation` ya quedó realmente cerrado
- `Provisioning/DLQ` ya cubre fila, batch filtrado, guía por fila, foco por familia, requeue por familia, batch homogéneo por familias y ahora recomendación operativa sobre la selección visible
- el siguiente paso correcto sigue estando dentro de `Provisioning/DLQ`, pero ya debe buscar consolidación operativa adicional y no volver a tapar faltantes básicos
