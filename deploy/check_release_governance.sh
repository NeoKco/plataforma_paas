#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
CHECK_SCRIPT="$PROJECT_ROOT/backend/app/scripts/check_memory_viva_sync.py"

if [ ! -f "$CHECK_SCRIPT" ]; then
    echo "Release governance check script not found: $CHECK_SCRIPT" >&2
    exit 1
fi

echo "Running release governance check from $PROJECT_ROOT"
"$PYTHON_BIN" "$CHECK_SCRIPT"
echo "Release governance check completed successfully."
