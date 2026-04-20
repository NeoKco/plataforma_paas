# Respuesta a Incidentes Tenant

Este runbook unifica el diagnóstico y recuperación de tenants cuando aparece un problema operativo real en `platform_admin` o en `tenant_portal`.

## Cuándo usarlo

Usar este runbook si ves síntomas como:

- `Este tenant no está disponible por un problema operativo`
- `Esquema tenant: Internal server error`
- login tenant roto solo en uno o algunos tenants
- un tenant sano y otro roto en el mismo ambiente
- sospecha de drift entre repo, runtime o credenciales DB tenant

## Regla previa crítica

Si vas a ejecutar scripts del repo usando el `.env` de runtime:

1. usa `set -a`
2. luego `source /opt/platform_paas/.env` o `source /opt/platform_paas_staging/.env.staging`

Sin `set -a`, variables como `TENANT_SECRETS_FILE` pueden no exportarse y producir falsos negativos en auditorías tenant.

## Paso 1. Distinguir el tipo de incidente

Antes de tocar código, clasifica el problema:

- `frontend/caché`
- `runtime publicado`
- `schema tenant`
- `credenciales DB tenant`
- `defaults o convergencia`

No asumir que el error vive en repo.

## Paso 2. Verificar salud del ambiente

Comprobar:

- `healthcheck`
- backend activo
- ambiente correcto (`staging` o `production`)

Si el servicio está sano y el error es solo por tenant, pasar al paso 3.

## Paso 3. Auditar tenants activos

Script canónico:

- [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)

Objetivo:

- identificar qué tenants están realmente rotos
- evitar atribuir el problema al tenant equivocado

## Paso 4. Diferenciar causa tenant-local

Leer si el problema es:

- `schema` desalineado
- `maintenance -> finance` roto
- defaults faltantes
- credenciales DB tenant desalineadas

Herramientas canónicas:

- [sync_active_tenant_schemas.py](/home/felipe/platform_paas/backend/app/scripts/sync_active_tenant_schemas.py)
- [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
- [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)

## Paso 5. Si el problema es credencial DB tenant

Ruta recomendada:

- rotar credencial técnica del tenant desde el servicio canónico (`TenantService.rotate_tenant_db_credentials(...)`) o desde la consola si ya existe la acción operativa visible

Después:

1. volver a correr convergencia
2. reauditar tenants activos

## Paso 6. Secuencia canónica de recuperación

Orden oficial:

1. `sync_active_tenant_schemas.py`
2. `seed_missing_tenant_defaults.py --apply`
3. `repair_maintenance_finance_sync.py --all-active --limit 100`
4. `audit_active_tenant_convergence.py --all-active --limit 100`

## Paso 7. Confirmar cierre real

No dar el incidente por cerrado sin:

- tenant operando otra vez en UI
- auditoría del ambiente sin fallos críticos
- documentación viva actualizada

## Qué registrar al cerrar

- ambiente afectado
- tenant realmente roto
- causa real
- comando o reparación aplicada
- resultado final de auditoría
- si hubo falso negativo o diagnóstico incorrecto inicial

## Regla final

Si un tenant parece roto pero la auditoría no cuadra, revisar primero:

- `set -a`
- `.env` runtime correcto
- `TENANT_SECRETS_FILE` exportado
- frontend cache/bundles publicados

Antes de reabrir un slice funcional.
