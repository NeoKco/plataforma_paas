# Maintenance Imports

Esta carpeta documenta la migracion legacy desde `ieris_app` hacia `business-core` y `maintenance`.

Script principal:

- [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)

Comportamiento:

- usa la BD de `ieris_app` solo como fuente
- escribe en la BD tenant del PaaS
- corre en `dry-run` por defecto
- requiere `--apply` para persistir cambios
- genera un reporte JSON en `tmp/` por defecto

Precondicion obligatoria:

- el tenant destino ya debe tener aplicadas las migraciones de:
  - `business-core`
  - `maintenance`

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

Salida:

- reporte JSON por defecto en:
  - `/home/felipe/platform_paas/tmp/ieris_business_core_maintenance_import_report.json`

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
