#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_BIN="${E2E_BACKEND_PYTHON:-$ROOT_DIR/platform_paas_venv/bin/python}"
TARGET="all"
ATTEMPTS="${SMOKE_ATTEMPTS:-3}"
RETRY_DELAY="${SMOKE_RETRY_DELAY_SECONDS:-5}"
TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-15}"
REPORT_PATH="${SMOKE_REPORT_PATH:-$ROOT_DIR/storage/remote-backend-smoke/latest-report.json}"
EXTRA_ARGS=()

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_remote_backend_smoke.sh [opciones]

Opciones:
  --target VALUE       Selecciona `all`, `base`, `platform` o `tenant`
  --attempts VALUE     Reintentos antes de fallar
  --retry-delay VALUE  Segundos entre reintentos
  --timeout VALUE      Timeout por request
  --report-path PATH   Ruta del reporte JSON
  --help               Muestra esta ayuda

Variables útiles:
  SMOKE_BASE_URL
  SMOKE_PLATFORM_EMAIL / SMOKE_PLATFORM_PASSWORD
  SMOKE_TENANT_SLUG / SMOKE_TENANT_EMAIL / SMOKE_TENANT_PASSWORD
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      continue
      ;;
    --attempts)
      ATTEMPTS="${2:-}"
      shift 2
      continue
      ;;
    --retry-delay)
      RETRY_DELAY="${2:-}"
      shift 2
      continue
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:-}"
      shift 2
      continue
      ;;
    --report-path)
      REPORT_PATH="${2:-}"
      shift 2
      continue
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      EXTRA_ARGS+=("$1")
      ;;
  esac
  shift
done

case "$TARGET" in
  all|base|platform|tenant)
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

if [[ -z "${SMOKE_BASE_URL:-}" ]]; then
  echo "Falta SMOKE_BASE_URL" >&2
  exit 1
fi

echo "==> Remote backend smoke target: $TARGET"
echo "==> Base URL: ${SMOKE_BASE_URL}"
echo "==> Reporte JSON: ${REPORT_PATH}"

"$PYTHON_BIN" "$ROOT_DIR/deploy/run_remote_backend_smoke.py" \
  --base-url "$SMOKE_BASE_URL" \
  --target "$TARGET" \
  --attempts "$ATTEMPTS" \
  --retry-delay "$RETRY_DELAY" \
  --timeout "$TIMEOUT_SECONDS" \
  --report-path "$REPORT_PATH" \
  "${EXTRA_ARGS[@]}"