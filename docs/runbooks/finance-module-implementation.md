# Implementacion Modulo Finance

Este documento describe el primer modulo tenant funcional agregado sobre la base multi-tenant actual.

Desde el estado actual del proyecto, `finance` queda ademas declarado como:

- modulo base del SaaS
- modulo piloto para la convencion modular futura
- referencia tecnica para los siguientes modulos tenant

## Objetivo

Agregar un modulo pequeno pero real que reutilice:

- JWT tenant
- `get_tenant_db()`
- permisos tenant
- patron `router -> service -> repository`

## Alcance de esta primera version

El modulo `finance` permite:

- registrar movimientos financieros
- listar movimientos
- obtener un resumen simple

## Estado actual del roadmap maestro

El trabajo sobre `finance` ya arranco siguiendo el orden obligatorio del prompt maestro:

- `Lote 0` completado
- `Lote 1` completado
- `Lote 2` completado
- `Lote 3` completado
- `Lote 4` completado
- `Lote 5` completado

En esta fase quedaron listos:

- estructura backend del modulo bajo `backend/app/apps/tenant_modules/finance/`
- estructura frontend del modulo bajo `frontend/src/apps/tenant_portal/modules/finance/`
- router agregador del slice
- placeholders de vistas futuras sin romper la vista actual de movimientos
- documentacion tecnica y funcional inicial del modulo
- migracion tenant `0003_finance_catalogs`
- migracion tenant `0004_finance_seed_clp`
- catalogos base del modulo y seeds idempotentes
- `CLP` disponible como moneda semilla adicional
- modelos SQLAlchemy de catalogos base
- schemas backend por entidad
- repositories CRUD base por catalogo
- servicios backend por catalogo
- endpoints CRUD base para catalogos, settings y exchange rates
- endpoints de detalle y `reorder` para catalogos principales
- frontend operativo para cuentas, categorias, catalogos auxiliares y configuracion financiera
- migracion tenant `0005_finance_transactions`
- tabla `finance_transactions` como nucleo real del modulo
- tablas auxiliares de tags, adjuntos y auditoria por transaccion
- backfill idempotente desde `finance_entries`
- compatibilidad legacy de `/tenant/finance/entries` sobre la nueva persistencia
- endpoints modernos `GET|POST /tenant/finance/transactions`
- endpoint `GET /tenant/finance/transactions/{transaction_id}` con auditoria reciente
- endpoint `GET /tenant/finance/account-balances`
- vista tenant real de transacciones sobre `finance_transactions`
- panel de detalle operacional por transaccion seleccionada
- balances por cuenta visibles desde la UI tenant
- filtros operativos por tipo, cuenta, categoria, conciliacion y texto
- acciones rapidas para marcar favorita o conciliada una transaccion existente
- edicion completa de transacciones existentes usando el mismo contrato de escritura
- modo edicion en la pantalla principal de `Transacciones`, con cancelar y refresco del detalle sin colapsarlo
- filtro explicito por favoritas y mesa de trabajo basica con seleccion multiple
- acciones por lote para favoritas y conciliacion desde la tabla principal
- conciliacion guiada con nota opcional, confirmacion explicita y auditoria reciente enriquecida

## Archivos principales

- `backend/app/apps/tenant_modules/finance/models/entry.py`
- `backend/app/apps/tenant_modules/finance/repositories/entry_repository.py`
- `backend/app/apps/tenant_modules/finance/services/transaction_service.py`
- `backend/app/apps/tenant_modules/finance/services/budget_service.py`
- `backend/app/apps/tenant_modules/finance/services/finance_service.py`
- `backend/app/apps/tenant_modules/finance/schemas/__init__.py`
- `backend/app/apps/tenant_modules/finance/api/router.py`
- `backend/app/apps/tenant_modules/finance/api/transactions.py`
- `backend/app/apps/tenant_modules/finance/api/budgets.py`
- `backend/app/tests/test_tenant_finance_flow.py`
- `backend/app/tests/test_finance_budget_core.py`
- `frontend/src/apps/tenant_portal/modules/finance/routes.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceTransactionsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceBudgetsPage.tsx`
- `frontend/src/apps/tenant_portal/pages/finance/TenantFinancePageLegacy.tsx`

## Endpoints

- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`
- `GET|POST|PUT /tenant/finance/budgets`
- `GET|POST|PUT|PATCH /tenant/finance/accounts`
- `GET|POST|PUT|PATCH /tenant/finance/categories`
- `GET|POST|PUT|PATCH /tenant/finance/beneficiaries`
- `GET|POST|PUT|PATCH /tenant/finance/people`
- `GET|POST|PUT|PATCH /tenant/finance/projects`
- `GET|POST|PUT|PATCH /tenant/finance/tags`
- `GET|POST|PUT|PATCH /tenant/finance/currencies`
- `GET|POST|PUT /tenant/finance/currencies/exchange-rates`
- `GET|POST|PUT|PATCH /tenant/finance/settings`
- `GET` detalle por entidad en catalogos principales
- `PATCH /reorder` donde aplica

## Permisos usados

El modulo se integra con permisos tenant finos:

- `tenant.finance.read`
- `tenant.finance.create`

Roles actuales:

- `admin`: lectura y creacion
- `manager`: lectura y creacion
- `operator`: solo lectura

## Modelo actual

La persistencia transicional del modulo queda asi:

- `finance_entries` se conserva como tabla minima legacy
- `finance_transactions` pasa a ser la tabla central real del modulo
- `finance_budgets` abre la primera capa de planificacion mensual del modulo

Campos legacy principales:

- `movement_type`
- `concept`
- `amount`
- `category`
- `created_by_user_id`
- `created_at`

Campos base del nuevo nucleo:

- `transaction_type`
- `account_id`
- `target_account_id`
- `category_id`
- `beneficiary_id`
- `person_id`
- `project_id`
- `currency_id`
- `amount`
- `amount_in_base_currency`
- `exchange_rate`
- `description`
- `notes`
- `is_reconciled`
- `source_type`
- `source_id`

Campos base de presupuestos:

- `period_month`
- `category_id`
- `amount`
- `note`
- `is_active`

## Validaciones actuales

- `movement_type` debe ser `income` o `expense`
- `amount` debe ser mayor que cero

## Estado actual de persistencia

El modulo ya tiene migracion versionada y soporte de sync para tenant DB existente.

En otras palabras:

- el patron del modulo ya esta armado
- la integracion HTTP y de servicio ya existe
- la persistencia fisica en DB se cubre por migracion tenant `0002_finance_entries`
- para tenants existentes aun debes ejecutar sync de esquema o la migracion correspondiente

## Por que este modulo queda como base

`Finance` ya no se interpreta solo como una demo funcional.

En la politica actual del proyecto, queda como:

- primer modulo real sobre la base tenant ya cerrada
- referencia para permisos, enforcement, migraciones y UI tenant
- modulo sobre el cual conviene probar el patron completo antes de abrir otros dominios

## Por que igual sirve este paso

Porque deja resuelto el esqueleto que van a seguir los modulos futuros:

- `condos`
- `iot`
- otros modulos de negocio

## Como cerrar el esquema en tenants existentes

La plataforma expone una ruta administrativa para sincronizar esquema sobre un tenant activo:

- `POST /platform/tenants/{tenant_id}/sync-schema`

Eso permite crear tablas nuevas, como `finance_entries`, sin reprovisionar el tenant completo.

## Siguiente iteracion recomendable

`Lote 6` ya quedo abierto sobre un slice operativo mas completo:

1. pantalla tenant de transacciones sobre `finance_transactions`
2. balances por cuenta y detalle operacional con auditoria reciente
3. filtros operativos por tipo, cuenta, categoria, conciliacion y texto
4. toggles rapidos de favorito y conciliacion
5. edicion completa de transacciones existentes
6. mesa de trabajo basica para conciliacion/favoritos con seleccion multiple y acciones por lote
7. primera vista real de `Presupuestos` por mes y categoria, con comparacion presupuesto vs ejecucion

Lo siguiente recomendable ahora es:

1. ampliar la conciliacion asistida con motivos estructurados, agrupacion y revision visual mas densa
2. endurecer `Presupuestos` con estados, filtros y lectura por tipo
3. seguir con prestamos, planificacion y reportes
4. evaluar lotes mas inteligentes sobre el filtro activo completo, no solo sobre seleccion manual
5. abrir exportacion o vistas derivadas cuando el trabajo operativo del slice ya quede estable

## Convencion relacionada

La regla general para modulos nuevos ya quedo escrita en:

- [Convencion modular por slice](../architecture/module-slice-convention.md)
