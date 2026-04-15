# Maintenance Imports

Esta carpeta documenta la migracion legacy desde `ieris_app` hacia `business-core` y `maintenance`.

Script principal:

- [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)
- [import_ieris_historical_maintenance_only.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_historical_maintenance_only.py)
- [remove_duplicate_legacy_historical_work_orders.py](/home/felipe/platform_paas/backend/app/scripts/remove_duplicate_legacy_historical_work_orders.py)
- [cleanup_business_core_legacy_site_notes.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_business_core_legacy_site_notes.py)

Comportamiento:

- usa la BD de `ieris_app` solo como fuente
- escribe en la BD tenant del PaaS
- corre en `dry-run` por defecto
- requiere `--apply` para persistir cambios
- genera un reporte JSON en `tmp/` por defecto
- no debe copiar ids o trazas legacy a campos visibles para usuario como `reference_notes`
- para `business_sites`, una corrida posterior tambien puede corregir registros legacy ya importados si detecta que `comuna`, `ciudad` o `region` quedaron mal asignadas
- tambien sanea placeholders heredados como `Sin Mail`, `Sin Fono` o `Sin contacto`, convirtiendolos en `null` o eliminando contactos falsos si no contienen datos reales

Precondicion obligatoria:

- el tenant destino ya debe tener aplicadas las migraciones de:
  - `business-core`
  - `maintenance`

Validacion ya realizada:

- `dry-run` validado contra la BD legacy `kanban_db`
- tenant destino validado: `empresa-bootstrap`
- tenant destino validado tambien: `empresa-demo`
- antes de esa corrida se aplicaron en ese tenant:
  - `0015_business_core_base`
  - `0016_maintenance_base`
  - `0017_business_core_taxonomy`
- luego `empresa-demo` tambien se alineo a `0018_business_core_site_commune`
- `--apply` ejecutado con exito sobre `empresa-bootstrap`
- `--apply` ejecutado con exito sobre `empresa-demo`
- segunda corrida en `dry-run` validada como idempotente
- luego se reaplico `--apply` para corregir direcciones legacy ya existentes y normalizar `commune/city/region` en `empresa-bootstrap`

Comando recomendado de validacion:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_ieris_business_core_maintenance.py \
  --tenant-slug empresa-bootstrap
```

Comando recomendado de aplicacion:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_ieris_business_core_maintenance.py \
  --tenant-slug empresa-bootstrap \
  --apply
```

Si solo necesitas traer `historico_mantenciones` desde `ieris_app` a un tenant ya poblado, usa el wrapper histórico:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_ieris_historical_maintenance_only.py \
  --tenant-slug ieris-ltda
```

Aplicación real:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_ieris_historical_maintenance_only.py \
  --tenant-slug ieris-ltda \
  --apply
```

Notas operativas del wrapper histórico:

- fuerza `mantenciones=[]` para no importar órdenes activas/base
- sí permite completar catálogos y relaciones mínimas que el histórico necesita:
  - organizaciones
  - clientes
  - contactos
  - sitios
  - perfiles funcionales
  - instalaciones
- usa verificación `best_effort` porque en tenants ya poblados no aplica `source == processed`

Validación real ya ejecutada en `production` sobre `ieris-ltda`:

- `historico_mantenciones` fuente: `113`
- creados en tenant destino:
  - `historical_work_orders=113`
  - `historical_status_logs=113`
  - `historical_visits=113`

Si el tenant destino ya tenía OT cerradas previas y necesitas limpiar duplicados funcionales del histórico legacy recién importado:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/remove_duplicate_legacy_historical_work_orders.py \
  --tenant-slug ieris-ltda
```

Aplicación real:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/remove_duplicate_legacy_historical_work_orders.py \
  --tenant-slug ieris-ltda \
  --apply
```

Notas del cleanup de duplicados:

- sólo considera work orders legacy `LEGACY-HIST-MAINT-*`
- conserva la OT no legacy ya existente
- elimina únicamente la duplicada legacy
- usa como criterio operativo:
  - cliente
  - dirección
  - fecha de cierre

Validación real ya ejecutada en `production` sobre `ieris-ltda`:

- `duplicates_detected=3`
- `duplicates_deleted=3`
- verificación posterior:
  - `closed_total=114`
  - `legacy_total=110`
  - `history_total=114`

Si un tenant ya fue importado con notas legacy visibles en direcciones:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/cleanup_business_core_legacy_site_notes.py \
  --tenant-slug empresa-bootstrap \
  --apply
```

Salida:

- reporte JSON por defecto en:
  - `/home/felipe/platform_paas/tmp/ieris_business_core_maintenance_import_report.json`
- el reporte incluye `status: ok` cuando la corrida termina bien y `status: error` cuando falla
- en modo exitoso tambien incluye un bloque `verification` con validaciones de consistencia entre fuente y resultado

Alcance del importador inicial:

- `business_organizations`
- `business_clients`
- `business_contacts`
- `business_sites`
- `business_function_profiles`
- `business_work_groups`
- `business_task_types`
- `maintenance_equipment_types`
- `maintenance_installations`
- `maintenance_work_orders`
- `maintenance_status_logs`
- `maintenance_visits`

Pendiente posterior:

- `business_work_group_members`
- mapeo de usuarios legacy a usuarios tenant reales
- activos compartidos si `asset-core` se abre despues
- si se migra a otro tenant, repetir primero `dry-run` y luego `--apply`
