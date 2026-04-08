#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_PYTHON="${VENV_PYTHON:-$PROJECT_ROOT/platform_paas_venv/bin/python}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/health}"
BACKEND_AUTO_SYNC_POST_DEPLOY="${BACKEND_AUTO_SYNC_POST_DEPLOY:-true}"
BACKEND_AUTO_SYNC_LIMIT="${BACKEND_AUTO_SYNC_LIMIT:-100}"
PYTHONPATH_VALUE="${PYTHONPATH_VALUE:-$BACKEND_DIR}"

source "$SCRIPT_DIR/load_dotenv.sh"

echo "Deploying backend from $PROJECT_ROOT"

if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found: $ENV_FILE" >&2
    exit 1
fi

bash "$SCRIPT_DIR/validate_backend_env.sh" "$ENV_FILE" "$EXPECTED_APP_ENV"

load_dotenv_file "$ENV_FILE"

cd "$BACKEND_DIR"

if [ ! -x "$VENV_PYTHON" ]; then
    echo "Virtualenv python not found: $VENV_PYTHON" >&2
    exit 1
fi

"$VENV_PYTHON" -m pip install -r requirements/base.txt
PYTHONPATH="$PYTHONPATH_VALUE" "$VENV_PYTHON" app/scripts/run_control_migrations.py
PYTHONPATH="$PYTHONPATH_VALUE" "$VENV_PYTHON" app/scripts/run_backend_tests.py --skip-http-smoke --skip-postgres

sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
export PROJECT_ROOT
export VENV_PYTHON
export SERVICE_NAME
export HEALTHCHECK_URL
export BACKEND_AUTO_SYNC_POST_DEPLOY
export BACKEND_AUTO_SYNC_LIMIT
export COLLECT_OPERATIONAL_EVIDENCE="${COLLECT_OPERATIONAL_EVIDENCE:-true}"

bash "$SCRIPT_DIR/run_backend_post_deploy_gate.sh"
