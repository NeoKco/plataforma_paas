# Backend Release y Rollback

Esta guia deja una base minima para ejecutar despliegues manuales asistidos y rollback de backend sin depender de pasos improvisados.

## Objetivo

- tener un camino claro para desplegar una ref concreta
- dejar un rollback reproducible ante una regresion
- preparar una base para evolucionar despues a CD mas robusto

## Archivos Base

- `deploy/rollback_backend.sh`
- `deploy/verify_backend_deploy.sh`
- `deploy/run_backend_post_deploy_gate.sh`
- `deploy/collect_backend_operational_evidence.sh`
- `deploy/run_remote_backend_smoke.py`
- `.github/workflows/backend-deploy.yml`

## Deploy Manual desde Servidor

Ya existe el flujo base por wrapper:

```bash
bash deploy/deploy_backend_staging.sh
bash deploy/deploy_backend_production.sh
```

Ese flujo:

- valida variables de entorno
- corre migraciones de control
- ejecuta pruebas backend base
- reinicia el servicio objetivo
- verifica `systemd` y `/health` antes de dar el deploy por bueno
- encola ademas auto-sync masivo de schema tenant para tenants activos con DB configurada
- deja evidencia operativa local despues del gate post-deploy, tanto en exito como en fallo, salvo que `COLLECT_OPERATIONAL_EVIDENCE=false`

## Rollback Manual en Servidor

Script:

- `deploy/rollback_backend.sh`

Uso:

```bash
PROJECT_ROOT=/opt/platform_paas \
ENV_FILE=/opt/platform_paas/.env \
SERVICE_NAME=platform-paas-backend \
EXPECTED_APP_ENV=production \
bash deploy/rollback_backend.sh v1.2.3
```

Que hace:

- entra al repositorio del servidor
- hace `git fetch --all --tags --prune`
- hace `git checkout <ref>`
- vuelve a ejecutar el deploy backend sobre esa ref

Precaucion:

- el rollback asume que el directorio del servidor es un checkout git funcional
- el rollback no revierte migraciones de DB; solo revierte codigo y reaplica el deploy

## Workflow Manual de Deploy

Archivo:

- `.github/workflows/backend-deploy.yml`

Tipo:

- `workflow_dispatch`

Inputs:

- `environment`: `staging` o `production`
- `git_ref`: branch, tag o commit a desplegar
- `collect_evidence`: activa o desactiva la evidencia operativa post-deploy
- `run_remote_smoke`: activa o desactiva el smoke funcional remoto tras el deploy

Secrets esperados en GitHub:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PROJECT_ROOT`

Secrets recomendados por entorno para smoke remoto:

- `BACKEND_PUBLIC_BASE_URL`
- `SMOKE_PLATFORM_EMAIL`
- `SMOKE_PLATFORM_PASSWORD`
- `SMOKE_TENANT_SLUG`
- `SMOKE_TENANT_EMAIL`
- `SMOKE_TENANT_PASSWORD`

Que hace la plantilla:

- abre SSH al servidor
- hace `git fetch`
- hace `git checkout` de la ref pedida
- ejecuta el wrapper de deploy correcto segun entorno
- puede correr un smoke funcional remoto contra la URL publica del entorno si `run_remote_smoke=true`
- intenta descargar la evidencia operativa mas reciente como artefacto del job para facilitar revision remota

## Recomendacion Operativa

- usar tags para production cuando sea posible
- probar primero la ref en `staging`
- no considerar exitoso un deploy si falla la verificacion post-deploy
- no considerar exitoso un deploy si falla el auto-sync post-deploy cuando ese paso esta habilitado
- si una release falla por codigo, usar rollback a la tag previa
- si la falla es de datos o migraciones, evaluar restore antes de solo hacer rollback de codigo

## Limites de Esta Base

- no existe aun aprobacion manual entre jobs
- no existe rollback automatico
- no existe estrategia de migraciones reversibles
- no existe promotion pipeline entre `staging` y `production`

## Siguiente Evolucion Natural

- separar job de `build/test` y job de `deploy`
- exigir aprobacion manual para production
- desplegar solo tags firmadas o releases
- agregar checks posteriores al deploy y rollback asistido
