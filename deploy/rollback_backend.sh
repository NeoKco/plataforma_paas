#!/usr/bin/env bash
set -euo pipefail

TARGET_REF="${1:-${TARGET_REF:-}}"
PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_REPO_ROOT="${SOURCE_REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
DEPLOY_SCRIPT_ROOT="${DEPLOY_SCRIPT_ROOT:-$SOURCE_REPO_ROOT}"
ROLLBACK_GIT_FETCH="${ROLLBACK_GIT_FETCH:-true}"
ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK="${ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK:-false}"

if [ -z "$TARGET_REF" ]; then
    echo "Usage: rollback_backend.sh <git_ref>" >&2
    exit 1
fi

if [ ! -d "$SOURCE_REPO_ROOT/.git" ]; then
    echo "Source repo root is not a git repository: $SOURCE_REPO_ROOT" >&2
    exit 1
fi

if [ ! -f "$DEPLOY_SCRIPT_ROOT/deploy/deploy_backend.sh" ]; then
    echo "Deploy wrapper not found under $DEPLOY_SCRIPT_ROOT" >&2
    exit 1
fi

echo "Rolling back backend in $PROJECT_ROOT to ref $TARGET_REF"
echo "Source repo root: $SOURCE_REPO_ROOT"

cd "$SOURCE_REPO_ROOT"

current_ref="$(git rev-parse --short HEAD)"
echo "Current source ref: $current_ref"

if [ "$ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK" != "true" ] && [ -n "$(git status --porcelain)" ]; then
    echo "Source repo has local changes; refusing rollback with dirty checkout." >&2
    echo "Commit or stash changes first, or set ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK=true explicitly." >&2
    exit 1
fi

if [ "$ROLLBACK_GIT_FETCH" = "true" ]; then
    git fetch --all --tags --prune
else
    echo "Skipping git fetch before rollback (ROLLBACK_GIT_FETCH=false)."
fi

git checkout "$TARGET_REF"

echo "Checked out source ref: $(git rev-parse --short HEAD)"

PROJECT_ROOT="$PROJECT_ROOT" \
ENV_FILE="$ENV_FILE" \
SERVICE_NAME="$SERVICE_NAME" \
EXPECTED_APP_ENV="$EXPECTED_APP_ENV" \
SOURCE_REPO_ROOT="$SOURCE_REPO_ROOT" \
bash "$DEPLOY_SCRIPT_ROOT/deploy/deploy_backend.sh"
