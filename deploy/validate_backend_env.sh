#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"
EXPECTED_APP_ENV="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/load_dotenv.sh"

if [ -z "$ENV_FILE" ]; then
    echo "Usage: validate_backend_env.sh <env_file> [expected_app_env]" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found: $ENV_FILE" >&2
    exit 1
fi

load_dotenv_file "$ENV_FILE"

required_vars=(
    APP_ENV
    DEBUG
    CONTROL_DB_HOST
    CONTROL_DB_PORT
    CONTROL_DB_NAME
    CONTROL_DB_USER
    CONTROL_DB_PASSWORD
    POSTGRES_ADMIN_PASSWORD
    JWT_SECRET_KEY
    JWT_ISSUER
    JWT_PLATFORM_AUDIENCE
    JWT_TENANT_AUDIENCE
)

for var_name in "${required_vars[@]}"; do
    if [ -z "${!var_name:-}" ]; then
        echo "Missing required variable: $var_name" >&2
        exit 1
    fi
done

if [ -n "$EXPECTED_APP_ENV" ] && [ "${APP_ENV}" != "$EXPECTED_APP_ENV" ]; then
    echo "APP_ENV mismatch. Expected '$EXPECTED_APP_ENV' but found '${APP_ENV}'." >&2
    exit 1
fi

if [ "$APP_ENV" = "staging" ] || [ "$APP_ENV" = "production" ]; then
    if [ "${DEBUG}" != "false" ]; then
        echo "DEBUG must be false for staging/production deploys." >&2
        exit 1
    fi
fi

placeholder_values=(
    "change_me"
    "replace_me"
    "replace_with_strong_secret"
    "replace_with_strong_staging_secret"
    "change_this_secret_in_development"
)

for value in "${placeholder_values[@]}"; do
    if [ "${CONTROL_DB_PASSWORD}" = "$value" ]; then
        echo "CONTROL_DB_PASSWORD still uses a placeholder value." >&2
        exit 1
    fi

    if [ "${POSTGRES_ADMIN_PASSWORD}" = "$value" ]; then
        echo "POSTGRES_ADMIN_PASSWORD still uses a placeholder value." >&2
        exit 1
    fi

    if [ "${JWT_SECRET_KEY}" = "$value" ]; then
        echo "JWT_SECRET_KEY still uses a placeholder value." >&2
        exit 1
    fi
done

echo "Environment validation passed for APP_ENV=${APP_ENV} using ${ENV_FILE}"
