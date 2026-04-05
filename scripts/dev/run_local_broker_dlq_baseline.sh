#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PYTHON_BIN="${E2E_BACKEND_PYTHON:-$ROOT_DIR/platform_paas_venv/bin/python}"
BACKEND_HOST="${BROKER_BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BROKER_BACKEND_PORT:-8001}"
FRONTEND_HOST="${BROKER_FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${BROKER_FRONTEND_PORT:-4273}"
REDIS_HOST="${BROKER_REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${BROKER_REDIS_PORT:-6379}"
REDIS_DB="${BROKER_REDIS_DB:-0}"
REDIS_URL="${BROKER_REDIS_URL:-redis://$REDIS_HOST:$REDIS_PORT/$REDIS_DB}"
BACKEND_PID=""
FRONTEND_PID=""
TARGET="all"
RUN_E2E_CLEANUP=1
E2E_CLEANUP_PREFIX="${E2E_CLEANUP_PREFIX:-e2e-}"

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_local_broker_dlq_baseline.sh [--target all|batch|row|filters]

Ejecuta la validación local broker-only para los 3 smokes DLQ de provisioning.

Opciones:
  --target VALUE   Selecciona `all`, `batch`, `row` o `filters`
  --skip-e2e-cleanup Omite el cleanup final de tenants `e2e-*`
  --help           Muestra esta ayuda

Variables útiles:
  E2E_BACKEND_PYTHON
  E2E_CLEANUP_PREFIX
  BROKER_BACKEND_HOST / BROKER_BACKEND_PORT
  BROKER_FRONTEND_HOST / BROKER_FRONTEND_PORT
  BROKER_REDIS_HOST / BROKER_REDIS_PORT / BROKER_REDIS_DB / BROKER_REDIS_URL
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
    --help)
      usage
      exit 0
      ;;
    --skip-e2e-cleanup)
      RUN_E2E_CLEANUP=0
      shift
      ;;
    *)
      echo "Opción no reconocida: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python backend no encontrado en $PYTHON_BIN" >&2
  exit 1
fi

export E2E_PLATFORM_EMAIL="${E2E_PLATFORM_EMAIL:-admin@platform.local}"
export E2E_PLATFORM_PASSWORD="${E2E_PLATFORM_PASSWORD:-AdminTemporal123!}"
export E2E_BASE_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"
export E2E_USE_EXISTING_FRONTEND="1"
export E2E_BACKEND_PYTHON="$PYTHON_BIN"
export PROVISIONING_DISPATCH_BACKEND="broker"
export PROVISIONING_BROKER_URL="$REDIS_URL"
export REDIS_URL="$REDIS_URL"

wait_for_http() {
  local url="$1"
  "$PYTHON_BIN" - <<'PY' "$url"
import sys
import time
import urllib.request

url = sys.argv[1]
deadline = time.time() + 60
last_error = None

while time.time() < deadline:
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            print(response.read().decode("utf-8"))
            raise SystemExit(0)
    except Exception as exc:
        last_error = exc
        time.sleep(1)

raise SystemExit(f"Health check failed for {url}: {last_error}")
PY
}

cleanup() {
  local exit_code="${1:-0}"
  set +e

  if [[ "$RUN_E2E_CLEANUP" -eq 1 ]]; then
    echo "==> Cleanup tenants E2E con prefijo $E2E_CLEANUP_PREFIX"
    (
      cd "$BACKEND_DIR"
      PYTHONPATH="$BACKEND_DIR" "$PYTHON_BIN" app/scripts/cleanup_e2e_tenants.py --prefix "$E2E_CLEANUP_PREFIX" --apply
    ) || true
  fi

  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$FRONTEND_PID" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  return "$exit_code"
}
trap 'cleanup "$?"' EXIT

echo "==> Verificando Redis broker en $REDIS_URL"
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null
else
  "$PYTHON_BIN" - <<'PY' "$REDIS_HOST" "$REDIS_PORT"
import socket
import sys
host = sys.argv[1]
port = int(sys.argv[2])
with socket.create_connection((host, port), timeout=3):
    pass
PY
fi

echo "==> Iniciando backend broker local en http://$BACKEND_HOST:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  BACKEND_CORS_ALLOW_ORIGINS="http://$FRONTEND_HOST:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT" \
  PROVISIONING_DISPATCH_BACKEND=broker \
  PROVISIONING_BROKER_URL="$REDIS_URL" \
  REDIS_URL="$REDIS_URL" \
  nohup "$PYTHON_BIN" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" >/tmp/platform-local-broker-dlq-backend.log 2>&1 &
  echo $! > /tmp/platform-local-broker-dlq-backend.pid
)
BACKEND_PID="$(cat /tmp/platform-local-broker-dlq-backend.pid)"
wait_for_http "http://$BACKEND_HOST:$BACKEND_PORT/health"

echo "==> Iniciando frontend broker local en http://$FRONTEND_HOST:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  VITE_API_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT" \
  nohup npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" >/tmp/platform-local-broker-dlq-frontend.log 2>&1 &
  echo $! > /tmp/platform-local-broker-dlq-frontend.pid
)
FRONTEND_PID="$(cat /tmp/platform-local-broker-dlq-frontend.pid)"
wait_for_http "http://$FRONTEND_HOST:$FRONTEND_PORT"

echo "==> Ejecutando smokes broker-only DLQ"
(
  cd "$FRONTEND_DIR"
  case "$TARGET" in
    all)
      npx playwright test \
        e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts \
        e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts
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
    *)
      echo "Target broker-only no soportado: $TARGET" >&2
      exit 1
      ;;
  esac
)

echo "==> Validación broker-only DLQ completada"
