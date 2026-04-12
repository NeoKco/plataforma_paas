# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: separación contractual de `maintenance` respecto de `core` y bootstrap financiero por vertical de tenant
- estado general: el repo ya soporta `maintenance` como módulo contractual independiente y los tenants nuevos ya pueden nacer con catálogo financiero distinto para `empresa` vs `condominio/hogar`; falta solo la validación/publicación en entorno si se quiere llevar este corte fuera del repo

## Resumen ejecutivo en 30 segundos

- `Mantenciones` ya no queda implícito dentro de `Core negocio`; backend y frontend tenant-side ahora lo tratan como módulo propio `maintenance`
- el bootstrap tenant ahora reemplaza el catálogo financiero neutral por un perfil vertical (`empresa` o `condominio/hogar`) cuando la DB está recién creada y sin uso financiero
- el corte quedó validado en repo con unit tests backend, build frontend y `playwright --list`; todavía no se publicó a `staging/production`

## Qué ya quedó hecho

- `VALID_PLAN_MODULES` ya incluye `maintenance`
- el middleware tenant ya clasifica `/tenant/maintenance/*` como módulo `maintenance` en vez de dejarlo caer en `core`
- `maintenance_scopes` ya acepta también `maintenance`
- el `tenant_portal` ya muestra/oculta `Mantenciones` según `effective_enabled_modules` usando la clave `maintenance`
- `Tenants` en `platform_admin` ya deja copy explícito de que `Mantenciones` no viaja implícito dentro de `Core negocio`
- el baseline default de `settings.py` ya diferencia módulos por plan:
  - `mensual=core,users`
  - `trimestral=core,users,maintenance`
  - `semestral=core,users,finance`
  - `anual=all`
- el bootstrap tenant ahora siembra categorías financieras por vertical desde [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
- el perfil `empresa` ya incluye categorías operativas como `Mantenciones y servicios` y `Costos de mantencion`
- el perfil `condominio/hogar` ya incluye categorías base de hogar como `Sueldo`, `Mascotas`, `Hipotecario`, `Electricidad`, etc.
- el bootstrap reemplaza el catálogo neutral solo si no existe uso financiero todavía, evitando mezclar el set genérico de migración con el perfil final del tenant

## Qué archivos se tocaron

- backend de contratos y middleware:
  - [module_limit_catalog.py](/home/felipe/platform_paas/backend/app/common/policies/module_limit_catalog.py)
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
  - [tenant_context_middleware.py](/home/felipe/platform_paas/backend/app/common/middleware/tenant_context_middleware.py)
- bootstrap financiero por vertical:
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
- frontend:
  - [module-visibility.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/utils/module-visibility.ts)
  - [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx)
  - [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts)
- tests backend:
  - [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
  - [test_tenant_flow.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_flow.py)
  - [test_tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_db_bootstrap_service.py)
- configuración y documentación:
  - [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py)
  - [backend.development.example.env](/home/felipe/platform_paas/infra/env/backend.development.example.env)
  - [backend.staging.example.env](/home/felipe/platform_paas/infra/env/backend.staging.example.env)
  - [backend.production.example.env](/home/felipe/platform_paas/infra/env/backend.production.example.env)
  - [docs/modules/platform-core/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)
  - [docs/modules/platform-core/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/USER_GUIDE.md)
  - [docs/modules/platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
  - [docs/modules/finance/README.md](/home/felipe/platform_paas/docs/modules/finance/README.md)
  - [docs/modules/finance/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/DEV_GUIDE.md)
  - [docs/modules/finance/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/finance/USER_GUIDE.md)
  - [docs/modules/finance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/finance/ROADMAP.md)
  - [backend-env-catalog.md](/home/felipe/platform_paas/docs/runbooks/backend-env-catalog.md)
  - [tenant-backend-implementation.md](/home/felipe/platform_paas/docs/runbooks/tenant-backend-implementation.md)
  - [docs/api/index.md](/home/felipe/platform_paas/docs/api/index.md)
  - [finance_overview.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_overview.md)
  - [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
  - [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

## Qué decisiones quedaron cerradas

- `maintenance` ya no debe tratarse como herencia implícita de `core`; si el tenant lo usa, el contrato debe incluir el módulo `maintenance`
- el gating tenant-side debe coincidir con backend: si `effective_enabled_modules` no trae `maintenance`, el sidebar lo oculta y el middleware bloquea rutas `/tenant/maintenance/*`
- el catálogo financiero inicial ya no será único y genérico para todos los tenants nuevos
- `tenant_type` pasa a tener impacto funcional explícito sobre el seed financiero inicial del tenant
- el corte de categorías por vertical se resuelve en bootstrap tenant, no con una migración destructiva sobre tenants ya operativos

## Qué falta exactamente

- decidir si este corte debe publicarse ahora a `staging` y `production`
- si se publica, correr al menos:
  - smoke tenant-side de sidebar por módulos
  - validación manual o automática de bootstrap de un tenant nuevo `empresa`
  - validación manual o automática de bootstrap de un tenant nuevo `condominio`
- abrir el siguiente slice funcional pedido por el usuario:
  - ajustes de llenado entre `maintenance` y `finance`
  - posible autoselección de categorías/cuentas por defecto usando el nuevo catálogo vertical

## Qué no debe tocarse

- no volver a acoplar `maintenance` a `core` por copy, por UI o por middleware
- no vender el seed financiero por vertical como migración automática de tenants viejos; hoy aplica al bootstrap de tenants nuevos o a DB sin uso financiero
- no mezclar publicación de este corte con cambios adicionales de `maintenance -> finance` en la misma subida sin antes validar el baseline
- no modificar `.env` reales de producción por inercia; la matriz contractual de planes quedó en `settings.py` y en ejemplos, pero el rollout real debe decidirse conscientemente

## Validaciones ya ejecutadas

- backend repo:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_flow app.tests.test_tenant_flow app.tests.test_tenant_db_bootstrap_service`
  - resultado: `Ran 292 tests ... OK`
- frontend repo:
  - `cd frontend && npm run build`
  - resultado: `OK`
- playwright repo:
  - `cd frontend && npx playwright test e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts --list`
  - resultado: `OK`

## Bloqueos reales detectados

- no hay bloqueo técnico real en repo
- queda pendiente la decisión operativa de rollout: este corte aún no se publicó a `staging/production`
- el siguiente frente funcional (`maintenance -> finance` autollenado y defaults más finos) conviene abrirlo sobre esta base nueva, no antes

## Mi conclusión

- el hueco contractual real quedó resuelto en código: `Mantenciones` ya puede venderse, bloquearse o degradarse aparte de `Core negocio`
- el bootstrap financiero también quedó mejor alineado al negocio real porque los tenants nuevos ya no parten con un único catálogo genérico indiferenciado
- el siguiente paso correcto ya no es más DLQ; ahora toca decidir rollout de este corte y luego entrar al ajuste fino entre `maintenance` y `finance`
