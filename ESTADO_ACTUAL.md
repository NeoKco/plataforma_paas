# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: formalizar gobernanza de datos y `SRED Driven Development` como estándar transversal antes de abrir el slice fino `maintenance -> finance`
- estado general: baseline contractual por módulos ya publicado; gobernanza transversal ampliada con datos + `SRED`; sin bloqueo técnico abierto

## Resumen ejecutivo en 30 segundos

- el baseline contractual por módulos ya quedó operativo en repo, `staging` y `production`
- `core` ya puede sembrar perfiles funcionales y tipos de tarea; `core` o `finance` ya pueden sembrar baseline financiero con `CLP` y categorías `Casa - ...` / `Empresa - ...`
- `maintenance -> finance` ya existía; antes de endurecerlo quedó formalizado el marco transversal de gobernanza de datos y `SRED`

## Qué ya quedó hecho

- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) separa `seed_defaults(...)` para reutilizar el baseline tanto en provisioning inicial como en backfill por cambio de plan
- [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) ahora siembra `CLP` como base efectiva, categorías compartidas y familias clasificadas `Casa - ...` / `Empresa - ...`
- [default_catalog_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py) agrega perfiles `tecnico`, `lider`, `administrativo`, `vendedor`, `otro`, `supervisor` y tipos `mantencion`, `instalacion`, `tareas generales`, `ventas`, `administracion`
- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ya backfillea esos defaults cuando un tenant activo gana `core` o `finance` por cambio de plan
- el backend quedó desplegado en `/opt/platform_paas_staging` y `/opt/platform_paas`, con `523 tests ... OK` en ambos carriles
- en `staging` se validó con tenants nuevos reales:
  - `bootstrap-empresa-20260412002354`
  - `bootstrap-condominio-20260412002354`
- esa validación confirmó:
  - `CLP` como moneda base efectiva
  - presencia de ambas familias `Empresa - ...` y `Casa - ...`
  - orden dominante por tipo de tenant
  - perfiles funcionales y tipos de tarea sembrados correctamente
- la regresión browser [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) volvió a quedar `1 passed` en `staging` y `production`
- [data-governance.md](/home/felipe/platform_paas/docs/architecture/data-governance.md) ya define ownership de datos, contratos entre módulos, reglas de seeds/defaults, calidad mínima, archivo y portabilidad
- [sred-development.md](/home/felipe/platform_paas/docs/architecture/sred-development.md) ya formaliza el cierre por `Spec`, `Rules`, `Evidence` y `Documentation`
- ese marco ya quedó enlazado desde contexto, reglas, gobernanza, estándar modular, checklist y prompt maestro

## Qué archivos se tocaron

- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
- [provisioning_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/provisioning_service.py)
- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
- [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
- [default_catalog_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py)
- [test_tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_db_bootstrap_service.py)
- [test_tenant_service_module_seed_backfill.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_service_module_seed_backfill.py)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
- [docs/modules/platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
- [docs/modules/business-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)
- [docs/modules/finance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/finance/ROADMAP.md)
- [docs/modules/maintenance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)
- [backend/app/apps/tenant_modules/finance/docs/finance_db.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_db.md)
- [docs/architecture/data-governance.md](/home/felipe/platform_paas/docs/architecture/data-governance.md)
- [docs/architecture/sred-development.md](/home/felipe/platform_paas/docs/architecture/sred-development.md)
- [docs/architecture/implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [docs/architecture/index.md](/home/felipe/platform_paas/docs/architecture/index.md)
- [docs/architecture/module-build-standard.md](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)
- [PROJECT_CONTEXT.md](/home/felipe/platform_paas/PROJECT_CONTEXT.md)
- [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md)
- [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md)
- [PROMPT_MAESTRO_MODULO.md](/home/felipe/platform_paas/PROMPT_MAESTRO_MODULO.md)

## Qué decisiones quedaron cerradas

- el baseline contractual debe sembrarse tanto en provisioning inicial como en backfill posterior por cambio de plan
- `CLP` pasa a ser la moneda base efectiva por defecto para tenants nuevos o sin uso financiero todavía
- las familias domésticas y empresariales convivirán en el mismo catálogo usando prefijos `Casa - ...` y `Empresa - ...` para respetar la unicidad `name + category_type`
- `maintenance -> finance` ya no debe tratarse como integración faltante; el siguiente corte será de autollenado, defaults y ergonomía
- `core` debe dejar listo el baseline operativo de `business-core` para que `maintenance` no parta sin taxonomía mínima
- el proyecto ya tiene ahora dos capas explícitas de gobernanza transversal:
  - implementación
  - datos
- el criterio oficial de cierre relevante pasa a expresarse también como `SRED`

## Qué falta exactamente

- definir el slice fino `maintenance -> finance`:
  - en qué evento se sugieren ingreso y egreso
  - qué categoría y cuenta se proponen por defecto
  - qué campos quedan editables antes del sync
- decidir si hace falta un smoke/browser específico para alta visible de tenant nuevo con inspección de catálogos bootstrap; hoy esa validación quedó cerrada con pruebas reales y verificación directa de DB en `staging`
- mantener sincronizados repo, `/opt/platform_paas` y `/opt/platform_paas_staging` cuando se abra el siguiente corte funcional
- aplicar este nuevo marco al siguiente slice `maintenance -> finance`

## Qué no debe tocarse

- no volver a acoplar `maintenance` dentro de `core` como herencia implícita
- no quitar los prefijos `Casa - ...` / `Empresa - ...` mientras siga vigente la unicidad de `finance_categories`
- no cambiar el bootstrap contractual por módulos sin actualizar a la vez provisioning, backfill de plan, roadmap y handoff
- no reabrir `Provisioning/DLQ` salvo necesidad operativa explícita
- no abrir integraciones de datos nuevas sin revisar `data-governance.md`

## Validaciones ya ejecutadas

- repo:
  - `python -m unittest app.tests.test_tenant_db_bootstrap_service app.tests.test_tenant_service_module_seed_backfill` -> `5 tests OK`
  - `python3 -m py_compile` sobre archivos nuevos/modificados -> `OK`
  - revisión documental de gobernanza transversal: `OK`
- staging:
  - `deploy_backend_staging.sh` -> `523 tests ... OK`
  - `platform-paas-backend-staging.service` activo
  - validación real con tenants `bootstrap-empresa-20260412002354` y `bootstrap-condominio-20260412002354`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) -> `1 passed`
- production:
  - `deploy_backend_production.sh` -> `523 tests ... OK`
  - `curl -k https://orkestia.ddns.net/health` -> `healthy`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) -> `1 passed`

## Bloqueos reales detectados

- no hay bloqueo técnico abierto
- la única decisión pendiente ya es funcional: acotar el alcance del autollenado fino `maintenance -> finance` bajo el nuevo marco de gobernanza de datos

## Mi conclusión

- este subcorte ya quedó cerrado y publicado correctamente
- el siguiente paso correcto es abrir el slice funcional de autollenado entre `maintenance` y `finance`, ya con gobernanza de datos y `SRED` formalizados
