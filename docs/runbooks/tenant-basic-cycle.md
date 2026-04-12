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
- desprovisionar tenant archivado mediante un job tecnico explicito
- eliminar tenant de forma definitiva solo en modo seguro y acotado
- abrir el portal tenant solo cuando el tenant ya esta realmente listo
- operar estado, mantenimiento, billing, plan, limites y sincronizacion de esquema
- rotar credenciales tecnicas de DB tenant de forma controlada
- reiniciar la contraseña de usuarios del portal tenant desde plataforma
- revisar si el esquema tenant esta al dia sin entrar a SQL manual
- abrir la vista lateral `Histórico tenants` para consultar retirados sin mezclarlos con el catálogo vivo
- inspeccionar ahi el detalle funcional del snapshot de retiro: policy efectiva, límites, billing reciente, policy history reciente y jobs técnicos recientes
- abrir y cerrar ese detalle historico bajo demanda desde `Ver detalle` y `Ocultar detalle`, sin dejarlo expandido por defecto
- validar el ciclo tambien contra PostgreSQL real cuando cambian passwords tecnicas o builders de conexion

Auditoria visible actual:

- alta de tenant
- restore de tenant archivado
- borrado seguro de tenant archivado
- reprovisionado de tenant inconsistente
- solicitud de desprovisionado tecnico de tenant archivado
- consulta del archivo historico de tenants retirados desde la vista `Histórico tenants`

Las mutaciones finas de estado, billing, mantenimiento, limites y plan siguen quedando visibles ademas en el historial de politica del tenant.

Tambien queda visible como evento tecnico:

- rotacion de credenciales DB tenant
- la plataforma ya usa builders seguros de URL PostgreSQL para que passwords con `@`, `:` o `/` no rompan provisioning, rotacion tecnica ni readiness tenant
- si el modelo tenant crece con nuevas columnas en `platform_control`, el backend ya aplica migraciones de control al arrancar para evitar que `Tenants` falle por esquema desalineado

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
- el detalle del tenant ya muestra un bloque `Provisioning` con el ultimo job visible para ese tenant
- el mismo detalle ya deja ver si el esquema tenant esta al dia o si quedaron migraciones pendientes
- desde ese bloque ya puede abrirse la pantalla global de `Provisioning` o ejecutar/reintentar el job segun su estado
- si un tenant quedo con historial `completed` pero sigue sin DB tenant configurada, el bloque ahora tambien expone `Reprovisionar tenant`
- si la credencial tecnica tenant ya no coincide con PostgreSQL, el portal tenant y el uso por modulo deben degradar a aviso operativo en vez de caer con error crudo
- el acceso rapido a `tenant_portal` ya debe reservarse para tenants `active` con provisioning completado

![Formulario de alta y catalogo tenant](../assets/app-visual-manual/04a-tenants-create-form-catalog.png)

## 2. Catalogo y filtros

El catalogo ya permite:

- buscar por nombre, slug o tipo
- filtrar por `status`
- filtrar por `billing_status`
- filtrar por `tenant_type`

Eso deja la vista usable para operacion diaria sin depender de una lista larga sin contexto.

Despues del alta, el tenant nuevo entra al catalogo con `status=pending` y queda listo para seguirse desde `Provisioning`.

Lectura practica importante:

- `crear tenant` = alta en catalogo central
- `provisionar tenant` = materializar DB tenant, rol tecnico, esquema y bootstrap
- esas dos cosas son parte del mismo ciclo, pero no son la misma accion
- si la DB tenant no quedo materializada aunque exista un job historico `completed`, el camino correcto ya no es forzar el portal: es lanzar `Reprovisionar tenant`

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

No hace:

- eliminar la base tenant
- eliminar el rol tecnico PostgreSQL
- limpiar secretos tecnicos

Esa parte ahora se resuelve con una accion separada y explicita: `Desprovisionar tenant`.

![Tenant archivado desde consola](../assets/app-visual-manual/04d-tenants-archived-result.png)

## 4b. Restaurar tenant archivado

La restauracion ya existe como flujo formal y no como mutacion improvisada del lifecycle.

La accion pide:

- estado destino
- motivo de restauracion

Estados destino permitidos:

- `pending`
- `active`
- `suspended`

Lectura practica:

- `pending`: reabre el tenant pero lo deja fuera de uso normal mientras se revisa o reprovisiona
- `active`: reabre el tenant para operacion normal
- `suspended`: lo saca de `archived`, pero lo deja aun restringido por decision operativa

La restauracion:

- no cambia `slug`
- no borra historial
- no elimina billing history ni policy history
- deja trazabilidad con evento propio de `restore`

## 5. Politica operativa vigente

Para no seguir mezclando recomendaciones con decisiones, la politica vigente del producto queda asi:

### `slug`

- el `slug` se trata como identificador estable
- no se expone su edicion en UI
- cualquier cambio futuro de `slug` requeriria una politica formal de migracion y compatibilidad

Motivo:

- el `slug` participa en rutas, credenciales bootstrap, referencias operativas, acceso al portal tenant y lectura humana del catalogo

### `archive`

- `archive` es la baja operativa correcta en esta etapa
- un tenant archivado sale de la operacion normal sin perder historia ni trazabilidad
- la consola debe seguir priorizando esta salida por sobre cualquier borrado duro
- `archive` no desprovisiona infraestructura tecnica en segundo plano
- si el tenant ya no debe conservar DB ni credenciales tecnicas, el paso correcto siguiente es `Desprovisionar tenant`

### `desprovision`

- `desprovision` ya existe como accion explicita solo para tenants `archived`
- no corre directamente dentro de la request HTTP
- la consola crea un job `deprovision_tenant_database`
- ese job lo procesa el worker de provisioning o puede ejecutarse manualmente desde la ficha del tenant
- al completarse:
  - elimina la base tenant si existe
  - elimina el rol tecnico tenant si existe
  - limpia `TENANT_DB_PASSWORD__<SLUG>` y secretos bootstrap relacionados
  - limpia `db_name`, `db_user`, `db_host`, `db_port`

## Operaciones complementarias

### Re-sembrar defaults core/finance

Si un tenant ya provisionado quedó sin perfiles funcionales, tipos de tarea o categorías por defecto, usa el script de backfill:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/seed_tenant_defaults.py --tenant-slug <slug> --modules core,finance
```

Esto vuelve a sembrar:

- perfiles funcionales (`tecnico`, `lider`, `administrativo`, `vendedor`, `supervisor`, `otro`)
- tipos de tarea (`mantencion`, `instalacion`, `tareas generales`, `ventas`, `administracion`)
- categorías `finance` empresa + casa
- moneda base `CLP`

El seed es idempotente y respeta uso real de finanzas: no borra transacciones ni presupuestos existentes.

### Backfill masivo de defaults faltantes

Para revisar todos los tenants activos y sembrar solo los que no tengan defaults:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/seed_missing_tenant_defaults.py --apply
```

Notas:

- por defecto no toca tenants `archived`
- si existen categorías en un tenant sin uso financiero, el script no borra nada (usa `--force-finance` para forzar el seed)

### Reparar familias en categorías finance

Si un tenant tiene categorías sin familia (parent):

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/repair_finance_category_families.py --tenant-slug <slug> --apply
```

Esto crea familias base (`Ingresos`, `Egresos`, `Transferencias`) y asigna parent a las categorías sin familia.

### Limpieza de residuos E2E en finanzas

Si se ejecutaron smokes contra un tenant real y quedaron categorías o movimientos `e2e-*`, usa:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/cleanup_tenant_e2e_finance_data.py --tenant-slug <slug> --apply
```

El script elimina datos efímeros (transacciones, presupuestos, préstamos, categorías, cuentas y settings) que comiencen con `e2e-` o `debug-`.
  - limpia tracking tecnico como schema version y timestamp de rotacion
- desprovisionar no elimina la fila del tenant en `platform_control`
- desprovisionar tampoco equivale a restaurar ni a borrar
- despues de desprovisionar, la consola ya no intenta leer usuarios del portal tenant desde una DB inexistente
- por eso el bloque de usuarios/reset del portal debe ocultarse cuando `db_configured=false`

### `delete`

- ya existe un borrado seguro y muy acotado
- solo aplica a tenants `archived`
- exige que no exista configuracion DB tenant materializada
- antes del borrado guarda un archivo historico minimo en `platform_control.tenant_retirement_archives`
- ese archivo conserva snapshot de identidad, estado final, estado billing, cantidades de eventos y actor del borrado
- ademas conserva un snapshot funcional resumido con:
  - policy efectiva al retiro
  - limites efectivos
  - billing reciente
  - policy history reciente
  - jobs tecnicos recientes
- despues de archivar ese resumen, elimina la fila viva del tenant y su historial operativo asociado
- despues de desprovisionar ya no bloquea solo por tener jobs tecnicos historicos de provisioning
- esta pensado para altas descartadas, tenants de prueba o casos que no deben conservarse despues de retirar su infraestructura tecnica, incluso si tuvieron billing history

### restauracion

- ya existe una accion formal de `restore` para tenants archivados
- la restauracion pide:
  - estado destino (`pending`, `active` o `suspended`)
  - motivo de restauracion
- no cambia `slug`
- no elimina historial
- no equivale a editar el lifecycle archivado de forma improvisada
- el acceso rapido al portal tenant no debe presentarse como accion util para tenants `pending`, `archived` o con provisioning incompleto
- si el tenant esta `active` pero `db_configured=false`, la consola debe seguir ocultando `Abrir portal tenant` y ofrecer `Reprovisionar tenant`
- si el tenant queda bloqueado por lifecycle o billing, `Tenants` y `tenant_portal` deben mostrar una explicacion operativa clara en vez de dejar el detalle crudo del backend
- si la DB tenant existe pero el esquema queda atrasado, `Tenants` ya deja visible version actual, ultima version disponible, cantidad de migraciones pendientes y ultima sincronizacion
- si la DB tenant ya existe, `Tenants` tambien deja rotar la credencial tecnica de la base tenant sin afectar usuarios del portal
- si la credencial tecnica tenant queda desalineada:
  - el login tenant debe devolver un error operativo controlado
  - `Uso por modulo` debe indicar que primero debes rotar o reprovisionar la credencial tecnica de la base tenant
  - ese camino ya no debe caer con `500` crudo por `password authentication failed`
  - si la rotacion devuelve `role not found` o `database not found`, el siguiente camino correcto es `Reprovisionar tenant`
  - la credencial tecnica rotada queda guardada en `/home/felipe/platform_paas/.env` bajo `TENANT_DB_PASSWORD__<SLUG>`
  - esa credencial tecnica no corresponde a la contraseña del usuario del portal tenant
  - si un usuario del portal tenant pierde su clave, `Platform Admin > Tenants` ya deja reiniciarla por email sin tocar la credencial tecnica DB

## 6. Que no conviene hacer todavia

No conviene abrir un `delete` duro para tenants provisionados o con historia real.

Motivo:

- un tenant no es solo una fila
- puede arrastrar DB tenant
- jobs de provisioning
- billing history
- policy history
- contexto de auditoria

Por eso el borrado actual sigue siendo deliberadamente estrecho, `archive` se mantiene como salida principal y la auditoria minima del retiro queda resumida en `tenant_retirement_archives` en vez de exigir conservar la DB tenant completa.

## 7. Flujo correcto de retiro

Cuando un tenant ya no debe seguir existiendo pero aun conserva infraestructura tecnica, el flujo correcto ahora es:

1. `Archivar tenant`
2. `Desprovisionar tenant`
3. esperar o ejecutar el job `deprovision_tenant_database`
4. verificar que `db_configured=false`
5. usar `Eliminar tenant` si el caso realmente requiere borrado definitivo
6. el borrado guarda un snapshot minimo en `tenant_retirement_archives` antes de remover el tenant vivo del catalogo

Lectura operativa:

- `Archivar` = retiro reversible de negocio
- `Desprovisionar` = retiro tecnico de infraestructura
- `Eliminar` = borrado definitivo del registro cuando ya no queda infraestructura tenant materializada

## 7b. Archivo historico en UI

La barra lateral de `platform_admin` ya muestra una entrada propia: `Histórico tenants`.

Comportamiento actual esperado:

- lista solo tenants ya retirados del catalogo vivo
- permite filtrar por nombre, slug, actor o billing
- `Ver detalle` abre el snapshot del retirado seleccionado
- `Ocultar detalle` colapsa el panel y deja la lista visible sin detalle expandido
- el detalle no debe autoabrirse al cargar la pantalla
- `Tenants` ya no mezcla esta auditoria con la operacion diaria; desde ahi solo queda un acceso corto para abrir la vista historica

El detalle historico actual muestra:

- identidad resumida del tenant retirado
- fecha y actor del borrado
- billing final
- policy efectiva al retiro
- limites efectivos al retiro
- tablas resumidas de billing reciente, policy history reciente y jobs tecnicos recientes

## 8. Recuperar un tenant nuevo o desalineado hasta dejarlo operativo

Esta es la secuencia que debes seguir cuando un tenant:

- acaba de crearse
- quedo `pending`, `retry_pending` o `failed`
- quedo `active` pero sin DB tenant materializada
- quedo `active` pero con esquema atrasado
- todavia no muestra `Abrir portal tenant`

Objetivo final:

- `status=active`
- `db_configured=true`
- `sync_tenant_schema` completado
- acciones visibles: `Archivar tenant` y `Abrir portal tenant`

### Secuencia recomendada

1. entrar a `Platform Admin > Tenants`
2. seleccionar el tenant afectado
3. revisar en el panel derecho el bloque `Provisioning`
4. si el tenant sigue `pending` o `retry_pending`, abrir `Provisioning` y ejecutar o reencolar el job que corresponda
5. si el job historico quedo `completed` pero la DB sigue incompleta, usar `Reprovisionar tenant`
6. si la DB existe pero el esquema esta atrasado, ejecutar `sync_tenant_schema` desde `Provisioning` o lanzar `schema auto-sync`
7. volver a `Tenants` y verificar que:
   - `status = active`
   - `db_configured = true`
   - la version de esquema ya aparece como al dia
   - no exista bloqueo operativo visible
8. confirmar que ahora aparecen las acciones:
   - `Archivar tenant`
   - `Abrir portal tenant`

### Regla de lectura operativa

- `pending` o `retry_pending` significa que primero falta completar provisioning
- `active` pero `db_configured=false` significa que el tenant ya existe en catalogo, pero todavia no puede abrir portal tenant
- `active` + `db_configured=true` + schema al dia significa que el portal tenant ya debe quedar disponible
- si un `sync_tenant_schema` falla por configuracion DB incompleta, el camino correcto no es insistir sobre el mismo job historico: es `Reprovisionar tenant`

### Atajo practico

Si solo quieres saber si ya esta listo para operar, usa esta regla simple:

- si ves `Abrir portal tenant`, ya puedes entrar al portal
- si solo ves `Archivar tenant`, el tenant ya esta vivo pero aun no necesariamente listo para usar
- si no ves `Abrir portal tenant`, revisa primero provisioning y esquema antes de tocar otras cosas

## 9. Estado actual del bloque basico

Este bloque ya queda practicamente cerrado a nivel de consola:

- alta
- catalogo
- filtros
- identidad basica
- archivo operativo
- delete seguro y acotado
- operacion diaria

Lo que sigue abierto aqui ya no es una falta de UI base, sino una decision de producto:

- definir recien despues, y solo si se vuelve necesario, una politica de baja dura para tenants provisionados o con historia real
- evaluar mas adelante un flujo distinto de `reprovisionado profundo` para tenants que ya tienen DB materializada y requieren recomposicion mas invasiva

Backlog corto de endurecimiento ya identificado:

- ya existe una prueba de lifecycle integrada que cubre:
  - crear
  - provisionar
  - login tenant
  - archivar
  - restaurar
  - desprovisionar
  - eliminar
  - verificar aparicion en `Histórico tenants`
- permisos finos de la vista `Histórico tenants` ya congelados para mantenerla acotada a `superadmin`
- agregar despues un stack E2E browser para desarrollo local que recorra este mismo ciclo desde UI real
- evaluar filtros mas ricos o exportacion basica del historico
- recapturar el manual visual cuando la UX de `Tenants`, `Provisioning` y `Histórico tenants` deje de moverse

## 8. Validacion recomendada

Cuando cambies este bloque, la validacion corta recomendada es:

1. crear tenant
2. confirmar que aparece en catalogo
3. confirmar que se genero provisioning
4. editar `name` o `tenant_type`
5. archivar tenant
6. confirmar que sale de la operacion normal con `status=archived`
7. probar `delete` solo si el tenant sigue archivado y nunca llego a quedar materializado
8. restaurar tenant con un estado destino explicito cuando corresponda
9. revisar politica de acceso y efecto operativo
10. si la DB tenant ya existe, verificar que la accion `Rotar credenciales tecnicas` siga visible y deje trazabilidad

## 8b. Validacion funcional corta en UI

Si quieres validar rapidamente el flujo nuevo sin abrir una prueba larga, usa esta secuencia:

### Caso sugerido

1. entrar a `Tenants`
2. crear un tenant nuevo con:
   - nombre visible
   - slug claro
   - tipo de tenant
   - plan opcional
3. confirmar que aparece en el catalogo y nace en `pending`
4. editar `name` o `tenant_type`
5. confirmar que el `slug` no cambia
6. archivar tenant
7. confirmar que:
   - el tenant queda en `archived`
   - la politica de acceso deja de permitir operacion normal
8. usar el bloque `Restauracion`
9. elegir un estado destino explicito:
   - `pending`
   - `active`
   - o `suspended`
10. confirmar que:
   - el tenant sale de `archived`
   - el nuevo estado queda visible en catalogo y detalle
   - el motivo de restauracion queda trazable

### Resultado esperado

El flujo se considera sano si:

- el alta no requiere salir de `Tenants`
- la identidad basica cambia sin tocar el `slug`
- `archive` funciona como baja operativa
- `restore` no reaparece como cambio informal de lifecycle
- el tenant vuelve con el estado destino elegido
- el archivo historico deja abrir y cerrar el detalle del retiro sin quedar expandido por defecto

### Cuando repetir esta validacion

Conviene repetir esta secuencia si cambias:

- formularios de `Tenants`
- reglas de lifecycle
- labels de estados
- politica de acceso derivada del lifecycle
- feedback de acciones administrativas

## 9. Cobertura automatizada actual

Este bloque ya no depende solo de prueba manual.

Hoy la suite `platform` ya cubre al menos:

- alta de tenant
- edicion basica
- validacion de campos obligatorios
- cambio de estado
- restauracion de tenant archivado
- rechazo de restore sobre tenants no archivados

Suite recomendada:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_flow
```

## 10. Documentacion relacionada

- [Guia unica para entender la app](../architecture/app-understanding-guide.md)
- [Roadmap de frontend](../architecture/frontend-roadmap.md)
- [Roadmap de desarrollo](../architecture/development-roadmap.md)
- [Prueba guiada de provisioning](./provisioning-guided-test.md)
