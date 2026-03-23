# Onboarding de Developers

Este runbook resume como levantar `platform_paas` localmente, donde mirar primero y cual es la secuencia minima para trabajar sin perder tiempo.

## 1. Leer Primero

Antes de tocar codigo, parte por estos documentos:

- `docs/architecture/app-understanding-guide.md`
- `docs/architecture/backend-closure-status.md`
- `docs/architecture/frontend-roadmap.md`
- `docs/architecture/project-structure.md`
- `docs/runbooks/backend-rules-and-change-guidelines.md`
- `docs/api/index.md`

## 2. Prerrequisitos

Backend:

- Python 3.11+
- virtualenv ya creado o capacidad de crearlo
- PostgreSQL para `platform_control`
- Redis solo si quieres probar broker real o rate limiting distribuido

Frontend:

- Node 20+
- npm 10+

## 3. Backend Local

Secuencia minima recomendada:

1. preparar `.env`
2. ejecutar migraciones de `platform_control`
3. levantar backend
4. comprobar `GET /health`

### Variables de entorno

Usa como referencia:

- `infra/env/backend.development.example.env`
- `docs/runbooks/backend-env-catalog.md`

### Base de control

Inicializa o sincroniza la DB de control con:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/init_control_db.py
```

Si ya tienes la base creada y quieres solo ejecutar migraciones:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_control_migrations
```

### Backend HTTP

Levanta el backend desde la carpeta `backend/` con el entrypoint o con `uvicorn`, segun tu flujo local.

La referencia funcional minima es:

- `GET /health`
- `POST /platform/auth/login`

Si `GET /health` responde `installed=false`, el flujo correcto ya no es ir directo a login:

- abre el frontend
- completa `/install`
- luego vuelve al login de `Platform Admin`

## 4. Tests del Backend

Runner unificado:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/run_backend_tests.py
```

Para un barrido rapido sin smoke HTTP:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/run_backend_tests.py --skip-http-smoke
```

Mas detalle:

- `docs/runbooks/backend-tests.md`
- `docs/runbooks/backend-ci.md`

## 5. Frontend Local

Base actual:

- `frontend/` usa Vite + React + TypeScript
- la app activa es `platform_admin`
- el shell y auth base ya existen

Variables:

```bash
cd /home/felipe/platform_paas/frontend
cp .env.example .env
```

La variable minima es:

- `VITE_API_BASE_URL=http://127.0.0.1:8000`

Instalacion y arranque:

```bash
cd /home/felipe/platform_paas/frontend
npm install
npm run dev
```

Flujo esperado al abrir el navegador:

- si la plataforma no esta instalada: `/install`
- si ya esta instalada: `/login`

## 6. Datos Minimos para Desarrollo

Para una demo local minima necesitas:

- plataforma instalada
- un usuario `platform` valido para login
- al menos un tenant creado

Flujo minimo:

1. instalar o inicializar `platform_control`
2. entrar a `Platform Admin`
3. crear o sembrar tenants demo
4. dejar correr provisioning o ejecutar el worker
5. volver a consultar el tenant ya aprovisionado

Credenciales bootstrap tenant de desarrollo:

- email: `admin@<tenant_slug>.local`
- password: `TenantAdmin123!`

Ejemplo:

- `admin@condominio-demo.local`
- `TenantAdmin123!`

Comando operativo minimo para procesar jobs pendientes de provisioning:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_provisioning_worker --once
```

Si un tenant ya tiene DB pero le faltan tablas tenant:

- usar `POST /platform/tenants/{tenant_id}/sync-schema`
- o correr migraciones tenant por terminal

Si un tenant muestra `Tenant database configuration is incomplete`:

- no basta con `sync-schema`
- primero hay que completar el provisioning `create_tenant_database`
- si no existe job pendiente, hay que crearlo o reencolar uno fallido antes de ejecutar el worker

Si quieres ejercitar billing:

- asigna `billing_provider`, `customer_id` o `subscription_id`
- usa los endpoints de `billing/sync-event`

Si quieres un entorno mas rico para demos y frontend:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/seed_demo_data.py
```

Si quieres un baseline mas estable para frontend y pruebas guiadas:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.seed_frontend_demo_baseline
```

## 7. Donde Agregar Cambios

Regla corta:

- negocio del modulo: `services/`
- politicas compartidas: `common/policies/`
- enforcement por request: middleware o dependencies
- lecturas SQL para soportar la regla: `repositories/`

Referencia directa:

- `docs/runbooks/backend-rules-and-change-guidelines.md`

## 8. Contratos Estables para Frontend

Antes de cambiar un endpoint que ya consume o consumira frontend, revisa:

- `docs/api/frontend-contract-stability.md`
- `docs/architecture/frontend-conventions.md`
- `docs/api/openapi.snapshot.json`

## 9. Si Algo Falla

Orden recomendado de diagnostico:

1. `GET /health`
2. login platform
3. revisar variables de entorno
4. revisar migraciones de `platform_control`
5. correr tests focalizados
6. revisar `request_id` y logs

Errores frecuentes de tenant:

- `Tenant database configuration is incomplete`: faltan `db_host`, `db_port`, `db_name` o `db_user`; corresponde provisioning
- `Tenant DB password not configured for this tenant`: falta secreto tenant o no esta accesible; revisar `.env`
- `finance_entries` o `tenant_info` inexistente: la DB tenant existe pero su schema esta incompleto; corresponde `sync-schema`

Apoyos utiles:

- `docs/runbooks/backend-error-handling.md`
- `docs/runbooks/backend-observability.md`
- `docs/architecture/backend-error-status-matrix.md`

## 10. Secuencia Recomendada para un Developer Nuevo

1. leer estructura y cierre de backend
2. levantar backend
3. correr tests
4. levantar frontend
5. autenticarte en `platform_admin`
6. comprobar `GET /platform/capabilities`
7. empezar a trabajar sobre una pantalla o servicio concreto
