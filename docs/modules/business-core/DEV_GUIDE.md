# Business Core Dev Guide

`business-core` se propone como dominio tenant transversal para negocio.

Referencias transversales obligatorias:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

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
- la UX de `organizations` deberia incluir lectura y edicion del `contacto principal` sin obligar al usuario a ir al catálogo global de `contacts`
- la direccion propia de `organizations` no debe improvisarse como nota o texto libre: requiere una ola de modelo posterior para resolver bien empresa/proveedor con direccion editable y visible

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
- `client_code` puede seguir existiendo en el modelo y en integraciones, pero no debe formar parte de la captura normal del usuario
- la capa de servicio debe preservarlo o generarlo internamente; no debe aceptar mutaciones manuales desde la operacion diaria

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
- `commune`
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
- en el storage puede seguir existiendo `name`, pero en la UX normal no debe pedirse como campo separado cuando solo duplica la direccion visible
- `site_code` se mantiene como identificador tecnico interno para integraciones/importadores
- la UI normal del tenant no deberia exponer `site_code` como campo editable
- la captura visible debe pedir `street`/`street_number` o `Calle`/`Número`, y desde ahi derivar `address_line` y el `name` tecnico cuando sea necesario
- `reference_notes` es un campo visible al usuario y no debe usarse para guardar metadatos legacy como `legacy_client_id`
- `commune` debe vivir en `business_sites`, no comprimirse dentro de `city`, porque en Chile es una clave de busqueda y lectura operativa distinta.
- la UX de ficha debe privilegiar lectura primero y edicion bajo demanda: formularios abiertos solo en modal o accion explicita, no desplegados por defecto
- los modales de captura del dominio deberian seguir una plantilla comun: `ancho` para altas principales y `compacto` para ediciones puntuales, con bloques claros y formularios densos pero legibles
- en `clients`, la captura inicial deberia soportar `contacto principal` y `contacto secundario`; contactos adicionales quedan para gestion posterior en la ficha del cliente
- `BusinessCoreCatalogPage` deberia comportarse con el mismo patron: tabla visible por defecto y formulario solo bajo demanda en modal
- `BusinessCoreOverviewPage` ya puede usar directamente `organizations` y `clients` para mostrar ultimas altas visibles del dominio; no hace falta crear primero un endpoint nuevo mientras la lectura siga siendo ligera y acotada
- en esa portada, la lectura debe ser acotada y util: 2 `organizations` visibles y 5 `clients`, usando la `organization` asociada para exponer nombre, `tax_id`, contacto base y estado de servicio del cliente.
- `sort_order` puede seguir existiendo en el modelo para ordenamiento tecnico, pero la UI normal del tenant no deberia exponerlo mientras no haya una necesidad operativa concreta.
- `code` en `business_function_profiles`, `business_work_groups` y `business_task_types` debe tratarse como identificador tecnico interno. La UI normal no debe mostrarlo ni permitir editarlo; el backend puede autogenerarlo desde `name`.
- cualquier marcador `legacy_*` proveniente de importacion debe limpiarse antes de guardar o mostrarse. La descripcion funcional solo debe contener texto humano escrito por el equipo.
- placeholders heredados como `Sin Mail`, `Sin Fono` o `Sin contacto` tampoco deben persistir como datos visibles del negocio; el importador debe sanearlos o descartarlos.
- cuando no sea posible limpiar un marcador legacy en DB porque hoy participa en deduplicacion o reimportacion, al menos debe ocultarse en la lectura/edicion del frontend hasta migrar esa trazabilidad a un canal interno.
- la eliminacion de `clients` no debe entenderse como limpieza en cascada de negocio; si el cliente ya tiene mantenciones registradas, el backend debe bloquear el borrado y exigir desactivacion.
- en la alta de `clients`, la proteccion anti-duplicado debe vivir antes del primer `POST`, porque el flujo actual crea `organization`, `client`, `contacts` y `site` en varias llamadas. La UX debe interceptar coincidencias fuertes y redirigir a la ficha existente para agregar contactos en vez de abrir otra cartera paralela.
- cuando esa proteccion preventiva no alcanzo y la base ya quedo contaminada, el dominio debe ofrecer una auditoria operativa de duplicados: el primer corte puede resolverlo en frontend agrupando `clients`, `sites` e `installations` por claves normalizadas exactas y calculando dependencias con `work_orders` antes de habilitar `DELETE`.

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
- `is_primary`
- `is_active`
- `starts_at`
- `ends_at`
- `notes`

Estado actual:

- `business_work_group_members` ya esta implementada en migracion tenant
- ya existe CRUD tenant para listar, crear, editar y eliminar membresias
- `work_groups` ya expone `member_count` para lectura rapida en catalogo
- la UX del dominio ya permite entrar a `Miembros` desde cada grupo y mantener ahi perfil funcional, liderazgo, vigencia y pertenencia principal

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

Uso recomendado por modulos:

- `maintenance` ya puede asignar `grupo` a la orden y `usuario` a la visita cuando ya exista responsable concreto
- `projects` puede reutilizar la misma membresia para cuadrillas o equipos
- `iot` podria reutilizarla para responsables de terreno o soporte

## Reglas de modelado

Reglas recomendadas desde el inicio:

- no mezclar `organization` y `client` en una sola tabla si luego habra proveedores o partners
- no guardar todos los contactos dentro del cliente como campos planos
- no modelar `site` como simple texto dentro de otros modulos
- no usar `function_profile` como reemplazo del sistema de permisos
- no hacer que `maintenance` sea dueño de `task_types`

Reglas anti-duplicados recomendadas:

- `organizations`: por `name` normalizado y `tax_id` normalizado
- `clients`: un solo registro por `organization_id`
- `contacts`: no repetir `full_name`, `email` o `phone` dentro de la misma organizacion
- `sites`: no repetir nombre ni combinacion de direccion dentro del mismo cliente

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

Estado real:

- `1A` ya operativo en backend/frontend
- `1B` ya operativo en backend/frontend para catalogos base
- la lectura principal del usuario ya no debe apoyarse en catalogos planos de `contacts` o `sites`
- el patron recomendado pasa a ser: tabla de clientes -> ficha del cliente -> salto contextual a `maintenance`
- ya existe un importador inicial desde `ieris_app` hacia `business-core` y `maintenance`

## Importacion legacy

Script actual:

- [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)

Cobertura actual:

- `business_organizations`
- `business_clients`
- `business_contacts`
- `business_sites`
- `business_function_profiles`
- `business_work_groups`
- `business_task_types`

Pendiente aun en business-core:

- `business_work_group_members`
- `business_site_contacts`
- `business_site_responsibles`
- `assets`
- mapeo de usuarios legacy hacia usuarios tenant reales
- `business_work_group_members` se posterga para una ola posterior, evitando sobrediseño antes de conectar `maintenance`

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
## Estado de implementacion
- El primer slice backend ya existe en el PaaS para `organizations`, `clients`, `contacts` y `sites`.
- El primer slice frontend tenant ya existe en el PaaS para `organizations`, `clients`, `contacts` y `sites`.
- Las rutas activas del primer corte son:
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/organizations`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/clients`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/contacts`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/sites`
- El siguiente corte ya no es catalogo base, sino taxonomias compartidas: `function_profiles`, `work_groups` y `task_types`.
