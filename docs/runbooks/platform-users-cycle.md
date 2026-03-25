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

Todo esto se hace sobre `platform_users` en `platform_control`.

## 2. Que problema resuelve

Hasta ahora la plataforma podia autenticarse contra `platform_users`, pero no existia una forma visible de gobernar esos operadores desde la UI.

Eso dejaba un hueco basico:

- el operador principal existia
- el login funcionaba
- pero la consola no podia administrar a sus propios operadores

Con este bloque ya queda cubierta esa parte basica.

## 3. Politica vigente

La politica actual queda asi:

- roles visibles: `superadmin`, `support`
- solo `superadmin` puede operar este bloque
- la plataforma debe operar con un solo `superadmin` activo

Eso implica:

- no puede crearse otro `superadmin` activo si ya existe uno
- no puede promoverse un usuario `support` a `superadmin` si ya existe uno activo
- no puede reactivarse un `superadmin` inactivo si ya existe otro activo
- no puede desactivarse el ultimo `superadmin` activo
- no puede cambiarse el ultimo `superadmin` activo a `support`

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

## 5. Endpoints actuales

Backend actual:

- `GET /platform/users/`
- `POST /platform/users/`
- `PATCH /platform/users/{user_id}`
- `PATCH /platform/users/{user_id}/status`
- `POST /platform/users/{user_id}/reset-password`

## 6. Validacion funcional corta

La validacion minima recomendada del bloque es esta:

1. entrar a `Usuarios de plataforma`
2. crear un usuario `support` activo
3. confirmar que aparece en el catalogo
4. editar su nombre o rol y verificar persistencia
5. desactivarlo y confirmar que cambia a `inactive`
6. volver a activarlo
7. actualizar su contraseña
8. intentar desactivar o degradar al ultimo `superadmin` activo y confirmar que el backend lo bloquea
9. intentar crear o promover otro `superadmin` activo y confirmar que el backend lo bloquea

## 7. Cobertura automatizada actual

La suite backend recomendada para congelar este bloque es:

- `app.tests.test_platform_flow`

Casos ya cubiertos:

- alta de usuario de plataforma
- rechazo por email duplicado
- rechazo al intentar crear un segundo `superadmin` activo
- rechazo al intentar promover un `support` a `superadmin` cuando ya existe uno activo
- rechazo al intentar reactivar un `superadmin` inactivo cuando ya existe otro activo
- bloqueo al intentar desactivar el ultimo `superadmin` activo
- bloqueo al intentar cambiar el rol del ultimo `superadmin` activo
- respuestas base de las rutas de listado, alta, edicion, cambio de estado y reset de contraseña

## 8. Pendientes deliberados

Este bloque aun no abre:

- borrado fisico de usuarios de plataforma
- cambio de email
- recuperacion de contraseña por correo
- permisos mas finos por rol dentro de `platform_admin`

Eso queda fuera por ahora para no mezclar el cierre del bloque basico con una politica de identidades mas compleja.
