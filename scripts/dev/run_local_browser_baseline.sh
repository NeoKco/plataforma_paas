#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
PYTHON_BIN="${E2E_BACKEND_PYTHON:-$ROOT_DIR/platform_paas_venv/bin/python}"
RUN_BUILD=1
RUN_PLATFORM=1
RUN_TENANT=1
STARTED_BACKEND=0
BACKEND_PID=""
TARGET="all"

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_local_browser_baseline.sh [opciones]

Opciones:
  --target VALUE   Selecciona `all`, `platform` o `tenant`
  --platform-only   Ejecuta solo build + baseline platform
  --tenant-only     Ejecuta solo build + baseline tenant
  --skip-build      Omite npm run build
  --help            Muestra esta ayuda

Variables útiles:
  E2E_PLATFORM_EMAIL / E2E_PLATFORM_PASSWORD
  E2E_TENANT_SLUG / E2E_TENANT_EMAIL / E2E_TENANT_PASSWORD
  E2E_BACKEND_PYTHON
  BACKEND_HOST / BACKEND_PORT
  FRONTEND_HOST / FRONTEND_PORT
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
      continue
      ;;
    --platform-only)
      RUN_PLATFORM=1
      RUN_TENANT=0
      TARGET="platform"
      ;;
    --tenant-only)
      RUN_PLATFORM=0
      RUN_TENANT=1
      TARGET="tenant"
      ;;
    --skip-build)
      RUN_BUILD=0
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
  shift
done

case "$TARGET" in
  all)
    RUN_PLATFORM=1
    RUN_TENANT=1
    ;;
  platform)
    RUN_PLATFORM=1
    RUN_TENANT=0
    ;;
  tenant)
    RUN_PLATFORM=0
    RUN_TENANT=1
    ;;
  *)
    echo "Target no soportado: $TARGET" >&2
    exit 1
    ;;
esac

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python backend no encontrado en $PYTHON_BIN" >&2
  exit 1
fi

export E2E_PLATFORM_EMAIL="${E2E_PLATFORM_EMAIL:-admin@platform.local}"
export E2E_PLATFORM_PASSWORD="${E2E_PLATFORM_PASSWORD:-AdminTemporal123!}"
export E2E_TENANT_SLUG="${E2E_TENANT_SLUG:-empresa-bootstrap}"
export E2E_TENANT_EMAIL="${E2E_TENANT_EMAIL:-admin@empresa-bootstrap.local}"
export E2E_TENANT_PASSWORD="${E2E_TENANT_PASSWORD:-TenantAdmin123!}"
export E2E_BASE_URL="${E2E_BASE_URL:-http://$FRONTEND_HOST:$FRONTEND_PORT}"
export E2E_USE_EXISTING_FRONTEND="${E2E_USE_EXISTING_FRONTEND:-0}"
export E2E_BACKEND_PYTHON="$PYTHON_BIN"

wait_for_health() {
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
  if [[ "$STARTED_BACKEND" -eq 1 && -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> Migraciones de control"
(
  cd "$BACKEND_DIR"
  PYTHONPATH="$BACKEND_DIR" "$PYTHON_BIN" -m app.scripts.run_control_migrations
)

echo "==> Seed baseline frontend"
(
  cd "$BACKEND_DIR"
  PYTHONPATH="$BACKEND_DIR" "$PYTHON_BIN" -m app.scripts.seed_frontend_demo_baseline
)

echo "==> Verificando backend en http://$BACKEND_HOST:$BACKEND_PORT/health"
if ! "$PYTHON_BIN" - <<'PY' "$BACKEND_HOST" "$BACKEND_PORT"
import socket
import sys
host = sys.argv[1]
port = int(sys.argv[2])
try:
    with socket.create_connection((host, port), timeout=1):
        raise SystemExit(0)
except OSError:
    raise SystemExit(1)
PY
then
  echo "==> Backend no detectado. Iniciando uvicorn local"
  (
    cd "$BACKEND_DIR"
    nohup "$PYTHON_BIN" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" >/tmp/platform-local-browser-baseline-backend.log 2>&1 &
    echo $! > /tmp/platform-local-browser-baseline-backend.pid
  )
  BACKEND_PID="$(cat /tmp/platform-local-browser-baseline-backend.pid)"
  STARTED_BACKEND=1
fi

wait_for_health "http://$BACKEND_HOST:$BACKEND_PORT/health"

if [[ "$RUN_BUILD" -eq 1 ]]; then
  echo "==> Frontend build"
  (
    cd "$FRONTEND_DIR"
    npm run build
  )
fi

if [[ "$RUN_PLATFORM" -eq 1 ]]; then
  echo "==> Baseline browser platform"
  (
    cd "$FRONTEND_DIR"
    npm run e2e:platform
  )
fi

if [[ "$RUN_TENANT" -eq 1 ]]; then
  echo "==> Baseline browser tenant"
  (
    cd "$FRONTEND_DIR"
    npm run e2e:tenant
  )
fi

echo "==> Baseline browser local completada"
