#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
TARGET="${TARGET:-all}"
LIST_ONLY=0

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_broker_dlq_playwright_target.sh [opciones]

Ejecuta o lista el subset broker-only de Provisioning/DLQ en Playwright.

Opciones:
  --target VALUE   Uno de: all, batch, row, filters, guided, family,
                   family-requeue, family-batch, family-recommendation,
                   tenant-focus, technical, matrix
  --list           Solo valida wiring/compilación con `playwright --list`
  --help           Muestra esta ayuda

Variables útiles:
  FRONTEND_DIR
  TARGET
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      if [[ -z "$TARGET" ]]; then
        echo "Falta valor para --target" >&2
        exit 1
      fi
      shift 2
      ;;
    --list)
      LIST_ONLY=1
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Opción no reconocida: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

SPECS=()
case "$TARGET" in
  all)
    SPECS=(
      e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts
      e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts
    )
    ;;
  batch)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
    ;;
  row)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
    ;;
  filters)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)
    ;;
  guided)
    SPECS=(e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts)
    ;;
  family)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts)
    ;;
  family-requeue)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts)
    ;;
  family-batch)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
    ;;
  family-recommendation)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
    ;;
  tenant-focus)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
    ;;
  technical)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
    ;;
  matrix)
    SPECS=(e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)
    ;;
  *)
    echo "Target broker-only no soportado: $TARGET" >&2
    exit 1
    ;;
esac

PLAYWRIGHT_ARGS=("${SPECS[@]}")
if [[ "$LIST_ONLY" -eq 1 ]]; then
  PLAYWRIGHT_ARGS+=(--list)
fi

(
  cd "$FRONTEND_DIR"
  npx playwright test "${PLAYWRIGHT_ARGS[@]}"
)
