# Business Core

Documentacion canonica del dominio transversal de negocio para tenants.

Nombre funcional visible sugerido:

- `Core de negocio`

Objetivo:

- concentrar las entidades y catalogos compartidos por modulos operativos tenant
- evitar que `maintenance`, `projects`, `iot` o futuros modulos repliquen clientes, empresas, contactos, sitios, equipos, grupos o taxonomias base
- servir como base funcional sobre la que se montan los modulos de negocio

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

Alcance recomendado inmediatamente despues:

- activos o equipos instalados
- responsables internos y externos por sitio
- clasificaciones tecnicas compartidas

## Modulos que dependen de este dominio

- `maintenance`
- `projects`
- `iot`
- `crm` si se abre mas adelante
- `technical-records` o `expediente tecnico` si se separa como modulo

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/USER_GUIDE.md)
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/DEV_GUIDE.md)
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/business-core/API_REFERENCE.md)
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/business-core/CHANGELOG.md)

## Criterio de uso

Si necesitas entender que resuelve para operacion:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/USER_GUIDE.md)

Si necesitas modelarlo bien para modulos futuros:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/business-core/DEV_GUIDE.md)

Si necesitas revisar orden de ejecucion:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/business-core/ROADMAP.md)
