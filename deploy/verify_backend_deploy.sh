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
BACKEND_POST_DEPLOY_SEED_DEFAULTS="${BACKEND_POST_DEPLOY_SEED_DEFAULTS:-true}"
BACKEND_POST_DEPLOY_REPAIR_MAINTENANCE_FINANCE="${BACKEND_POST_DEPLOY_REPAIR_MAINTENANCE_FINANCE:-true}"
BACKEND_POST_DEPLOY_CONVERGENCE_STRICT="${BACKEND_POST_DEPLOY_CONVERGENCE_STRICT:-false}"
SYNC_SCRIPT="$PROJECT_ROOT/backend/app/scripts/sync_active_tenant_schemas.py"
SEED_DEFAULTS_SCRIPT="$PROJECT_ROOT/backend/app/scripts/seed_missing_tenant_defaults.py"
REPAIR_MAINTENANCE_FINANCE_SCRIPT="$PROJECT_ROOT/backend/app/scripts/repair_maintenance_finance_sync.py"

CONVERGENCE_FAILED=0

run_convergence_step() {
    local step_name="$1"
    shift
    if "$@"; then
        echo "Convergence step OK: $step_name"
        return 0
    fi

    echo "WARNING: Convergence step failed: $step_name" >&2
    CONVERGENCE_FAILED=1
    return 0
}

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
            echo "Running direct post-deploy tenant schema convergence (limit: $BACKEND_AUTO_SYNC_LIMIT)"

            if [ ! -x "$VENV_PYTHON" ]; then
                echo "Virtualenv python not found: $VENV_PYTHON" >&2
                exit 1
            fi

            if [ ! -f "$SYNC_SCRIPT" ]; then
                echo "Tenant schema sync script not found: $SYNC_SCRIPT" >&2
                exit 1
            fi

            run_convergence_step \
                "tenant_schema_sync" \
                "$VENV_PYTHON" "$SYNC_SCRIPT" --limit "$BACKEND_AUTO_SYNC_LIMIT"
        else
            echo "Post-deploy tenant schema sync skipped."
        fi

        if [ "$BACKEND_POST_DEPLOY_SEED_DEFAULTS" = "true" ]; then
            if [ ! -f "$SEED_DEFAULTS_SCRIPT" ]; then
                echo "Tenant defaults seed script not found: $SEED_DEFAULTS_SCRIPT" >&2
                exit 1
            fi
            echo "Running post-deploy seed convergence for missing tenant defaults"
            run_convergence_step \
                "tenant_defaults_seed" \
                "$VENV_PYTHON" "$SEED_DEFAULTS_SCRIPT" --apply
        else
            echo "Post-deploy tenant defaults convergence skipped."
        fi

        if [ "$BACKEND_POST_DEPLOY_REPAIR_MAINTENANCE_FINANCE" = "true" ]; then
            if [ ! -f "$REPAIR_MAINTENANCE_FINANCE_SCRIPT" ]; then
                echo "Maintenance-finance repair script not found: $REPAIR_MAINTENANCE_FINANCE_SCRIPT" >&2
                exit 1
            fi
            echo "Running post-deploy maintenance-finance convergence for active tenants"
            run_convergence_step \
                "maintenance_finance_repair" \
                "$VENV_PYTHON" "$REPAIR_MAINTENANCE_FINANCE_SCRIPT" --all-active --limit "$BACKEND_AUTO_SYNC_LIMIT"
        else
            echo "Post-deploy maintenance-finance convergence skipped."
        fi

        if [ "$CONVERGENCE_FAILED" -ne 0 ]; then
            if [ "$BACKEND_POST_DEPLOY_CONVERGENCE_STRICT" = "true" ]; then
                echo "Post-deploy convergence finished with failures (strict mode)." >&2
                exit 1
            fi
            echo "Post-deploy convergence finished with warnings; service remains healthy."
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
