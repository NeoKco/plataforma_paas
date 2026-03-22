#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <profile-name> [extra worker args...]"
  exit 1
fi

PROFILE_NAME="$1"
shift

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
VENV_PYTHON="${PROJECT_ROOT}/platform_paas_venv/bin/python"

cd "${BACKEND_DIR}"

exec "${VENV_PYTHON}" app/scripts/run_provisioning_worker.py \
  --once \
  --profile "${PROFILE_NAME}" \
  "$@"
