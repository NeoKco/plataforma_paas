#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_PYTHON="${VENV_PYTHON:-$PROJECT_ROOT/platform_paas_venv/bin/python}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-production}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/health}"
REQUIRE_SYSTEMD="${REQUIRE_SYSTEMD:-true}"
REQUIRE_SERVICE_UNIT="${REQUIRE_SERVICE_UNIT:-true}"
REQUIRE_FRONTEND_DIST="${REQUIRE_FRONTEND_DIST:-false}"

failures=0
warnings=0

pass() {
    printf '[PASS] %s\n' "$1"
}

warn() {
    warnings=$((warnings + 1))
    printf '[WARN] %s\n' "$1"
}

fail() {
    failures=$((failures + 1))
    printf '[FAIL] %s\n' "$1"
}

check_path() {
    local path="$1"
    local label="$2"
    if [ -e "$path" ]; then
        pass "$label: $path"
    else
        fail "$label no encontrado: $path"
    fi
}

echo '== Backend release readiness =='
printf 'PROJECT_ROOT=%s\n' "$PROJECT_ROOT"
printf 'ENV_FILE=%s\n' "$ENV_FILE"
printf 'SERVICE_NAME=%s\n' "$SERVICE_NAME"
printf 'EXPECTED_APP_ENV=%s\n' "$EXPECTED_APP_ENV"

check_path "$PROJECT_ROOT" 'Project root'
check_path "$BACKEND_DIR" 'Backend dir'
check_path "$PROJECT_ROOT/deploy/deploy_backend.sh" 'Deploy script'
check_path "$PROJECT_ROOT/deploy/validate_backend_env.sh" 'Env validator'

if [ -x "$VENV_PYTHON" ]; then
    pass "Python virtualenv listo: $VENV_PYTHON"
else
    fail "Python virtualenv no ejecutable: $VENV_PYTHON"
fi

if [ -f "$ENV_FILE" ]; then
    if validation_output=$(bash "$PROJECT_ROOT/deploy/validate_backend_env.sh" "$ENV_FILE" "$EXPECTED_APP_ENV" 2>&1); then
        pass 'Validación de entorno OK'
        printf '%s\n' "$validation_output"
    else
        fail 'Validación de entorno falló'
        printf '%s\n' "$validation_output"
    fi
else
    fail "Archivo de entorno no encontrado: $ENV_FILE"
fi

if command -v git >/dev/null 2>&1 && git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    current_ref=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)
    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]; then
        warn "El checkout tiene cambios locales sin commitear en ref $current_ref"
    else
        pass "Checkout git limpio en ref $current_ref"
    fi
else
    warn 'No se detectó checkout git utilizable para rollback por ref'
fi

if [ "$REQUIRE_FRONTEND_DIST" = "true" ]; then
    if [ -f "$FRONTEND_DIR/dist/index.html" ]; then
        pass "Build frontend presente en $FRONTEND_DIR/dist"
    else
        fail "No existe build frontend en $FRONTEND_DIR/dist"
    fi
else
    if [ -f "$FRONTEND_DIR/dist/index.html" ]; then
        pass "Build frontend detectado en $FRONTEND_DIR/dist"
    else
        warn 'No se detectó build frontend; si el release publica frontend estático, construirlo antes de salir'
    fi
fi

if [ "$REQUIRE_SYSTEMD" = "true" ]; then
    if command -v systemctl >/dev/null 2>&1; then
        pass 'systemctl disponible'

        if [ "$REQUIRE_SERVICE_UNIT" = "true" ]; then
            if systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
                pass "Unidad systemd detectada: $SERVICE_NAME"

                if systemctl is-enabled "$SERVICE_NAME" >/dev/null 2>&1; then
                    pass "Unidad habilitada: $SERVICE_NAME"
                else
                    warn "Unidad no habilitada todavía: $SERVICE_NAME"
                fi

                if systemctl is-active "$SERVICE_NAME" >/dev/null 2>&1; then
                    pass "Servicio activo: $SERVICE_NAME"
                    if command -v curl >/dev/null 2>&1; then
                        if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null 2>&1; then
                            pass "Healthcheck responde en $HEALTHCHECK_URL"
                        else
                            warn "La unidad existe pero el healthcheck no respondió aún en $HEALTHCHECK_URL"
                        fi
                    else
                        warn 'curl no disponible; no se comprobó el healthcheck'
                    fi
                else
                    warn "Servicio aún no activo: $SERVICE_NAME"
                fi
            else
                fail "No existe la unidad systemd esperada: $SERVICE_NAME"
            fi
        fi
    else
        fail 'systemctl no está disponible en el host actual'
    fi
else
    warn 'Se omitió la validación systemd por configuración'
fi

echo
printf 'Resumen: %s fallos, %s advertencias\n' "$failures" "$warnings"

if [ "$failures" -gt 0 ]; then
    exit 1
fi