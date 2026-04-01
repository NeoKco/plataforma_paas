#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="${E2E_BACKEND_PYTHON:-$ROOT_DIR/platform_paas_venv/bin/python}"
TARGET="all"
WITH_POSTGRES=0
SKIP_POSTGRES=0
SKIP_HTTP_SMOKE=0

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_local_backend_baseline.sh [opciones]

Opciones:
  --target VALUE      Selecciona `all`, `auth`, `tenant`, `finance`, `provisioning` o `platform`
  --with-postgres     Fuerza suites PostgreSQL usando `PGTEST_*` o defaults locales
  --skip-postgres     Omite suites PostgreSQL aunque exista configuración
  --skip-http-smoke   Omite el smoke HTTP que levanta Uvicorn temporal
  --help              Muestra esta ayuda

Variables útiles:
  E2E_BACKEND_PYTHON
  PGTEST_HOST / PGTEST_PORT / PGTEST_ADMIN_DB
  PGTEST_ADMIN_USER / PGTEST_ADMIN_PASSWORD
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
    --with-postgres)
      WITH_POSTGRES=1
      ;;
    --skip-postgres)
      SKIP_POSTGRES=1
      ;;
    --skip-http-smoke)
      SKIP_HTTP_SMOKE=1
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
  all|auth|tenant|finance|provisioning|platform)
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

if [[ "$WITH_POSTGRES" -eq 1 && "$SKIP_POSTGRES" -eq 0 ]]; then
  export PGTEST_HOST="${PGTEST_HOST:-127.0.0.1}"
  export PGTEST_PORT="${PGTEST_PORT:-5432}"
  export PGTEST_ADMIN_DB="${PGTEST_ADMIN_DB:-postgres}"
  export PGTEST_ADMIN_USER="${PGTEST_ADMIN_USER:-postgres}"
  export PGTEST_ADMIN_PASSWORD="${PGTEST_ADMIN_PASSWORD:-postgres}"
fi

CMD=("$PYTHON_BIN" "app/scripts/run_backend_tests.py" "--target" "$TARGET")

if [[ "$WITH_POSTGRES" -eq 1 ]]; then
  CMD+=("--with-postgres")
fi

if [[ "$SKIP_POSTGRES" -eq 1 ]]; then
  CMD+=("--skip-postgres")
fi

if [[ "$SKIP_HTTP_SMOKE" -eq 1 ]]; then
  CMD+=("--skip-http-smoke")
fi

echo "==> Backend baseline target: $TARGET"
if [[ "$WITH_POSTGRES" -eq 1 && "$SKIP_POSTGRES" -eq 0 ]]; then
  echo "==> PostgreSQL target activo en ${PGTEST_HOST}:${PGTEST_PORT}/${PGTEST_ADMIN_DB}"
fi

(
  cd "$BACKEND_DIR"
  PYTHONPATH="$BACKEND_DIR" "${CMD[@]}"
)
