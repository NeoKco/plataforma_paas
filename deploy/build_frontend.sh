#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
API_BASE_URL="${API_BASE_URL:-${VITE_API_BASE_URL:-}}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-true}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Frontend directory not found: $FRONTEND_DIR" >&2
    exit 1
fi

if [ -z "$API_BASE_URL" ]; then
    echo 'API_BASE_URL or VITE_API_BASE_URL is required for production frontend build.' >&2
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