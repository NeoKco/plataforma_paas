#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
BROKER_RUNNER="${BROKER_RUNNER:-$ROOT_DIR/scripts/dev/run_broker_dlq_playwright_target.sh}"
DISPATCH_BACKEND="${DISPATCH_BACKEND:-database}"
INCLUDE_BROKER_ONLY="${INCLUDE_BROKER_ONLY:-auto}"
BROKER_TARGET="${BROKER_TARGET:-all}"
LIST_ONLY=0

usage() {
  cat <<'EOF'
Uso:
  scripts/dev/run_repo_provisioning_baseline.sh [opciones]

Ejecuta el equivalente repo/CI del baseline curado de Provisioning/DLQ:
  1. dispatch-capability
  2. DLQ surface gating
  3. observabilidad visible
  4. pack broker-only opcional cuando el backend activo usa broker

Opciones:
  --dispatch-backend VALUE  Fuerza broker|database
  --broker-target VALUE     Uno de: all, batch, row, filters, guided, family,
                            family-requeue, family-batch, family-recommendation,
                            tenant-focus, technical, matrix
  --skip-broker-only        Omite el pack broker-only aunque el backend use broker
  --list                    Solo valida wiring/compilación con `playwright --list`
  --help                    Muestra esta ayuda

Variables útiles:
  FRONTEND_DIR
  DISPATCH_BACKEND
  INCLUDE_BROKER_ONLY
  BROKER_TARGET
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dispatch-backend)
      DISPATCH_BACKEND="${2:-}"
      if [[ -z "$DISPATCH_BACKEND" ]]; then
        echo "Falta valor para --dispatch-backend" >&2
        exit 1
      fi
      shift 2
      ;;
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

if [[ ! -x "$BROKER_RUNNER" ]]; then
  echo "Runner broker-only no encontrado o no ejecutable: $BROKER_RUNNER" >&2
  exit 1
fi

DISPATCH_BACKEND="$(printf '%s' "$DISPATCH_BACKEND" | tr '[:upper:]' '[:lower:]')"
case "$DISPATCH_BACKEND" in
  broker|database)
    ;;
  *)
    echo "dispatch backend no soportado: $DISPATCH_BACKEND" >&2
    exit 1
    ;;
esac

PLAYWRIGHT_ARGS=(
  e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts
  e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts
  e2e/specs/platform-admin-provisioning-observability-visible.smoke.spec.ts
)
if [[ "$LIST_ONLY" -eq 1 ]]; then
  PLAYWRIGHT_ARGS+=(--list)
fi

echo "==> Ejecutando baseline repo/CI visible de Provisioning/DLQ"
(
  cd "$FRONTEND_DIR"
  npx playwright test "${PLAYWRIGHT_ARGS[@]}"
)

case "$INCLUDE_BROKER_ONLY" in
  never)
    echo "==> Broker-only omitido por configuración"
    ;;
  auto|always)
    if [[ "$DISPATCH_BACKEND" == "broker" ]]; then
      echo "==> Ejecutando pack broker-only con target $BROKER_TARGET"
      BROKER_ARGS=()
      if [[ "$LIST_ONLY" -eq 1 ]]; then
        BROKER_ARGS+=(--list)
      fi
      TARGET="$BROKER_TARGET" FRONTEND_DIR="$FRONTEND_DIR" "$BROKER_RUNNER" "${BROKER_ARGS[@]}"
    elif [[ "$INCLUDE_BROKER_ONLY" == "always" ]]; then
      echo "Se pidió broker-only obligatorio pero el backend activo es $DISPATCH_BACKEND" >&2
      exit 1
    else
      echo "==> Broker-only omitido: el backend activo no usa broker"
    fi
    ;;
  *)
    echo "INCLUDE_BROKER_ONLY no soportado: $INCLUDE_BROKER_ONLY" >&2
    exit 1
    ;;
esac

echo "==> Baseline repo/CI de Provisioning/DLQ completado"
