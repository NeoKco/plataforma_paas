#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECT_OPERATIONAL_EVIDENCE="${COLLECT_OPERATIONAL_EVIDENCE:-true}"
RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY="${RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY:-false}"
REMOTE_BACKEND_SMOKE_STRICT="${REMOTE_BACKEND_SMOKE_STRICT:-true}"
REMOTE_BACKEND_SMOKE_BASE_URL="${REMOTE_BACKEND_SMOKE_BASE_URL:-}"
REMOTE_BACKEND_SMOKE_TARGET="${REMOTE_BACKEND_SMOKE_TARGET:-all}"
REMOTE_BACKEND_SMOKE_TIMEOUT_SECONDS="${REMOTE_BACKEND_SMOKE_TIMEOUT_SECONDS:-15}"
REMOTE_BACKEND_SMOKE_ATTEMPTS="${REMOTE_BACKEND_SMOKE_ATTEMPTS:-3}"
REMOTE_BACKEND_SMOKE_RETRY_DELAY_SECONDS="${REMOTE_BACKEND_SMOKE_RETRY_DELAY_SECONDS:-5}"
PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
REMOTE_BACKEND_SMOKE_REPORT_PATH="${REMOTE_BACKEND_SMOKE_REPORT_PATH:-$PROJECT_ROOT/operational_evidence/remote_backend_smoke_$(date +%Y%m%d_%H%M%S).json}"

VERIFY_EXIT_CODE=0
REMOTE_SMOKE_EXIT_CODE=0

set +e
bash "$SCRIPT_DIR/verify_backend_deploy.sh"
VERIFY_EXIT_CODE=$?
set -e

if [ "$RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY" = "true" ]; then
    echo "Running remote backend smoke..."
    set +e
    python3 "$SCRIPT_DIR/run_remote_backend_smoke.py" \
        --base-url "$REMOTE_BACKEND_SMOKE_BASE_URL" \
        --target "$REMOTE_BACKEND_SMOKE_TARGET" \
        --timeout "$REMOTE_BACKEND_SMOKE_TIMEOUT_SECONDS" \
        --attempts "$REMOTE_BACKEND_SMOKE_ATTEMPTS" \
        --retry-delay "$REMOTE_BACKEND_SMOKE_RETRY_DELAY_SECONDS" \
        --report-path "$REMOTE_BACKEND_SMOKE_REPORT_PATH"
    REMOTE_SMOKE_EXIT_CODE=$?
    set -e

    if [ "$REMOTE_SMOKE_EXIT_CODE" -ne 0 ]; then
        if [ "$REMOTE_BACKEND_SMOKE_STRICT" = "true" ]; then
            echo "Remote backend smoke failed with exit code $REMOTE_SMOKE_EXIT_CODE" >&2
        else
            echo "WARNING: Remote backend smoke failed with exit code $REMOTE_SMOKE_EXIT_CODE" >&2
        fi
    fi
else
    echo "Remote backend smoke skipped."
fi

if [ "$COLLECT_OPERATIONAL_EVIDENCE" = "true" ]; then
    echo "Collecting backend operational evidence..."
    bash "$SCRIPT_DIR/collect_backend_operational_evidence.sh" || true
else
    echo "Operational evidence collection skipped."
fi

if [ "$VERIFY_EXIT_CODE" -ne 0 ]; then
    echo "Post-deploy verification failed with exit code $VERIFY_EXIT_CODE" >&2
    exit "$VERIFY_EXIT_CODE"
fi

if [ "$REMOTE_SMOKE_EXIT_CODE" -ne 0 ] && [ "$REMOTE_BACKEND_SMOKE_STRICT" = "true" ]; then
    echo "Post-deploy remote smoke failed with exit code $REMOTE_SMOKE_EXIT_CODE" >&2
    exit "$REMOTE_SMOKE_EXIT_CODE"
fi

echo "Post-deploy verification completed successfully."
