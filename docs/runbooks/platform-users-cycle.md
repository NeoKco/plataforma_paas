# Ciclo Basico de Usuarios de Plataforma

Este documento deja el alcance actual del bloque `Usuarios de plataforma` dentro de `platform_admin`.

La idea es cerrar el gobierno basico de quienes pueden entrar a la consola central sin depender de scripts sueltos ni de seed manual.

## 1. Alcance actual

Desde `platform_admin` ya se puede:

- listar usuarios de plataforma
- crear un usuario de plataforma
- editar nombre visible y rol
- activar o desactivar acceso
- reemplazar la contraseña inicial por una nueva clave controlada
- eliminar usuarios no criticos de plataforma

Todo esto se hace sobre `platform_users` en `platform_control`.

Todas estas mutaciones ya dejan rastro visible en `Actividad`.

## 2. Que problema resuelve

Hasta ahora la plataforma podia autenticarse contra `platform_users`, pero no existia una forma visible de gobernar esos operadores desde la UI.

Eso dejaba un hueco basico:

- el operador principal existia
- el login funcionaba
- pero la consola no podia administrar a sus propios operadores

Con este bloque ya queda cubierta esa parte basica.

## 3. Politica vigente

La politica actual queda asi:

- roles visibles: `superadmin`, `admin`, `support`
- `superadmin` es la cuenta raiz unica
- esa cuenta raiz inicial nace en `/install`
- `admin` gobierna usuarios operativos sin tocar la cuenta raiz
- `support` queda como perfil operativo y hoy entra a este bloque en modo principalmente de lectura
- la plataforma debe operar con un solo `superadmin` activo

Eso implica:

- no se crea ni se asigna `superadmin` desde este flujo normal
- no puede crearse otro `superadmin` activo si ya existe uno
- no puede promoverse un usuario `support` o `admin` a `superadmin` desde este flujo
- no puede reactivarse un `superadmin` inactivo si ya existe otro activo
- no puede desactivarse el ultimo `superadmin` activo
- no puede cambiarse el ultimo `superadmin` activo a otro rol
- no puede borrarse un usuario `superadmin`
- no puede borrarse la propia cuenta desde la consola

Referencia complementaria:

- [Ciclo de vida de la cuenta raiz](./platform-root-account-lifecycle.md)

Politica de gestion por rol:

- `superadmin` puede crear `admin` y `support`
- `superadmin` puede editar, activar, desactivar y resetear contraseñas de `admin` y `support`
- `superadmin` tambien puede degradar o desactivar `superadmin` heredados extra si sigue quedando uno activo
- `admin` puede crear usuarios `support`
- `admin` puede editar, activar, desactivar, resetear contraseña y borrar usuarios `support`
- `admin` no puede tocar cuentas `superadmin`
- `admin` tampoco puede crear mas `admin`
- `admin` hoy tambien puede entrar al bloque `Actividad`
- `support` hoy queda fuera de `Actividad` y de los bloques exclusivos de `superadmin`

## 4. Flujos cubiertos

### Alta

Campos actuales:

- nombre completo
- correo
- rol
- contraseña inicial
- estado inicial

Al dar de alta:

- el email se normaliza a minusculas
- la contraseña se guarda hasheada
- el usuario queda disponible para login segun su estado

### Edicion basica

Hoy se puede editar:

- nombre completo
- rol

No se esta exponiendo cambio de email por ahora.

### Estado operativo

Hoy se puede:

- activar acceso
- desactivar acceso

Con la proteccion ya mencionada sobre el ultimo `superadmin` activo.

### Reset de contraseña

Hoy se puede:

- reemplazar la contraseña del usuario por una nueva clave

Esto no depende de recordar la contraseña anterior.

### Borrado seguro

Hoy se puede:

- borrar usuarios `support`
- borrar usuarios `admin` cuando la accion la ejecuta `superadmin`

Hoy no se puede:

- borrar cuentas `superadmin`
- borrar la propia cuenta desde la UI
- usar `admin` para borrar cuentas `admin` o `superadmin`

Auditoria visible actual de este bloque:

- alta de usuario de plataforma
- cambio de identidad o rol
- activacion o desactivacion de acceso
- reset de contraseña inicial
- borrado de usuario no critico

## 5. Endpoints actuales

Backend actual:

- `GET /platform/users/`
- `POST /platform/users/`
- `PATCH /platform/users/{user_id}`
- `PATCH /platform/users/{user_id}/status`
- `POST /platform/users/{user_id}/reset-password`
- `DELETE /platform/users/{user_id}`

## 6. Validacion funcional corta

La validacion minima recomendada del bloque es esta:

1. entrar a `Usuarios de plataforma`
2. crear un usuario `admin` o `support` desde `superadmin`
3. confirmar que aparece en el catalogo
4. entrar con un `admin` y verificar que puede crear un `support`
5. verificar que un `admin` no puede crear otro `admin`
6. editar nombre o rol segun el alcance del actor y verificar persistencia
7. desactivar y reactivar un `support`
8. actualizar su contraseña
9. borrar un `support`
10. intentar desactivar o degradar al ultimo `superadmin` activo y confirmar que el backend lo bloquea
11. intentar crear o promover otro `superadmin` activo y confirmar que el backend lo bloquea
12. intentar borrar un `superadmin` y confirmar que el backend lo bloquea

## 7. Cobertura automatizada actual

La suite backend recomendada para congelar este bloque es:

- `app.tests.test_platform_flow`

Casos ya cubiertos:

- alta de usuario de plataforma
- rechazo por email duplicado
- rechazo al intentar crear un segundo `superadmin` activo
- rechazo al intentar promover un usuario no `superadmin` a `superadmin` desde este flujo
- rechazo al intentar reactivar un `superadmin` inactivo cuando ya existe otro activo
- bloqueo al intentar desactivar el ultimo `superadmin` activo
- bloqueo al intentar cambiar el rol del ultimo `superadmin` activo
- alta de `admin` desde `superadmin`
- alta de `support` desde `admin`
- bloqueo de `admin` al intentar crear otro `admin`
- bloqueo al intentar borrar un `superadmin`
- bloqueo al intentar borrar la propia cuenta
- borrado permitido de `support` por `admin`
- respuestas base de las rutas de listado, alta, edicion, cambio de estado, reset de contraseña y borrado

## 8. Pendientes deliberados

Este bloque aun no abre:

- cambio de email
- recuperacion de contraseña por correo
- permisos mas finos sobre otros bloques de `platform_admin` para `admin` y `support`

Nota importante:

- hoy el rol `admin` queda cerrado sobre `Usuarios de plataforma`
- el resto de la consola sigue pensado principalmente para `superadmin`
- si despues se quiere abrir mas superficie para `admin`, eso debe definirse como politica explicita por bloque

Eso queda fuera por ahora para no mezclar el cierre del bloque basico con una politica de identidades mas compleja.
