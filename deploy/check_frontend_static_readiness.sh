#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DIST_DIR="${DIST_DIR:-$FRONTEND_DIR/dist}"
EXPECTED_API_BASE_URL="${EXPECTED_API_BASE_URL:-}"
REQUIRE_NGINX_TEMPLATES="${REQUIRE_NGINX_TEMPLATES:-true}"

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

echo '== Frontend static readiness =='
printf 'PROJECT_ROOT=%s\n' "$PROJECT_ROOT"
printf 'DIST_DIR=%s\n' "$DIST_DIR"

if [ -d "$FRONTEND_DIR" ]; then
    pass "Frontend dir: $FRONTEND_DIR"
else
    fail "Frontend dir no encontrado: $FRONTEND_DIR"
fi

if [ -f "$DIST_DIR/index.html" ]; then
    pass "Build detectado: $DIST_DIR/index.html"
else
    fail "No existe index.html en $DIST_DIR"
fi

if ls "$DIST_DIR"/assets/*.js >/dev/null 2>&1; then
    pass 'Assets JS detectados en dist/assets'
else
    fail 'No se detectaron assets JS en dist/assets'
fi

if [ -n "$EXPECTED_API_BASE_URL" ]; then
    if grep -R --fixed-strings "$EXPECTED_API_BASE_URL" "$DIST_DIR" >/dev/null 2>&1; then
        pass "La API esperada aparece en el build: $EXPECTED_API_BASE_URL"
    else
        warn "No se encontró la API esperada dentro del build: $EXPECTED_API_BASE_URL"
    fi
else
    warn 'No se indicó EXPECTED_API_BASE_URL; no se validó el endpoint embebido en el build'
fi

if [ "$REQUIRE_NGINX_TEMPLATES" = "true" ]; then
    if [ -f "$PROJECT_ROOT/infra/nginx/platform-paas-frontend.conf" ]; then
        pass 'Plantilla nginx HTTP disponible para frontend'
    else
        fail 'Falta la plantilla nginx HTTP del frontend'
    fi

    if [ -f "$PROJECT_ROOT/infra/nginx/platform-paas-frontend-ssl.conf" ]; then
        pass 'Plantilla nginx HTTPS disponible para frontend'
    else
        fail 'Falta la plantilla nginx HTTPS del frontend'
    fi
fi

echo
printf 'Resumen: %s fallos, %s advertencias\n' "$failures" "$warnings"

if [ "$failures" -gt 0 ]; then
    exit 1
fi