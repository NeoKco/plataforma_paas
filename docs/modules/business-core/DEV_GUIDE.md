# Business Core Dev Guide

`business-core` se propone como dominio tenant transversal para negocio.

No debe mezclarse con:

- `platform-core`
- el `core` tecnico actual de autenticacion, usuarios tenant y permisos

La separacion correcta seria:

- `platform-core`
  instalador, tenants, lifecycle, provisioning, billing, platform users
- `tenant technical core`
  auth tenant, users, roles base, permisos, contexto
- `business-core`
  entidades compartidas por modulos de negocio
- modulos funcionales
  `finance`, `maintenance`, `projects`, `iot`

## Entidades recomendadas

Primer bloque:

- `business_organizations`
- `business_clients`
- `business_contacts`
- `business_sites`
- `business_function_profiles`
- `business_work_groups`
- `business_task_types`

Segundo bloque recomendado:

- `business_assets`
- `business_asset_types`
- `business_site_responsibles`

## Contratos esperados

`maintenance` deberia depender de este dominio para:

- cliente
- sitio
- grupo tecnico
- tipo de tarea
- activo o equipo instalado

`projects` deberia depender de este dominio para:

- cliente
- empresa
- sitio
- responsables
- perfiles funcionales

`iot` deberia depender de este dominio para:

- sitio
- activo instalado
- responsable
- clasificacion del equipo

## Decision de arquitectura

No conviene abrir `maintenance` como modulo pleno de produccion antes de tener al menos el primer bloque de `business-core`.

Si se hace antes, ocurren dos problemas:

- `maintenance` captura entidades que luego deberian ser compartidas
- `projects` e `iot` terminan naciendo con tablas duplicadas o acoplamientos forzados

## Fronteras recomendadas

`business-core` no deberia contener:

- work orders
- agenda de mantenciones
- cronologia de visitas
- telemetria
- presupuestos o ingresos/egresos

Esas piezas pertenecen a modulos funcionales.

## Secuencia recomendada

1. abrir `business-core`
2. modelar clientes, empresas, contactos, sitios y taxonomias base
3. conectar `maintenance` a esas entidades
4. despues abrir `projects`
5. dejar `iot` apoyado sobre sitios y activos instalados, no sobre clientes crudos

## Sugerencias para futuro

Si `projects` e `iot` estan en el horizonte, conviene considerar desde ya:

- `site` como entidad de primer nivel
- `asset` o `installed_equipment` como entidad reutilizable
- `organization` con roles de relacion, no solo etiqueta de cliente/proveedor
- perfiles funcionales configurables, no hardcodeados por modulo
