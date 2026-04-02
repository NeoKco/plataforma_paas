# Maintenance Migration Matrix

Esta matriz define como migrar el modulo real de mantenciones desde `ieris_app` hacia `maintenance` en `platform_paas`.

Regla principal:

- `ieris_app` y su BD son fuente de referencia y migracion
- `platform_paas` y su BD tenant son el destino operativo real
- el modulo `maintenance` del PaaS no debe depender en runtime de la BD vieja

## Fuente vs destino operativo

Uso correcto de la BD de `ieris_app`:

- auditar tablas y reglas reales
- construir scripts de importacion
- validar paridad funcional durante la transicion
- comparar historico y datos migrados

Uso incorrecto de la BD de `ieris_app`:

- consultar clientes, instalaciones o mantenciones en runtime desde el PaaS
- dejar al modulo nuevo leyendo directo la BD vieja para operar dia a dia
- mezclar ids viejos como si fueran el modelo definitivo del PaaS

Decision tomada:

- `maintenance` operara sobre la BD tenant del PaaS
- la BD de `ieris_app` se usara solo para migracion, importacion y verificacion
- el importador inicial queda en [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)
- la guia operativa del importador queda en [imports/README.md](/home/felipe/platform_paas/docs/modules/maintenance/imports/README.md)

## Fuentes auditadas

Modelos fuente:

- [maintenances_tables.py](/home/felipe/ieris_app/app/models/maintenances_tables.py)
- [instalacion_sst_tables.py](/home/felipe/ieris_app/app/models/instalacion_sst_tables.py)
- [tipo_equipo_tables.py](/home/felipe/ieris_app/app/models/tipo_equipo_tables.py)
- [clients_tables.py](/home/felipe/ieris_app/app/models/clients_tables.py)
- [empresa_tables.py](/home/felipe/ieris_app/app/models/empresa_tables.py)
- [task_types_tables.py](/home/felipe/ieris_app/app/models/task_types_tables.py)
- [work_groups_tables.py](/home/felipe/ieris_app/app/models/work_groups_tables.py)
- [user_groups_tables.py](/home/felipe/ieris_app/app/models/user_groups_tables.py)

Rutas y servicios fuente:

- [mantenciones_routes.py](/home/felipe/ieris_app/app/routes/mantenciones_routes.py)
- [historico_mantenciones_routes.py](/home/felipe/ieris_app/app/routes/historico_mantenciones_routes.py)
- [instalaciones_por_cliente_routes.py](/home/felipe/ieris_app/app/routes/instalaciones_por_cliente_routes.py)
- [tipo_equipo_routes.py](/home/felipe/ieris_app/app/routes/tipo_equipo_routes.py)
- [mantenciones_service.py](/home/felipe/ieris_app/app/services/mantenciones_service.py)
- [historico_mantenciones_service.py](/home/felipe/ieris_app/app/services/historico_mantenciones_service.py)
- [instalaciones_por_cliente_service.py](/home/felipe/ieris_app/app/services/instalaciones_por_cliente_service.py)
- [calendar_service.py](/home/felipe/ieris_app/app/services/calendar_service.py)

## Matriz fuente -> destino

### 1. Mantenciones activas

Fuente:

- tabla `mantenciones`

Destino:

- `maintenance_work_orders`
- `maintenance_visits` cuando una orden tenga agenda separada
- `maintenance_status_logs`

Transformacion:

- cada fila activa de `mantenciones` genera una orden de trabajo viva
- las fechas y programaciones se migran a la orden o a su primera visita
- el responsable actual se traduce a usuario o grupo del PaaS

Mejora aplicada:

- no se mueve la fila a una tabla historica al cerrar
- la orden mantiene lifecycle auditable dentro de la misma entidad

### 2. Historico de mantenciones

Fuente:

- tabla `historico_mantenciones`

Destino:

- no debe existir como tabla operativa obligatoria
- su informacion migra a `maintenance_work_orders` con estado cerrado
- eventos relevantes migran a `maintenance_status_logs`

Transformacion:

- ordenes cerradas o anuladas del sistema viejo se importan como work orders historicas
- el historico del modulo nuevo debe ser una vista derivada por estado y fechas

Mejora aplicada:

- se elimina el patron fuente de mover registros entre tablas para “archivar”

### 3. Instalaciones por cliente

Fuente:

- tabla `instalacion_sst`

Destino:

- `business_sites`
- `maintenance_installations` o `maintenance_assets` segun el detalle final del modulo

Transformacion:

- la ubicacion operativa base debe resolverse primero en `business_sites`
- el detalle tecnico de la instalacion queda en el modulo `maintenance`
- no toda instalacion vieja debe quedar como `site`; una parte puede ser activo instalado dentro de un sitio

Decision:

- `instalacion_sst` no migra directo 1:1 a una tabla unica
- primero se separa contexto comercial (`site`) de contexto tecnico (`installation` o `asset`)

### 4. Tipos de equipo

Fuente:

- tabla `tipo_equipo`

Destino inicial:

- `maintenance_equipment_types`

Destino posterior si se vuelve transversal:

- `asset_types` dentro de un futuro `asset-core`

Transformacion:

- migracion casi directa de nombre y descripcion
- se recomienda agregar `code`, `category`, `manufacturer_required` y `is_active`

Decision:

- en la primera fase vive dentro de `maintenance`
- si `projects` o `iot` lo empiezan a usar tambien, se extrae despues a un core reutilizable

### 5. Clientes y empresas usados por mantenciones

Fuentes:

- `clientes`
- `empresa`

Destino:

- [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md)

Transformacion:

- antes de cerrar `maintenance`, estos datos deben existir ya en:
  - `business_organizations`
  - `business_clients`
  - `business_contacts`
  - `business_sites`

Decision:

- `maintenance` no sera dueño de clientes ni empresas
- las ordenes nuevas deben apuntar a ids del `business-core`

### 6. Grupos de trabajo y tipos de tarea

Fuentes:

- `work_groups`
- `user_groups`
- `task_types`
- `perfil_funcional`

Destino:

- `business_work_groups`
- `business_work_group_members`
- `business_task_types`
- `business_function_profiles`

Decision:

- `maintenance` debe consumir estas taxonomias
- no debe volver a crear una copia local de grupos o tipos de tarea

### 7. Agenda

Fuente:

- `calendar_events` y helpers en [calendar_service.py](/home/felipe/ieris_app/app/services/calendar_service.py)

Destino:

- `maintenance_visits`
- integracion con el calendario tenant del PaaS

Transformacion:

- el modulo nuevo no debe depender de side effects acoplados como en la fuente
- primero se crea la orden o visita
- luego se sincroniza el calendario como proyeccion

## Orden correcto de migracion

1. migrar `business-core`
2. crear tablas reales de `maintenance`
3. importar tipos de equipo
4. importar work orders activas
5. importar work orders historicas
6. importar instalaciones tecnicas ligadas a `sites`
7. validar agenda y responsables

## Riesgos a evitar

- traer el historico como tabla separada obligatoria
- dejar runtime dual contra la BD de `ieris_app`
- mezclar `site` con `installation` sin separar contexto comercial y tecnico
- arrastrar ids viejos como contratos publicos del PaaS
