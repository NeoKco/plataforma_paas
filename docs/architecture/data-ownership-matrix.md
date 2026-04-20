# Matriz de Ownership de Datos

Esta matriz aterriza la [Gobernanza de datos](./data-governance.md) en una vista operativa por dominio.

No reemplaza la documentación del módulo. La resume para que cualquier developer o IA pueda responder rápido:

- quién es dueño del dato
- quién puede escribirlo
- quién solo lo consume
- qué defaults o seeds lo afectan
- cuándo debe archivarse en vez de borrarse

## Regla de uso

Esta matriz debe revisarse siempre que un cambio:

- agregue una entidad nueva
- mueva ownership entre módulos
- altere defaults o seeds
- cambie una integración entre módulos
- toque export/import, portabilidad o recuperación

Si un cambio toca datos y no puede mapearse en esta matriz, el diseño todavía no está bien cerrado.

## Matriz por dominio

| Dominio | Dato / agregado principal | Dueño | Escritura permitida | Consumo permitido | Defaults / seeds relevantes | Política de baja |
| --- | --- | --- | --- | --- | --- | --- |
| `platform-core` | tenants, plans, billing state, provisioning jobs, platform users | `platform-core` | `platform-core` | todos los módulos por contrato | bootstrap de plataforma, seeds de roles y operadores centrales | archivar / desprovisionar antes de delete |
| `platform-core` | tenant DB credentials, tenant technical metadata, tenant access policy | `platform-core` | `platform-core` | tenant middleware, diagnósticos, auditoría | provisioning y rotación de credenciales | nunca borrar sin evidencia recuperable |
| `business-core` | organizations, clients, contacts, sites | `business-core` | `business-core` | `maintenance`, módulos futuros, portal tenant | seeds mínimos tenant, imports controlados, copias funcionales | desactivar / archivar antes de delete |
| `business-core` | work groups, function profiles, task types | `business-core` | `business-core` | `maintenance`, agenda, verticales futuras | defaults por tenant y backfills de catálogo | desactivar antes de delete |
| `maintenance` | installations | `maintenance` | `maintenance` | agenda, reportes, historial | imports legacy, backfills preventivos | desactivar o archivar según lifecycle |
| `maintenance` | work orders, visits, history, schedules, due items | `maintenance` | `maintenance` | agenda, reportes, `finance` por integración | defaults de task type, backfills históricos, generación automática | reabrir / anular / archivar; no delete operativo |
| `maintenance` | costing operativo y resumen de cierre | `maintenance` | `maintenance` | `finance` por sync, historial técnico | templates futuras, backfills financieros | mantener historial; no delete físico |
| `finance` | accounts, categories, currencies, finance settings | `finance` | `finance` | portal tenant, integrations | seeds financieros baseline, convergencia de defaults | desactivar antes de delete |
| `finance` | finance transactions, attachments, reconciliation state | `finance` | `finance`; otros módulos solo vía servicio/integración | reportes, dashboard, auditoría | defaults de cuenta/categoría, repair scripts | no delete físico; anular o revertir |
| `agenda` | agenda general tenant (vista agregada) | `agenda` como capa de lectura transversal | no genera escritura propia todavía | `maintenance` hoy; otros módulos a futuro | n/a, porque hoy consume fuentes existentes | n/a |

## Reglas transversales derivadas

### 1. Un módulo consumidor no redefine ownership

Ejemplos:

- `maintenance` puede mostrar clientes o sitios, pero no redefinirlos.
- `finance` puede referenciar una mantención, pero no reescribir su lifecycle operativo.

### 2. Defaults y seeds respetan ownership

Si un seed necesita crear:

- `task types`
- `work groups`
- `function profiles`

ese seed sigue siendo de `business-core`, aunque lo consuma `maintenance`.

### 3. Integraciones entre módulos escriben por servicio, no por acceso libre

Ejemplos:

- `maintenance -> finance`: solo por sync o servicio autorizado
- `platform-core -> tenant defaults`: por scripts de bootstrap o convergencia documentados

### 4. Portabilidad no reescribe ownership

Exportar/importar datos no cambia quién es dueño del dato.

Una importación debe respetar:

- ownership original
- claves naturales o estrategia de upsert
- límites entre restauración técnica y portabilidad funcional

## Checklist corto de control

Antes de cerrar un cambio de datos, responder:

- ¿está claro qué dominio es dueño del dato?
- ¿está claro quién escribe y quién solo consume?
- ¿los defaults y seeds respetan ese ownership?
- ¿la política de baja está definida?
- ¿la memoria viva y la documentación del módulo reflejan el cambio?

Si alguna respuesta es `no`, la gobernanza todavía no quedó bien cerrada.
