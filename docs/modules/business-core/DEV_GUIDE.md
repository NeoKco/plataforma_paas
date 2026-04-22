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
- `social_community_groups`

Direccion propia de organizaciones:

- `business_organizations.address_line`
- `business_organizations.commune`
- `business_organizations.city`
- `business_organizations.region`
- `business_organizations.country_code`

Estado de este segundo bloque:

- `business_asset_types`: implementado
- `business_assets`: implementado
- adopción visible por `maintenance`: ya existe foco contextual por `siteId` + `source=maintenance` + búsqueda `q` en la vista tenant de `assets`
- adopción visible fuera de `maintenance`: la ficha del cliente ya puede cargar `assets` del tenant, agruparlos por `site_id` y dejar CTA contextual a `Activos sitio`
- `BusinessCoreOverviewPage` ya puede cargar también `sites` y `assets` para mostrar señal rápida de inventario reusable sin abrir backend nuevo ni salir del dominio
- `BusinessCoreClientsPage` ya puede reutilizar `assets` para mostrar señal rápida de inventario por cliente, siempre derivando el resumen desde `client -> sites -> assets`
- `BusinessCoreOrganizationsPage` ya puede cargar también `clients` del tenant para sintetizar lectura operacional por organización sin endpoint nuevo:
  - dirección propia lista o faltante
  - contacto principal listo
  - cantidad de clientes ligados a esa organización
- `BusinessCoreClientsPage` ya puede derivar lectura operacional del grupo social común desde `business_clients.social_community_group_id`:
  - cantidad de clientes ya homologados
  - grupos visibles de tamaño > 1
  - pendientes por homologar
  - columna operativa por fila con nombre común y tamaño de grupo
- `BusinessCoreClientsPage` ya no debe asumir unificación de fichas para la homologación operativa de organizaciones:
  - la lectura principal de cartera queda limpia
  - la acción manual vive en `BusinessCoreCommonOrganizationNamePage`
  - `Nombre social común final` es obligatorio
  - el flujo crea o reutiliza `social_community_groups`
  - el flujo solo actualiza `business_clients.social_community_group_id`
  - no reasigna `sites`, `maintenance work_orders` ni `contacts`
  - no elige ficha destino
  - no borra ni desactiva clientes/organizaciones
  - no se persisten aliases visibles ni nombres anteriores como dato funcional del negocio
  - la pantalla detecta candidatos por similitud real de organización y deja la decisión final al operador

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
- `name` sigue siendo el nombre visible de la empresa / contraparte base
- `legal_name` queda como razón social o nombre legal de esa contraparte base
- la UX de `organizations` deberia incluir lectura y edicion del `contacto principal` sin obligar al usuario a ir al catálogo global de `contacts`
- la direccion propia de `organizations` no debe improvisarse como nota o texto libre: requiere una ola de modelo posterior para resolver bien empresa/proveedor con direccion editable y visible

### 2. Clients

Tabla sugerida:

- `business_clients`

Campos base:

- `id`
- `organization_id`
- `social_community_group_id`
- `client_code`
- `service_status`
- `commercial_notes`
- `is_active`
- `created_at`
- `updated_at`

Observacion:

- esto permite que una `organization` exista primero y solo algunas de ellas se activen como cliente
- también permite que varios `clients` distintos compartan un mismo `social_community_group` sin mezclar empresa base con organización social común
- `client_code` puede seguir existiendo en el modelo y en integraciones, pero no debe formar parte de la captura normal del usuario
- la capa de servicio debe preservarlo o generarlo internamente; no debe aceptar mutaciones manuales desde la operacion diaria

### 2.5. Social Community Groups

Tabla sugerida:

- `social_community_groups`

Campos base:

- `id`
- `name`
- `commune`
- `sector`
- `zone`
- `territorial_classification`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

Observacion:

- esta tabla resuelve el concepto de organización social común que no corresponde mezclar con `business_organizations`
- su consumo visible principal hoy vive en `BusinessCoreCommonOrganizationNamePage` y en lecturas operativas de `Clients` / `MaintenanceReports`
- la migración tenant `v0039_social_community_groups` ya crea la tabla, agrega `business_clients.social_community_group_id` y backfillea grupos desde `organization.legal_name` cuando existían homologaciones legacy

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
- ese patrón ya admite también una franja operativa previa a la tabla cuando el slice necesita contexto transversal; el primer uso real es `assets` abierto desde `maintenance`
- `BusinessCoreOverviewPage` ya puede usar directamente `organizations` y `clients` para mostrar ultimas altas visibles del dominio; no hace falta crear primero un endpoint nuevo mientras la lectura siga siendo ligera y acotada
- ese mismo overview ya puede extenderse con `sites` + `assets` cuando el objetivo sea mostrar señal rápida de inventario reusable y no un catálogo completo
- en esa portada, la lectura debe ser acotada y util: 2 `organizations` visibles y 5 `clients`, usando la `organization` asociada para exponer nombre, `tax_id`, contacto base y estado de servicio del cliente.
- `BusinessCoreClientDetailPage` ya puede reutilizar `getTenantBusinessAssets(...)` para enriquecer la ficha del cliente con lectura por dirección/sitio, siempre que siga agrupando por `site_id` y no abra todavía una relación dura `installation.asset_id`
- `BusinessCoreClientsPage` puede apoyarse en la misma idea para resumir inventario por cliente, pero sin perder la regla de derivarlo desde `sites` y no desde una FK nueva de cliente a activo
- `sort_order` puede seguir existiendo en el modelo para ordenamiento tecnico, pero la UI normal del tenant no deberia exponerlo mientras no haya una necesidad operativa concreta.
- `code` en `business_function_profiles`, `business_work_groups` y `business_task_types` debe tratarse como identificador tecnico interno. La UI normal no debe mostrarlo ni permitir editarlo; el backend puede autogenerarlo desde `name`.
- cualquier marcador `legacy_*` proveniente de importacion debe limpiarse antes de guardar o mostrarse. La descripcion funcional solo debe contener texto humano escrito por el equipo.
- placeholders heredados como `Sin Mail`, `Sin Fono` o `Sin contacto` tampoco deben persistir como datos visibles del negocio; el importador debe sanearlos o descartarlos.
- cuando no sea posible limpiar un marcador legacy en DB porque hoy participa en deduplicacion o reimportacion, al menos debe ocultarse en la lectura/edicion del frontend hasta migrar esa trazabilidad a un canal interno.
- la eliminacion de `clients` no debe entenderse como limpieza en cascada de negocio; si el cliente ya tiene mantenciones registradas, el backend debe bloquear el borrado y exigir desactivacion.
- en la alta de `clients`, la proteccion anti-duplicado debe vivir antes del primer `POST`, porque el flujo actual crea `organization`, `client`, `contacts` y `site` en varias llamadas. La UX debe interceptar coincidencias fuertes y redirigir a la ficha existente para agregar contactos en vez de abrir otra cartera paralela.
- cuando esa proteccion preventiva no alcanzo y la base ya quedo contaminada, el dominio debe ofrecer una auditoria operativa de duplicados: el corte actual puede resolverlo en frontend agrupando `organizations`, `clients`, `contacts`, `sites` e `installations` por claves normalizadas exactas, calculando dependencias con `work_orders`, sugiriendo una ficha a conservar y habilitando `DELETE`, desactivacion segura o consolidacion operativa segun el nivel de historial.
- en `assets`, sigue vigente una restricción deliberada:
  - no existe aún una FK ni contrato explícito `maintenance_installation.asset_id`
  - la adopción actual trabaja por contexto de `site`, tipo visible y búsqueda técnica
  - si en el futuro se endurece esa relación, debe definirse como slice contractual nuevo y no como extensión implícita del filtro actual

Slice frontend actual de duplicados:

- ruta tenant: `/tenant-portal/business-core/duplicates`
- entrada visible: `Core de negocio -> Duplicados`
- acceso directo adicional desde `BusinessCoreOverviewPage`

Heuristicas actuales de agrupacion:

- `organizations`: por `tax_id` normalizado, y luego por `name + (email|phone)`
- `clients`: por `tax_id` normalizado, y luego por `name + primary address`
- `contacts`: por `organization_id + full_name + (email|phone)` normalizados
- `sites`: por `client_id + visible address` normalizada
- `installations`: por `site_id + serial_number`, y fallback por identidad tecnica visible

Heuristica actual para `sugerida para conservar`:

- prioriza mayor trazabilidad operativa
- prioriza mayor completitud visible
- prioriza registro mas antiguo cuando el score empata

Resumen previo por grupo:

- el slice ya calcula y muestra antes de consolidar cuantas fichas origen, direcciones, instalaciones u `OT` seran movidas
- para `organizations`, el corte ya puede asimilar guiadamente varios `clients` del mismo grupo: elige una ficha sugerida, mueve `sites` y `work_orders`, reasigna la ficha final a la organización objetivo, integra campos documentales visibles y luego consolida `contacts`
- adicionalmente, `organizations` ya expone una capa frontend de decisión manual por campo antes del `PUT` final reutilizando contratos existentes
- esa misma capa ahora calcula y renderiza un diff explícito `current -> final` por campo antes de ejecutar la consolidación
- tras consolidar `organizations`, el frontend registra además una auditoría persistente del merge con el diff final, los ids origen y el resumen operativo en `business_core_merge_audits`
- para `contacts`, el resumen previo indica cuantas fichas origen se desactivaran, cuantos primarios conviene revisar y cuantos campos visibles se integraran antes de consolidar
- ese resumen vive en frontend usando los datasets cargados del modulo y evita disparar un backend nuevo en este corte
- el mismo slice ahora también consume `GET /tenant/business-core/merge-audits` para renderizar historial reciente visible dentro de `Duplicados`
- además de `organizations`, el frontend ya registra eventos de auditoría para consolidaciones de `clients`, `contacts`, `sites` e `installations`
- el renderer visible del historial ya soporta payloads mixtos:
  - lee `summary` cuando el audit solo trae resumen operativo
  - lee también `diff_rows` y `selections` cuando el merge dejó evidencia documental por campo
  - hoy esa capa enriquecida aplica sobre todo a `organizations` y `contacts` sin exigir backend nuevo
- `clients` ya suma una primera capa documental propia sin backend nuevo:
  - el merge guiado puede ajustar `service_status` y `commercial_notes`
  - el audit persistente de `clients` ya puede guardar `selections` y `diff_rows`
- `sites` ya suma también una primera capa documental propia sin backend nuevo:
  - el merge guiado puede ajustar `address_line`, `commune`, `city`, `region`, `country_code` y `reference_notes`
  - el audit persistente de `sites` ya puede guardar `selections` y `diff_rows`
- `installations` ya suma también una primera capa documental propia sin backend nuevo:
  - el merge guiado puede ajustar `name`, `serial_number`, `manufacturer`, `model`, `installed_at`, `last_service_at`, `warranty_until`, `location_note` y `technical_notes`
  - el audit persistente de `installations` ya puede guardar `selections` y `diff_rows`
- `organizations` ya alinea además la primera ola visible de dirección con el patrón de `sites`:
  - la captura usa `street` + `streetNumber` y deriva `address_line` al enviar
  - la tabla expone salida operativa a `Google Maps` cuando existe dirección cargada
- restricción vigente:
  - `organizations`, `clients`, `contacts`, `sites` y ahora también `installations` ya pueden dejar evidencia documental por campo
  - `installations` ya cubre también fechas técnicas y garantía, pero aún no entra en merge profundo de relaciones externas, estados derivados o contratos posteriores

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

- `maintenance` asigna el `grupo` responsable a la orden y usa su líder como referencia operativa; no depende de un responsable separado por sitio
- `projects` puede reutilizar la misma membresia para cuadrillas o equipos
- `iot` podria reutilizarla para cuadrillas o soporte

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

Reglas de consolidacion operativa vigentes:

- si el duplicado no tiene dependencias visibles, puede borrarse
- si el duplicado ya tiene historial, debe priorizarse `desactivacion` sobre borrado
- la consolidacion actual debe mover primero referencias operativas y solo despues desactivar el origen
- la ficha `sugerida para conservar` debe priorizar mayor trazabilidad, mayor completitud visible y antiguedad
- no debe intentarse aun merge profundo de `contacts` sin un flujo dedicado y auditable
- `organizations` ya cuentan con un flujo de merge auditable con ledger persistente de decisión; el siguiente paso de profundidad debe ampliar esa idea al resto de las entidades
- `contacts` ya dio el primer paso en esa dirección:
  - existe ajuste manual previo por campo visible
  - existe diff final por campo antes de consolidar
  - el ledger persistente de `merge_audits` ya guarda `selections` y `diff_rows` para este caso
  - sigue faltando identidad completa, notas libres y relaciones externas profundas

Secuencia de consolidacion actual:

- consolidacion de `clients`: reasigna `contacts`, `sites` y `work_orders`, luego desactiva `clients` origen
- consolidacion de `sites`: reasigna `installations` y `work_orders`, luego desactiva `sites` origen
- consolidacion de `installations`: reasigna `work_orders`, luego desactiva `installations` origen

Detalle actual del merge de `clients`:

- los `contacts` de organizaciones origen se comparan contra la organización destino por identidad normalizada
- si el contacto no existe en destino, se mueve a la organización sugerida
- si ya existe un equivalente, el contacto origen se desactiva para no duplicar lectura operativa
- las `organizations` origen no se fusionan en este corte

Limites tecnicos vigentes:

- no se reasignan aun `contacts` ni relaciones de identidad externa
- no se fusionan notas ni snapshots historicos libres
- el corte actual privilegia seguridad operativa y trazabilidad antes que merge profundo

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
- ese importador ya sanea tambien notas/descripciones visibles del dominio antes de persistirlas, sin tocar los marcadores internos que usa para idempotencia

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

Regla vigente del corte actual:

- el importador puede seguir escribiendo marcadores internos en campos tecnicos cuando son la clave de reimportacion/idempotencia
- pero cualquier texto visible del negocio que llegue desde `ieris_app` debe pasar por saneamiento de `legacy_*` y placeholders antes de guardarse

Pendiente aun en business-core:

- `business_work_group_members`
- `business_site_contacts`
- mapeo de usuarios legacy hacia usuarios tenant reales
- `business_work_group_members` se posterga para una ola posterior, evitando sobrediseño antes de conectar `maintenance`

Fase 2:

- frontend tenant base para catalogos
- permisos finos
- validaciones de inactivacion segura

Fase 3:

- responsabilidad operativa por grupo y lider
- adopcion por `maintenance`

Fase 4:

- `assets` y `asset_types`
- adopcion de `assets` por `maintenance` e `iot`

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
- grupo responsable y lider
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
- `asset_type` como taxonomia compartida de equipos instalados
- `organization` con roles de relacion, no solo etiqueta de cliente/proveedor
- `organization` con direccion propia separada de `site`
- perfiles funcionales configurables, no hardcodeados por modulo
## Estado de implementacion
- El primer slice backend ya existe en el PaaS para `organizations`, `clients`, `contacts` y `sites`.
- El primer slice frontend tenant ya existe en el PaaS para `organizations`, `clients`, `contacts` y `sites`.
- El slice backend y frontend de `assets` y `asset_types` ya existe en el PaaS.
- Las rutas activas del primer corte son:
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/organizations`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/clients`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/contacts`
  - `GET/POST/GET by id/PUT/PATCH status/DELETE /tenant/business-core/sites`
- El siguiente corte ya no es catalogo base, sino taxonomias compartidas: `function_profiles`, `work_groups` y `task_types`.
- El siguiente paso de negocio es adopción de `assets` por `maintenance` e integración de lectura por `iot`.
