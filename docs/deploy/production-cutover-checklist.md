# Checklist de Cutover a Producción

Esta guía deja una secuencia única para sacar `platform_paas` a producción con backend y frontend separados.

Está pensada para una primera salida a terreno, sin asumir todavía CD completo.

## Topología recomendada

- `https://api.example.com` → backend FastAPI
- `https://app.example.com` → frontend SPA estática

Fallback operativo válido para un mini PC único:

- `https://orkestia.ddns.net/` -> SPA estática
- `https://orkestia.ddns.net/platform/*` -> backend platform
- `https://orkestia.ddns.net/tenant/*` -> backend tenant
- `https://orkestia.ddns.net/health` -> healthcheck backend

## Variables a decidir antes del cutover

- dominio backend público
- dominio frontend público
- ruta real del checkout: `/opt/platform_paas`
- archivo productivo: `/opt/platform_paas/.env`
- servicio backend: `platform-paas-backend`

Si usas single-host:

- dominio único público: `orkestia.ddns.net`
- `API_BASE_URL` del build: `https://orkestia.ddns.net`

## Pre-cutover

### Backend

En el host backend:

```bash
cd /opt/platform_paas
PROJECT_ROOT=/opt/platform_paas \
ENV_FILE=/opt/platform_paas/.env \
EXPECTED_APP_ENV=production \
SERVICE_NAME=platform-paas-backend \
REQUIRE_FRONTEND_DIST=false \
bash deploy/check_backend_release_readiness.sh
```

No seguir mientras exista algún `[FAIL]`.

### Frontend

En el host donde se publicará la SPA:

```bash
cd /opt/platform_paas
API_BASE_URL=https://api.example.com \
bash deploy/build_frontend.sh

EXPECTED_API_BASE_URL=https://api.example.com \
bash deploy/check_frontend_static_readiness.sh
```

Nota: si operas single-host, define `frontend/.env.production` con `VITE_API_BASE_URL=https://orkestia.ddns.net` para evitar builds que apunten a staging.

## Ejecución del cutover

### Paso 1. Deploy backend

```bash
cd /opt/platform_paas
bash deploy/deploy_backend_production.sh
```

### Paso 2. Publicar frontend

```bash
cd /opt/platform_paas
API_BASE_URL=https://api.example.com \
bash deploy/build_frontend.sh
```

Instalar o actualizar la plantilla nginx del frontend y recargar:

```bash
sudo cp infra/nginx/platform-paas-frontend-ssl.conf /etc/nginx/sites-available/platform-paas-frontend.conf
sudo ln -sf /etc/nginx/sites-available/platform-paas-frontend.conf /etc/nginx/sites-enabled/platform-paas-frontend.conf
sudo nginx -t
sudo systemctl reload nginx
```

Si usas single-host en un solo mini PC:

```bash
sudo cp infra/nginx/platform-paas-single-host-ssl.conf /etc/nginx/sites-available/platform-paas-orkestia.conf
sudo ln -sf /etc/nginx/sites-available/platform-paas-orkestia.conf /etc/nginx/sites-enabled/platform-paas-orkestia.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Validación inmediata post-cutover

### Backend

- `GET /health`
- servicio `systemd` activo
- evidencia operativa generada
- opcional pero recomendado: smoke remoto contra la URL pública con `scripts/dev/run_remote_backend_smoke.sh --target all`

### Frontend

- abrir `https://app.example.com`
- abrir `https://app.example.com/platform-admin/dashboard`
- refrescar esa ruta y confirmar que no devuelva `404`
- confirmar login `platform_admin`
- confirmar login `tenant_portal`

## Smoke funcional corto de salida a terreno

Validar al menos:

1. login `platform_admin`
2. `Dashboard` carga
3. `Tenants` carga
4. `business-core -> Resumen`, `Clientes`, `Duplicados`
5. `maintenance -> Resumen técnico`, `Mantenciones`, `Pendientes`, `Historial técnico`
6. login real de `tenant_portal`
7. una lectura rápida de `Instalaciones`, `Costos` y `Checklist`

## Criterio de aceptación

Aceptar el cutover solo si:

- backend sin fallos en gate post-deploy
- frontend publicado con la API correcta
- rutas SPA recargables sin `404`
- smoke corto de terreno sin error visible

## Si algo falla

- fallo backend: revisar evidencia y evaluar rollback con [docs/deploy/backend-release-and-rollback.md](docs/deploy/backend-release-and-rollback.md)
- fallo frontend: reconstruir con `API_BASE_URL` correcta y republicar `dist/`
- fallo de rutas SPA: corregir `try_files` en nginx del frontend

## Guías relacionadas

- [docs/deploy/backend-production-preflight.md](docs/deploy/backend-production-preflight.md)
- [docs/deploy/frontend-static-nginx.md](docs/deploy/frontend-static-nginx.md)
- [docs/deploy/backend-release-and-rollback.md](docs/deploy/backend-release-and-rollback.md)
- [docs/deploy/functional-release-checklist.md](docs/deploy/functional-release-checklist.md)
