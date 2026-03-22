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
- [Guia de comprension de la app](./docs/architecture/app-functional-walkthrough.md)
- [Manual visual de la app](./docs/architecture/app-visual-manual.md)

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

Usa [`.env.example`](./.env.example) e inicializa la base de control.

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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd /home/felipe/platform_paas/frontend
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

## Credenciales de desarrollo

Platform:

- `admin@platform.local`
- `AdminTemporal123!`

Tenant demo:

- `admin@condominio-demo.local`
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

## Documentacion recomendada

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
