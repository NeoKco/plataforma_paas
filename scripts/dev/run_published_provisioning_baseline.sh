#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
BROKER_RUNNER="${BROKER_RUNNER:-$ROOT_DIR/scripts/dev/run_broker_dlq_playwright_target.sh}"
PUBLISHED_ROOT="${PUBLISHED_ROOT:-/opt/platform_paas_staging}"
PUBLISHED_ENV_SOURCE="${PUBLISHED_ENV_SOURCE:-$PUBLISHED_ROOT/.env.staging}"
PUBLISHED_ENV_TMP="${PUBLISHED_ENV_TMP:-/tmp/platform_paas_published.env}"
PUBLISHED_BASE_URL="${PUBLISHED_BASE_URL:-http://192.168.7.42:8081}"
PUBLISHED_BACKEND_PYTHON="${PUBLISHED_BACKEND_PYTHON:-$PUBLISHED_ROOT/platform_paas_venv/bin/python}"
PUBLISHED_DISPATCH_BACKEND="${PUBLISHED_DISPATCH_BACKEND:-}"
INCLUDE_BROKER_ONLY="${INCLUDE_BROKER_ONLY:-auto}"
BROKER_TARGET="${BROKER_TARGET:-all}"
KEEP_TMP_ENV=0

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_published_provisioning_baseline.sh [opciones]

Ejecuta un baseline published curado de Provisioning/DLQ:
  1. dispatch-capability
  2. DLQ surface gating
  3. observabilidad visible
  4. pack broker-only opcional cuando el entorno realmente usa broker

Opciones:
  --broker-target VALUE     Uno de: all, batch, row, filters, guided, family,
                            family-requeue, family-batch, family-recommendation,
                            tenant-focus, technical, matrix
  --skip-broker-only        Omite el pack broker-only aunque el entorno use broker
  --dispatch-backend VALUE  Fuerza broker|database si no quieres detectarlo desde env
  --keep-tmp-env            Conserva el env temporal copiado a /tmp
  --help                    Muestra esta ayuda

Variables útiles:
  PUBLISHED_ROOT
  PUBLISHED_ENV_SOURCE
  PUBLISHED_ENV_TMP
  PUBLISHED_BASE_URL
  PUBLISHED_BACKEND_PYTHON
  PUBLISHED_DISPATCH_BACKEND
  INCLUDE_BROKER_ONLY
  BROKER_TARGET
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --broker-target)
      BROKER_TARGET="${2:-}"
      if [[ -z "$BROKER_TARGET" ]]; then
        echo "Falta valor para --broker-target" >&2
        exit 1
      fi
      shift 2
      ;;
    --skip-broker-only)
      INCLUDE_BROKER_ONLY="never"
      shift
      ;;
    --dispatch-backend)
      PUBLISHED_DISPATCH_BACKEND="${2:-}"
      if [[ -z "$PUBLISHED_DISPATCH_BACKEND" ]]; then
        echo "Falta valor para --dispatch-backend" >&2
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

if [[ ! -x "$BROKER_RUNNER" ]]; then
  echo "Runner broker-only no encontrado o no ejecutable: $BROKER_RUNNER" >&2
  exit 1
fi

if [[ ! -x "$PUBLISHED_BACKEND_PYTHON" ]]; then
  echo "Python backend published no encontrado en $PUBLISHED_BACKEND_PYTHON" >&2
  exit 1
fi

cleanup() {
  local exit_code="${1:-0}"
  set +e
  if [[ "$KEEP_TMP_ENV" -ne 1 && -f "$PUBLISHED_ENV_TMP" ]]; then
    rm -f "$PUBLISHED_ENV_TMP"
  fi
  return "$exit_code"
}
trap 'cleanup "$?"' EXIT

copy_env_if_present() {
  if [[ -n "$PUBLISHED_DISPATCH_BACKEND" ]]; then
    return 0
  fi
  if [[ ! -f "$PUBLISHED_ENV_SOURCE" ]]; then
    return 0
  fi
  echo "==> Copiando env published a $PUBLISHED_ENV_TMP"
  sudo bash -lc "cp '$PUBLISHED_ENV_SOURCE' '$PUBLISHED_ENV_TMP' && chown $(id -un):$(id -gn) '$PUBLISHED_ENV_TMP' && chmod 600 '$PUBLISHED_ENV_TMP'"
}

detect_dispatch_backend() {
  if [[ -n "$PUBLISHED_DISPATCH_BACKEND" ]]; then
    printf '%s\n' "$PUBLISHED_DISPATCH_BACKEND"
    return 0
  fi
  if [[ ! -f "$PUBLISHED_ENV_TMP" ]]; then
    printf 'unknown\n'
    return 0
  fi

  (
    set -a
    source "$PUBLISHED_ENV_TMP"
    set +a
    PYTHONPATH="$PUBLISHED_ROOT/backend" "$PUBLISHED_BACKEND_PYTHON" -c \
      'from app.common.config.settings import settings; print(settings.PROVISIONING_DISPATCH_BACKEND)'
  )
}

copy_env_if_present

DISPATCH_BACKEND="$(detect_dispatch_backend | tr '[:upper:]' '[:lower:]')"
echo "==> Dispatch backend detectado: $DISPATCH_BACKEND"

export E2E_BASE_URL="$PUBLISHED_BASE_URL"
export E2E_USE_EXISTING_FRONTEND="1"
export E2E_BACKEND_ROOT="$PUBLISHED_ROOT"
export E2E_BACKEND_PYTHON="$PUBLISHED_BACKEND_PYTHON"
if [[ -f "$PUBLISHED_ENV_TMP" ]]; then
  export E2E_BACKEND_ENV_FILE="$PUBLISHED_ENV_TMP"
fi

echo "==> Ejecutando baseline visible de Provisioning/DLQ"
(
  cd "$FRONTEND_DIR"
  npx playwright test \
    e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts \
    e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts \
    e2e/specs/platform-admin-provisioning-observability-visible.smoke.spec.ts
)

case "$INCLUDE_BROKER_ONLY" in
  never)
    echo "==> Broker-only omitido por configuración"
    ;;
  auto|always)
    if [[ "$DISPATCH_BACKEND" == "broker" ]]; then
      echo "==> Ejecutando pack broker-only con target $BROKER_TARGET"
      TARGET="$BROKER_TARGET" FRONTEND_DIR="$FRONTEND_DIR" "$BROKER_RUNNER"
    elif [[ "$INCLUDE_BROKER_ONLY" == "always" ]]; then
      echo "El entorno publicado no usa broker y se pidió broker-only obligatorio" >&2
      exit 1
    else
      echo "==> Broker-only omitido: el entorno publicado no usa broker"
    fi
    ;;
  *)
    echo "INCLUDE_BROKER_ONLY no soportado: $INCLUDE_BROKER_ONLY" >&2
    exit 1
    ;;
esac

echo "==> Baseline published de Provisioning/DLQ completado"
