# Finance Module

Documentación canónica del módulo `finance`.

Este directorio ordena la documentación por tipo para que el conocimiento del módulo no quede repartido solo entre código, runbooks y notas históricas.

Estado actual:

- módulo funcionalmente cerrado para la etapa actual del PaaS
- backend, frontend, migraciones, importación legacy y smoke E2E ya operativos
- `finance` actúa como módulo base y piloto de convención para siguientes módulos tenant

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/DEV_GUIDE.md)
  Estructura, contratos, extensión y pruebas para desarrollo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/finance/API_REFERENCE.md)
  Referencia resumida de endpoints y grupos del módulo.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/finance/ROADMAP.md)
  Estado, siguientes pasos, deuda técnica y backlog post-cierre.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/finance/CHANGELOG.md)
  Consolidado de hitos funcionales y técnicos del módulo.

## Fuentes de detalle ya existentes

- Backend overview: [finance_overview.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_overview.md)
- Base de datos: [finance_db.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_db.md)
- Reglas de negocio: [finance_business_rules.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_business_rules.md)
- Permisos: [finance_permissions.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_permissions.md)
- Testing backend: [finance_testing.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_testing.md)
- API backend detallada: [finance_api.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_api.md)
- Manual de usuario frontend: [finance_user_manual.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_user_manual.md)
- Manual administrativo frontend: [finance_admin_manual.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_admin_manual.md)
- Notas frontend: [finance_frontend_notes.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_frontend_notes.md)
- Runbook de implementación: [finance-module-implementation.md](/home/felipe/platform_paas/docs/runbooks/finance-module-implementation.md)
- Material fuente histórico: [finance-module-source-material](/home/felipe/platform_paas/docs/finance-module-source-material)

## Código principal

- Backend: [finance](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance)
- Frontend: [finance](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance)
- E2E browser: [e2e](/home/felipe/platform_paas/frontend/e2e)

## Criterio de uso

Si necesitas operar el módulo:
- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/USER_GUIDE.md)

Si necesitas modificar o extender el módulo:
- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/DEV_GUIDE.md)

Si necesitas revisar estado y próximos pasos:
- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/finance/ROADMAP.md)
