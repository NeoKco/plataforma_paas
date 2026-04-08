#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas_staging}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.staging}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8200/health}"
PYTHON_BIN="${PYTHON_BIN:-$PROJECT_ROOT/platform_paas_venv/bin/python}"
BACKEND_DIR="${BACKEND_DIR:-$PROJECT_ROOT/backend}"
SEED_SCRIPT="${SEED_SCRIPT:-$BACKEND_DIR/app/scripts/seed_frontend_demo_baseline.py}"
INSTALL_FLAG_PATH_DEFAULT="$PROJECT_ROOT/.platform_installed"
MODE="plan"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_dotenv.sh"

usage() {
    cat <<'EOF'
Uso:
  bash deploy/restore_staging_mirror.sh --plan
  bash deploy/restore_staging_mirror.sh --execute

Opciones:
  --plan      Modo seguro por defecto. Solo informa lo que haria.
  --execute   Ejecuta la restauracion real de staging al modo espejo.
  --help      Muestra esta ayuda.
EOF
}

log() {
    printf '[restore-staging-mirror] %s\n' "$*"
}

fail() {
    printf '[restore-staging-mirror] ERROR: %s\n' "$*" >&2
    exit 1
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
[[ -x "$PYTHON_BIN" ]] || fail "No existe PYTHON_BIN ejecutable: $PYTHON_BIN"
[[ -f "$SEED_SCRIPT" ]] || fail "No existe SEED_SCRIPT: $SEED_SCRIPT"

INSTALL_FLAG_PATH="${INSTALL_FLAG_FILE:-$INSTALL_FLAG_PATH_DEFAULT}"
INSTALLER_ENV_PATH="$PROJECT_ROOT/.env"

log "Modo: $MODE"
log "PROJECT_ROOT=$PROJECT_ROOT"
log "ENV_FILE=$ENV_FILE"
log "SERVICE_NAME=$SERVICE_NAME"
log "BACKEND_DIR=$BACKEND_DIR"
log "PYTHON_BIN=$PYTHON_BIN"
log "INSTALL_FLAG_PATH=$INSTALL_FLAG_PATH"
log "INSTALLER_ENV_PATH=$INSTALLER_ENV_PATH"
log "Install flag existe: $([[ -f "$INSTALL_FLAG_PATH" ]] && printf yes || printf no)"

if [[ "$MODE" == "plan" ]]; then
    log "Plan listo. Usa --execute para restaurar staging al modo espejo instalado."
    exit 0
fi

command -v systemctl >/dev/null 2>&1 || fail "systemctl no esta disponible"
command -v curl >/dev/null 2>&1 || fail "curl no esta disponible"

log "Deteniendo servicio $SERVICE_NAME"
systemctl stop "$SERVICE_NAME"

if [[ -f "$INSTALLER_ENV_PATH" ]]; then
    log "Removiendo env heredado del instalador: $INSTALLER_ENV_PATH"
    rm -f "$INSTALLER_ENV_PATH"
fi

set_env_value "PLATFORM_INSTALLED" "true"
set_env_value "INSTALL_FLAG_FILE" "$INSTALL_FLAG_PATH"

log "Corriendo migraciones de control en staging"
(
    cd "$BACKEND_DIR"
    set -a
    source "$ENV_FILE"
    set +a
    PYTHONPATH="$BACKEND_DIR" "$PYTHON_BIN" -m app.scripts.run_control_migrations
)

log "Sembrando baseline frontend para staging espejo"
(
    cd "$BACKEND_DIR"
    set -a
    source "$ENV_FILE"
    set +a
    PYTHONPATH="$BACKEND_DIR" "$PYTHON_BIN" app/scripts/seed_frontend_demo_baseline.py
)

log "Recreando install flag en $INSTALL_FLAG_PATH"
mkdir -p "$(dirname "$INSTALL_FLAG_PATH")"
printf 'installed=true\n' >"$INSTALL_FLAG_PATH"

log "Levantando servicio $SERVICE_NAME"
systemctl start "$SERVICE_NAME"

log "Esperando health healthy en $HEALTH_URL"
for _ in {1..30}; do
    if curl --silent --show-error "$HEALTH_URL" | grep -q '"installed":[[:space:]]*true'; then
        log "Staging restaurado a modo espejo instalado."
        exit 0
    fi
    sleep 1
done

fail "El health de staging no confirmo installed=true dentro del tiempo esperado"
