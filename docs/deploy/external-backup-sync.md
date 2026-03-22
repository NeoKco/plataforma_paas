# Sincronizacion Externa de Backups

Esta guia deja una base minima para copiar los backups locales de `platform_paas` hacia almacenamiento externo.

La idea no es definir el storage final por ti. La plantilla usa `rsync` porque sirve tanto para otro servidor Debian como para un volumen montado.

## Objetivo

- no depender solo del disco local del servidor
- mover respaldos de `platform_control` y tenants fuera de la maquina principal
- dejar un mecanismo simple y repetible

## Archivos Base

- `infra/postgres/backups/sync_backup_archives.sh`
- `infra/env/backup.external.example.env`
- `infra/systemd/platform-paas-backup-sync.service`
- `infra/systemd/platform-paas-backup-sync.timer`

## Variables

Archivo ejemplo:

- `infra/env/backup.external.example.env`

Variables soportadas:

- `SOURCE_DIR`
- `REMOTE_TARGET`
- `RSYNC_BIN`
- `RSYNC_OPTS`

Ejemplo de destino remoto:

```text
backup@example:/srv/backups/platform_paas
```

Tambien puede ser un path local montado:

```text
/mnt/external_backups/platform_paas
```

## Sincronizacion Manual

```bash
cp infra/env/backup.external.example.env /opt/platform_paas/infra/env/backup.external.env
```

Ajustar el archivo real y luego:

```bash
bash infra/postgres/backups/sync_backup_archives.sh
```

## Sincronizacion Programada

Archivos plantilla:

- `infra/systemd/platform-paas-backup-sync.service`
- `infra/systemd/platform-paas-backup-sync.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-backup-sync.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-backup-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-backup-sync.timer
sudo systemctl list-timers | grep platform-paas-backup-sync
```

## Validacion Minima

```bash
sudo systemctl status platform-paas-backup-sync.timer --no-pager
sudo systemctl start platform-paas-backup-sync.service
sudo systemctl status platform-paas-backup-sync.service --no-pager
```

## Recomendaciones

- usar un usuario dedicado de backup para destinos SSH
- validar conectividad y permisos antes de automatizar
- no asumir que sincronizar equivale a probar restore
- si el destino es remoto, proteger la clave SSH del proceso

## Guia Relacionada

- `docs/deploy/postgres-backup-and-restore.md`
