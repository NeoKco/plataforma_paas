# Business Core Migration Matrix

Esta matriz define como migrar el core funcional real de `ieris_app` hacia `business-core` en `platform_paas`.

No es una copia 1:1 de tablas.

La regla es:

- conservar el negocio real que ya usas
- corregir acoplamientos y mezclas del sistema fuente
- normalizar entidades compartidas antes de abrir `maintenance`, `projects` e `iot`

## Fuente vs destino operativo

Uso correcto de `ieris_app` y su BD:

- descubrir reglas reales del negocio
- preparar importadores
- validar datos migrados
- contrastar paridad durante la transicion

Uso incorrecto de `ieris_app` y su BD:

- dejar a `business-core` funcionando con consultas vivas contra la BD vieja
- usar ids antiguos como contrato publico del PaaS
- arrastrar tablas fuente como si fueran el modelo final

Decision:

- `business-core` opera sobre la BD tenant del PaaS
- la BD de `ieris_app` se usa solo como fuente de migracion y verificacion

## Fuentes auditadas

Modelos fuente:

- [clients_tables.py](/home/felipe/ieris_app/app/models/clients_tables.py)
- [empresa_tables.py](/home/felipe/ieris_app/app/models/empresa_tables.py)
- [contactos_tables.py](/home/felipe/ieris_app/app/models/contactos_tables.py)
- [perfil_funcional_tables.py](/home/felipe/ieris_app/app/models/perfil_funcional_tables.py)
- [work_groups_tables.py](/home/felipe/ieris_app/app/models/work_groups_tables.py)
- [user_groups_tables.py](/home/felipe/ieris_app/app/models/user_groups_tables.py)
- [task_types_tables.py](/home/felipe/ieris_app/app/models/task_types_tables.py)
- [instalacion_sst_tables.py](/home/felipe/ieris_app/app/models/instalacion_sst_tables.py)

Rutas fuente:

- [clientes_routes.py](/home/felipe/ieris_app/app/routes/clientes_routes.py)
- [empresas_routes.py](/home/felipe/ieris_app/app/routes/empresas_routes.py)
- [groups_routes.py](/home/felipe/ieris_app/app/routes/groups_routes.py)
- [perfil_funcional_usuarios_routes.py](/home/felipe/ieris_app/app/routes/perfil_funcional_usuarios_routes.py)
- [task_types_routes.py](/home/felipe/ieris_app/app/routes/task_types_routes.py)
- [users_routes.py](/home/felipe/ieris_app/app/routes/users_routes.py)
- [instalaciones_por_cliente_routes.py](/home/felipe/ieris_app/app/routes/instalaciones_por_cliente_routes.py)
- [mantenciones_routes.py](/home/felipe/ieris_app/app/routes/mantenciones_routes.py)

Servicios fuente:

- [mantenciones_service.py](/home/felipe/ieris_app/app/services/mantenciones_service.py)
- [instalaciones_por_cliente_service.py](/home/felipe/ieris_app/app/services/instalaciones_por_cliente_service.py)

## Resumen de criterio

Lo que existe hoy en `ieris_app`:

- `clientes` mezcla identidad de cliente, direccion y contactos en una sola tabla
- `empresa` mezcla empresa propia, proveedor y cliente institucional en una sola tabla
- `contactos` del CRM no es un core compartido; depende de `oportunidades`
- `perfil_funcional`, `work_groups`, `user_groups` y `task_types` si son base reusable
- `instalacion_sst` depende de `cliente`, `empresa` y `tipo_equipo`, pero eso debe quedar para `maintenance` y luego `assets`

El destino correcto en PaaS:

- separar organizacion, cliente, contacto y sitio
- conservar grupos, perfiles funcionales y tipos de tarea como taxonomias reutilizables
- no dejar `maintenance` como dueño de clientes, grupos o tipos de tarea

## Matriz fuente -> destino

### 1. Clientes

Fuente:

- tabla `clientes`

Destino:

- `business_clients`
- `business_sites`
- `business_contacts`

Transformacion:

- un registro de `clientes` genera un `business_client`
- la direccion principal (`calle`, `numero_casa`, `comuna`, `ciudad`, `region`, `codigo_postal`) genera un `business_site`
- `contacto_1` y `contacto_2` deben migrarse como filas separadas de `business_contacts`

Campos fuente relevantes:

- `nombre`
- `rut`
- `tipo_cliente`
- `calle`
- `numero_casa`
- `comuna`
- `ciudad`
- `region`
- `codigo_postal`
- `organizacion`
- `contacto_1`
- `fono_contacto_1`
- `mail_contacto_1`
- `contacto_2`
- `fono_contacto_2`
- `mail_contacto_2`
- `observaciones`
- `giro`
- `estado`
- `motivo_baja`

Mejora aplicada:

- la direccion deja de vivir escondida dentro del cliente
- los contactos dejan de ser columnas planas duplicadas
- `estado` pasa a `is_active` o lifecycle equivalente

Riesgo de fuente:

- `organizacion` en `clientes` es texto libre, no FK real

Decision:

- no confiar en `organizacion` como relacion estructural
- usarla como insumo para match o normalizacion posterior

### 2. Empresas

Fuente:

- tabla `empresa`

Destino:

- `business_organizations`
- eventualmente `business_contacts`

Transformacion:

- cada fila de `empresa` genera una `business_organization`
- `tipo` migra a `organization_kind`
- `nombre_contacto`, `contacto_2` y sus datos deben convertirse en contactos separados cuando existan

Campos fuente relevantes:

- `nombre`
- `rut`
- `descripcion`
- `mail`
- `nombre_contacto`
- `fono_contacto_1`
- `mail_contacto_1`
- `contacto_2`
- `fono_contacto_2`
- `mail_contacto_2`
- `es_predeterminada`
- `tipo`

Mejora aplicada:

- `organization_kind` deja de estar limitado a la semantica rígida actual
- la relacion empresa-contacto deja de depender de dos pares de columnas fijas

Decision:

- `empresa.tipo='cliente'` no reemplaza a `business_clients`
- una organizacion puede existir y luego activarse como cliente en `business_clients`

### 3. Contactos CRM

Fuente:

- tabla `contactos`

Destino:

- no migra a `business-core` como fuente principal

Motivo:

- depende de `oportunidades`
- es contacto de CRM, no contacto compartido de negocio base

Decision:

- no usar esta tabla como origen de `business_contacts`
- solo podria servir como fuente secundaria en una migracion futura de `crm`

### 4. Perfiles funcionales

Fuente:

- tabla `perfil_funcional`
- uso desde `users.secondary_role_id`

Destino:

- `business_function_profiles`

Transformacion:

- migracion casi directa de `name` y `description`

Mejora aplicada:

- en PaaS se documenta mejor que perfil funcional no es permiso de sistema
- es taxonomia operativa reusable

### 5. Grupos de trabajo

Fuente:

- `work_groups`
- `user_groups`

Destino:

- `business_work_groups`
- `business_work_group_members`

Transformacion:

- `work_groups.name` -> `business_work_groups.name`
- `work_groups.description` -> `business_work_groups.description`
- `work_groups.lider` -> `business_work_group_members.is_lead` o campo equivalente
- `user_groups` migra a membresia many-to-many

Campos fuente relevantes:

- `name`
- `description`
- `por_defecto`
- `lider`

Mejora aplicada:

- la membresia pasa a permitir perfil funcional por miembro
- el grupo deja de ser solo apoyo del Kanban y pasa a ser reusable por `maintenance` y `projects`

### 6. Tipos de tarea

Fuente:

- `task_types`

Destino:

- `business_task_types`

Transformacion:

- migracion directa de `name`
- `por_defecto` se puede conservar como metadato

Mejora aplicada:

- se recomienda agregar `code`, `description`, `color` e `icon`
- deja de ser taxonomia exclusiva del Kanban

### 7. Instalaciones

Fuente:

- `instalacion_sst`

Destino inicial:

- no entra en `business-core` fase 1

Destino posterior:

- `business_assets` o `maintenance` segun corte final

Motivo:

- hoy depende de `cliente_id`, `empresa_id` y `tipo_equipo_id`
- conviene esperar a que existan `business_clients`, `business_sites` y despues decidir el modelo final de activo o instalacion

Decision:

- no migrar `instalacion_sst` directamente a la primera fase de `business-core`
- usarla como insumo para la fase posterior de `assets` o para `maintenance`

## Reglas de transformacion recomendadas

### Regla 1

No migrar columnas de contacto duplicadas como columnas planas.

Aplicacion:

- `contacto_1`, `contacto_2`
- `nombre_contacto`, `contacto_2`

Destino:

- filas separadas en `business_contacts`

### Regla 2

No mezclar organizaciones y clientes en una sola entidad.

Aplicacion:

- `empresa`
- `clientes`

Destino:

- `business_organizations`
- `business_clients`

### Regla 3

No dejar direcciones como texto embebido dentro del cliente.

Destino:

- `business_sites`

### Regla 4

No dejar que `maintenance` sea el dueño de grupos o tipos de tarea.

Destino:

- `business_work_groups`
- `business_task_types`

## Dependencias de maintenance sobre este core

`mantenciones_service.py` hoy depende de:

- `clientes`
- `users`
- `work_groups`
- `user_groups`
- agenda

`instalaciones_por_cliente_service.py` hoy depende de:

- `clientes`
- `empresa`
- `tipo_equipo`
- `instalacion_sst`

Lectura correcta para el PaaS:

- `maintenance` debe consumir `business_clients`, `business_sites`, `business_work_groups` y `business_task_types`
- `assets` o instalaciones tecnicas deberian venir en una fase posterior, no como requisito previo para modelar el core base

## Orden recomendado de migracion

1. `empresa` -> `business_organizations`
2. `clientes` -> `business_clients`
3. direcciones de `clientes` -> `business_sites`
4. contactos embebidos en `clientes` y `empresa` -> `business_contacts`
5. `perfil_funcional` -> `business_function_profiles`
6. `work_groups` + `user_groups` -> `business_work_groups` + `business_work_group_members`
7. `task_types` -> `business_task_types`
8. despues retomar `instalacion_sst` en el diseño de `maintenance` o `assets`

## Mejoras recomendadas durante la migracion

- agregar codigos legibles a clientes, sitios y tipos de tarea
- permitir inactivacion segura en vez de borrado duro
- separar contacto administrativo, tecnico y comercial por `relationship_kind`
- soportar multiples sitios por cliente desde el inicio
- dejar `organization_kind` extensible, no solo `cliente/proveedora/propia`
- preparar `site` como base para `projects` e `iot`
