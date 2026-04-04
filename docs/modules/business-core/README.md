# Business Core

Documentacion canonica del dominio transversal de negocio para tenants.

Nombre funcional visible sugerido:

- `Core de negocio`

Objetivo:

- concentrar las entidades y catalogos compartidos por modulos operativos tenant
- evitar que `maintenance`, `projects`, `iot` o futuros modulos repliquen clientes, empresas, contactos, sitios, equipos, grupos o taxonomias base
- servir como base funcional sobre la que se montan los modulos de negocio

Estado actual:

- migracion tenant base creada
- backend CRUD implementado para `organizations` y `clients`
- backend CRUD implementado para `contacts` y `sites`
- frontend tenant operativo para `organizations`, `clients`, `contacts` y `sites`
- migracion tenant de taxonomias compartidas creada
- backend CRUD implementado para `function_profiles`, `work_groups` y `task_types`
- frontend tenant operativo para las taxonomias de ola 1B
- la vista `Resumen` ya consume datos reales y muestra solo las 2 ultimas `Empresas` creadas y los 5 ultimos `Clientes`, con datos operativos legibles del cliente en vez de una portada ciega
- la vista principal de `clients` ya se rehizo inspirada en `ieris_app`: busqueda por nombre/contacto/direccion, alta unica desde la esquina superior derecha y ficha consolidada del cliente
- la vista de `organizations` ya muestra y edita el contacto principal junto con la contraparte operativa, para no obligar a entrar al catalogo global de contactos solo para leer nombre, telefono o mail
- la ficha del cliente ya conecta con `maintenance` para ver instalaciones y abrir/agendar mantenciones con contexto precargado
- el `codigo de direccion` queda tratado como dato tecnico interno y no como campo editable de usuario
- `comuna` queda modelada como dato propio de direccion, separado de `ciudad`, para alinear la captura y la busqueda con el uso real en Chile
- la captura visible de direcciones ya no pide `Nombre dirección` y `Dirección` como dos datos duplicados: en la UX normal solo se piden `Calle` y `Número`, y el identificador interno se deriva de esa captura
- `reference_notes` se reserva para observaciones humanas, no para arrastrar ids legacy visibles
- se limpia la importacion visible desde `ieris_app` para que `legacy_*` no contamine notas operativas, catalogos y taxonomias compartidas
- la lectura y edicion normal del dominio ya oculta o sanea placeholders heredados como `Sin Mail`, `Sin Fono` o `Sin contacto`, para no confundirlos con datos reales del negocio
- la no duplicacion de `clients` se resuelve sobre la entidad base: primero no se repite la `organization`, y luego solo puede existir un `client` por `organization_id`
- `client_code` se mantiene solo como identificador tecnico interno: la UI normal del tenant no debe mostrarlo ni permitir editarlo, y el backend lo preserva o genera internamente
- el importador legacy ya no solo crea `sites`; tambien puede corregir direcciones legacy existentes cuando detecta que `comuna`, `ciudad` o `region` quedaron mal cargadas en una corrida anterior
- `business_work_group_members` ya existe como tabla y CRUD real para modelar membresias entre usuarios tenant y grupos de trabajo
- la vista de `work_groups` ya expone conteo de miembros y acceso directo a la gestion de `Miembros`
- `maintenance` ya consume `work_groups` reales para asignar grupo responsable en ordenes y visitas, en vez de depender solo de etiquetas legacy o texto libre

Pendientes visibles inmediatos:

- responsables por sitio
- assets o equipos instalados como dominio compartido
- importadores desde `ieris_app`
- integracion mas profunda con `maintenance` para filtros por grupo, snapshot historico enriquecido y agenda por responsable
- direccion propia de `organizations` como entidad/modelo de primer nivel o bloque dedicado, sin improvisarla como texto plano en el modal

Estado del importador legacy:

- ya existe el primer importador combinado desde `ieris_app`
- cubre `organizations`, `clients`, `contacts`, `sites`, `function_profiles`, `work_groups` y `task_types`
- la guia de uso principal vive en [maintenance/imports/README.md](/home/felipe/platform_paas/docs/modules/maintenance/imports/README.md) porque el mismo script tambien importa `maintenance`

Nota importante:

- esto no reemplaza `platform-core`
- `platform-core` sigue siendo el bloque central del SaaS
- `business-core` es un dominio tenant reutilizable

## Alcance inicial recomendado

Primer corte del dominio:

- empresas
- clientes
- contactos
- sitios o instalaciones por cliente
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

Primer corte tecnico sugerido:

- `organizations`
- `clients`
- `contacts`
- `sites`
- `function_profiles`
- `work_groups`
- `task_types`
- relaciones minimas entre cliente, sitio y contacto

Alcance recomendado inmediatamente despues:

- activos o equipos instalados
- responsables internos y externos por sitio
- clasificaciones tecnicas compartidas

Pendiente posterior importante:

- no abrir `iot` sobre tablas propias antes de resolver `assets`

## Modulos que dependen de este dominio

- `maintenance`
- `projects`
- `iot`
- `crm` si se abre mas adelante
- `technical-records` o `expediente tecnico` si se separa como modulo

## Relacion minima esperada entre entidades

Lectura base recomendada:

- una `organization` representa una empresa o contraparte
- un `client` representa el rol de cliente dentro del tenant
- un `contact` pertenece a una `organization` y puede quedar asociado a uno o mas `sites`
- un `site` cuelga de un `client`
- un `work_group` representa un equipo interno reusable por modulos operativos
- un `work_group_member` representa la membresia real usuario-grupo con perfil funcional, vigencia y flags operativos
- un `function_profile` representa perfiles funcionales configurables
- un `task_type` representa taxonomias de trabajo reutilizables

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/USER_GUIDE.md)
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/DEV_GUIDE.md)
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/business-core/API_REFERENCE.md)
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/business-core/CHANGELOG.md)
- [MIGRATION_MATRIX.md](/home/felipe/platform_paas/docs/modules/business-core/MIGRATION_MATRIX.md)

## Criterio de uso

Si necesitas entender que resuelve para operacion:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/USER_GUIDE.md)

Si necesitas modelarlo bien para modulos futuros:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/DEV_GUIDE.md)

Si necesitas revisar orden de ejecucion:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)

Si necesitas mapear `ieris_app` hacia el modelo nuevo:

- parte por [MIGRATION_MATRIX.md](/home/felipe/platform_paas/docs/modules/business-core/MIGRATION_MATRIX.md)
