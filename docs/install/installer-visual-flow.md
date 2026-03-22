# Flujo Visual del Instalador

Este documento define como deberia verse y comportarse el instalador visual de primera ejecucion.

No es una idea abstracta: esta basado en lo que el backend ya soporta hoy.

## Estado actual

Backend ya soporta:

- `GET /install/`
- `POST /install/setup`
- bloqueo de rutas normales mientras la plataforma no este instalada
- `GET /health` con campo `installed`

Frontend todavia no soporta:

- pantalla visual de instalacion
- redireccion automatica a instalador cuando `installed=false`

## Que decide si la plataforma esta instalada

Hoy el backend considera instalada la plataforma cuando existe el archivo:

- `/.platform_installed`

Eso se resuelve en:

- [install_checker.py](/home/felipe/platform_paas/backend/app/bootstrap/install_checker.py)

Mientras ese flag no exista:

- el backend publica solo rutas de instalacion
- no expone las rutas normales de `platform` ni `tenant`

## Objetivo del flujo visual

Cuando la plataforma aun no esta instalada, el frontend no deberia mostrar login.

Deberia mostrar un wizard corto que:

1. detecta que `installed=false`
2. pide datos minimos de PostgreSQL admin y control DB
3. ejecuta la instalacion
4. informa resultado
5. redirige al login de plataforma

## Pantallas del flujo

### 1. Deteccion inicial

La app al arrancar deberia consultar:

- `GET /health`

Si responde:

```json
{
  "installed": false
}
```

el frontend deberia redirigir a:

- `/install`

Si responde `installed=true`, sigue el flujo normal.

### 2. Pantalla de bienvenida

Objetivo:

- explicar que la plataforma aun no esta configurada
- dejar claro que este paso se hace una sola vez

Contenido recomendado:

- titulo: `Instalador de Platform PaaS`
- breve texto de contexto
- lista corta de lo que va a hacer el instalador
- boton `Comenzar instalacion`

No deberia pedir todavia todos los datos en esta primera vista.

### 3. Formulario de instalacion

Este paso debe mapear 1:1 al contrato backend actual.

Campos que hoy soporta `POST /install/setup`:

#### Acceso PostgreSQL administrador

- `admin_db_host`
- `admin_db_port`
- `admin_db_name`
- `admin_db_user`
- `admin_db_password`

#### Base de control de la plataforma

- `control_db_name`
- `control_db_user`
- `control_db_password`

#### Metadata de aplicacion

- `app_name`
- `app_version`

## Propuesta de agrupacion visual

### Bloque 1. Servidor PostgreSQL

Campos:

- host
- puerto
- base administrativa
- usuario administrador
- contraseña administrador

Texto de ayuda:

- esta cuenta se usa para crear la base de control y su usuario propietario

### Bloque 2. Base de control

Campos:

- nombre de base de control
- usuario propietario
- contraseña propietaria

Texto de ayuda:

- aqui viviran tenants, provisioning, billing y auth central

### Bloque 3. Metadata de la app

Campos:

- nombre visible
- version

Texto de ayuda:

- inicialmente puede venir precargado con defaults

## Defaults visibles recomendados

Como el backend ya tiene defaults, la UI deberia reflejarlos:

- `admin_db_host = 127.0.0.1`
- `admin_db_port = 5432`
- `admin_db_name = postgres`
- `control_db_name = platform_control`
- `control_db_user = platform_owner`
- `app_name = Platform Backend`
- `app_version = 0.1.0`

Los campos de contraseña no deberian venir prellenados.

## Accion principal

Boton:

- `Instalar plataforma`

Request:

- `POST /install/setup`

Comportamiento:

- deshabilitar formulario mientras corre
- mostrar estado `Instalando...`
- no permitir doble submit

## Estado exitoso

Si `POST /install/setup` responde éxito:

- mostrar mensaje claro de instalacion completada
- explicar que la plataforma ya puede usarse
- ofrecer boton `Ir al login`

La redireccion ideal es:

- `/login`

## Estado de error

Si falla la instalacion:

- mostrar mensaje corto
- mostrar `detail` tecnico si viene
- mantener formulario visible
- permitir corregir y reintentar

Si el backend responde:

- `400 Platform already installed`
  el frontend deberia ofrecer ir al login

- `500`
  mostrar el detalle y sugerir revisar credenciales o acceso a PostgreSQL

## Estados visuales que conviene contemplar

### Cargando

Mientras se decide si `installed` es `true` o `false`:

- pantalla simple de carga
- sin mostrar login todavia

### Instalacion en curso

- formulario bloqueado
- feedback visible de progreso simple

### Instalacion exitosa

- panel de confirmacion
- CTA al login

### Instalacion fallida

- error visible
- formulario editable otra vez

## Navegacion esperada

Mientras `installed=false`:

- `/login` deberia redirigir a `/install`
- `/tenant-portal/login` tambien deberia redirigir a `/install`

Cuando `installed=true`:

- `/install` deberia redirigir a `/login`

## Lo que no conviene meter todavia

Para la primera version del instalador visual no conviene:

- wizard multi-step complejo
- chequeos de red sofisticados en frontend
- test de DB separados del submit real
- creacion del superadmin desde esta pantalla

La razon es que el backend actual todavia no expone ese nivel de granularidad.

## Primera version recomendada

La version mas pragmatica del instalador visual seria:

1. pantalla unica
2. tres bloques de formulario
3. submit unico
4. estado de carga
5. exito o error
6. redireccion al login

## Dependencias para implementarlo

Antes de construir esta pantalla en frontend, conviene asumir estas reglas:

- usar `GET /health` como fuente inicial de `installed`
- consumir `GET /install/` solo como verificacion secundaria o diagnostico
- `POST /install/setup` como unica accion de instalacion

## Resultado esperado

Cuando este flujo exista, el producto se entendera mucho mejor desde el primer arranque porque:

- no arrancara directo en login cuando aun no esta instalado
- el onboarding inicial dejara de depender de consola
- el recorrido visual del producto quedara completo
