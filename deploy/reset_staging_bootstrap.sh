#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas_staging}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.staging}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8200/health}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
POSTGRES_ADMIN_DB="${POSTGRES_ADMIN_DB:-postgres}"
MODE="plan"
DROP_TENANT_DBS=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_dotenv.sh"

usage() {
    cat <<'EOF'
Uso:
  bash deploy/reset_staging_bootstrap.sh --plan
  bash deploy/reset_staging_bootstrap.sh --execute

Opciones:
  --plan                  Modo seguro por defecto. Solo informa lo que haria.
  --execute               Ejecuta el reset real sobre staging.
  --preserve-tenant-dbs   No elimina DBs ni roles tenant asociados al control DB staging.
  --help                  Muestra esta ayuda.
EOF
}

log() {
    printf '[reset-staging-bootstrap] %s\n' "$*"
}

fail() {
    printf '[reset-staging-bootstrap] ERROR: %s\n' "$*" >&2
    exit 1
}

sql_literal() {
    local value="$1"
    value="${value//\'/''}"
    printf "'%s'" "$value"
}

sql_identifier() {
    local value="$1"
    value="${value//\"/\"\"}"
    printf '"%s"' "$value"
}

psql_admin() {
    PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" psql \
        -h "$CONTROL_DB_HOST" \
        -p "$CONTROL_DB_PORT" \
        -U "$POSTGRES_ADMIN_USER" \
        -d "$POSTGRES_ADMIN_DB" \
        -v ON_ERROR_STOP=1 \
        "$@"
}

psql_control() {
    PGPASSWORD="$POSTGRES_ADMIN_PASSWORD" psql \
        -h "$CONTROL_DB_HOST" \
        -p "$CONTROL_DB_PORT" \
        -U "$POSTGRES_ADMIN_USER" \
        -d "$CONTROL_DB_NAME" \
        -v ON_ERROR_STOP=1 \
        "$@"
}

database_exists() {
    local db_name="$1"
    local result
    result="$(
        psql_admin -Atqc "SELECT 1 FROM pg_database WHERE datname = $(sql_literal "$db_name");"
    )"
    [[ "$result" == "1" ]]
}

table_exists_in_control() {
    local table_name="$1"
    local result
    result="$(
        psql_control -Atqc "SELECT to_regclass($(sql_literal "$table_name")) IS NOT NULL;"
    )"
    [[ "$result" == "t" ]]
}

collect_tenant_inventory() {
    if ! database_exists "$CONTROL_DB_NAME"; then
        return 0
    fi

    if ! table_exists_in_control "public.tenants"; then
        return 0
    fi

    psql_control -AtF '|' -qc "
        SELECT COALESCE(db_name, ''), COALESCE(db_user, '')
        FROM tenants
        WHERE db_name IS NOT NULL OR db_user IS NOT NULL
        ORDER BY id
    "
}

terminate_db_connections() {
    local db_name="$1"
    psql_admin \
        -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $(sql_literal "$db_name")
              AND pid <> pg_backend_pid();
        " >/dev/null
}

drop_database() {
    local db_name="$1"
    terminate_db_connections "$db_name"
    psql_admin -c "DROP DATABASE IF EXISTS $(sql_identifier "$db_name");" >/dev/null
}

drop_role() {
    local role_name="$1"
    psql_admin -c "DROP ROLE IF EXISTS $(sql_identifier "$role_name");" >/dev/null
}

set_env_value() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        printf '\n%s=%s\n' "$key" "$value" >>"$ENV_FILE"
    fi
}

while (($#)); do
    case "$1" in
        --plan)
            MODE="plan"
            ;;
        --execute)
            MODE="execute"
            ;;
        --preserve-tenant-dbs)
            DROP_TENANT_DBS=0
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            fail "Opcion no reconocida: $1"
            ;;
    esac
    shift
done

[[ -f "$ENV_FILE" ]] || fail "No existe ENV_FILE: $ENV_FILE"

load_dotenv_file "$ENV_FILE"

[[ "${APP_ENV:-}" == "staging" ]] || fail "APP_ENV debe ser staging en $ENV_FILE"
[[ "$PROJECT_ROOT" == *staging* ]] || fail "PROJECT_ROOT no parece ser un arbol staging: $PROJECT_ROOT"
[[ "$SERVICE_NAME" == *staging* ]] || fail "SERVICE_NAME no parece ser staging: $SERVICE_NAME"
[[ -n "${POSTGRES_ADMIN_PASSWORD:-}" ]] || fail "POSTGRES_ADMIN_PASSWORD no esta configurado en $ENV_FILE"
[[ -n "${CONTROL_DB_HOST:-}" ]] || fail "CONTROL_DB_HOST no esta configurado"
[[ -n "${CONTROL_DB_PORT:-}" ]] || fail "CONTROL_DB_PORT no esta configurado"
[[ -n "${CONTROL_DB_NAME:-}" ]] || fail "CONTROL_DB_NAME no esta configurado"

INSTALL_FLAG_PATH="${INSTALL_FLAG_FILE:-$PROJECT_ROOT/.platform_installed}"
INSTALLER_ENV_PATH="$PROJECT_ROOT/.env"

mapfile -t TENANT_ROWS < <(collect_tenant_inventory || true)

log "Modo: $MODE"
log "PROJECT_ROOT=$PROJECT_ROOT"
log "ENV_FILE=$ENV_FILE"
log "SERVICE_NAME=$SERVICE_NAME"
log "INSTALL_FLAG_PATH=$INSTALL_FLAG_PATH"
log "INSTALLER_ENV_PATH=$INSTALLER_ENV_PATH"
log "CONTROL_DB_NAME=$CONTROL_DB_NAME"
log "DROP_TENANT_DBS=$DROP_TENANT_DBS"
log "Control DB existe: $(database_exists "$CONTROL_DB_NAME" && printf yes || printf no)"
log "Install flag existe: $([[ -f "$INSTALL_FLAG_PATH" ]] && printf yes || printf no)"
log "Tenants detectados en control DB: ${#TENANT_ROWS[@]}"

if ((${#TENANT_ROWS[@]} > 0)); then
    for row in "${TENANT_ROWS[@]}"; do
        IFS='|' read -r tenant_db tenant_user <<<"$row"
        log " - tenant_db=${tenant_db:-<vacio>} tenant_user=${tenant_user:-<vacio>}"
    done
fi

if [[ "$MODE" == "plan" ]]; then
    log "Plan listo. Usa --execute para aplicar el reset real de staging."
    exit 0
fi

command -v systemctl >/dev/null 2>&1 || fail "systemctl no esta disponible"
command -v psql >/dev/null 2>&1 || fail "psql no esta disponible"
command -v curl >/dev/null 2>&1 || fail "curl no esta disponible"

log "Deteniendo servicio $SERVICE_NAME"
systemctl stop "$SERVICE_NAME"

if ((DROP_TENANT_DBS)); then
    for row in "${TENANT_ROWS[@]}"; do
        IFS='|' read -r tenant_db tenant_user <<<"$row"
        if [[ -n "$tenant_db" ]] && database_exists "$tenant_db"; then
            log "Eliminando tenant DB $tenant_db"
            drop_database "$tenant_db"
        fi
        if [[ -n "$tenant_user" ]]; then
            log "Eliminando tenant role $tenant_user"
            drop_role "$tenant_user"
        fi
    done
else
    log "Preservando DBs y roles tenant por solicitud explicita"
fi

if database_exists "$CONTROL_DB_NAME"; then
    log "Eliminando control DB $CONTROL_DB_NAME"
    drop_database "$CONTROL_DB_NAME"
fi

if [[ -f "$INSTALL_FLAG_PATH" ]]; then
    log "Removiendo install flag"
    rm -f "$INSTALL_FLAG_PATH"
fi

log "Marcando PLATFORM_INSTALLED=false en $ENV_FILE"
set_env_value "PLATFORM_INSTALLED" "false"
set_env_value "INSTALL_FLAG_FILE" "$INSTALL_FLAG_PATH"

if [[ -f "$INSTALLER_ENV_PATH" ]]; then
    log "Removiendo .env heredado del instalador anterior"
    rm -f "$INSTALLER_ENV_PATH"
fi

log "Levantando servicio $SERVICE_NAME en modo bootstrap"
systemctl start "$SERVICE_NAME"

for _ in $(seq 1 20); do
    if health_payload="$(curl --silent --show-error "$HEALTH_URL" 2>/dev/null)"; then
        if grep -q '"installed":false' <<<"$health_payload"; then
            log "Health OK en modo bootstrap: $health_payload"
            log "El instalador deberia quedar visible en el frontend staging."
            exit 0
        fi
    fi
    sleep 1
done

fail "El health no confirmo modo bootstrap en $HEALTH_URL"
