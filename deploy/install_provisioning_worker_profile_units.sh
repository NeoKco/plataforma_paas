#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <profile-name> <on-calendar> [target-dir]" >&2
  exit 1
fi

PROFILE_NAME="$1"
ON_CALENDAR="$2"
TARGET_DIR="${3:-/etc/systemd/system}"

case "$PROFILE_NAME" in
  *[!A-Za-z0-9._-]*|"")
    echo "Invalid profile name: $PROFILE_NAME" >&2
    exit 1
    ;;
esac

PROJECT_ROOT="${PROJECT_ROOT:-/opt/platform_paas}"
RUN_AS_USER="${RUN_AS_USER:-platform}"
RUN_AS_GROUP="${RUN_AS_GROUP:-platform}"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/.env}"
WRAPPER_PATH="${WRAPPER_PATH:-${PROJECT_ROOT}/deploy/run_provisioning_worker_profile.sh}"

SERVICE_NAME="platform-paas-provisioning-worker-profile-${PROFILE_NAME}.service"
TIMER_NAME="platform-paas-provisioning-worker-profile-${PROFILE_NAME}.timer"
SERVICE_PATH="${TARGET_DIR}/${SERVICE_NAME}"
TIMER_PATH="${TARGET_DIR}/${TIMER_NAME}"

mkdir -p "${TARGET_DIR}"

cat > "${SERVICE_PATH}" <<EOF
[Unit]
Description=Run provisioning worker once for profile ${PROFILE_NAME}
After=postgresql.service
Wants=postgresql.service

[Service]
Type=oneshot
User=${RUN_AS_USER}
Group=${RUN_AS_GROUP}
WorkingDirectory=${PROJECT_ROOT}
EnvironmentFile=${ENV_FILE}
ExecStart=${WRAPPER_PATH} ${PROFILE_NAME}
EOF

cat > "${TIMER_PATH}" <<EOF
[Unit]
Description=Run provisioning worker profile ${PROFILE_NAME} on schedule

[Timer]
OnCalendar=${ON_CALENDAR}
Persistent=true
Unit=${SERVICE_NAME}

[Install]
WantedBy=timers.target
EOF

echo "Created:"
echo "  ${SERVICE_PATH}"
echo "  ${TIMER_PATH}"
echo
echo "Next steps:"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now ${TIMER_NAME}"
echo "  sudo systemctl status ${TIMER_NAME} --no-pager"
