#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-platform-paas-backend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/health}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

echo "Verifying service: $SERVICE_NAME"
echo "Healthcheck URL: $HEALTHCHECK_URL"

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Service is not active: $SERVICE_NAME" >&2
    systemctl status "$SERVICE_NAME" --no-pager || true
    exit 1
fi

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
        echo "Healthcheck passed on attempt $attempt."
        exit 0
    fi

    echo "Healthcheck attempt $attempt failed. Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
done

echo "Healthcheck did not pass after $MAX_ATTEMPTS attempts." >&2
systemctl status "$SERVICE_NAME" --no-pager || true
exit 1
