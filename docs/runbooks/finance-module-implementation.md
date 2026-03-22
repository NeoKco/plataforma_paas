# Implementacion Modulo Finance

Este documento describe el primer modulo tenant funcional agregado sobre la base multi-tenant actual.

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

## Archivos principales

- `backend/app/apps/tenant_modules/finance/models/entry.py`
- `backend/app/apps/tenant_modules/finance/repositories/entry_repository.py`
- `backend/app/apps/tenant_modules/finance/services/finance_service.py`
- `backend/app/apps/tenant_modules/finance/schemas.py`
- `backend/app/apps/tenant_modules/finance/api/routes.py`
- `backend/app/tests/test_tenant_finance_flow.py`

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

La siguiente iteracion sobre `finance` ya deberia ser:

1. migracion versionada real
2. seed inicial opcional
3. operaciones mas ricas de negocio
