# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: fix deprovision/delete (Permission denied .env)
- estado general: backend actualizado en `production` y `staging`, familias seed actualizadas

## Resumen ejecutivo en 30 segundos

- se evita que el deprovision falle por `Permission denied` al limpiar secrets en `.env`

## Qué ya quedó hecho

- [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia PK en `maintenance_due_items` y reintenta el insert
- [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) agrega familias y parent_name por seed
- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) asigna parent a categorías por familia
- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ignora `PermissionError` al limpiar secrets runtime durante deprovision

## Qué archivos se tocaron

- [backend/app/apps/platform_control/services/tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)

## Qué decisiones quedaron cerradas

- el deprovision no debe fallar por permisos de `.env` runtime
- la limpieza de residuos E2E en finanzas se maneja con un script operativo explícito
- los 500 en `Pendientes` por secuencia PK se corrigen desde backend sin intervención manual

## Qué falta exactamente

- reintentar desprovision + delete del tenant con error

## Qué no debe tocarse

- no borrar transacciones reales al limpiar E2E: sólo prefijos `e2e-`/`debug-`
- no cambiar parent de categorías que ya tengan familia definida manualmente

## Validaciones ya ejecutadas

- backend production y staging reiniciados con el hotfix

## Bloqueos reales detectados

- pendiente validar que delete funcione tras el hotfix

## Mi conclusión

- el hotfix quedó desplegado; falta validar eliminación real desde UI.
