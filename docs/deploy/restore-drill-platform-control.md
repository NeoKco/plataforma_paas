# Restore Drill de Platform Control

Esta guia deja una base minima para ensayar restauracion de `platform_control` sin tocar la base principal.

La idea es restaurar un backup en una DB temporal, validar tablas clave y luego limpiar.

## Objetivo

- comprobar que el backup realmente restaura
- detectar backups corruptos o incompletos
- dejar evidencia operativa de que el restore fue ensayado

## Archivos Base

- `infra/postgres/backups/restore_drill_platform_control.sh`
- `infra/env/restore.drill.example.env`
- `infra/systemd/platform-paas-restore-drill.service`
- `infra/systemd/platform-paas-restore-drill.timer`

## Variables

Archivo ejemplo:

- `infra/env/restore.drill.example.env`

Variables soportadas:

- `ADMIN_DB_HOST`
- `ADMIN_DB_PORT`
- `ADMIN_DB_NAME`
- `ADMIN_DB_USER`
- `ADMIN_DB_PASSWORD`
- `RESTORE_DB_PREFIX`
- `KEEP_RESTORE_DB`

## Ejecucion Manual

```bash
cp infra/env/restore.drill.example.env /opt/platform_paas/infra/env/restore.drill.env
```

Ajustar credenciales y luego:

```bash
bash infra/postgres/backups/restore_drill_platform_control.sh \
  /var/backups/platform_paas/platform_control_20260317_120000.sql.gz
```

## Que Valida

La restauracion temporal verifica que existan al menos estas tablas:

- `platform_users`
- `tenants`
- `provisioning_jobs`
- `auth_tokens`
- `auth_audit_events`

## Timer `systemd`

Archivos plantilla:

- `infra/systemd/platform-paas-restore-drill.service`
- `infra/systemd/platform-paas-restore-drill.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-restore-drill.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-restore-drill.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-restore-drill.timer
sudo systemctl list-timers | grep platform-paas-restore-drill
```

## Validacion Minima

```bash
sudo systemctl start platform-paas-restore-drill.service
sudo systemctl status platform-paas-restore-drill.service --no-pager
sudo journalctl -u platform-paas-restore-drill.service -n 50 --no-pager
```

## Notas

- por defecto la DB temporal se elimina al terminar
- si quieres inspeccionarla, usar `KEEP_RESTORE_DB=true`
- este drill cubre `platform_control`; los tenants pueden seguir un patron similar despues

## Guia Relacionada

- `docs/deploy/operational-acceptance-checklist.md`
- `docs/deploy/postgres-backup-and-restore.md`
- `docs/deploy/external-backup-sync.md`
