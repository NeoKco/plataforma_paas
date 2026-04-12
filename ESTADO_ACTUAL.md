# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: hotfix deprovision + fix de login tenant para evitar `500` y habilitar cleanup E2E
- estado general: fixes desplegados en `staging` y `production`, cleanup E2E ejecutado

## Resumen ejecutivo en 30 segundos

- el deprovision falla en prod por intentar escribir `/opt/platform_paas/.env`
- se ajustó `tenant_service.deprovision_tenant` para saltar el `.env` legacy si no es escribible
- el cleanup de tenants E2E se mantiene con `cleanup_e2e_tenants.py` y requiere el hotfix desplegado
- el login tenant deja de disparar `500` si falla la conexión antes de instanciar la sesión

## Qué ya quedó hecho

- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) omite limpiar el `.env` legacy si no es escribible, evitando `Permission denied` en deprovision
- [auth_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/auth_routes.py) asegura cierre seguro si `tenant_db` no llegó a instanciarse
- el script [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py) ya existe y permite limpieza segura via lifecycle

## Qué archivos se tocaron

- [backend/app/apps/platform_control/services/tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
- [backend/app/apps/tenant_modules/core/api/auth_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/auth_routes.py)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- el `.env` legacy no puede bloquear el deprovision; solo debe limpiarse si es escribible
- el cleanup E2E debe usar lifecycle (archive -> deprovision -> delete) y no borrar directo

## Qué falta exactamente

- validar login tenant en UI para confirmar error controlado (sin `500`) con hashes inválidos

## Qué no debe tocarse

- no tocar contratos de lifecycle ni reglas de billing
- no reabrir el slice `maintenance -> finance` ya cerrado

## Validaciones ya ejecutadas

- deploy backend `staging` -> `523 tests OK`
- deploy backend `production` -> `523 tests OK`
- deploy backend `staging` (hash invalid fix) -> `523 tests OK`
- deploy backend `production` (hash invalid fix) -> `523 tests OK`
- cleanup `cleanup_e2e_tenants.py --apply --prefix e2e-` -> `2 deleted`

## Bloqueos reales detectados

- sin bloqueos técnicos activos (pendiente validación UI)

## Mi conclusión

- hotfix ya aplicado; queda validar visualmente el login tenant
