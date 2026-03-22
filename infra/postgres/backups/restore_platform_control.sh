#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-platform_control}"
DB_USER="${DB_USER:-platform_owner}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: restore_platform_control.sh /ruta/al/backup.sql.gz" >&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Archivo no encontrado: $BACKUP_FILE" >&2
    exit 1
fi

if [ -z "${PGPASSWORD:-}" ]; then
    echo "PGPASSWORD no esta definido." >&2
    exit 1
fi

gunzip -c "$BACKUP_FILE" | psql \
    --host "$DB_HOST" \
    --port "$DB_PORT" \
    --username "$DB_USER" \
    --dbname "$DB_NAME"

echo "Restore completado desde: $BACKUP_FILE"
