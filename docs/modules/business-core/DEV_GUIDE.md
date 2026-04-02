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

## Modelo inicial sugerido

### 1. Organizations

Tabla sugerida:

- `business_organizations`

Campos base:

- `id`
- `name`
- `legal_name`
- `tax_id`
- `organization_kind`
- `phone`
- `email`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

Observacion:

- `organization_kind` no deberia limitarse a `client` o `provider`
- conviene permitir etiquetas como `client`, `provider`, `partner`, `contractor`

### 2. Clients

Tabla sugerida:

- `business_clients`

Campos base:

- `id`
- `organization_id`
- `client_code`
- `service_status`
- `commercial_notes`
- `is_active`
- `created_at`
- `updated_at`

Observacion:

- esto permite que una `organization` exista primero y solo algunas de ellas se activen como cliente

### 3. Contacts

Tabla sugerida:

- `business_contacts`

Campos base:

- `id`
- `organization_id`
- `full_name`
- `email`
- `phone`
- `role_title`
- `is_primary`
- `is_active`
- `created_at`
- `updated_at`

### 4. Sites

Tabla sugerida:

- `business_sites`

Campos base:

- `id`
- `client_id`
- `name`
- `site_code`
- `address_line`
- `city`
- `region`
- `country_code`
- `reference_notes`
- `is_active`
- `created_at`
- `updated_at`

Observacion:

- `site` debe ser entidad de primer nivel
- no conviene esconderlo como simple direccion dentro del cliente

### 5. Contact-Site Links

Tabla sugerida:

- `business_site_contacts`

Campos base:

- `id`
- `site_id`
- `contact_id`
- `relationship_kind`
- `is_primary`

Sirve para:

- contacto tecnico del sitio
- contacto administrativo
- responsable local

### 6. Function Profiles

Tabla sugerida:

- `business_function_profiles`

Campos base:

- `id`
- `code`
- `name`
- `description`
- `is_active`

Observacion:

- no representa permisos de sistema
- representa roles funcionales como tecnico, coordinador, supervisor, vendedor

### 7. Work Groups

Tabla sugerida:

- `business_work_groups`
- `business_work_group_members`

Campos base del grupo:

- `id`
- `name`
- `description`
- `group_kind`
- `is_active`

Campos base de membresia:

- `id`
- `group_id`
- `tenant_user_id`
- `function_profile_id`
- `is_lead`

### 8. Task Types

Tabla sugerida:

- `business_task_types`

Campos base:

- `id`
- `code`
- `name`
- `description`
- `color`
- `icon`
- `is_active`

## Relaciones recomendadas

Relaciones minimas del primer corte:

- `organization` 1 -> N `contacts`
- `organization` 1 -> 0..1 `client`
- `client` 1 -> N `sites`
- `site` N <-> N `contacts` via `business_site_contacts`
- `work_group` N <-> N `tenant_users` via membresia
- `function_profile` 1 -> N `business_work_group_members`

## Reglas de modelado

Reglas recomendadas desde el inicio:

- no mezclar `organization` y `client` en una sola tabla si luego habra proveedores o partners
- no guardar todos los contactos dentro del cliente como campos planos
- no modelar `site` como simple texto dentro de otros modulos
- no usar `function_profile` como reemplazo del sistema de permisos
- no hacer que `maintenance` sea dueño de `task_types`

## Permisos sugeridos

Primer bloque de permisos:

- `tenant.business_core.read`
- `tenant.business_core.organizations.manage`
- `tenant.business_core.clients.manage`
- `tenant.business_core.contacts.manage`
- `tenant.business_core.sites.manage`
- `tenant.business_core.taxonomy.manage`

## Orden de implementacion recomendado

Fase 1A:

- `organizations`
- `clients`
- `contacts`
- `sites`

Fase 1B:

- `function_profiles`
- `work_groups`
- `task_types`

Fase 2:

- frontend tenant base para catalogos
- permisos finos
- validaciones de inactivacion segura

Fase 3:

- `assets`
- responsables de sitio
- adopcion por `maintenance`

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

## Criterio de salida del primer corte

El primer corte deberia considerarse suficiente cuando:

- exista CRUD para organizaciones, clientes, contactos y sitios
- un modulo externo pueda referenciar `client_id` y `site_id`
- existan grupos de trabajo y tipos de tarea reutilizables
- `maintenance` ya no necesite crear sus propios catalogos de cliente, sitio o grupo

## Sugerencias para futuro

Si `projects` e `iot` estan en el horizonte, conviene considerar desde ya:

- `site` como entidad de primer nivel
- `asset` o `installed_equipment` como entidad reutilizable
- `organization` con roles de relacion, no solo etiqueta de cliente/proveedor
- perfiles funcionales configurables, no hardcodeados por modulo
