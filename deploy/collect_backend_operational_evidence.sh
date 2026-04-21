#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/health}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/operational_evidence}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${OUTPUT_DIR}/backend_operational_evidence_${TIMESTAMP}.log"

mkdir -p "$OUTPUT_DIR"

append_section() {
    local title="$1"

    {
        echo
        echo "===== ${title} ====="
    } >> "$OUTPUT_FILE"
}

append_command_output() {
    local title="$1"
    shift

    append_section "$title"
    {
        echo "Command: $*"
        "$@" 2>&1 || true
    } >> "$OUTPUT_FILE"
}

{
    echo "Platform PaaS Operational Evidence"
    echo "Generated at: $(date --iso-8601=seconds)"
    echo "Hostname: $(hostname)"
    echo "Service: ${SERVICE_NAME}"
    echo "Healthcheck URL: ${HEALTHCHECK_URL}"
} > "$OUTPUT_FILE"

if [ -d "$PROJECT_ROOT/.git" ]; then
    append_command_output "Git Revision" git -C "$PROJECT_ROOT" rev-parse HEAD
    append_command_output "Git Status" git -C "$PROJECT_ROOT" status --short
fi

append_command_output "Service Status" systemctl status "$SERVICE_NAME" --no-pager
append_command_output "Recent Service Logs" journalctl -u "$SERVICE_NAME" -n 100 --no-pager
append_command_output "Healthcheck Response" curl --include --silent --show-error "$HEALTHCHECK_URL"

latest_audit_snapshot="$(ls -1t "$OUTPUT_DIR"/active_tenant_convergence_*.json 2>/dev/null | head -n 1 || true)"
if [ -n "$latest_audit_snapshot" ] && [ -f "$latest_audit_snapshot" ]; then
    append_section "Active Tenant Convergence JSON Snapshot"
    {
        echo "File: $latest_audit_snapshot"
        cat "$latest_audit_snapshot"
    } >> "$OUTPUT_FILE"
fi

echo "Operational evidence saved to: $OUTPUT_FILE"
