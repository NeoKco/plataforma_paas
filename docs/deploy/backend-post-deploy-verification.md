# Verificacion Post-Deploy Backend

Esta guia deja una secuencia minima para validar un deploy antes de darlo por bueno o decidir rollback.

## Objetivo

- confirmar que el servicio subio
- confirmar que el healthcheck responde
- dejar un criterio simple para seguir o revertir

## Archivo Base

- `deploy/verify_backend_deploy.sh`

## Que Valida

- que `systemd` tenga el servicio en estado `active`
- que el endpoint de health responda `200`
- que el servicio siga estable durante varios intentos cortos
- que, por defecto, se encole el auto-sync masivo de schema tenant para tenants activos con DB ya configurada

## Uso Basico

```bash
SERVICE_NAME=platform-paas-backend \
HEALTHCHECK_URL=http://127.0.0.1/health \
bash deploy/verify_backend_deploy.sh
```

Variables opcionales:

- `MAX_ATTEMPTS`
- `SLEEP_SECONDS`
- `PROJECT_ROOT`
- `VENV_PYTHON`
- `BACKEND_AUTO_SYNC_POST_DEPLOY`
- `BACKEND_AUTO_SYNC_LIMIT`

Ejemplo:

```bash
SERVICE_NAME=platform-paas-backend-staging \
HEALTHCHECK_URL=http://127.0.0.1/health \
MAX_ATTEMPTS=15 \
SLEEP_SECONDS=2 \
bash deploy/verify_backend_deploy.sh
```

Ejemplo deshabilitando el paso post-deploy de auto-sync:

```bash
SERVICE_NAME=platform-paas-backend \
BACKEND_AUTO_SYNC_POST_DEPLOY=false \
bash deploy/verify_backend_deploy.sh
```

Ejemplo limitando la corrida masiva:

```bash
SERVICE_NAME=platform-paas-backend \
BACKEND_AUTO_SYNC_LIMIT=25 \
bash deploy/verify_backend_deploy.sh
```

## Integracion Actual

El script ya queda llamado al final de:

- `deploy/deploy_backend.sh`

Eso significa que un deploy no termina exitosamente si:

- el servicio no queda activo
- el endpoint `/health` no responde bien en los intentos configurados
- falla el encolado masivo de `sync_tenant_schema` cuando `BACKEND_AUTO_SYNC_POST_DEPLOY=true`

El paso de auto-sync usa:

- `backend/app/scripts/enqueue_active_tenant_schema_sync.py`
- `POST /platform/tenants/schema-sync/bulk`

Alcance operativo:

- tenants `active`
- con configuracion de DB completa
- sin depender de que un operador entre luego a `Provisioning` para dispararlo a mano

## Cuando Hacer Rollback

Rollback recomendado si:

- el deploy termino con error en verificacion
- `systemctl status` muestra fallas persistentes
- el healthcheck no responde despues de los reintentos
- el wrapper no logra encolar el auto-sync post-deploy y ese paso estaba habilitado

Antes de hacer rollback, revisar al menos:

```bash
systemctl status platform-paas-backend --no-pager
sudo journalctl -u platform-paas-backend -n 100 --no-pager
curl -I http://127.0.0.1/health
```

## Relacion con Rollback

Guia relacionada:

- `docs/deploy/operational-acceptance-checklist.md`
- `docs/deploy/backend-release-and-rollback.md`
