#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECT_OPERATIONAL_EVIDENCE="${COLLECT_OPERATIONAL_EVIDENCE:-true}"

VERIFY_EXIT_CODE=0

set +e
bash "$SCRIPT_DIR/verify_backend_deploy.sh"
VERIFY_EXIT_CODE=$?
set -e

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

echo "Post-deploy verification completed successfully."