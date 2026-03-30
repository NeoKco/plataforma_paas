# Platform Core Developer Guide

Guía de desarrollo para la parte central de la app.

## Alcance

`platform-core` cubre:

- instalador
- `platform_admin`
- base de control
- lifecycle tenant
- provisioning
- billing
- actividad
- autenticación `platform`

## Estructura relevante

Backend:

- `backend/app/apps/platform/`
- `backend/app/common/`
- `backend/app/bootstrap/`

Frontend:

- `frontend/src/apps/platform_admin/`
- `frontend/src/apps/installer/`

Documentación base:

- [backend-current-flow.md](/home/felipe/platform_paas/docs/architecture/backend-current-flow.md)
- [authentication-and-authorization.md](/home/felipe/platform_paas/docs/architecture/authentication-and-authorization.md)
- [multi-tenant-model.md](/home/felipe/platform_paas/docs/architecture/multi-tenant-model.md)

## Contratos y decisiones importantes

- `platform_control` es la fuente de verdad central
- el lifecycle tenant es explícito y no debe mutarse informalmente
- `archive` es la baja operativa preferida
- `restore` es flujo explícito, no cambio manual de estado
- `delete` físico de tenants sigue fuera del alcance normal de operación
- frontend y backend deben consumir el catálogo de capacidades como fuente de verdad cuando aplique

## Cómo extender este bloque

1. definir impacto sobre lifecycle, permisos y observabilidad
2. cambiar backend
3. exponer endpoints
4. conectar frontend
5. agregar tests
6. actualizar runbook y documentación canónica de `platform-core`

## Referencias técnicas

- Implementación platform backend: [platform-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/platform-backend-implementation.md)
- Implementación tenant backend: [tenant-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/tenant-backend-implementation.md)
- Error/status matrix: [backend-error-status-matrix.md](/home/felipe/platform_paas/docs/architecture/backend-error-status-matrix.md)
- Mapa de permisos: [permission-map.md](/home/felipe/platform_paas/docs/architecture/permission-map.md)
- E2E browser: [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

## E2E vigente

Smokes actuales del bloque central:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)

Cobertura actual:

- login `platform_admin`
- navegación base a `Tenants` y `Provisioning`
- lifecycle tenant base en UI con `create`, `archive` y `restore`
