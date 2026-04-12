# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: reset de categorías finance en `ieris-ltda` + regla E2E tenants permitidos
- estado general: backend actualizado en `production` y `staging`, familias seed actualizadas

## Resumen ejecutivo en 30 segundos

- se limpió `ieris-ltda` para dejar solo categorías default con familias
- se dejó explícito que E2E solo usa `empresa-bootstrap` y `empresa-demo` (nunca `ieris-ltda`)

## Qué ya quedó hecho

- [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia PK en `maintenance_due_items` y reintenta el insert
- [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) agrega familias y parent_name por seed
- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) asigna parent a categorías por familia
- [reset_finance_categories_to_defaults.py](/home/felipe/platform_paas/backend/app/scripts/reset_finance_categories_to_defaults.py) limpia catálogos y remapea referencias a defaults
- script ejecutado en `production` para `ieris-ltda`:
  - categorías removidas: 21
  - transacciones remapeadas: 55
- [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md) deja la regla de tenants E2E permitidos

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/finance/default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
- [backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
- [backend/app/scripts/reset_finance_categories_to_defaults.py](/home/felipe/platform_paas/backend/app/scripts/reset_finance_categories_to_defaults.py)
- [docs/runbooks/tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)
- [docs/modules/finance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/DEV_GUIDE.md)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
- [docs/runbooks/frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

## Qué decisiones quedaron cerradas

- el reset de categorías se hace con remapeo de referencias a defaults
- `ieris-ltda` queda excluido de E2E; solo `empresa-bootstrap` y `empresa-demo`
- la limpieza de residuos E2E en finanzas se maneja con un script operativo explícito
- los 500 en `Pendientes` por secuencia PK se corrigen desde backend sin intervención manual

## Qué falta exactamente

- revisar visualmente categorías `ieris-ltda` para confirmar solo defaults

## Qué no debe tocarse

- no borrar transacciones reales al limpiar E2E: sólo prefijos `e2e-`/`debug-`
- no cambiar parent de categorías que ya tengan familia definida manualmente

## Validaciones ya ejecutadas

- `ieris-ltda`: reset de categorías aplicado

## Bloqueos reales detectados

- falta confirmación visual en UI de categorías default en `ieris-ltda`

## Mi conclusión

- el reset quedó aplicado; falta validar en UI que se vea solo el baseline default.
