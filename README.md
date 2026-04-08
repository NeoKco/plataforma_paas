# Platform PaaS

Consola multi-tenant para operar una plataforma central (`platform_admin`) y portales por tenant (`tenant_portal`).

Hoy el proyecto ya incluye:

- backend FastAPI con auth platform y tenant
- `platform_control` con tenants, provisioning, billing y politicas
- `tenant_portal` con overview, usuarios y finanzas
- instalador visual de primera ejecucion
- documentacion funcional, tecnica y visual dentro de `docs/`

## Caras del producto

- `platform_admin`: consola del superadmin para crear, observar y corregir tenants
- `tenant_portal`: portal de uso para un tenant especifico ya provisionado

Guia rapida:

- [Guia rapida de la app](./docs/architecture/app-quick-guide.md)
- [Guia unica para entender la app](./docs/architecture/app-understanding-guide.md)
- [Manual visual de la app](./docs/architecture/app-visual-manual.md)
- [Onboarding de developers](./docs/runbooks/developer-onboarding.md)

## Handoff rapido para otra IA o developer

Si alguien retoma el trabajo sin contexto conversacional, debe partir por estos archivos del root:

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
- [SESION_ACTIVA.md](./SESION_ACTIVA.md)
- [REGLAS_IMPLEMENTACION.md](./REGLAS_IMPLEMENTACION.md)
- [PROMPT_MAESTRO_MODULO.md](./PROMPT_MAESTRO_MODULO.md)
- [ESTADO_ACTUAL.md](./ESTADO_ACTUAL.md)
- [SIGUIENTE_PASO.md](./SIGUIENTE_PASO.md)
- [HANDOFF_STATE.json](./HANDOFF_STATE.json)
- [HISTORIAL_ITERACIONES.md](./HISTORIAL_ITERACIONES.md)
- [PLANTILLA_ACTUALIZACION_ESTADO.md](./PLANTILLA_ACTUALIZACION_ESTADO.md)
- [PAQUETE_RELEASE_OPERADOR.md](./PAQUETE_RELEASE_OPERADOR.md)

Estos archivos existen para que la memoria operativa del proyecto viva en el repo y no dependa del chat.

## Empieza aqui

Si es tu primera vez con este repo, usa este orden:

1. [Guia unica para entender la app](./docs/architecture/app-understanding-guide.md)
2. [Onboarding de developers](./docs/runbooks/developer-onboarding.md)
3. [Flujo visual del instalador](./docs/install/installer-visual-flow.md)
4. [Demo data y seeds de desarrollo](./docs/runbooks/demo-data.md)

Si solo quieres levantarlo rapido:

1. backend
2. frontend
3. abrir `http://127.0.0.1:5173`
4. si el sistema no esta instalado, completar `/install`
5. entrar a `Platform Admin`

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, TypeScript, Vite
- Provisioning y operaciones: scripts Python, systemd, Nginx, PostgreSQL backups

## Estructura principal

- [backend/](./backend): API, servicios, modelos, migraciones y tests
- [frontend/](./frontend): `platform_admin` y `tenant_portal`
- [docs/](./docs): arquitectura, runbooks, deploy, install y manual visual
- [infra/](./infra): ejemplos de entorno, Nginx, systemd, backups
- [deploy/](./deploy): scripts operativos de despliegue y verificacion

## Arranque local rapido

### 1. Backend

Usa [`.env.example`](./.env.example) como base y ajusta al menos:

- `CONTROL_DB_PASSWORD`
- `POSTGRES_ADMIN_PASSWORD`
- `BACKEND_CORS_ALLOW_ORIGINS`

Luego inicializa la base de control.

Migraciones:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_control_migrations
```

Seed platform:

```bash
cd /home/felipe/platform_paas/backend
DEBUG=true PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.seed_platform_control
```

Backend HTTP:

```bash
cd /home/felipe/platform_paas/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

### 2. Frontend

```bash
cd /home/felipe/platform_paas/frontend
cp .env.example .env
npm install
VITE_API_BASE_URL=http://127.0.0.1:8100 npm run dev -- --host 0.0.0.0 --port 5173
```

### 3. Primer arranque visual

Si `GET /health` responde `installed=false`, el frontend redirige a:

- `http://127.0.0.1:5173/install`

Desde ahi puedes:

- configurar PostgreSQL
- crear la base `platform_control`
- dejar la plataforma lista para login

Referencia:

- [Flujo visual del instalador](./docs/install/installer-visual-flow.md)

## Credenciales de desarrollo

Estas credenciales aplican al baseline demo y no a una instalacion nueva hecha desde `/install`.

Platform demo:

- `admin@platform.local`
- `AdminTemporal123!`

Instalacion nueva:

- la cuenta raiz sale del instalador
- la clave de recuperacion se emite una sola vez al instalar

Tenant demo:

- `admin@condominio-demo.local`
- `TenantAdmin123!`

Tenant provisionado nuevo:

- `admin@<tenant_slug>.local`
- `TenantAdmin123!`

## Datos demo y baseline

Para dejar el entorno reproducible para frontend:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.seed_frontend_demo_baseline
```

Referencia:

- [Demo data y seeds de desarrollo](./docs/runbooks/demo-data.md)
- [Baseline browser local](./docs/runbooks/frontend-e2e-browser.md)

## Documentacion recomendada

- [Contexto raiz del proyecto](./PROJECT_CONTEXT.md)
- [Sesión activa / puntero corto](./SESION_ACTIVA.md)
- [Reglas de implementacion](./REGLAS_IMPLEMENTACION.md)
- [Estado actual de la iteracion](./ESTADO_ACTUAL.md)
- [Siguiente paso recomendado](./SIGUIENTE_PASO.md)
- [Estado maquina-legible de handoff](./HANDOFF_STATE.json)
- [Historial de iteraciones](./HISTORIAL_ITERACIONES.md)
- [Plantilla de actualizacion de estado](./PLANTILLA_ACTUALIZACION_ESTADO.md)
- [Paquete resumido de release para operador](./PAQUETE_RELEASE_OPERADOR.md)
- [Indice general de docs](./docs/index.md)
- [Business core: donde encontrar Duplicados](./docs/modules/business-core/USER_GUIDE.md)
- [Guia unica para entender la app](./docs/architecture/app-understanding-guide.md)
- [Onboarding de developers](./docs/runbooks/developer-onboarding.md)
- [Catalogo de variables backend](./docs/runbooks/backend-env-catalog.md)
- [Implementacion backend platform](./docs/runbooks/platform-backend-implementation.md)
- [Implementacion backend tenant](./docs/runbooks/tenant-backend-implementation.md)
- [Higiene del repositorio para GitHub](./docs/runbooks/github-repository-hygiene.md)

## Estado del repo

El repo ya esta preparado para GitHub:

- secretos fuera de Git
- `venv`, `node_modules`, `dist` y caches ignorados
- `.env.example` como base publica
- capturas finales del manual visual si versionadas como documentacion
- baseline browser institucionalizado en GitHub Actions con `build + e2e:platform + e2e:tenant`
- baseline browser local repetible con [scripts/dev/run_local_browser_baseline.sh](./scripts/dev/run_local_browser_baseline.sh)
- reset bootstrap de staging disponible con [deploy/reset_staging_bootstrap.sh](./deploy/reset_staging_bootstrap.sh) cuando haga falta revalidar el instalador inicial en el mini PC
- baseline backend institucionalizado en GitHub Actions con [.github/workflows/backend-tests.yml](.github/workflows/backend-tests.yml)
- baseline backend local repetible con [scripts/dev/run_local_backend_baseline.sh](./scripts/dev/run_local_backend_baseline.sh)
- helper broker-only para DLQ con [scripts/dev/run_local_broker_dlq_baseline.sh](./scripts/dev/run_local_broker_dlq_baseline.sh)
- workflow CI manual broker-only para DLQ con [.github/workflows/frontend-broker-dlq-e2e.yml](.github/workflows/frontend-broker-dlq-e2e.yml)
