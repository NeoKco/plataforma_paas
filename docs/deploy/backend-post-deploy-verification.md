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
- clasificación de fallos tenant por causa operativa (`invalid_db_credentials`, `db_unreachable`, `schema_incomplete`, `unknown_error`)
- resumen explícito de tenants convergidos con notas no críticas (`tenants_with_notes`, `notes_by_reason`)

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

Ejemplo para `staging`:

```bash
SERVICE_NAME=platform-paas-backend-staging \
PROJECT_ROOT=/opt/platform_paas_staging \
HEALTHCHECK_URL=http://127.0.0.1/health \
MAX_ATTEMPTS=15 \
SLEEP_SECONDS=2 \
bash deploy/verify_backend_deploy.sh
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
