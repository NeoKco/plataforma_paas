# Actividad de Plataforma

Este documento deja el alcance actual del bloque `Actividad` dentro de `platform_admin`.

La idea es dar una vista corta y util de auditoria de accesos recientes sin depender de revisar logs crudos o recordar que paso en cada prueba.

## 1. Alcance actual

Desde `platform_admin` ya se puede:

- listar eventos recientes de autenticacion
- listar cambios administrativos recientes sobre tenants
- listar acciones criticas recientes de operadores de plataforma
- leer una seccion `Que revisar ahora` con senales operativas breves
- filtrar por `scope`
- filtrar por resultado
- buscar por email, tenant, detalle o tipo de evento
- filtrar cambios tenant por `event_type`
- filtrar cambios tenant por `actor_email`
- ajustar el limite de filas visibles

La vista trabaja sobre `auth_audit_events` en `platform_control`.

## 2. Que problema resuelve

Antes de este bloque, la trazabilidad de accesos existia en backend, pero no habia una vista operativa simple para responder preguntas basicas como estas:

- quien intento entrar
- si el login fue correcto o fallido
- si hubo accesos denegados
- si el evento fue de `platform` o de `tenant`
- sobre que tenant ocurrio el acceso

Con este bloque ya no hace falta partir por logs para responder esas preguntas.

Ahora tambien ayuda a responder:

- quien cambio billing, estado, mantenimiento, plan o limites de un tenant
- sobre que tenant se hizo ese cambio
- que campos fueron tocados recientemente
- quien creo, actualizo, activo, desactivo, reseteo contraseña o elimino un usuario de plataforma
- quien creo, reprovisiono, restauro o elimino un tenant

## 3. Politica vigente

La politica actual queda asi:

- `superadmin` puede ver `Actividad`
- `admin` puede ver `Actividad`
- `support` no ve `Actividad` en el menu y tampoco debe entrar por URL directa

Lectura recomendada por rol:

- `superadmin`: auditoria global y seguimiento operativo
- `admin`: lectura de accesos recientes para soporte y operacion
- `support`: fuera de alcance por ahora, para no exponer mas superficie sensible de la necesaria

## 4. Que muestra hoy

La pantalla entrega:

- resumen corto de eventos visibles
- ingresos correctos
- ingresos fallidos
- accesos denegados
- cantidad de eventos `tenant`
- cantidad de cambios administrativos tenant
- panel `Que revisar ahora`
- tabla de actividad reciente
- tabla de cambios administrativos recientes

Cada fila muestra:

- fecha y hora
- `scope`
- tipo de evento
- resultado
- email
- tenant relacionado si aplica
- detalle resumido

En la practica, la tabla principal ya mezcla:

- autenticacion
- mutaciones criticas de `Usuarios de plataforma`
- acciones duras del ciclo tenant que no siempre aparecen en el historial de politica

## 5. Endpoints actuales

Backend actual:

- `GET /platform/auth-audit/`
- `GET /platform/tenants/policy-history/recent`

Eventos visibles relevantes hoy:

- `platform.login`
- `platform.refresh`
- `platform.logout`
- `platform.root_recovery`
- `platform.user.create`
- `platform.user.update`
- `platform.user.status`
- `platform.user.password_reset`
- `platform.user.delete`
- `platform.tenant.create`
- `platform.tenant.reprovision`
- `platform.tenant_db_credentials_rotated`
- `platform.tenant.restore`
- `platform.tenant.delete`

Filtros soportados hoy:

- `limit`
- `subject_scope`
- `outcome`
- `search`
- `event_type` para cambios tenant
- `actor_email` para cambios tenant

## 6. Validacion funcional corta

La validacion minima recomendada del bloque es esta:

1. entrar como `superadmin` o `admin`
2. abrir `Actividad`
3. confirmar que la tabla carga eventos recientes
4. filtrar por `platform`
5. filtrar por `tenant`
6. filtrar por `correctos`, `fallidos` o `denegados`
7. buscar por un correo o slug tenant conocido
8. confirmar que un usuario `support` no ve el item en el menu y no queda navegando a este bloque
9. confirmar que tambien aparecen cambios administrativos recientes sobre tenants
10. filtrar cambios tenant por tipo de evento como `billing`, `restore` o `delete`
11. filtrar cambios tenant por correo del actor

## 7. Cobertura automatizada actual

La suite backend recomendada para congelar este bloque es:

- `app.tests.test_platform_flow`

Casos ya cubiertos:

- normalizacion de filtros del servicio de auditoria
- clamp seguro de `limit`
- respuesta base de la ruta `GET /platform/auth-audit/`
- acceso correcto a la ruta con rol `admin`

## 8. Pendientes deliberados

Este bloque aun no abre:

- exportacion CSV
- filtros por rango de fechas
- detalle extendido por evento
- correlacion mas rica entre autenticacion, usuarios de plataforma y cambios tenant dentro de una sola linea temporal

Eso queda para una auditoria operativa mas rica. Por ahora el objetivo es dejar una consola basica, visible y util.
