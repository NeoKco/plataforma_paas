# Ciclo Basico de Tenants

Este runbook resume el bloque minimo que hoy ya puede resolverse desde `platform_admin` sin salir a scripts ni a llamadas manuales de API.

Sirve para ubicar rapidamente que parte del ciclo basico del tenant ya esta cerrada y que decision de producto sigue abierta.

## Alcance actual

Desde `Tenants` hoy ya puedes:

- crear tenant
- buscar tenants por nombre, slug o tipo
- filtrar tenants por estado, billing y tipo
- editar identidad basica del tenant
- archivar tenant como baja operativa segura
- operar estado, mantenimiento, billing, plan, limites y sincronizacion de esquema

## 1. Crear tenant

La alta visual pide:

- nombre visible
- slug
- tipo de tenant
- plan inicial opcional

Al confirmar:

- el tenant se crea en `platform_control`
- nace en `pending`
- se dispara un job `create_tenant_database`

Lectura practica:

- crear tenant no significa que ya este listo para usar
- significa que entro al catalogo central y quedo listo para provisioning

![Formulario de alta y catalogo tenant](../assets/app-visual-manual/04a-tenants-create-form-catalog.png)

## 2. Catalogo y filtros

El catalogo ya permite:

- buscar por nombre, slug o tipo
- filtrar por `status`
- filtrar por `billing_status`
- filtrar por `tenant_type`

Eso deja la vista usable para operacion diaria sin depender de una lista larga sin contexto.

Despues del alta, el tenant nuevo entra al catalogo con `status=pending` y queda listo para seguirse desde `Provisioning`.

![Tenant nuevo en estado pending](../assets/app-visual-manual/04b-tenants-created-pending-detail.png)

## 3. Editar identidad basica

La edicion basica actual permite cambiar:

- `name`
- `tenant_type`

No cambia:

- `slug`

Criterio actual:

- el `slug` se trata como identificador estable
- cambiarlo sin una politica formal puede romper portal tenant, bootstrap, credenciales esperadas y referencias operativas

![Edicion basica de identidad tenant](../assets/app-visual-manual/04c-tenants-basic-identity-edit.png)

## 4. Archivar tenant

`Archivar tenant` es hoy la baja operativa correcta.

No hace:

- borrado fisico
- eliminacion de DB tenant
- limpieza de billing history
- limpieza de policy history

Si hace:

- mover el tenant a `status=archived`
- dejarlo fuera de la operacion normal
- conservar trazabilidad y capacidad de auditoria

![Tenant archivado desde consola](../assets/app-visual-manual/04d-tenants-archived-result.png)

## 5. Que no conviene hacer todavia

No conviene exponer `delete` duro por ahora.

Motivo:

- un tenant no es solo una fila
- arrastra DB tenant
- jobs de provisioning
- billing history
- policy history
- contexto de auditoria

Mientras no exista una politica formal de baja dura, `archive` debe seguir siendo la salida segura.

## 6. Estado actual del bloque basico

Este bloque ya queda practicamente cerrado a nivel de consola:

- alta
- catalogo
- filtros
- identidad basica
- archivo operativo
- operacion diaria

Lo que sigue abierto aqui ya no es una falta de UI base, sino una decision de producto:

- confirmar formalmente que el `slug` queda estable
- mantener fuera `delete` fisico hasta definir politica de baja dura

## 7. Validacion recomendada

Cuando cambies este bloque, la validacion corta recomendada es:

1. crear tenant
2. confirmar que aparece en catalogo
3. confirmar que se genero provisioning
4. editar `name` o `tenant_type`
5. archivar tenant
6. revisar politica de acceso y efecto operativo

## 8. Documentacion relacionada

- [Guia unica para entender la app](../architecture/app-understanding-guide.md)
- [Roadmap de frontend](../architecture/frontend-roadmap.md)
- [Roadmap de desarrollo](../architecture/development-roadmap.md)
- [Prueba guiada de provisioning](./provisioning-guided-test.md)
