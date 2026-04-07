# PAQUETE_RELEASE_OPERADOR

Este archivo resume el paquete mínimo que un operador necesita para ejecutar la primera salida a producción sin navegar demasiados documentos.

## Objetivo

Pasar `platform_paas` desde estado "listo para salir" a estado "publicado y validado en terreno".

## Topología recomendada

- backend: `https://api.example.com`
- frontend: `https://app.example.com`
- checkout servidor: `/opt/platform_paas`
- servicio backend: `platform-paas-backend`

## 1. Precondiciones del host

Debe existir:

- `/opt/platform_paas`
- checkout funcional del repo
- virtualenv Python operativo
- PostgreSQL operativo
- `nginx` operativo
- `systemd` operativo
- `/opt/platform_paas/.env` productivo real

## 2. Preflight backend

Ejecutar:

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

## 3. Build y preflight frontend

Ejecutar:

```bash
cd /opt/platform_paas
API_BASE_URL=https://api.example.com \
bash deploy/build_frontend.sh

EXPECTED_API_BASE_URL=https://api.example.com \
bash deploy/check_frontend_static_readiness.sh
```

## 4. Deploy backend

Ejecutar:

```bash
cd /opt/platform_paas
bash deploy/deploy_backend_production.sh
```

## 5. Publicación frontend

Instalar o actualizar plantilla `nginx` del frontend y recargar:

```bash
sudo cp infra/nginx/platform-paas-frontend-ssl.conf /etc/nginx/sites-available/platform-paas-frontend.conf
sudo ln -sf /etc/nginx/sites-available/platform-paas-frontend.conf /etc/nginx/sites-enabled/platform-paas-frontend.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Smoke corto de terreno

Validar al menos:

1. `GET /health`
2. login `platform_admin`
3. carga de `Dashboard`
4. carga de `Tenants`
5. `business-core -> Resumen`, `Clientes`, `Duplicados`
6. `maintenance -> Resumen técnico`, `Mantenciones`, `Pendientes`, `Historial técnico`
7. login real de `tenant_portal`
8. lectura rápida de `Instalaciones`, `Costos` y `Checklist`

## 7. Si algo falla

### Falla backend

Revisar:

- `docs/deploy/backend-release-and-rollback.md`
- evidencia operativa recolectada
- estado del servicio y logs recientes

### Falla frontend

Revisar:

- `VITE_API_BASE_URL`
- build generado
- `try_files` de `nginx`
- recarga de rutas SPA

## 8. Documentos de apoyo

- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/frontend-static-nginx.md`
- `docs/deploy/production-cutover-checklist.md`
- `docs/deploy/backend-release-and-rollback.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

## 9. Cierre obligatorio después del release

Si el release realmente se ejecuta, actualizar:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`
- `HISTORIAL_ITERACIONES.md`

La siguiente IA no debería tener que adivinar si el cutover ocurrió o no.
