#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
TARGET="${TARGET:-all}"
STAGING_ROOT="${STAGING_ROOT:-/opt/platform_paas_staging}"
STAGING_ENV_SOURCE="${STAGING_ENV_SOURCE:-$STAGING_ROOT/.env.staging}"
STAGING_ENV_TMP="${STAGING_ENV_TMP:-/tmp/platform_paas_staging.env}"
STAGING_BASE_URL="${STAGING_BASE_URL:-http://192.168.7.42:8081}"
STAGING_BACKEND_PYTHON="${STAGING_BACKEND_PYTHON:-$STAGING_ROOT/platform_paas_venv/bin/python}"
KEEP_TMP_ENV=0

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_staging_published_broker_dlq_smoke.sh [opciones]

Ejecuta smokes broker-only de Provisioning/DLQ contra el staging publicado,
apuntando el seed backend al árbol real /opt/platform_paas_staging.

Opciones:
  --target VALUE   Uno de: all, batch, row, filters, guided, family, family-requeue, family-batch, family-recommendation
  --keep-tmp-env   Conserva /tmp/platform_paas_staging.env al terminar
  --help           Muestra esta ayuda

Variables útiles:
  STAGING_ROOT
  STAGING_ENV_SOURCE
  STAGING_ENV_TMP
  STAGING_BASE_URL
  STAGING_BACKEND_PYTHON
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
    --keep-tmp-env)
      KEEP_TMP_ENV=1
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

if [[ ! -x "$STAGING_BACKEND_PYTHON" ]]; then
  echo "Python backend de staging no encontrado en $STAGING_BACKEND_PYTHON" >&2
  exit 1
fi

copy_staging_env() {
  echo "==> Copiando env real de staging a $STAGING_ENV_TMP"
  sudo bash -lc "cp '$STAGING_ENV_SOURCE' '$STAGING_ENV_TMP' && chown $(id -un):$(id -gn) '$STAGING_ENV_TMP' && chmod 600 '$STAGING_ENV_TMP'"
}

cleanup() {
  local exit_code="${1:-0}"
  set +e
  if [[ "$KEEP_TMP_ENV" -ne 1 && -f "$STAGING_ENV_TMP" ]]; then
    rm -f "$STAGING_ENV_TMP"
  fi
  return "$exit_code"
}
trap 'cleanup "$?"' EXIT

copy_staging_env

echo "==> Validando dispatch backend real de staging"
DISPATCH_BACKEND="$(
  set -a && source "$STAGING_ENV_TMP" && set +a && \
    PYTHONPATH="$STAGING_ROOT/backend" "$STAGING_BACKEND_PYTHON" -c \
      'from app.common.config.settings import settings; print(settings.PROVISIONING_DISPATCH_BACKEND)'
)"

if [[ "$DISPATCH_BACKEND" != "broker" ]]; then
  echo "El staging publicado no corre con backend broker: $DISPATCH_BACKEND" >&2
  exit 1
fi

export E2E_BASE_URL="$STAGING_BASE_URL"
export E2E_USE_EXISTING_FRONTEND="1"
export E2E_BACKEND_ROOT="$STAGING_ROOT"
export E2E_BACKEND_PYTHON="$STAGING_BACKEND_PYTHON"
export E2E_BACKEND_ENV_FILE="$STAGING_ENV_TMP"

echo "==> Ejecutando smokes broker-only de staging publicado"
(
  cd "$FRONTEND_DIR"
  case "$TARGET" in
    all)
      npx playwright test \
        e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts
      ;;
    batch)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts
      ;;
    row)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts
      ;;
    filters)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts
      ;;
    guided)
      npx playwright test e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts
      ;;
    family)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts
      ;;
    family-requeue)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts
      ;;
    family-batch)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts
      ;;
    family-recommendation)
      npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts
      ;;
    *)
      echo "Target no soportado: $TARGET" >&2
      exit 1
      ;;
  esac
)

echo "==> Smokes broker-only published de staging completados"
