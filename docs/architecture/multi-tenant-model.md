# Modelo Multi-Tenant

Este documento describe el modelo multi-tenant actual de `platform_paas` segun la implementacion existente en backend.

## Objetivo

La plataforma esta pensada para operar multiples tenants dentro de una misma aplicacion, pero aislando sus datos operativos en bases de datos independientes.

La idea central hoy es:

- una base de datos de control para la plataforma
- una base de datos por cada tenant activo

## Capas del Modelo

### 1. Capa de control central

La base `platform_control` concentra el estado global del sistema. Aqui viven, entre otros:

- usuarios administrativos de la plataforma
- registro de tenants
- estado de instalacion
- jobs de provisionamiento

Esta base no guarda la operacion diaria del tenant, sino su metadata y ciclo de vida.

### 2. Capa de datos por tenant

Cada tenant provisionado recibe:

- una base de datos propia
- un usuario tecnico propio de PostgreSQL
- tablas base del dominio tenant
- datos iniciales minimos para operar

Esto permite que el backend conecte a la base correcta segun el tenant autenticado.

## Ciclo de Vida de un Tenant

El ciclo implementado hoy sigue este patron:

1. se crea un tenant en `platform_control`
2. el tenant queda en estado `pending`
3. se genera un `provisioning_job`
4. al ejecutar el job, se crea la base y el usuario tecnico del tenant
5. se bootstrappea el esquema inicial
6. se insertan datos base
7. el tenant pasa a estado `active`

Si algo falla durante ese proceso:

- el job queda en `failed`
- el tenant pasa a estado `error`

## Datos que Identifican a un Tenant

Hoy el tenant se identifica principalmente por:

- `id`
- `name`
- `slug`
- `tenant_type`
- `status`

Y tecnicamente por su configuracion de conexion:

- `db_name`
- `db_user`
- `db_host`
- `db_port`

El `slug` es especialmente importante porque participa en:

- login tenant
- resolucion del tenant activo
- construccion del nombre de base de datos
- claims del JWT tenant

## Provisionamiento Tecnico

Cuando un tenant se provisiona, el backend genera:

- `db_name`: derivado del `slug`
- `db_user`: derivado del `slug`
- `db_password`: generado al momento del job

Luego:

- crea el rol PostgreSQL si no existe
- crea la base si no existe
- conecta a la base nueva
- aplica migraciones tenant y crea el esquema base

## Bootstrap de la Base Tenant

El bootstrap actual del tenant crea al menos:

- informacion base del tenant
- roles iniciales
- un usuario admin inicial

Roles base sembrados:

- `admin`
- `manager`
- `operator`

Usuario inicial:

- email: `admin@<tenant_slug>.local`
- password inicial de desarrollo

## Modulos Tenant

La estructura del backend sugiere que cada tenant puede extender sus capacidades por modulos. Hoy existen estas familias:

- `core`
- `condos`
- `finance`
- `iot`

Ademas existe:

- `shared`: enums, mixins y validadores compartidos
- `_templates`: plantillas para crear nuevos modulos

El modelo apunta a que todos los tenants compartan una base comun y luego agreguen capacidades por dominio.

## Aislamiento de Datos

El aislamiento actual es principalmente fisico a nivel de base de datos:

- cada tenant tiene su propia DB
- cada tenant usa su propio usuario PostgreSQL
- la plataforma central no mezcla registros operativos de tenants en una sola tabla compartida

Esto reduce el acoplamiento entre tenants y simplifica ciertas tareas de mantenimiento, backup y separacion de contextos.

## Resolucion de Conexion Tenant

Para autenticar o trabajar con un tenant, el backend:

1. consulta el tenant en `platform_control`
2. valida que este `active`
3. toma su metadata de conexion
4. crea una session factory para esa base

En el estado actual hay una limitacion relevante:

- la password tecnica de la DB tenant todavia no vive en un secret manager real
- hoy se resuelve por env var dinamica por tenant, con compatibilidad temporal hacia nombres antiguos

Eso muestra que el modelo funcional existe, pero el manejo de secretos aun esta en etapa inicial.

## Ventajas del Enfoque Actual

- separacion clara entre control global y operacion tenant
- posibilidad de provisionar tenants de forma independiente
- mejor aislamiento de datos
- base preparada para crecimiento por modulos

## Limitaciones Actuales

- manejo de secretos tenant todavia temporal respecto de un secret manager externo pleno
- el ciclo multi-tenant todavia puede endurecer mas sus pruebas y automatizacion operativa
- no existe aun una capa visible mas rica de automatizacion para backup, restore o rotacion de credenciales fuera del bloque actual

## Resumen

El modelo multi-tenant de `platform_paas` ya esta definido conceptualmente y parcialmente implementado:

- control centralizado en `platform_control`
- aislamiento operativo por base de datos tenant
- ciclo de provisionamiento real
- estructura modular para crecer por dominio

Lo pendiente no es el concepto, sino endurecer su operacion: secretos, migraciones, automatizacion y pruebas.
