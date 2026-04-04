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
- en `platform_admin`, las capturas de alta más sensibles (`Tenants`, `Usuarios de plataforma`) no deberían quedar abiertas por defecto; la lectura principal debe mostrarse primero y la creación abrirse bajo demanda en modal
- en `tenant_portal`, `Usuarios` debe seguir el mismo patrón: catálogo visible primero y alta solo bajo demanda desde botón
- `tenant_portal > Usuarios` ya expone además edición y borrado seguro: el backend bloquea autoeliminación y protege al último admin activo antes de aceptar `DELETE /tenant/users/{id}` o degradaciones equivalentes
- `tenant_portal > Usuarios` también es la fuente de verdad para la zona horaria operativa del tenant:
  - `tenant_info.timezone` define la zona por defecto del tenant
  - `users.timezone` permite override por usuario
  - la precedencia efectiva es `users.timezone -> tenant_info.timezone -> default plataforma`
  - los módulos del tenant deben consumir la zona efectiva desde `/tenant/info` y no asumir UTC ni el reloj del navegador como única fuente

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
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-role-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-role-access.smoke.spec.ts)
- [platform-admin-billing-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-reconcile.smoke.spec.ts)
- [platform-admin-billing-batch-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-batch-reconcile.smoke.spec.ts)
- [platform-admin-tenant-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-history.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-provisioning-dlq-row.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [platform-admin-provisioning-dlq-filters.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)

Baseline E2E tenant actualmente validado para continuar pruebas browser:

- `E2E_TENANT_SLUG=empresa-bootstrap`
- `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
- `E2E_TENANT_PASSWORD=TenantAdmin123!`

Nota operativa:

- para esta iteración el baseline validado de tenant browser sigue siendo `empresa-bootstrap`
- los smokes de límites tenant (`core.users.active` y `finance.entries`) ahora preparan y limpian overrides de forma determinista por control DB
- si otro entorno no tiene `empresa-bootstrap` disponible, hay que sobreescribir `E2E_TENANT_*` y revalidar el baseline

Cobertura actual:

- login `platform_admin`
- navegación base a `Tenants` y `Provisioning`
- lifecycle tenant base en UI con `create`, `archive` y `restore`
- acceso rápido desde `Tenants` al login de `tenant_portal` con `slug` precargado
- feedback de bloqueo en `Tenants` cuando el acceso rápido al `tenant_portal` todavía no debe habilitarse
- enforcement visible por rol en `platform_admin` para `admin` y `support`
- workspace de `Billing` con reconcile individual sobre evento tenant persistido
- workspace de `Billing` con reconcile batch sobre eventos filtrados
- `Histórico tenants` con filtros, exportaciones y lectura del detalle archivado
- visibilidad de jobs de provisioning recién disparados desde `Tenants`
- ejecución manual de jobs `pending` desde `Provisioning`
- requeue de jobs `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning` con confirmación y feedback visible
- requeue individual de filas DLQ desde `Provisioning` en entornos con backend `broker`
- requeue batch de filas DLQ filtradas desde `Provisioning` en entornos con backend `broker`
- filtros finos DLQ por texto de error y validación visible de `delay/reset attempts` antes del requeue individual en backend `broker`
- enforcement visible de límites de usuarios activos en `tenant_portal` con overrides preparados de forma determinista
- enforcement visible de límites de `finance.entries` en `tenant_portal` con overrides preparados de forma determinista
- precedencia visible de `finance.entries` sobre `finance.entries.monthly` cuando ambos límites aplican a la vez en `tenant_portal`
- enforcement de límites mensuales de `finance.entries.monthly` en `tenant_portal` con overrides preparados de forma determinista
- enforcement de límites mensuales por tipo `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal` con overrides preparados de forma determinista
- mantenimiento operativo de cuentas y categorías `finance` en `tenant_portal` (`create`, `deactivate`, `delete`)
- flujo operativo base de presupuestos `finance` en `tenant_portal` (`create`, `clone`)
- flujo operativo base de préstamos `finance` en `tenant_portal` (`create`, `schedule`, `payment`)
- operaciones batch de préstamos `finance` en `tenant_portal` (`batch payment`, `batch reversal`)
