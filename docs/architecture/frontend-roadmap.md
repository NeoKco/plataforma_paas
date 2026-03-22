# Roadmap de Frontend

Este documento deja un plan especifico para construir el frontend de `platform_paas` sobre el backend ya cerrado como base.

La idea es evitar dos errores comunes:

- empezar el frontend sin un orden claro
- abrir muchas pantallas antes de estabilizar auth, layout y contratos base

## Objetivo del frontend en esta etapa

El objetivo inmediato no es construir todo el producto visual de una vez.

El objetivo es este:

- dejar una app `platform` usable sin `curl`
- consumir las capacidades reales del backend
- validar los contratos ya construidos
- preparar la base para despues abrir el portal tenant

## Principio rector

El frontend debe consumir el backend como fuente de verdad.

Eso implica:

- no hardcodear estados, modulos o claves de cuota cuando ya existen por API
- preferir `GET /platform/capabilities` para poblar catalogos, labels y agrupaciones
- mantener en frontend la logica de presentacion, no la logica central de negocio

## Etapa F1. Auth y Shell Base

Estado: `En progreso`

Objetivo:

- login platform
- persistencia de sesion
- refresh de token
- layout base
- navegacion
- manejo comun de `401`, `403` y errores API

Entregables minimos:

- pantalla de login
- store de sesion
- cliente HTTP base
- layout con sidebar o navegacion superior
- proteccion de rutas privadas

Avance actual:

- scaffold Vite + React + TypeScript creado en `frontend/`
- `platform_admin` con login inicial, sesion persistida y logout
- shell base con `SidebarNav`, `Topbar` y rutas protegidas
- cliente HTTP simple sobre `fetch`

## Etapa F2. Catalogo de Capacidades

Estado: `En progreso`

Objetivo:

- hacer el frontend `backend-driven` desde el comienzo

Entregables minimos:

- consumo de `GET /platform/capabilities`
- mapeo UI para:
  - `tenant_statuses`
  - `tenant_billing_statuses`
  - `maintenance_scopes`
  - `maintenance_access_modes`
  - `module_limit_capabilities`

Esto evita hardcodear claves como:

- `core.users.admin`
- `finance.entries.monthly.income`

Avance actual:

- dashboard inicial leyendo `GET /platform/capabilities`
- tabla base de `module_limit_capabilities`
- metric cards simples basadas en el catalogo expuesto por backend

## Etapa F3. Tenants List y Detalle

Estado: `En progreso`

Objetivo:

- hacer visible el dominio principal de operacion platform

Entregables minimos:

- listado de tenants
- detalle de tenant
- cards o secciones para:
  - status
  - billing
  - maintenance
  - access policy
  - module usage

APIs base sugeridas:

- endpoints `platform/tenants/*`
- `GET /platform/tenants/{tenant_id}/access-policy`
- `GET /platform/tenants/{tenant_id}/module-usage`

Avance actual:

- listado base de tenants ya montado en `platform_admin`
- seleccion de tenant y panel de detalle inicial
- lectura de `access-policy` y `module-usage` desde backend

## Etapa F4. Acciones Administrativas de Tenant

Estado: `En progreso`

Objetivo:

- operar el tenant desde UI

Entregables minimos:

- cambio de `status`
- cambio de `maintenance`
- cambio de `plan`
- cambio de `rate-limit`
- cambio de `module-limits`
- edicion de billing identity y billing state

Condicion importante:

- estas pantallas deben reutilizar el catalogo de capacidades del backend

Avance actual:

- `Tenants` ya permite operar `status`
- `Tenants` ya permite operar `maintenance`
- `Tenants` ya permite operar `billing`
- `Tenants` ya permite operar `plan`
- `Tenants` ya permite operar `rate-limit`
- `Tenants` ya permite operar `billing identity`
- `Tenants` ya permite operar `module-limits`
- `Tenants` ya muestra `policy history` del tenant
- `Tenants` ya permite abrir `Tenant Portal` con el tenant seleccionado precargado
- `Tenants` ya pide confirmacion previa para acciones administrativas sensibles

## Etapa F5. Provisioning y Operacion

Estado: `En progreso`

Objetivo:

- hacer visible la parte operativa que hoy vive solo en API

Entregables minimos:

- tabla de provisioning jobs
- metricas por tenant
- metricas por `job_type`
- alertas
- DLQ y acciones de requeue

Avance actual:

- `Provisioning` ya muestra el catalogo actual de jobs
- `Provisioning` ya muestra metricas por tenant
- `Provisioning` ya muestra metricas por `job_type`
- `Provisioning` ya muestra alertas activas
- `Provisioning` ya permite inspeccionar DLQ y hacer requeue individual o batch

## Etapa F6. Billing Operativo

Estado: `En progreso`

Objetivo:

- hacer operable desde UI la capa de billing ya implementada en backend

Entregables minimos:

- historial de eventos
- resumen por proveedor, tipo y `processing_result`
- alertas de billing
- reconciliacion individual y batch
- policy history del tenant

Avance actual:

- `Billing` ya muestra resumen global por proveedor, `event_type` y `processing_result`
- `Billing` ya muestra alertas activas e historial de alertas
- `Billing` ya permite seleccionar tenant y leer su historial de eventos
- `Billing` ya permite reconciliacion individual por evento persistido
- `Billing` ya permite reconciliacion batch sobre el filtro activo del tenant

## Etapa F7. Dashboard Platform

Estado: `En progreso`

Objetivo:

- dar una vista ejecutiva minima, no solo pantallas de detalle

Entregables minimos:

- KPIs base
- estado general de tenants
- alertas activas de provisioning y billing
- accesos rapidos a operaciones relevantes

Avance actual:

- `Dashboard` ya muestra KPIs base de tenants, provisioning y billing
- `Dashboard` ya destaca tenants con atencion operativa inmediata
- `Dashboard` ya muestra focos de provisioning y billing para soporte
- `Dashboard` ya incluye accesos rapidos hacia `Tenants`, `Provisioning` y `Billing`
- `Settings` ya expone sesion actual, `API base URL`, catalogo backend y alcance de la UI

Pendiente fino conocido:

- la lectura visible de `API base URL` en `Settings` debe alinearse mejor con el host efectivo cuando el frontend se consume desde otra IP del mismo host local

## Etapa F8. Portal Tenant

Estado: `En progreso`

Objetivo:

- abrir la segunda app del frontend solo cuando `platform` ya sea operable

Orden sugerido dentro del portal tenant:

1. auth tenant
2. shell tenant
3. vista de `tenant/info`
4. usuarios
5. `finance`

Avance actual:

- existe login tenant separado del `platform_admin`
- existe shell inicial para el portal tenant
- la primera pantalla ya consume `GET /tenant/info`
- la primera pantalla ya consume `GET /tenant/module-usage`
- `Users` ya tiene listado, alta basica y cambio de estado
- `Finance` ya tiene resumen, uso efectivo, listado y alta basica de movimientos

## Que frontend NO conviene abrir aun

Antes de cerrar `platform` base, no conviene:

- abrir muchos modulos visuales en paralelo
- intentar dashboards muy ricos desde el dia uno
- meter mucha logica de negocio en el cliente
- diseñar pantallas que ignoren el catalogo de capacidades ya expuesto por backend

Referencia de estabilizacion previa:

- [Baseline de UX para frontend](./frontend-ux-baseline.md)

## Criterio de cierre del frontend base

El frontend base de plataforma puede considerarse cerrado cuando:

- login y sesion funcionan de forma estable
- existe shell base usable
- tenants pueden verse y operarse desde UI
- provisioning y billing tienen vistas operativas minimas
- el cliente consume capacidades backend sin hardcodear politicas principales

## Orden recomendado

1. Auth y shell base
2. Catalogo de capacidades
3. Tenants list y detalle
4. Acciones administrativas de tenant
5. Provisioning y operacion
6. Billing operativo
7. Dashboard platform
8. Portal tenant

## Resumen ejecutivo

El frontend deberia empezar por `platform`, no por el portal tenant.

La razon es simple:

- hoy el backend ya esta mas maduro en esa mitad
- `platform` valida primero la operacion real
- despues el portal tenant puede construirse sobre una base mejor probada

## Pendientes de UX

- refinar todavia mas el login de `tenant_portal` para hacerlo menos tecnico y mas evidente para usuario final, manteniendo el acceso rapido desde `Tenants` para superadmin
