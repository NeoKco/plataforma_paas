# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: backfill de defaults tenant + limpieza E2E finance + fix PK en `maintenance_due_items`
- estado general: backend actualizado en `production` y `staging`, scripts operativos nuevos disponibles

## Resumen ejecutivo en 30 segundos

- `Pendientes` fallaba por secuencia desfasada en `maintenance_due_items`; se corrige con reparación automática al insertar
- se agregó script de backfill para perfiles funcionales, tipos de tarea, categorías finance y base CLP por tenant
- se agregó script de cleanup de datos E2E en finanzas y ya se aplicó en `ieris-ltda` (45 transacciones removidas)

## Qué ya quedó hecho

- [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia PK en `maintenance_due_items` y reintenta el insert
- [seed_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_tenant_defaults.py) permite re-sembrar defaults core/finance por tenant
- [cleanup_tenant_e2e_finance_data.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_tenant_e2e_finance_data.py) limpia residuos E2E de finanzas por tenant
- scripts ejecutados en `production` para `ieris-ltda`:
  - seed defaults core/finance
  - cleanup E2E finance (45 transacciones)

## Qué archivos se tocaron

- [backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py)
- [backend/app/scripts/seed_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_tenant_defaults.py)
- [backend/app/scripts/cleanup_tenant_e2e_finance_data.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_tenant_e2e_finance_data.py)
- [docs/runbooks/frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)
- [docs/runbooks/tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)
- [docs/modules/maintenance/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- el backfill de defaults por tenant se resuelve con un script idempotente (`seed_tenant_defaults.py`)
- la limpieza de residuos E2E en finanzas se maneja con un script operativo explícito
- los 500 en `Pendientes` por secuencia PK se corrigen desde backend sin intervención manual

## Qué falta exactamente

- validar en UI que `Pendientes` ya carga sin 500 en `ieris-ltda`
- confirmar si se necesita automatizar limpieza E2E finance en pipelines E2E publicados

## Qué no debe tocarse

- no borrar transacciones reales al limpiar E2E: sólo prefijos `e2e-`/`debug-`
- no modificar catálogo core/finance más allá del seed idempotente

## Validaciones ya ejecutadas

- backend `production`: servicio reiniciado tras hotfix
- seed defaults aplicado a `ieris-ltda`
- cleanup E2E finance aplicado a `ieris-ltda`

## Bloqueos reales detectados

- falta confirmación visual de `Pendientes` tras el fix de secuencia

## Mi conclusión

- los defaults y limpieza quedaron operativos; falta confirmar el fix de `Pendientes` en UI.
