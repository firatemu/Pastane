# Shared staging env loader — source from other scripts (not executable).
ENV_FILE="${ENV_FILE:-.env.staging}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pastane-staging}"
STAGING_TIMING_REPORT="${STAGING_TIMING_REPORT:-${BACKUP_DIR}/cutover-timing-report.json}"
STAGING_RESOURCE_REPORT="${STAGING_RESOURCE_REPORT:-${BACKUP_DIR}/resource-snapshot.txt}"
export BACKUP_DIR ENV_FILE STAGING_TIMING_REPORT STAGING_RESOURCE_REPORT
