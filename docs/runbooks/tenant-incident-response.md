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

## Regla previa crítica 2: backup antes de mutar datos tenant

Antes de modificar datos de cualquier tenant en:

- `development`
- `staging`
- `production`

se debe tomar un backup PostgreSQL del tenant afectado.

Aplica antes de:

- imports
- backfills
- seeds correctivos
- repairs
- scripts manuales
- SQL directo
- recreación o repoblado de la DB tenant

Regla de cierre:

- si el cambio reemplaza o recrea datos, el cierre exige restaurar los datos desde el backup inmediato previo y recién después reaplicar la modificación que se quería dejar
- si el cambio es in-place y no destructivo, no se restaura por reflejo; se conserva el backup y se valida que los datos previos sigan intactos

Caso especial:

- `ieris-ltda` debe tratarse como tenant sensible; cualquier mutación exige backup previo explícito y verificación posterior contra ese punto de control

## Paso 1. Distinguir el tipo de incidente

Antes de tocar código, clasifica el problema:

- `frontend/caché`
- `runtime publicado`
- `schema tenant`
- `credenciales DB tenant`
- `defaults o convergencia`

Y antes de ejecutar la mutación correctiva:

- generar backup técnico del tenant afectado
- registrar el archivo usado como punto de control

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
- clasificar rápido la causa operativa cuando un tenant falla
- distinguir aparte si el ambiente quedó sano pero todavía arrastra `notes` no críticas
- permitir guardar o compartir el estado del ambiente en JSON cuando haga falta comparar carriles o dejar evidencia
- causas clasificadas hoy:
  - `invalid_db_credentials`
  - `db_unreachable`
  - `schema_incomplete`
  - `unknown_error`

Salidas útiles:

- texto por consola para diagnóstico rápido
- `--format json` o `--json-output-file` cuando se necesita snapshot estructurado por ambiente

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
- [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py)

Uso recomendado por tenant:

1. `repair_tenant_operational_drift.py --tenant-slug <slug> --audit-only`
2. si el pre-audit falla por `invalid_db_credentials`, usar `repair_tenant_operational_drift.py --tenant-slug <slug> --auto-rotate-if-invalid-credentials`
3. si el mismo slug existe en otro carril del mismo host y ya hay una credencial válida en un ambiente, sincronizar el secreto hacia el carril hermano sin volver a rotar:
   `repair_tenant_operational_drift.py --tenant-slug <slug> --sync-env-file /ruta/al/.tenant-secrets.env --skip-schema-sync --skip-seed-defaults --skip-maintenance-finance-repair`

Antes de ejecutar esa sincronización, leer la línea `secret_posture ...` que imprime el script:

- confirma cuál es el `TENANT_SECRETS_FILE` efectivo del carril
- deja visible si el target adicional es runtime, legacy o custom
- si el target es el `.env` legacy, usarlo solo como excepción explícita con `--allow-legacy-env-sync`

## Paso 5. Si el problema es credencial DB tenant

Ruta recomendada:

- preferir el flujo canónico por tenant: `repair_tenant_operational_drift.py --tenant-slug <slug> --auto-rotate-if-invalid-credentials`
- si hace falta intervención manual, rotar credencial técnica del tenant desde el servicio canónico (`TenantService.rotate_tenant_db_credentials(...)`) o desde la consola si ya existe la acción operativa visible

Después:

1. volver a correr convergencia
2. reauditar tenants activos

## Paso 6. Secuencia canónica de recuperación

Orden oficial:

0. backup PostgreSQL del tenant afectado
1. `repair_tenant_operational_drift.py --tenant-slug <slug> --audit-only`
2. si el tenant falla por credencial inválida o drift tenant-local, usar `repair_tenant_operational_drift.py --tenant-slug <slug> --auto-rotate-if-invalid-credentials`
3. si se trabaja manualmente o de forma masiva, seguir esta secuencia:
4. `sync_active_tenant_schemas.py`
5. `seed_missing_tenant_defaults.py --apply`
6. `repair_maintenance_finance_sync.py --all-active --limit 100`
7. `audit_active_tenant_convergence.py --all-active --limit 100`

Si el audit termina con `failed=0` y `warnings=0` pero muestra `tenants_with_notes > 0`, tratarlo como convergencia incompleta no crítica, no como incidente duro de runtime.

Si al rotar en `staging` se rompe `production` o viceversa:

- asumir primero que el rol PostgreSQL puede estar compartido entre carriles
- no volver a rotar dos veces por reflejo
- preferir sincronizar el `TENANT_DB_PASSWORD__<SLUG>` válido hacia el `TENANT_SECRETS_FILE` del otro ambiente
- no reutilizar el `.env` legacy como target por defecto; si se hace por compatibilidad temporal, dejarlo explícito con `--allow-legacy-env-sync`

Si el audit muestra `legacy_finance_base_currency:USD`:

- no tratarlo como `missing defaults`
- significa que el tenant ya tiene uso financiero y sigue operando con base legacy `USD`
- el seed post-deploy ya no intenta corregirlo automáticamente
- correr además [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) para ver:
  - `migration_readiness`
  - `legacy_base_transaction_summary`
  - `loan_counts_by_currency`
  - `exchange_rate_pair_summary`
- si `migration_readiness.status=blocked`, no tocar runtime automáticamente:
  - significa que aún falta política de revalorización histórica y/o criterio explícito para cuentas y préstamos
  - el siguiente paso correcto es decidir una migración guiada formal o aceptar la convivencia legacy

Si el audit muestra `accepted_legacy_finance_base_currency:USD`:

- no tratarlo como incidente ni como deuda abierta de convergencia
- significa que el tenant quedó explícitamente aceptado en convivencia legacy
- el auditor específico debe devolver:
  - `recommendation=accepted_legacy_coexistence`
  - `readiness.status=accepted_legacy`
- no tocar runtime automáticamente salvo que se decida abrir más adelante una migración formal `USD -> CLP`

Si el audit muestra `finance_base_currency_mismatch:CLP!=USD`:

- no tratarlo como el mismo caso legacy `USD`
- significa que `finance_currencies.is_base` y `finance_settings.base_currency_code` ya no apuntan a la misma base
- correr antes el auditor específico [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) para ver:
  - moneda base efectiva
  - setting declarado
  - uso real por moneda
  - recomendación operativa por tenant
- si la recomendación sale `repair_base_currency_setting_only`, usar [repair_finance_base_currency_mismatch.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_base_currency_mismatch.py) para alinear `base_currency_code` sin tocar transacciones
- si no, el siguiente paso correcto pasa a ser preparar una transición guiada o revisión manual, no resembrar defaults

## Paso 7. Confirmar cierre real

No dar el incidente por cerrado sin:

- tenant operando otra vez en UI
- auditoría del ambiente sin fallos críticos
- documentación viva actualizada

## Qué registrar al cerrar

- ambiente afectado
- tenant realmente roto
- backup previo usado como punto de control
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
