# PostgreSQL Backup y Restore

Esta guia deja una base minima para respaldar y restaurar PostgreSQL en un entorno Debian, cubriendo tanto `platform_control` como las bases tenant.

Importante:

- este flujo sigue siendo el respaldo técnico canónico
- no debe confundirse con el export/import tenant en `CSV + manifest`
- la Fase 1 de export portable ya existe en `platform_admin > Tenants`, pero no reemplaza este backup técnico
- el diseño de portabilidad tenant queda en [TENANT_DATA_PORTABILITY_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md)

## Archivos Base

- `infra/postgres/backups/backup_platform_control.sh`
- `infra/postgres/backups/restore_platform_control.sh`
- `backend/app/scripts/run_tenant_backups.py`
- `backend/app/scripts/run_tenant_restore.py`
- `infra/systemd/platform-paas-control-backup.service`
- `infra/systemd/platform-paas-control-backup.timer`
- `infra/systemd/platform-paas-tenant-backup.service`
- `infra/systemd/platform-paas-tenant-backup.timer`

## Variables Relevantes

Los scripts usan estas variables:

- `PGPASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `BACKUP_DIR`
- `RETENTION_DAYS`

Valores esperados por defecto:

- `DB_NAME=platform_control`
- `DB_HOST=127.0.0.1`
- `DB_PORT=5432`
- `DB_USER=platform_owner`

## Backup Manual

Ejemplo:

```bash
export PGPASSWORD='reemplazar_password'
export BACKUP_DIR=/var/backups/platform_paas

bash infra/postgres/backups/backup_platform_control.sh
```

Resultado esperado:

- se crea un archivo `platform_control_YYYYMMDD_HHMMSS.sql.gz`
- backups viejos se eliminan segun `RETENTION_DAYS`

## Restore Manual

Ejemplo:

```bash
export PGPASSWORD='reemplazar_password'

bash infra/postgres/backups/restore_platform_control.sh \
  /var/backups/platform_paas/platform_control_20260317_120000.sql.gz
```

Precaucion:

- este restore esta pensado para recuperar sobre una DB ya existente
- no lo ejecutes sobre produccion sin validar primero el backup y la ventana operativa

## Backup Programado con `systemd`

Archivos plantilla:

- `infra/systemd/platform-paas-control-backup.service`
- `infra/systemd/platform-paas-control-backup.timer`

Destino sugerido:

- `/etc/systemd/system/platform-paas-control-backup.service`
- `/etc/systemd/system/platform-paas-control-backup.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-control-backup.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-control-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-control-backup.timer
sudo systemctl list-timers | grep platform-paas-control-backup
```

## Validacion Minima

Despues de configurar el timer:

```bash
systemctl status platform-paas-control-backup.timer --no-pager
systemctl status platform-paas-control-backup.service --no-pager
ls -lah /var/backups/platform_paas
```

## Backup Tenant

El backup tenant no usa variables manuales por cada base. Resuelve la conexion real desde `platform_control` usando el mecanismo actual del backend.

Script:

- `backend/app/scripts/run_tenant_backups.py`

Uso para todos los tenants activos:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_tenant_backups.py \
  --backup-dir /var/backups/platform_paas/tenants \
  --retention-days 7
```

Uso para un solo tenant:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_tenant_backups.py \
  --tenant-slug empresa-bootstrap \
  --backup-dir /var/backups/platform_paas/tenants
```

Formato esperado del backup:

- `tenant-slug__tenant_db_name_YYYYMMDD_HHMMSS.sql.gz`

## Restore Tenant

Script:

- `backend/app/scripts/run_tenant_restore.py`

Ejemplo:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_tenant_restore.py \
  --tenant-slug empresa-bootstrap \
  --backup-file /var/backups/platform_paas/tenants/empresa-bootstrap__tenant_empresa-bootstrap_20260317_120000.sql.gz
```

Precaucion:

- el restore tenant usa el tenant activo registrado en `platform_control`
- no lo ejecutes sin validar primero que el backup corresponde al tenant correcto

## Timer `systemd` para Tenants

Archivos plantilla:

- `infra/systemd/platform-paas-tenant-backup.service`
- `infra/systemd/platform-paas-tenant-backup.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-tenant-backup.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-tenant-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-tenant-backup.timer
sudo systemctl list-timers | grep platform-paas-tenant-backup
```

## Siguiente Evolucion Natural

- cifrar backups fuera de disco local
- mover backups a almacenamiento externo
- probar restores periodicos como parte de operacion real

Guia relacionada:

- `docs/deploy/external-backup-sync.md`
- `docs/deploy/restore-drill-platform-control.md`
- `docs/deploy/restore-drill-tenants.md`
