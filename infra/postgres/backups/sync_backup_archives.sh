#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${SOURCE_DIR:-/var/backups/platform_paas}"
REMOTE_TARGET="${REMOTE_TARGET:-}"
RSYNC_BIN="${RSYNC_BIN:-rsync}"
RSYNC_OPTS="${RSYNC_OPTS:--az --delete}"

if [ -z "$REMOTE_TARGET" ]; then
    echo "REMOTE_TARGET is required. Example: backup@example:/srv/backups/platform_paas" >&2
    exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory not found: $SOURCE_DIR" >&2
    exit 1
fi

echo "Syncing backups from $SOURCE_DIR to $REMOTE_TARGET"

# shellcheck disable=SC2086
"$RSYNC_BIN" $RSYNC_OPTS "${SOURCE_DIR}/" "$REMOTE_TARGET"

echo "External backup sync completed."
