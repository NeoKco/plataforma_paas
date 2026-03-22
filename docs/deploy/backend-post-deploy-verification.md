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

## Uso Basico

```bash
SERVICE_NAME=platform-paas-backend \
HEALTHCHECK_URL=http://127.0.0.1/health \
bash deploy/verify_backend_deploy.sh
```

Variables opcionales:

- `MAX_ATTEMPTS`
- `SLEEP_SECONDS`

Ejemplo:

```bash
SERVICE_NAME=platform-paas-backend-staging \
HEALTHCHECK_URL=http://127.0.0.1/health \
MAX_ATTEMPTS=15 \
SLEEP_SECONDS=2 \
bash deploy/verify_backend_deploy.sh
```

## Integracion Actual

El script ya queda llamado al final de:

- `deploy/deploy_backend.sh`

Eso significa que un deploy no termina exitosamente si:

- el servicio no queda activo
- el endpoint `/health` no responde bien en los intentos configurados

## Cuando Hacer Rollback

Rollback recomendado si:

- el deploy termino con error en verificacion
- `systemctl status` muestra fallas persistentes
- el healthcheck no responde despues de los reintentos

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
