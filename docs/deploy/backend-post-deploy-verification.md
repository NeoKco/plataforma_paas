# Verificación Post-Deploy Backend

Esta guía define la verificación correcta después de desplegar backend en un ambiente real. El punto clave es este:

- `repo` no es `runtime`
- `servicio sano` no equivale a `tenants convergidos`

## Objetivo

- confirmar que el servicio subió
- confirmar que el `healthcheck` responde
- ejecutar convergencia post-deploy sobre tenants activos
- auditar drift crítico por tenant antes de dar el deploy por cerrado

## Archivos base

- [deploy/verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh)
- [deploy/run_backend_post_deploy_gate.sh](/home/felipe/platform_paas/deploy/run_backend_post_deploy_gate.sh)
- [deploy/collect_backend_operational_evidence.sh](/home/felipe/platform_paas/deploy/collect_backend_operational_evidence.sh)
- [backend/app/scripts/sync_active_tenant_schemas.py](/home/felipe/platform_paas/backend/app/scripts/sync_active_tenant_schemas.py)
- [backend/app/scripts/seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
- [backend/app/scripts/repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
- [backend/app/scripts/audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)
- [backend/app/scripts/repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py)
- [backend/app/scripts/audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py)
- [backend/app/scripts/repair_finance_base_currency_mismatch.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_base_currency_mismatch.py)

## Qué valida hoy

Primero valida capa servicio:

- `systemd` en estado `active`
- endpoint `/health` respondiendo `200`
- estabilidad durante varios intentos cortos

Luego valida capa tenant:

- `tenant schema sync` para tenants activos con DB configurada
- seed de defaults faltantes (`core`/`finance`) cuando corresponde
- reparación `maintenance -> finance` para OT cerradas sin movimientos
- auditoría crítica por tenant activo
- snapshot JSON reutilizable del estado del ambiente y de cada tenant auditado
- clasificación de fallos tenant por causa operativa (`invalid_db_credentials`, `db_unreachable`, `schema_incomplete`, `unknown_error`)
- resumen explícito de tenants convergidos con notas no críticas (`tenants_with_notes`, `notes_by_reason`)
- resumen separado de notas operativas aceptadas (`accepted_tenants_with_notes`, `accepted_notes_by_reason`)

## Uso básico

```bash
SERVICE_NAME=platform-paas-backend \
HEALTHCHECK_URL=http://127.0.0.1/health \
bash deploy/verify_backend_deploy.sh
```

Variables útiles:

- `MAX_ATTEMPTS`
- `SLEEP_SECONDS`
- `PROJECT_ROOT`
- `VENV_PYTHON`
- `BACKEND_AUTO_SYNC_POST_DEPLOY`
- `BACKEND_AUTO_SYNC_LIMIT`
- `BACKEND_POST_DEPLOY_SEED_DEFAULTS`
- `BACKEND_POST_DEPLOY_REPAIR_MAINTENANCE_FINANCE`
- `BACKEND_POST_DEPLOY_AUDIT_ACTIVE_TENANTS`
- `BACKEND_POST_DEPLOY_CONVERGENCE_STRICT`
- `BACKEND_POST_DEPLOY_AUDIT_OUTPUT_DIR`
- `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY`
- `REMOTE_BACKEND_SMOKE_BASE_URL`
- `REMOTE_BACKEND_SMOKE_TARGET`
- `REMOTE_BACKEND_SMOKE_TIMEOUT_SECONDS`
- `REMOTE_BACKEND_SMOKE_ATTEMPTS`
- `REMOTE_BACKEND_SMOKE_RETRY_DELAY_SECONDS`
- `REMOTE_BACKEND_SMOKE_STRICT`
- `REMOTE_BACKEND_SMOKE_REPORT_PATH`

Ejemplo para `staging`:

```bash
SERVICE_NAME=platform-paas-backend-staging \
PROJECT_ROOT=/opt/platform_paas_staging \
HEALTHCHECK_URL=http://127.0.0.1/health \
MAX_ATTEMPTS=15 \
SLEEP_SECONDS=2 \
bash deploy/verify_backend_deploy.sh
```

Si además quieres exigir smoke funcional corto contra la URL publicada:

```bash
PROJECT_ROOT=/opt/platform_paas \
RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true \
REMOTE_BACKEND_SMOKE_BASE_URL=https://orkestia.ddns.net \
REMOTE_BACKEND_SMOKE_TARGET=base \
REMOTE_BACKEND_SMOKE_STRICT=true \
bash deploy/run_backend_post_deploy_gate.sh
```

## Comportamiento actual del gate

Después del `healthcheck`, el script corre en este orden:

1. `sync_active_tenant_schemas.py`
2. `seed_missing_tenant_defaults.py --apply`
3. `repair_maintenance_finance_sync.py --all-active`
4. `audit_active_tenant_convergence.py --all-active`

Esto corrige dos problemas reales del proyecto:

- que un cambio exista en código pero no haya sido convergido por tenant
- que un tenant quede roto aunque el servicio general esté sano

Si el gate deja un tenant fallando por drift puntual, la herramienta canónica de recuperación por tenant es:

```bash
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/opt/platform_paas/backend
./platform_paas_venv/bin/python backend/app/scripts/repair_tenant_operational_drift.py \
  --tenant-slug <slug> \
  --auto-rotate-if-invalid-credentials
```

Además, desde este corte el gate deja dos lecturas operativas separadas:

- `WARNING` con sugerencia de comando cuando detecta drift recuperable por `invalid_db_credentials` o `schema_incomplete`
- `NOTICE` cuando el ambiente queda sano pero todavía arrastra `notes` no críticas de defaults o convergencia parcial
- `NOTICE` distinto cuando el ambiente solo arrastra `accepted notes` ya institucionalizadas

Y además deja un snapshot JSON en:

- `${BACKEND_POST_DEPLOY_AUDIT_OUTPUT_DIR:-$PROJECT_ROOT/operational_evidence}/active_tenant_convergence_<timestamp>.json`

Ese snapshot incluye:

- `overall_status`
- resumen agregado del ambiente
- `failed_by_reason`
- `notes_by_reason`
- `accepted_notes_by_reason`
- detalle por tenant auditado

Si el smoke remoto está habilitado, además deja:

- `${PROJECT_ROOT}/operational_evidence/remote_backend_smoke_<timestamp>.json`

Ese reporte resume:

- `base_url`
- `target`
- checks ejecutados
- `status=passed|failed`
- error final cuando corresponde

Decisión operativa vigente:

- `target=base` ya quedó validado en `staging` y `production` como smoke corto repetible del carril
- ese smoke puede tratarse como obligatorio por ambiente cuando el release quiera exigir evidencia mínima adicional sobre el servicio publicado
- `target=platform` o `target=all` siguen siendo `opt-in` mientras las credenciales no vivan en un canal seguro y repetible del entorno o del pipeline
- desde este corte, los wrappers por ambiente ya lo activan por defecto:
  - [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) -> `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`, `REMOTE_BACKEND_SMOKE_TARGET=base`, `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8200`
  - [deploy_backend_production.sh](/home/felipe/platform_paas/deploy/deploy_backend_production.sh) -> `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`, `REMOTE_BACKEND_SMOKE_TARGET=base`, `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8000`

Desde este corte, una `note` como `legacy_finance_base_currency:USD` significa algo distinto a un seed faltante:

- el tenant tiene uso financiero y conserva `USD` como base legacy
- el gate ya no intenta resembrar `finance` inútilmente en cada deploy
- la decisión pendiente pasa a ser de migración/compatibilidad, no de convergencia básica

Si la `note` pasa a ser `accepted_legacy_finance_base_currency:USD`:

- no tratarla como deuda abierta del deploy
- significa que el tenant quedó explícitamente aceptado en convivencia legacy
- el auditor específico debe devolver `recommendation=accepted_legacy_coexistence`
- la convergencia crítica del ambiente puede seguir considerándose cerrada aunque esa señal siga visible

Si el audit deja `finance_base_currency_mismatch:CLP!=USD`:

- no tratarlo como tenant legacy `USD`
- significa que la base efectiva en `finance_currencies` y el `base_currency_code` del setting ya no coinciden
- antes de tocar datos, correr el auditor específico:

```bash
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/opt/platform_paas/backend
./platform_paas_venv/bin/python backend/app/scripts/audit_legacy_finance_base_currency.py \
  --tenant-slug <slug>
```

- la decisión pendiente pasa a ser de reparación de metadata/configuración o transición guiada, no de seed faltante

Si el auditor específico devuelve `recommendation=repair_base_currency_setting_only`, la reparación canónica pasa a ser:

```bash
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/opt/platform_paas/backend
./platform_paas_venv/bin/python backend/app/scripts/repair_finance_base_currency_mismatch.py \
  --tenant-slug <slug> \
  --apply
```

Después, revalidar con:

```bash
./platform_paas_venv/bin/python backend/app/scripts/audit_active_tenant_convergence.py \
  --all-active --limit 100
```

Si la reparación se ejecuta en un solo carril y el mismo tenant se invalida en el otro:

- no asumir dos incidentes distintos
- comprobar si ambos ambientes comparten el mismo rol PostgreSQL tenant
- si ya existe una credencial válida en uno de los carriles, sincronizarla al otro `TENANT_SECRETS_FILE` con:

```bash
set -a
source /opt/platform_paas_staging/.env.staging
set +a
export PYTHONPATH=/opt/platform_paas_staging/backend
./platform_paas_venv/bin/python backend/app/scripts/repair_tenant_operational_drift.py \
  --tenant-slug <slug> \
  --sync-env-file /opt/platform_paas/.tenant-secrets.env \
  --skip-schema-sync \
  --skip-seed-defaults \
  --skip-maintenance-finance-repair
```

Desde este corte:

- el script imprime `secret_posture ...` antes de reparar para dejar visible el archivo runtime de secretos, el `.env` legacy y los targets extra de sincronización
- si se intenta usar el `.env` legacy como target de `--sync-env-file`, hace falta `--allow-legacy-env-sync`
- el camino normal sigue siendo sincronizar hacia el `TENANT_SECRETS_FILE` del otro carril, no hacia su `.env`

## Modo estricto vs no estricto

Por defecto:

- `BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=false`

Eso significa:

- si una convergencia falla para un tenant, el deploy deja warning
- el servicio puede seguir sano y publicado
- la evidencia operativa debe revisarse y el tenant debe repararse después

Modo estricto:

```bash
BACKEND_POST_DEPLOY_CONVERGENCE_STRICT=true bash deploy/verify_backend_deploy.sh
```

Con eso:

- cualquier falla de convergencia o auditoría hace fallar el gate
- si además está habilitado el smoke remoto y `REMOTE_BACKEND_SMOKE_STRICT=true`, también falla por smoke funcional corto

## Qué no debe asumirse

- que editar `/home/felipe/platform_paas` actualiza automáticamente:
  - `/opt/platform_paas`
  - `/opt/platform_paas_staging`
- que un `523 tests OK` garantiza consistencia tenant-local
- que si `empresa-demo` funciona, entonces `ieris-ltda` también debe funcionar sin revisar drift técnico

## Evidencia operativa

El gate deja evidencia con:

- `systemctl status`
- `journalctl` reciente
- respuesta del `healthcheck`
- resultado de los pasos de convergencia
- snapshot JSON de `audit_active_tenant_convergence.py` cuando se ejecuta la auditoría activa

Ubicación típica:

- `production`: `/opt/platform_paas/operational_evidence/`
- `staging`: `/opt/platform_paas_staging/operational_evidence/`

## Cuándo hacer rollback

Rollback recomendado si:

- el servicio no queda `active`
- `/health` no responde tras reintentos
- el problema es código o migración y no solo drift tenant-local

No hacer rollback automático solo porque un tenant falló en convergencia si:

- el servicio general quedó sano
- el gate corre en modo no estricto
- la falla es puntual de credenciales o runtime tenant

En ese caso, primero revisar evidencia y reparar el tenant.

## Guías relacionadas

- [backend-release-and-rollback.md](/home/felipe/platform_paas/docs/deploy/backend-release-and-rollback.md)
- [environment-strategy.md](/home/felipe/platform_paas/docs/deploy/environment-strategy.md)
