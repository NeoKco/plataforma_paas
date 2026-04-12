#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
API_BASE_URL="${API_BASE_URL:-${VITE_API_BASE_URL:-}}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-true}"
ENV_PRODUCTION_FILE="$FRONTEND_DIR/.env.production"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Frontend directory not found: $FRONTEND_DIR" >&2
    exit 1
fi

if [ -z "$API_BASE_URL" ] && [ -f "$ENV_PRODUCTION_FILE" ]; then
    API_BASE_URL="$(grep -E '^[[:space:]]*VITE_API_BASE_URL=' "$ENV_PRODUCTION_FILE" | head -n 1 | cut -d= -f2- | tr -d '\r' | xargs || true)"
fi

if [ -z "$API_BASE_URL" ]; then
    echo 'API_BASE_URL or VITE_API_BASE_URL is required for production frontend build.' >&2
    echo "Tip: define VITE_API_BASE_URL in $ENV_PRODUCTION_FILE to avoid staging URLs." >&2
    exit 1
fi

if echo "$API_BASE_URL" | grep -q "192.168.7.42:8081" && [ "${ALLOW_STAGING_API:-0}" != "1" ]; then
    echo "Refusing to build with staging API base URL: $API_BASE_URL" >&2
    echo "Set ALLOW_STAGING_API=1 if you really want a staging build." >&2
    exit 1
fi

cd "$FRONTEND_DIR"

if [ "$RUN_NPM_INSTALL" = "true" ]; then
    npm install
fi

VITE_API_BASE_URL="$API_BASE_URL" npm run build

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
    echo 'Frontend build did not produce dist/index.html' >&2
    exit 1
fi

echo "Frontend build completed with VITE_API_BASE_URL=$API_BASE_URL"
