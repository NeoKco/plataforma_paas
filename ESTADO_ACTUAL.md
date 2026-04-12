# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-11
- foco de iteración: endurecimiento del bootstrap contractual por módulos para tenants nuevos y cambios de plan
- estado general: el repo ya soporta `CLP` como base, categorías `Casa/Empresa`, perfiles funcionales y tipos de tarea default; este subcorte quedó validado por unit tests pero todavía no está publicado en `staging` ni `production`

## Resumen ejecutivo en 30 segundos

- el puente `maintenance -> finance` ya existe en primer corte; no se está creando desde cero, el siguiente trabajo será autollenado fino
- el bootstrap tenant ahora puede sembrar baseline real cuando el plan habilita `core` o `finance`, tanto en provisioning inicial como en cambio posterior de plan
- `finance` deja de nacer solo con el baseline neutral heredado de migración: el seed final ahora promueve `CLP` y agrega familias `Casa - ...` y `Empresa - ...`
- `business-core` ya puede nacer con perfiles funcionales y tipos de tarea base sin depender de carga manual posterior
- la documentación y el handoff ya quedaron alineados a este nuevo baseline, pero el subcorte aún espera publish visible

## Qué ya quedó hecho

- se confirmó en código que `maintenance -> finance` ya existe mediante:
  - sync manual por OT
  - política `manual` o `auto_on_close`
  - vínculo persistente a transacciones financieras
- [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) ahora expone `seed_defaults(...)` reutilizable
- el bootstrap financiero ahora asegura:
  - `CLP` como base efectiva por defecto
  - `finance_settings.base_currency_code = CLP`
  - categorías operativas compartidas
  - categorías clasificadas `Casa - ...`
  - categorías clasificadas `Empresa - ...`
- el bootstrap de `business-core` ahora asegura:
  - perfiles `tecnico`, `lider`, `administrativo`, `vendedor`, `otro`, `supervisor`
  - tipos de tarea `mantencion`, `instalacion`, `tareas generales`, `ventas`, `administracion`
  - compatibilidad base entre tipos de tarea y perfiles
- [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ahora puede backfillear esos defaults cuando un tenant activo gana `core` o `finance` por cambio de plan
- [provisioning_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/provisioning_service.py) ya pasa los módulos habilitados del plan al bootstrap tenant
- tests nuevos para bootstrap y backfill por plan ya quedaron verdes

## Qué archivos se tocaron

- backend bootstrap y lifecycle:
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py)
  - [provisioning_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/provisioning_service.py)
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
- nuevos catálogos default:
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py)
  - [default_catalog_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py)
- tests:
  - [test_tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_db_bootstrap_service.py)
  - [test_tenant_service_module_seed_backfill.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_service_module_seed_backfill.py)
- documentación:
  - [docs/modules/platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md)
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
  - [docs/modules/business-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)
  - [docs/modules/finance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/finance/ROADMAP.md)
  - [finance_db.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_db.md)
  - [docs/modules/maintenance/ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)

## Qué decisiones quedaron cerradas

- el baseline `core` no puede depender de carga manual posterior para perfiles funcionales ni tipos de tarea
- el baseline `finance` de un tenant nuevo no debe quedar con `USD` como moneda operativa final por defecto
- por la restricción única `(name, category_type)` en `finance_categories`, la convivencia `casa + empresa` se resuelve con nombres clasificados `Casa - ...` y `Empresa - ...`, no duplicando nombres desnudos
- el mismo bootstrap debe servir tanto para provisioning inicial como para backfill por cambio de plan; no conviene mantener dos rutas distintas de seed
- el siguiente slice `maintenance -> finance` debe enfocarse en autollenado y ergonomía, no en “crear la integración”

## Qué falta exactamente

- publicar este subcorte en `staging`
- validar de forma visible un tenant nuevo con `core` habilitado:
  - moneda base `CLP`
  - categorías `Casa/Empresa`
  - perfiles funcionales
  - tipos de tarea
- si `staging` queda correcto, promover a `production`
- recién después abrir el slice de autollenado fino `maintenance -> finance`

## Qué no debe tocarse

- no volver a un seed exclusivo `empresa` versus `hogar` si el requerimiento ahora es convivir con ambas familias en el mismo tenant
- no cambiar la migración tenant histórica para forzar `CLP` retroactivamente sobre tenants con uso financiero real
- no mezclar este publish de bootstrap contractual con el siguiente slice de autollenado `maintenance -> finance`
- no introducir toggles manuales ad hoc de módulos fuera del contrato por plan

## Validaciones ya ejecutadas

- backend unit:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_db_bootstrap_service app.tests.test_tenant_service_module_seed_backfill`
  - resultado: `Ran 5 tests ... OK`
- compilación Python:
  - `python3 -m py_compile backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py backend/app/apps/platform_control/services/tenant_service.py backend/app/apps/tenant_modules/finance/default_category_profiles.py backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py`
  - resultado: `OK`
- revisión funcional de código:
  - `maintenance -> finance` ya existe y quedó documentado como baseline vigente

## Bloqueos reales detectados

- no hay bloqueo técnico
- el subcorte todavía no está validado visualmente en `staging`
- falta decidir si el primer publish irá acompañado por smoke nuevo de bootstrap tenant o por validación manual controlada

## Mi conclusión

- el hueco real ya no estaba en la integración `maintenance -> finance`, sino en el baseline contractual del tenant
- ese hueco ya quedó resuelto en repo de forma más robusta: bootstrap inicial + backfill por cambio de plan
- el siguiente paso correcto ya no es más diseño; toca publicar y validar este baseline antes de pasar al autollenado fino entre `maintenance` y `finance`
