# Platform Core

Documentación canónica del bloque central de la app.

`platform-core` agrupa el conocimiento operativo y técnico de:

- instalador
- `platform_admin`
- control de tenants
- provisioning
- billing
- actividad
- operadores de plataforma

No reemplaza la documentación detallada ya existente. La ordena.

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/USER_GUIDE.md)
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/platform-core/API_REFERENCE.md)
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)

## Fuentes de detalle ya existentes

- Arquitectura general: [index.md](/home/felipe/platform_paas/docs/architecture/index.md)
- Gobernanza de implementacion: [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- Estructura del proyecto: [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md)
- Flujo backend actual: [backend-current-flow.md](/home/felipe/platform_paas/docs/architecture/backend-current-flow.md)
- Roadmap de desarrollo: [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md)
- Roadmap de frontend: [frontend-roadmap.md](/home/felipe/platform_paas/docs/architecture/frontend-roadmap.md)
- API index: [index.md](/home/felipe/platform_paas/docs/api/index.md)
- Bootstrap de plataforma: [platform-bootstrap.md](/home/felipe/platform_paas/docs/runbooks/platform-bootstrap.md)
- Implementación backend platform: [platform-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/platform-backend-implementation.md)
- Tenant backend: [tenant-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/tenant-backend-implementation.md)
- Lifecycle de tenants: [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)
- Usuarios de plataforma: [platform-users-cycle.md](/home/felipe/platform_paas/docs/runbooks/platform-users-cycle.md)
- Actividad: [platform-activity.md](/home/felipe/platform_paas/docs/runbooks/platform-activity.md)
- Provisioning guided test: [provisioning-guided-test.md](/home/felipe/platform_paas/docs/runbooks/provisioning-guided-test.md)
- Billing guided test: [billing-guided-test.md](/home/felipe/platform_paas/docs/runbooks/billing-guided-test.md)

## Criterio de uso

Si necesitas operar la app central:
- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/USER_GUIDE.md)

La guía de usuario ya cubre también la lectura operativa base de `Provisioning`, incluyendo jobs nuevos, ejecución manual, requeue, `schema auto-sync` y operación DLQ cuando el backend usa `broker`.

Si necesitas modificar backend/frontend central:
- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)

Si necesitas revisar estado y siguientes pasos:
- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
