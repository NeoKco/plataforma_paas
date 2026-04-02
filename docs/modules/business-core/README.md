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

Pendientes visibles inmediatos:

- membresias de `work_groups` (`business_work_group_members`)
- responsables por sitio
- assets o equipos instalados como dominio compartido
- importadores desde `ieris_app`
- integracion real con `maintenance`

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
