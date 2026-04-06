# Preflight de Producción Backend

Esta guía deja la secuencia exacta para decidir si un host ya está listo para recibir un deploy productivo de `platform_paas`.

No reemplaza el deploy. Lo prepara.

## Objetivo

- detectar antes del release bloqueos de entorno
- evitar deploys que fallen por `.env`, `systemd` o artefactos ausentes
- dejar un criterio repetible para decir `este host sí está listo`

## Script base

- `deploy/check_backend_release_readiness.sh`

## Qué valida

- presencia de `PROJECT_ROOT`
- presencia de `backend/` y scripts de deploy
- virtualenv Python ejecutable
- `.env` válido con el mismo gate del deploy real
- checkout git disponible para rollback por ref
- build frontend presente si se exige
- disponibilidad de `systemctl`
- existencia de la unidad `platform-paas-backend`
- estado de habilitación/actividad y healthcheck cuando ya aplica

## Uso típico en producción

```bash
cd /opt/platform_paas
PROJECT_ROOT=/opt/platform_paas \
ENV_FILE=/opt/platform_paas/.env \
EXPECTED_APP_ENV=production \
SERVICE_NAME=platform-paas-backend \
HEALTHCHECK_URL=http://127.0.0.1/health \
REQUIRE_FRONTEND_DIST=true \
bash deploy/check_backend_release_readiness.sh
```

## Lectura del resultado

- `[PASS]`: condición lista
- `[WARN]`: no bloquea por sí sola, pero conviene corregirla antes del release si aplica
- `[FAIL]`: no conviene desplegar mientras siga así

## Bloqueos típicos detectables

### 1. `.env` no compatible con shell

Ejemplo típico:

```dotenv
APP_NAME=Platform Backend
```

Eso no debe quedar sin comillas. Debe verse así:

```dotenv
APP_NAME="Platform Backend"
```

### 2. Entorno no coincide con producción

Para production, el gate exige al menos:

- `APP_ENV=production`
- `DEBUG=false`
- `JWT_ISSUER`
- `JWT_PLATFORM_AUDIENCE`
- `JWT_TENANT_AUDIENCE`
- secretos reales no placeholder

### 3. Unidad `systemd` ausente

Si el script informa que no existe `platform-paas-backend`, instalar primero:

- `infra/systemd/platform-paas-backend.service`

### 4. Build frontend ausente

Si el release publica frontend estático desde el mismo host, generar antes:

```bash
cd /opt/platform_paas/frontend
npm install
npm run build
```

## Criterio práctico de salida

Un host está razonablemente listo para deploy productivo cuando:

- el preflight termina sin fallos
- el servicio esperado existe en `systemd`
- el `.env` pasa con `EXPECTED_APP_ENV=production`
- el build frontend existe cuando corresponde
- el checkout remoto está en una ref identificable para rollback

## Secuencia recomendada completa

1. correr preflight
2. corregir cualquier `[FAIL]`
3. repetir preflight hasta quedar en cero fallos
4. ejecutar `bash deploy/deploy_backend_production.sh`
5. revisar gate post-deploy y evidencia operativa
6. ejecutar smoke funcional corto de salida a terreno

## Guías relacionadas

- `docs/deploy/backend-debian.md`
- `docs/deploy/backend-release-and-rollback.md`
- `docs/deploy/backend-post-deploy-verification.md`
- `docs/deploy/functional-release-checklist.md`
- `docs/deploy/operational-acceptance-checklist.md`