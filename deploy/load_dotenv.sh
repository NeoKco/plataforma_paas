#!/usr/bin/env bash

load_dotenv_file() {
    local env_file="$1"

    if [ ! -f "$env_file" ]; then
        echo "Environment file not found: $env_file" >&2
        return 1
    fi

    while IFS= read -r raw_line || [ -n "$raw_line" ]; do
        local line="$raw_line"

        line="${line%$'\r'}"

        case "$line" in
            ''|[[:space:]]*'#')
                continue
                ;;
        esac

        if [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            echo "Invalid env line: $line" >&2
            return 1
        fi

        local key="${line%%=*}"
        local value="${line#*=}"

        if [[ "$value" =~ ^".*"$ ]]; then
            value="${value:1:${#value}-2}"
        elif [[ "$value" =~ ^'.*'$ ]]; then
            value="${value:1:${#value}-2}"
        fi

        export "$key=$value"
    done < "$env_file"
}