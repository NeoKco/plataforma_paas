#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/health}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"
PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
VENV_PYTHON="${VENV_PYTHON:-$PROJECT_ROOT/platform_paas_venv/bin/python}"
BACKEND_AUTO_SYNC_POST_DEPLOY="${BACKEND_AUTO_SYNC_POST_DEPLOY:-true}"
BACKEND_AUTO_SYNC_LIMIT="${BACKEND_AUTO_SYNC_LIMIT:-100}"
AUTO_SYNC_SCRIPT="$PROJECT_ROOT/backend/app/scripts/enqueue_active_tenant_schema_sync.py"

echo "Verifying service: $SERVICE_NAME"
echo "Healthcheck URL: $HEALTHCHECK_URL"

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Service is not active: $SERVICE_NAME" >&2
    systemctl status "$SERVICE_NAME" --no-pager || true
    exit 1
fi

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
        echo "Healthcheck passed on attempt $attempt."
        if [ "$BACKEND_AUTO_SYNC_POST_DEPLOY" = "true" ]; then
            echo "Running post-deploy tenant schema auto-sync (limit: $BACKEND_AUTO_SYNC_LIMIT)"

            if [ ! -x "$VENV_PYTHON" ]; then
                echo "Virtualenv python not found: $VENV_PYTHON" >&2
                exit 1
            fi

            if [ ! -f "$AUTO_SYNC_SCRIPT" ]; then
                echo "Auto-sync script not found: $AUTO_SYNC_SCRIPT" >&2
                exit 1
            fi

            "$VENV_PYTHON" "$AUTO_SYNC_SCRIPT" --limit "$BACKEND_AUTO_SYNC_LIMIT"
        else
            echo "Post-deploy tenant schema auto-sync skipped."
        fi

        exit 0
    fi

    echo "Healthcheck attempt $attempt failed. Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
done

echo "Healthcheck did not pass after $MAX_ATTEMPTS attempts." >&2
systemctl status "$SERVICE_NAME" --no-pager || true
exit 1
