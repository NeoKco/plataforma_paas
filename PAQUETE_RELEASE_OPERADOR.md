# PAQUETE_RELEASE_OPERADOR

Este archivo resume el paquete mínimo que un operador necesita para ejecutar la primera salida a producción sin navegar demasiados documentos.

## Objetivo

Pasar `platform_paas` desde estado "listo para salir" a estado "publicado y validado en terreno".

## Topología recomendada

- backend: `https://api.example.com`
- frontend: `https://app.example.com`
- checkout servidor: `/opt/platform_paas`
- servicio backend: `platform-paas-backend`

## Topología actualmente aplicada en el mini PC

- host real: `orkestia.ddns.net`
- checkout productivo: `/opt/platform_paas`
- backend real: `platform-paas-backend` en `127.0.0.1:8000`
- frontend real: SPA publicada por `nginx` en el mismo host
- enrutamiento actual:
  - `/` -> frontend
  - `/platform/*` -> backend
  - `/tenant/*` -> backend
  - `/health` -> backend
- estado actual: HTTPS single-host operativo
- renovación automática: `certbot.timer` ya activo en el host

## Carriles vigentes en el mini PC

- desarrollo:
  - backend `8100`
  - frontend `5173`
- staging:
  - checkout `/opt/platform_paas_staging`
  - backend `platform-paas-backend-staging` en `127.0.0.1:8200`
  - frontend publicado por `nginx` en `http://192.168.7.42:8081`
  - puede correr como `espejo instalado` o como `bootstrap reset`
  - el flujo `/install` ya quedó validado realmente en browser cuando corre como `bootstrap reset`
- producción:
  - checkout `/opt/platform_paas`
  - backend `platform-paas-backend` en `127.0.0.1:8000`
  - frontend/backend publicados en `https://orkestia.ddns.net`

## 1. Precondiciones del host

Debe existir:

- `/opt/platform_paas`
- checkout funcional del repo
- virtualenv Python operativo
- PostgreSQL operativo
- `nginx` operativo
- `systemd` operativo
- `/opt/platform_paas/.env` productivo real

Invariantes operativos que no deben degradarse:

- `APP_ENV=production`
- `DEBUG=false`
- `INSTALL_FLAG_FILE=/opt/platform_paas/.platform_installed`
- passwords bootstrap explícitas y seguras para cualquier tenant demo heredado que siga existiendo en el host

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

1. `GET https://orkestia.ddns.net/health`
2. login `platform_admin`
3. carga de `Dashboard`
4. carga de `Tenants`
5. `business-core -> Resumen`, `Clientes`, `Duplicados`
6. `maintenance -> Resumen técnico`, `Mantenciones`, `Pendientes`, `Historial técnico`
7. login real de `tenant_portal`
8. lectura rápida de `Instalaciones`, `Costos` y `Checklist`
9. si el release toca `platform_admin > Tenants`, validar también el bloque `Portabilidad tenant`
10. si el release toca `Tenants` o `Provisioning`, validar también el salto `Abrir provisioning` con tenant precargado

Smoke técnico adicional ya disponible para la URL pública:

```bash
cd /opt/platform_paas
SMOKE_BASE_URL=https://orkestia.ddns.net \
SMOKE_PLATFORM_EMAIL=admin@platform.local \
SMOKE_PLATFORM_PASSWORD='***' \
SMOKE_TENANT_SLUG=empresa-bootstrap \
SMOKE_TENANT_EMAIL=admin@empresa-bootstrap.local \
SMOKE_TENANT_PASSWORD='***' \
bash scripts/dev/run_remote_backend_smoke.sh --target all
```

Evidencia validada en esta salida:

- `/opt/platform_paas/operational_evidence/remote_backend_smoke_20260407_final.json`

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
- certificado activo y server block HTTPS correcto si el error aparece solo sobre `https`

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

## 10. Estado actual de este paquete

La primera salida productiva sobre el mini PC ya quedó:

- publicada
- validada con HTTPS
- validada por smoke remoto backend
- aceptada como operación inicial

Lección operativa ya asentada:

- no reutilizar en `/opt/platform_paas/.env` valores de desarrollo
- si el host productivo vuelve a heredar `APP_ENV=development` o passwords bootstrap inseguras, el runtime debe considerarse desalineado y corregirse antes de cualquier restart
- los secretos tecnicos tenant de runtime ya no deben escribirse en `/opt/platform_paas/.env`; el backend usa `TENANT_SECRETS_FILE=/opt/platform_paas/.tenant-secrets.env` como archivo escribible de trabajo para provisioning y deprovision
- los artifacts de export portable tenant ya no deben improvisarse en carpetas temporales opacas; el backend usa `TENANT_DATA_EXPORT_ARTIFACTS_DIR=/opt/platform_paas/storage/tenant_data_exports` como raíz operativa para `zip + manifest + csv`
- si el release cambia UI visible de `platform_admin` o `tenant_portal`, no basta con deploy backend: también hay que reconstruir el frontend publicado
