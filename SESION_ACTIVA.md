# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-12
- foco activo: hotfix deprovision para tolerar `.env` legacy no escribible
- prioridad inmediata: publicar hotfix y limpiar tenants E2E bloqueados
- módulo o frente activo: `platform-core`

## Último contexto útil

- el deprovision falla en prod por intentar escribir `/opt/platform_paas/.env`
- `tenant_service.deprovision_tenant` ya fue ajustado para saltar el `.env` legacy si no es escribible
- el cleanup E2E debe hacerse con `cleanup_e2e_tenants.py --apply --prefix e2e-` después del deploy

## Bloqueo actual

- bloqueo actual: deprovision en prod falla hasta publicar el hotfix

## Siguiente acción inmediata

- publicar hotfix y limpiar tenants E2E bloqueados

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/platform-core/CHANGELOG.md`
5. `docs/runbooks/frontend-e2e-browser.md`
