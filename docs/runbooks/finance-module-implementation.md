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
- `Lote 1` pendiente

En esta fase quedaron listos:

- estructura backend del modulo bajo `backend/app/apps/tenant_modules/finance/`
- estructura frontend del modulo bajo `frontend/src/apps/tenant_portal/modules/finance/`
- router agregador del slice
- placeholders de vistas futuras sin romper la vista actual de movimientos
- documentacion tecnica y funcional inicial del modulo

## Archivos principales

- `backend/app/apps/tenant_modules/finance/models/entry.py`
- `backend/app/apps/tenant_modules/finance/repositories/entry_repository.py`
- `backend/app/apps/tenant_modules/finance/services/transaction_service.py`
- `backend/app/apps/tenant_modules/finance/services/finance_service.py`
- `backend/app/apps/tenant_modules/finance/schemas/__init__.py`
- `backend/app/apps/tenant_modules/finance/api/router.py`
- `backend/app/apps/tenant_modules/finance/api/transactions.py`
- `backend/app/tests/test_tenant_finance_flow.py`
- `frontend/src/apps/tenant_portal/modules/finance/routes.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceTransactionsPage.tsx`
- `frontend/src/apps/tenant_portal/pages/finance/TenantFinancePageLegacy.tsx`

## Endpoints

- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`

## Permisos usados

El modulo se integra con permisos tenant finos:

- `tenant.finance.read`
- `tenant.finance.create`

Roles actuales:

- `admin`: lectura y creacion
- `manager`: lectura y creacion
- `operator`: solo lectura

## Modelo actual

La tabla pensada para este modulo es `finance_entries`, con campos:

- `movement_type`
- `concept`
- `amount`
- `category`
- `created_by_user_id`
- `created_at`

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

La siguiente iteracion sobre `finance` ya debe entrar en `Lote 1` y `Lote 2`:

1. migraciones base del modulo
2. catalogos estructurales
3. cuentas
4. evolucion de transacciones mas alla del `finance_entries` inicial

## Convencion relacionada

La regla general para modulos nuevos ya quedo escrita en:

- [Convencion modular por slice](../architecture/module-slice-convention.md)
