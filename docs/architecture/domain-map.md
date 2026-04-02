# Mapa de Dominios del PaaS

Este documento define como pensar los dominios del producto para no mezclar:

- infraestructura del SaaS
- base tecnica tenant
- dominios de negocio transversales
- verticales especificos
- modulos operativos

La idea es evitar dos errores:

- meter demasiado negocio dentro de `platform-core`
- abrir modulos que terminan siendo dueños accidentales de entidades compartidas

## Capas recomendadas

### 1. Platform Core

Dominio central del SaaS.

Incluye:

- instalador
- tenants
- lifecycle
- provisioning
- billing
- platform users
- maintenance mode
- actividad y auditoria central

No incluye:

- clientes
- residentes
- work orders
- visitas
- dispositivos de negocio

Referencia:

- [platform-core](/home/felipe/platform_paas/docs/modules/platform-core/README.md)

### 2. Tenant Technical Core

Base tecnica comun del tenant.

Incluye:

- autenticacion tenant
- users tenant
- roles base
- permisos
- contexto tenant

No es un modulo funcional para negocio. Es soporte estructural.

### 3. Business Core

Dominio transversal de negocio generico para tenants.

Incluye:

- organizaciones
- clientes
- contactos
- sitios
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

Referencia:

- [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md)

### 4. Vertical Cores

Dominios base especificos de una veta de negocio.

Ejemplo actual:

- [community-core](/home/felipe/platform_paas/docs/modules/community-core/README.md)

Sirve para:

- residentes
- unidades
- visitas
- vehiculos
- operacion residencial

### 5. Functional Modules

Modulos operativos que usan los cores anteriores.

Ejemplos:

- [finance](/home/felipe/platform_paas/docs/modules/finance/README.md)
- [maintenance](/home/felipe/platform_paas/docs/modules/maintenance/README.md)
- `projects`
- `iot`
- `visits`

## Regla para decidir donde vive una entidad

Hazte estas preguntas:

1. ¿esto pertenece al SaaS central?
   Si si, va a `platform-core`.

2. ¿esto pertenece a la base tecnica de cualquier tenant?
   Si si, va al `tenant technical core`.

3. ¿esto sera usado por varios modulos de negocio genericos?
   Si si, va a `business-core`.

4. ¿esto es propio de un vertical especifico, como condominios?
   Si si, va a un `vertical core`, por ejemplo `community-core`.

5. ¿esto es exclusivo de un flujo operativo concreto?
   Si si, deberia vivir en el modulo funcional, no en un core.

## Cores definidos hoy

### `platform-core`

Estado:

- definido e implementado

### `business-core`

Estado:

- definido documentalmente
- recomendado como siguiente slice tenant

### `community-core`

Estado:

- definido documentalmente
- pendiente hasta que la veta residencial entre a implementacion

## Core sugerido para IoT

Si `IoT` sera transversal a varios verticales, conviene abrir un core adicional:

- `asset-core`
  o
- `iot-core-lite`

Su objetivo seria centralizar:

- dispositivos
- gateways
- sensores
- activos monitoreables
- relaciones activo-sitio
- relaciones activo-unidad cuando aplique

No conviene:

- meter telemetria cruda en `business-core`
- meter dispositivos dentro de `maintenance`
- meter estructura de activos residenciales dentro de `community-core` si luego IoT tambien se usara en empresas normales

## Secuencia recomendada de expansion

Orden sugerido desde el estado actual del proyecto:

1. `business-core`
2. `maintenance`
3. `projects`
4. `community-core` cuando la veta condominio pase a implementacion
5. `asset-core` si `iot` deja de ser solo una idea puntual y se vuelve dominio reutilizable
6. `iot`

## Regla para abrir un core nuevo

Abrir un core nuevo tiene sentido solo si:

- el dominio sera reutilizable
- lo necesitaran dos o mas modulos
- no cabe bien en un core ya existente
- mezclarlo con otro core forzaria conceptos o tablas incorrectas

No abras un core nuevo si:

- es una sola pantalla
- es un catalogo exclusivo de un solo modulo
- es una necesidad puntual que no tiene reuso real

## Heuristica simple

Si una entidad parece “demasiado importante” para dejarla dentro de un modulo, probablemente debas preguntarte primero si pertenece a un core.

Si una entidad solo existe para que un modulo haga su trabajo, probablemente no necesitas un core nuevo.
