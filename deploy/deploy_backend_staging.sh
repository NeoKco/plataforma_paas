#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas_staging}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.staging}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend-staging}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-staging}"

export PROJECT_ROOT
export ENV_FILE
export SERVICE_NAME
export EXPECTED_APP_ENV

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/deploy_backend.sh"
