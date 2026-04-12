# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: familias obligatorias en categorías finance + reparación en `ieris-ltda`
- estado general: backend actualizado en `production` y `staging`, familias seed actualizadas

## Resumen ejecutivo en 30 segundos

- las categorías finance default ahora nacen con familia (`Ingresos`, `Egresos`, `Transferencias`)
- `ieris-ltda` fue corregido para que todas sus categorías tengan familia
- el bootstrap ahora asigna parent a categorías existentes sin familia durante el seed

## Qué ya quedó hecho

- [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia PK en `maintenance_due_items` y reintenta el insert
- [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) agrega familias y parent_name por seed
- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) asigna parent a categorías por familia
- [repair_finance_category_families.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_category_families.py) repara categorías sin familia en tenants existentes
- script ejecutado en `production` para `ieris-ltda`:
  - reparación de familias (89 categorías actualizadas)

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/finance/default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
- [backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
- [backend/app/scripts/repair_finance_category_families.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_category_families.py)
- [docs/runbooks/tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)
- [docs/modules/finance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/DEV_GUIDE.md)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- todas las categorías default deben tener familia (parent) por tipo
- el seed asigna parent automáticamente y se puede reparar con script dedicado
- la limpieza de residuos E2E en finanzas se maneja con un script operativo explícito
- los 500 en `Pendientes` por secuencia PK se corrigen desde backend sin intervención manual

## Qué falta exactamente

- revisar visualmente categorías `ieris-ltda` para confirmar familias en UI

## Qué no debe tocarse

- no borrar transacciones reales al limpiar E2E: sólo prefijos `e2e-`/`debug-`
- no cambiar parent de categorías que ya tengan familia definida manualmente

## Validaciones ya ejecutadas

- backend `production`: servicio reiniciado tras cambios
- `ieris-ltda`: reparación de familias aplicada (89 categorías)

## Bloqueos reales detectados

- falta confirmación visual en UI de familias en `ieris-ltda`

## Mi conclusión

- las familias quedaron aplicadas; falta validar en UI que se reflejan correctamente.
