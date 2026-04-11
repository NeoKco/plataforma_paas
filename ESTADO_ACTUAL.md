# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-10
- foco de iteración: cierre del slice broker-only `Provisioning/DLQ family requeue` más hotfix visual del catálogo `Tenants`
- estado general: el corte DLQ sigue cerrado y además el catálogo `Tenants` ya quedó corregido para no desbordar la columna izquierda con slugs largos

## Resumen ejecutivo en 30 segundos

- `Provisioning` ya permite `Reencolar familia` directamente desde `Familias DLQ visibles`
- el smoke published real ya quedó verde en `staging` usando el helper broker-only y sin setup manual
- durante la validación se corrigieron fragilidades E2E reales del carril published: creación del tenant en el backend correcto, eliminación del plan hardcodeado y matcher alineado al copy real
- el catálogo `Tenants` ya no desborda su panel izquierdo cuando aparecen tenants con slugs o nombres largos

## Qué ya quedó hecho

- se implementó `handleDlqFamilyRequeue()` en [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx)
- cada tarjeta de familia DLQ visible ya expone la acción `Reencolar familia`
- se agregó el smoke [platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts)
- se endureció el layout del catálogo `Tenants` en [platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css) con:
  - contención de ancho en la columna izquierda
  - `min-width: 0` en el grid
  - wrap seguro para títulos y metadatos largos
- el helper [backend-control.ts](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) ahora soporta:
  - `getTenantCatalogRecord`
  - `waitForTenantCatalogRecord`
  - `seedPlatformTenantCatalogRecord` sin asumir `planCode="anual"`
- el helper [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target family-requeue`
- el frontend quedó republicado en:
  - `/opt/platform_paas`
  - `/opt/platform_paas_staging`
- se confirmó que el smoke publicado nuevo queda:
  - `staging`: `1 passed`
  - `production`: `1 skipped`

## Qué archivos se tocaron

- frontend funcional:
  - `frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx`
  - `frontend/src/styles/platform-admin.css`
- soporte E2E:
  - `frontend/e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts`
  - `frontend/e2e/support/backend-control.ts`
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh`
- documentación y handoff:
  - `docs/modules/platform-core/CHANGELOG.md`
  - `docs/modules/platform-core/ROADMAP.md`
  - `frontend/e2e/README.md`
  - `docs/runbooks/frontend-e2e-browser.md`
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
  - `SESION_ACTIVA.md`
  - `HANDOFF_STATE.json`
  - `HISTORIAL_ITERACIONES.md`

## Qué decisiones quedaron cerradas

- el reintento broker-only por familia ya no requiere pasar antes por `Enfocar familia`
- los smokes published broker-only que crean tenant efímero deben hacerlo con `backend-control` en el mismo backend del entorno objetivo
- el helper E2E no debe asumir un plan tenant fijo si el slice validado no depende de esa dimensión
- `production` puede seguir marcando estos smokes como `skipped_non_broker` mientras su dispatch backend real no sea `broker`

## Qué falta exactamente

- elegir el siguiente slice broker-only real dentro de `Provisioning/DLQ`
- mantener sincronizados repo, `/opt/platform_paas` y `/opt/platform_paas_staging` al cerrar cada corte
- si se abre otro smoke published broker-only, reutilizar el patrón ya fijado:
  - helper de `staging`
  - tenant efímero creado por backend-control
  - validación `production = skipped_non_broker` si aplica

## Qué no debe tocarse

- no reabrir `tenant data portability` en esta iteración; ese frente quedó cerrado en su último hotfix
- no volver a asumir `planCode="anual"` por defecto en helpers E2E published
- no mezclar creación UI en un entorno con seeds backend en otro árbol publicado
- no tocar auth, lifecycle tenant, billing ni provisioning backend por este cierre frontend/E2E

## Validaciones ya ejecutadas

- repo:
  - `cd frontend && npm run build`: `OK`
  - `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts --list`: `OK`
- `staging` publicado:
  - `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-requeue`: `1 passed`
- `production` publicado:
  - `E2E_BASE_URL=https://orkestia.ddns.net ... platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts`: `1 skipped`
- hotfix visual:
  - `cd frontend && npm run build`: `OK`
  - frontend republicado en `production`
  - frontend republicado en `staging`
- publish:
  - frontend publicado en `/opt/platform_paas/frontend/dist`
  - frontend publicado en `/opt/platform_paas_staging/frontend/dist`

## Bloqueos reales detectados

- no queda bloqueo activo del producto
- durante la validación hubo tres bloqueos E2E ya resueltos:
  - carrera o desalineación entre alta UI y backend seed en published `staging`
  - plan por defecto inválido para el catálogo real de `staging`
  - aserción frágil del copy del diálogo

## Mi conclusión

- el slice `family requeue` ya quedó cerrado con evidencia real
- el carril published broker-only de `staging` quedó más robusto que antes porque ahora su smoke no depende del flujo UI de alta tenant ni de supuestos de plan
- el siguiente paso correcto vuelve a ser abrir otro slice broker-only real de `Provisioning/DLQ`, no seguir corrigiendo este corte salvo regresión nueva
