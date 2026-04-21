#!/usr/bin/env bash
set -euo pipefail

SOURCE_BACKEND_DIR="${SOURCE_BACKEND_DIR:-}"
TARGET_BACKEND_DIR="${TARGET_BACKEND_DIR:-}"
SYNC_RUNTIME_BACKEND_FROM_SOURCE="${SYNC_RUNTIME_BACKEND_FROM_SOURCE:-auto}"

resolve_dir() {
    local path="$1"
    if [ ! -d "$path" ]; then
        echo "$path"
        return 0
    fi
    (cd "$path" && pwd)
}

if [ "$SYNC_RUNTIME_BACKEND_FROM_SOURCE" = "false" ]; then
    echo "Skipping backend runtime sync (SYNC_RUNTIME_BACKEND_FROM_SOURCE=false)."
    exit 0
fi

if [ -z "$SOURCE_BACKEND_DIR" ] || [ -z "$TARGET_BACKEND_DIR" ]; then
    echo "SOURCE_BACKEND_DIR and TARGET_BACKEND_DIR are required." >&2
    exit 1
fi

if [ ! -d "$SOURCE_BACKEND_DIR" ]; then
    echo "Source backend directory not found: $SOURCE_BACKEND_DIR" >&2
    exit 1
fi

mkdir -p "$TARGET_BACKEND_DIR"

source_real="$(resolve_dir "$SOURCE_BACKEND_DIR")"
target_real="$(resolve_dir "$TARGET_BACKEND_DIR")"

if [ "$source_real" = "$target_real" ]; then
    echo "Skipping backend runtime sync because source and target are the same: $source_real"
    exit 0
fi

case "$target_real" in
    */backend)
        ;;
    *)
        echo "Refusing to sync into unexpected target directory: $target_real" >&2
        exit 1
        ;;
esac

echo "Syncing runtime backend tree from $source_real to $target_real"

# Mirror the backend tree explicitly so the runtime does not keep stale code
# from a previous release.
find "$target_real" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a "$source_real/." "$target_real/"

echo "Runtime backend tree synced successfully."
