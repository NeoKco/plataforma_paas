#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="${E2E_BACKEND_PYTHON:-$ROOT_DIR/platform_paas_venv/bin/python}"
TARGET="all"
WITH_POSTGRES=0
SKIP_POSTGRES=0
SKIP_HTTP_SMOKE=0

read_env_value() {
  local env_file="$1"
  local key="$2"

  python3 - "$env_file" "$key" <<'PY'
from pathlib import Path
import sys

env_file = Path(sys.argv[1])
key = sys.argv[2]

if not env_file.exists():
    raise SystemExit(0)

for raw_line in env_file.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    current_key, value = line.split("=", 1)
    if current_key == key:
        print(value)
        break
PY
}

load_local_env_defaults() {
  local env_file="$ROOT_DIR/.env"

  if [[ ! -f "$env_file" ]]; then
    return
  fi

  if [[ -z "${PGTEST_HOST:-}" ]]; then
    PGTEST_HOST="$(read_env_value "$env_file" "PGTEST_HOST")"
  fi
  if [[ -z "${PGTEST_PORT:-}" ]]; then
    PGTEST_PORT="$(read_env_value "$env_file" "PGTEST_PORT")"
  fi
  if [[ -z "${PGTEST_ADMIN_DB:-}" ]]; then
    PGTEST_ADMIN_DB="$(read_env_value "$env_file" "PGTEST_ADMIN_DB")"
  fi
  if [[ -z "${PGTEST_ADMIN_USER:-}" ]]; then
    PGTEST_ADMIN_USER="$(read_env_value "$env_file" "PGTEST_ADMIN_USER")"
  fi
  if [[ -z "${PGTEST_ADMIN_PASSWORD:-}" ]]; then
    PGTEST_ADMIN_PASSWORD="$(read_env_value "$env_file" "PGTEST_ADMIN_PASSWORD")"
  fi
  if [[ -z "${POSTGRES_ADMIN_USER:-}" ]]; then
    POSTGRES_ADMIN_USER="$(read_env_value "$env_file" "POSTGRES_ADMIN_USER")"
  fi
  if [[ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]]; then
    POSTGRES_ADMIN_PASSWORD="$(read_env_value "$env_file" "POSTGRES_ADMIN_PASSWORD")"
  fi
}

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

Defaults locales para `--with-postgres`:
  1. `PGTEST_*` ya exportadas en el shell actual
  2. valores cargados desde `.env` del repo
  3. fallback local (`127.0.0.1`, `5432`, `postgres`)
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
  load_local_env_defaults
  export PGTEST_HOST="${PGTEST_HOST:-127.0.0.1}"
  export PGTEST_PORT="${PGTEST_PORT:-5432}"
  export PGTEST_ADMIN_DB="${PGTEST_ADMIN_DB:-postgres}"
  export PGTEST_ADMIN_USER="${PGTEST_ADMIN_USER:-${POSTGRES_ADMIN_USER:-postgres}}"
  export PGTEST_ADMIN_PASSWORD="${PGTEST_ADMIN_PASSWORD:-${POSTGRES_ADMIN_PASSWORD:-postgres}}"
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
