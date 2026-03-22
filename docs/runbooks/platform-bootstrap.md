# Bootstrap Inicial de Plataforma

Este runbook describe la secuencia base para dejar operativo el backend en un entorno local o de desarrollo controlado.

## Objetivo

Dejar lista una instancia funcional con:

- base de control creada
- tablas iniciales creadas
- datos seed de plataforma cargados
- login de plataforma operativo
- capacidad de crear y provisionar tenants

## Precondiciones

- PostgreSQL accesible
- credenciales administrativas para crear roles y bases
- entorno Python disponible
- dependencias del backend instaladas
- `.env` configurado para el entorno objetivo

## Ruta A: Instalacion via API

Usar esta ruta cuando la plataforma aun no este instalada.

### 1. Verificar estado del instalador

Consultar:

```text
GET /install/
```

### 2. Ejecutar setup inicial

Enviar:

```text
POST /install/setup
```

Body ejemplo:

```json
{
  "admin_db_host": "127.0.0.1",
  "admin_db_port": 5432,
  "admin_db_name": "postgres",
  "admin_db_user": "postgres",
  "admin_db_password": "secret",
  "control_db_name": "platform_control",
  "control_db_user": "platform_owner",
  "control_db_password": "secret",
  "app_name": "Platform Backend",
  "app_version": "0.1.0"
}
```

Resultado esperado:

- creacion de base `platform_control`
- escritura de `.env`
- creacion de `.platform_installed`

## Ruta B: Inicializacion via Scripts

Usar esta ruta cuando la base de control ya existe o cuando quieres reconstruir tablas y seeds en desarrollo.

### 1. Crear tablas de control

Ejecutar el script:

```text
backend/app/scripts/init_control_db.py
```

Este paso ejecuta migraciones versionadas de control y crea tablas de:

- instalacion de plataforma
- usuarios de plataforma
- tenants
- provisioning jobs

### 2. Cargar seeds de plataforma

Ejecutar el script:

```text
backend/app/scripts/seed_platform_control.py
```

Esto inserta:

- registro de instalacion
- usuario `superadmin` inicial

Credenciales seed actuales:

- email: `admin@platform.local`
- password: `AdminTemporal123!`

## Validacion Basica

### 1. Validar health general

```text
GET /health
```

### 2. Validar login de plataforma

```text
POST /platform/auth/login
```

Body ejemplo:

```json
{
  "email": "admin@platform.local",
  "password": "AdminTemporal123!"
}
```

### 3. Crear un tenant

```text
POST /platform/tenants/
```

Body ejemplo:

```json
{
  "name": "Condominio Demo",
  "slug": "condominio-demo",
  "tenant_type": "condos"
}
```

### 4. Ejecutar job de provisionamiento

```text
POST /platform/provisioning-jobs/{job_id}/run
```

Resultado esperado:

- base de datos tenant creada
- usuario tecnico creado
- tenant marcado `active`
- usuario admin tenant sembrado

### 5. Validar login tenant

```text
POST /tenant/auth/login
```

Body ejemplo:

```json
{
  "tenant_slug": "condominio-demo",
  "email": "admin@condominio-demo.local",
  "password": "TenantAdmin123!"
}
```

## Comprobaciones Finales

Una instancia bootstrappeada correctamente deberia permitir:

- responder `GET /health`
- autenticar `superadmin`
- crear tenants
- listar y ejecutar provisioning jobs
- autenticar usuarios tenant
- responder rutas protegidas bajo `/platform`
- responder rutas protegidas bajo `/tenant`

## Riesgos y Limitaciones Actuales

- hay credenciales temporales de desarrollo
- la resolucion de password tecnica tenant sigue siendo transitoria mientras no exista secret manager
- no hay una automatizacion completa del runbook de punta a punta

## Siguiente Paso Recomendado

Despues del bootstrap inicial, conviene:

- cambiar credenciales temporales
- mover secretos a un almacenamiento seguro
- agregar pruebas de smoke para este flujo
