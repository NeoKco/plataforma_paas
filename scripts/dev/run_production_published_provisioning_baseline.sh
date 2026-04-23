#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export PUBLISHED_ROOT="${PUBLISHED_ROOT:-/opt/platform_paas}"
export PUBLISHED_ENV_SOURCE="${PUBLISHED_ENV_SOURCE:-$PUBLISHED_ROOT/.env}"
export PUBLISHED_ENV_TMP="${PUBLISHED_ENV_TMP:-/tmp/platform_paas_prod.env}"
export PUBLISHED_BASE_URL="${PUBLISHED_BASE_URL:-https://orkestia.ddns.net}"
export PUBLISHED_BACKEND_PYTHON="${PUBLISHED_BACKEND_PYTHON:-$PUBLISHED_ROOT/platform_paas_venv/bin/python}"
export INCLUDE_BROKER_ONLY="${INCLUDE_BROKER_ONLY:-auto}"
export BROKER_TARGET="${BROKER_TARGET:-all}"

exec "$ROOT_DIR/scripts/dev/run_published_provisioning_baseline.sh" "$@"
