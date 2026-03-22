#!/usr/bin/env bash
set -euo pipefail

TARGET_REF="${1:-${TARGET_REF:-}}"
PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-}"
BACKEND_DIR="$PROJECT_ROOT/backend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$TARGET_REF" ]; then
    echo "Usage: rollback_backend.sh <git_ref>" >&2
    exit 1
fi

if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "Project root is not a git repository: $PROJECT_ROOT" >&2
    exit 1
fi

echo "Rolling back backend in $PROJECT_ROOT to ref $TARGET_REF"

cd "$PROJECT_ROOT"

current_ref="$(git rev-parse --short HEAD)"
echo "Current ref: $current_ref"

git fetch --all --tags --prune
git checkout "$TARGET_REF"

echo "Checked out ref: $(git rev-parse --short HEAD)"

cd "$BACKEND_DIR"
bash "$SCRIPT_DIR/deploy_backend.sh"
