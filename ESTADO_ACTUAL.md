# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: hotfix deprovision para tolerar `.env` legacy no escribible y habilitar cleanup de tenants E2E
- estado general: fix en repo, pendiente de deploy y limpieza en entornos publicados

## Resumen ejecutivo en 30 segundos

- el deprovision falla en prod por intentar escribir `/opt/platform_paas/.env`
- se ajustó `tenant_service.deprovision_tenant` para saltar el `.env` legacy si no es escribible
- el cleanup de tenants E2E se mantiene con `cleanup_e2e_tenants.py` y requiere el hotfix desplegado

## Qué ya quedó hecho

- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) omite limpiar el `.env` legacy si no es escribible, evitando `Permission denied` en deprovision
- el script [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py) ya existe y permite limpieza segura via lifecycle

## Qué archivos se tocaron

- [backend/app/apps/platform_control/services/tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- el `.env` legacy no puede bloquear el deprovision; solo debe limpiarse si es escribible
- el cleanup E2E debe usar lifecycle (archive -> deprovision -> delete) y no borrar directo

## Qué falta exactamente

- desplegar este hotfix en `staging` y `production`
- reintentar deprovision y borrar tenants E2E afectados
- ejecutar `cleanup_e2e_tenants.py --apply` con prefijo `e2e-` si siguen colgados

## Qué no debe tocarse

- no tocar contratos de lifecycle ni reglas de billing
- no reabrir el slice `maintenance -> finance` ya cerrado

## Validaciones ya ejecutadas

- aún no ejecutadas para este hotfix

## Bloqueos reales detectados

- deprovision en prod falla por `Permission denied` al escribir `/opt/platform_paas/.env` hasta publicar el fix

## Mi conclusión

- el fix es pequeño y directo; desplegarlo debería destrabar el borrado de tenants E2E
