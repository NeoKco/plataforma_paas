# Guia Rapida de la App

Esta guia existe para entender la app sin tener que leer toda la documentacion tecnica primero.

Si el manual visual es el recorrido completo, este documento es la version corta.

## Que es esta app

El producto hoy tiene dos caras:

- `platform_admin`: consola del superadmin u operador central
- `tenant_portal`: portal de uso para un tenant especifico

La forma mas simple de pensarla es esta:

- `platform_admin` crea, observa, corrige y gobierna tenants
- `tenant_portal` usa el espacio ya provisionado de un tenant

## Donde empezar

El punto de entrada real hoy es `Platform Admin`.

Orden recomendado:

1. login de plataforma
2. dashboard
3. tenants
4. provisioning
5. billing
6. tenant portal

Referencia visual:

- [Manual visual de la app](./app-visual-manual.md)

## Que hace cada pantalla principal

### `Dashboard`

Sirve para leer el estado general.

Aqui deberias mirar:

- KPIs
- focos operativos
- alertas visibles

### `Tenants`

Es la pantalla mas importante.

Aqui deberias mirar:

- estado del tenant
- `slug`
- lifecycle
- billing
- maintenance
- policy history
- uso por modulo

Si algo no funciona en un tenant, normalmente empiezas aqui.

### `Provisioning`

Sirve para entender por que un tenant nuevo no quedo listo.

Aqui deberias mirar:

- jobs pendientes
- jobs fallidos
- alertas
- DLQ

### `Facturacion`

Sirve para revisar eventos de billing, alertas y reconcile.

Aqui deberias mirar:

- resumen global
- alertas
- workspace por tenant

### `Configuracion`

Sirve para ver con que backend esta hablando el frontend y que capacidades declara la app.

Aqui deberias mirar:

- sesion actual
- `API base URL`
- capacidades backend
- enums y alcance funcional

### `Tenant Portal`

Es el espacio del tenant ya autenticado.

Pantallas principales:

- `Resumen`
- `Usuarios`
- `Finanzas`

## Como leer el estado de un tenant

Hay tres estados practicos:

### 1. Tenant creado pero no operativo

Se ve en `Tenants`.

Normalmente significa:

- falta provisioning
- falta configuracion de DB

### 2. Tenant provisionado pero incompleto

Tambien se ve en `Tenants`.

Normalmente significa:

- la DB tenant existe
- pero falta schema o migraciones tenant

### 3. Tenant sano

Se confirma cuando:

- aparece `active`
- la politica de acceso responde bien
- `Uso por modulo` carga filas reales con estado `ok`

## Si aparece un problema, donde lo miro

- tenant no usable: `Tenants`
- tenant nuevo no quedo listo: `Provisioning`
- error de billing o reconcile: `Facturacion`
- duda sobre entorno o backend: `Configuracion`
- duda sobre usuarios o movimientos tenant: `Tenant Portal`

## Lo que ya existe y lo que falta

Ya existe:

- login platform
- dashboard
- tenants
- provisioning
- billing
- portal tenant
- usuarios tenant
- finanzas tenant

Todavia falta o sigue pendiente:

- instalador visual de primera ejecucion
- UX mas pulida del login de `tenant_portal`
- algunos refinamientos de experiencia y onboarding

## Que leer despues de esta guia

Si quieres entender mejor la app, sigue con este orden:

1. [Guia de comprension de la app](./app-functional-walkthrough.md)
2. [Manual visual de la app](./app-visual-manual.md)
3. [Roadmap de frontend](./frontend-roadmap.md)
