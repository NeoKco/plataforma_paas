# Backend Release y Rollback

Esta guía deja el camino correcto para desplegar backend y entender qué se promueve realmente a cada ambiente.

## Objetivo

- desplegar una ref concreta a `staging` o `production`
- dejar explícito que el runtime real no es el repo local
- incorporar convergencia tenant y auditoría post-deploy como parte del release
- definir cuándo conviene rollback y cuándo conviene reparar drift tenant-local

## Regla base

El repo fuente es:

- `/home/felipe/platform_paas`

Los runtimes reales son:

- `staging`: `/opt/platform_paas_staging`
- `production`: `/opt/platform_paas`

Por eso:

- cambiar código en el repo no lo deja activo en ningún ambiente
- el cambio solo existe en un ambiente cuando se despliega a su árbol runtime
- desde este corte, el wrapper backend ya puede promover automáticamente `backend/` desde el repo fuente al árbol runtime antes de correr tests, restart y gate post-deploy

## Archivos base

- [deploy/deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh)
- [deploy/deploy_backend_production.sh](/home/felipe/platform_paas/deploy/deploy_backend_production.sh)
- [deploy/check_backend_release_readiness.sh](/home/felipe/platform_paas/deploy/check_backend_release_readiness.sh)
- [deploy/verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh)
- [deploy/rollback_backend.sh](/home/felipe/platform_paas/deploy/rollback_backend.sh)

## Flujo correcto de release

1. validar localmente en el repo
2. desplegar a `staging`
3. ejecutar convergencia post-deploy
4. revisar auditoría activa por tenant
5. promover a `production`
6. repetir convergencia y auditoría en `production`

## Deploy manual desde servidor

Preflight recomendado:

```bash
PROJECT_ROOT=/opt/platform_paas \
ENV_FILE=/opt/platform_paas/.env \
EXPECTED_APP_ENV=production \
SERVICE_NAME=platform-paas-backend \
REQUIRE_FRONTEND_DIST=true \
bash deploy/check_backend_release_readiness.sh
```

Wrappers normales:

```bash
bash deploy/deploy_backend_staging.sh
bash deploy/deploy_backend_production.sh
```

## Qué hace hoy un deploy backend

El wrapper:

- promueve `backend/` desde `SOURCE_REPO_ROOT` hacia `PROJECT_ROOT/backend` cuando ambos árboles no son el mismo
- valida `.env` y runtime base
- corre migraciones de control
- ejecuta pruebas backend
- reinicia el servicio objetivo
- valida `systemd` y `/health`
- corre convergencia post-deploy sobre tenants activos:
  - schema sync
  - seed de defaults
  - repair `maintenance -> finance`
  - audit activo por tenant

## Interpretación correcta del resultado

Hay dos capas de resultado:

### 1. Servicio

- backend `active`
- `healthcheck` OK

### 2. Tenants

- convergencia tenant-local
- auditoría crítica por tenant

Esto evita el error clásico de pensar:

- "el deploy salió bien, entonces todos los tenants quedaron bien"

Eso no es cierto si un tenant tiene:

- credenciales DB rotas
- password ausente
- secuencia PK desfasada
- defaults legacy faltantes

## Modo estricto

Por defecto el deploy usa convergencia no estricta:

- `BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=false`

Con eso:

- el servicio puede quedar sano aunque un tenant siga con warnings

Si quieres que cualquier drift crítico tumbe el release:

```bash
BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=true bash deploy/deploy_backend_production.sh
```

## Cuándo conviene rollback

Rollback si:

- el servicio no levanta
- `healthcheck` falla
- la release introdujo un bug de código o migración general

No conviene rollback inmediato si:

- el problema es de un tenant puntual
- el servicio general está sano
- la auditoría muestra drift tenant-local reparable

En ese caso conviene:

- reparar el tenant
- volver a correr convergencia y auditoría

## Rollback manual

Script:

- [deploy/rollback_backend.sh](/home/felipe/platform_paas/deploy/rollback_backend.sh)

Uso:

```bash
PROJECT_ROOT=/opt/platform_paas \
ENV_FILE=/opt/platform_paas/.env \
SERVICE_NAME=platform-paas-backend \
EXPECTED_APP_ENV=production \
SOURCE_REPO_ROOT=/home/felipe/platform_paas \
bash deploy/rollback_backend.sh v1.2.3
```

## Cómo funciona hoy el rollback

El rollback ya no asume que `PROJECT_ROOT=/opt/...` es un checkout git.

Ahora:

- el checkout git se mueve en `SOURCE_REPO_ROOT`
- el runtime afectado sigue siendo `PROJECT_ROOT`
- luego el wrapper normal vuelve a promover `backend/` desde esa ref al runtime real

Esto evita depender de que `/opt/platform_paas` o `/opt/platform_paas_staging` sean repos git utilizables.

Guardrails actuales:

- si `SOURCE_REPO_ROOT` no es git, el rollback falla
- si el repo fuente tiene cambios locales, el rollback falla por defecto
- solo si hace falta forzarlo, se puede usar:
  - `ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK=true`
  - `ROLLBACK_GIT_FETCH=false`

## Smoke corto opcional después del deploy o rollback

El gate post-deploy ya puede correr además un smoke remoto corto y guardar su reporte JSON dentro de `operational_evidence/`.

Variables útiles:

- `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`
- `REMOTE_BACKEND_SMOKE_BASE_URL=https://orkestia.ddns.net`
- `REMOTE_BACKEND_SMOKE_TARGET=all`
- `REMOTE_BACKEND_SMOKE_STRICT=true`
- `REMOTE_BACKEND_SMOKE_REPORT_PATH=/opt/platform_paas/operational_evidence/remote_backend_smoke_<timestamp>.json`

Si ese smoke falla:

- con `REMOTE_BACKEND_SMOKE_STRICT=true`, el gate falla
- con `REMOTE_BACKEND_SMOKE_STRICT=false`, deja `WARNING` pero sigue recolectando evidencia

Decisión operativa actual:

- para `staging` y `production`, el smoke corto repetible hoy es `REMOTE_BACKEND_SMOKE_TARGET=base`
- ese target ya quedó revalidado en ambos carriles con:
  - `staging` -> `http://127.0.0.1:8200`
  - `production` -> `http://127.0.0.1:8000`
- el smoke autenticado completo (`platform`/`tenant`/`all`) sigue siendo optativo hasta que las credenciales se inyecten por un canal seguro y mantenible

## Recomendación operativa

- probar siempre primero en `staging`
- lanzar el wrapper desde el repo fuente cuando `PROJECT_ROOT` apunte a `/opt/...`
- no promover a `production` solo porque el servicio subió
- revisar la auditoría de tenants activos
- dejar evidencia operativa archivada
- tratar como incidencia distinta:
  - falla de servicio
  - drift tenant-local

## Limitaciones actuales

- `staging` todavía puede quedar desalineado si algunos tenants tienen credenciales DB rotas
- el gate no corrige automáticamente secretos runtime faltantes por tenant
- el rollback sigue siendo de código; no revierte migraciones de datos

## Siguiente evolución natural

- endurecer `staging` hasta tener auditoría verde en todos los tenants activos del ambiente
- agregar promoción más explícita entre `staging` y `production`
- usar el modo estricto cuando el carril de `staging` esté completamente saneado
