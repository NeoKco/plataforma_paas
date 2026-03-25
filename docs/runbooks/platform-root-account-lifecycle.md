# Ciclo de Vida de la Cuenta Raiz

Este documento deja por escrito como nace, se conserva y se recupera la cuenta raiz de `Platform Admin`.

## Objetivo

La plataforma no debe depender de seeds ni de credenciales por defecto para existir.

La politica vigente es:

- existe una sola cuenta `superadmin` activa
- esa cuenta nace en el instalador inicial
- su conservacion se protege desde `Usuarios de plataforma`
- su recuperacion no depende de PostgreSQL ni de scripts manuales

## Nacimiento de la cuenta raiz

La cuenta raiz inicial se define en:

- `POST /install/setup`

Campos nuevos del instalador:

- `initial_superadmin_full_name`
- `initial_superadmin_email`
- `initial_superadmin_password`

Durante la instalacion el backend ahora hace todo esto:

1. crea la base de control y su usuario propietario
2. crea el esquema de `platform_control`
3. registra `platform_installation`
4. crea la primera cuenta `superadmin`
5. genera una clave de recuperacion de una sola emision
6. guarda solo el hash de esa clave en `.env`

## Conservacion de la cuenta raiz

La consola de `Usuarios de plataforma` deja fija esta politica:

- no se puede crear otro `superadmin` desde el flujo normal
- no se puede promover otro usuario a `superadmin`
- no se puede borrar un `superadmin`
- no se puede dejar la plataforma sin al menos un `superadmin` activo

La practica recomendada es:

- `superadmin`: una sola cuenta raiz
- `admin`: gestiona usuarios `support`
- `support`: operacion basica

## Recuperacion de la cuenta raiz

La recuperacion ya no depende de seeds ni de acceso tecnico a base de datos.

Ahora existe:

- `GET /platform/auth/root-recovery/status`
- `POST /platform/auth/root-recovery`

Este flujo solo funciona cuando:

- la plataforma ya esta instalada
- no existe ningun `superadmin` activo
- se conserva la clave de recuperacion emitida al instalar

Request de recuperacion:

- `recovery_key`
- `full_name`
- `email`
- `password`

Resultado:

- se crea o reactiva una cuenta `superadmin`
- queda activa
- la nueva contraseña pasa a ser la valida para login

## Que pasa con los seeds

Los scripts demo siguen existiendo para entornos de desarrollo y baseline:

- `seed_platform_control.py`
- `seed_frontend_demo_baseline.py`
- `seed_demo_data.py`

Pero ya no forman parte del ciclo normal de instalacion real.

En una instalacion nueva:

- la cuenta raiz sale del instalador
- no de `admin@platform.local / AdminTemporal123!`

## Regla operativa

Si el problema es:

- `perdi la contraseña`
- `desactive el ultimo superadmin`
- `importe datos y no quedo ninguna cuenta raiz activa`

la via correcta es:

1. abrir `Recuperar cuenta raíz`
2. usar la clave de recuperacion
3. definir la nueva identidad raiz

No conviene:

- editar la base manualmente
- revivir seeds sobre una base viva
- crear mas de una cuenta `superadmin` para operacion diaria
