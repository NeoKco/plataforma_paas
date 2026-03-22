# Restore Drill de Tenants

Esta guia deja una base minima para ensayar restauracion de backups tenant sobre DBs temporales, sin tocar las bases tenant reales.

## Objetivo

- comprobar que los backups tenant realmente restauran
- validar que el esquema core del tenant existe
- detectar backups vacios o corruptos antes de necesitarlos en una recuperacion real

## Archivos Base

- `backend/app/scripts/run_tenant_restore_drills.py`
- `infra/env/restore.drill.tenants.example.env`
- `infra/systemd/platform-paas-tenant-restore-drill.service`
- `infra/systemd/platform-paas-tenant-restore-drill.timer`

## Que Hace

El script:

- toma el backup mas reciente por tenant
- crea una DB temporal por tenant
- restaura el backup en esa DB
- valida tablas core:
  - `tenant_info`
  - `users`
  - `roles`
- elimina la DB temporal al terminar, salvo que se pida conservarla

## Ejecucion Manual

```bash
cp infra/env/restore.drill.tenants.example.env /opt/platform_paas/infra/env/restore.drill.tenants.env
```

Ajustar credenciales admin y luego:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_tenant_restore_drills.py \
  --backup-dir /var/backups/platform_paas/tenants
```

Para un tenant puntual:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_tenant_restore_drills.py \
  --backup-dir /var/backups/platform_paas/tenants \
  --tenant-slug empresa-bootstrap
```

## Timer `systemd`

Archivos plantilla:

- `infra/systemd/platform-paas-tenant-restore-drill.service`
- `infra/systemd/platform-paas-tenant-restore-drill.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-tenant-restore-drill.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-tenant-restore-drill.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-tenant-restore-drill.timer
sudo systemctl list-timers | grep platform-paas-tenant-restore-drill
```

## Validacion Minima

```bash
sudo systemctl start platform-paas-tenant-restore-drill.service
sudo systemctl status platform-paas-tenant-restore-drill.service --no-pager
sudo journalctl -u platform-paas-tenant-restore-drill.service -n 100 --no-pager
```

## Notas

- este drill valida el core tenant, no todos los modulos opcionales
- si quieres inspeccionar la DB temporal, usar `--keep-restore-db`
- si un tenant falla, el script sigue con los demas y devuelve error al final

## Guia Relacionada

- `docs/deploy/operational-acceptance-checklist.md`
- `docs/deploy/postgres-backup-and-restore.md`
- `docs/deploy/restore-drill-platform-control.md`
