#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
ADMIN_DB_HOST="${ADMIN_DB_HOST:-127.0.0.1}"
ADMIN_DB_PORT="${ADMIN_DB_PORT:-5432}"
ADMIN_DB_NAME="${ADMIN_DB_NAME:-postgres}"
ADMIN_DB_USER="${ADMIN_DB_USER:-postgres}"
ADMIN_DB_PASSWORD="${ADMIN_DB_PASSWORD:-}"
RESTORE_DB_PREFIX="${RESTORE_DB_PREFIX:-platform_restore_drill}"
KEEP_RESTORE_DB="${KEEP_RESTORE_DB:-false}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RESTORE_DB_NAME="${RESTORE_DB_NAME:-${RESTORE_DB_PREFIX}_${TIMESTAMP}}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore_drill_platform_control.sh <backup_file.sql.gz>" >&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

if [ -z "$ADMIN_DB_PASSWORD" ]; then
    echo "ADMIN_DB_PASSWORD is required." >&2
    exit 1
fi

export PGPASSWORD="$ADMIN_DB_PASSWORD"

cleanup() {
    if [ "$KEEP_RESTORE_DB" = "true" ]; then
        echo "Keeping restore drill database: $RESTORE_DB_NAME"
        return
    fi

    dropdb \
        --if-exists \
        --host "$ADMIN_DB_HOST" \
        --port "$ADMIN_DB_PORT" \
        --username "$ADMIN_DB_USER" \
        "$RESTORE_DB_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Creating temporary restore drill database: $RESTORE_DB_NAME"
createdb \
    --host "$ADMIN_DB_HOST" \
    --port "$ADMIN_DB_PORT" \
    --username "$ADMIN_DB_USER" \
    "$RESTORE_DB_NAME"

echo "Restoring backup into $RESTORE_DB_NAME"
gunzip -c "$BACKUP_FILE" | psql \
    --host "$ADMIN_DB_HOST" \
    --port "$ADMIN_DB_PORT" \
    --username "$ADMIN_DB_USER" \
    --dbname "$RESTORE_DB_NAME" >/dev/null

check_table() {
    local table_name="$1"
    local exists

    exists="$(
        psql \
            --host "$ADMIN_DB_HOST" \
            --port "$ADMIN_DB_PORT" \
            --username "$ADMIN_DB_USER" \
            --dbname "$RESTORE_DB_NAME" \
            --tuples-only \
            --no-align \
            --command "SELECT to_regclass('public.${table_name}') IS NOT NULL;"
    )"

    if [ "$exists" != "t" ]; then
        echo "Expected table missing in restore drill: ${table_name}" >&2
        exit 1
    fi
}

check_table "platform_users"
check_table "tenants"
check_table "provisioning_jobs"
check_table "auth_tokens"
check_table "auth_audit_events"

echo "Restore drill completed successfully for backup: $BACKUP_FILE"
