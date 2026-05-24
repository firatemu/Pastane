#!/usr/bin/env bash
# Restore sanitized production dump into staging Supabase full stack. Does NOT modify production.
#
# Usage:
#   DUMP_FILE=/var/backups/pastane-staging/prod-source-XXX.dump bash scripts/staging/restore-to-staging.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.staging}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-staging}"
RUNTIME_ENV="${RUNTIME_ENV:-docker/supabase/.runtime.staging.env}"
SQL_SANITIZE="${SQL_SANITIZE:-scripts/staging/sanitize-staging-db.sql}"
DB_SVC="${DB_SVC:-db}"

# shellcheck source=scripts/staging/_load-env.sh
source "$ROOT/scripts/staging/_load-env.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. cp .env.staging.example .env.staging" >&2
  exit 1
fi

DUMP_FILE="${DUMP_FILE:-}"
if [[ -z "$DUMP_FILE" && -f "${BACKUP_DIR:-/var/backups/pastane-staging}/.latest-prod-source-dump" ]]; then
  DUMP_FILE="$(cat "${BACKUP_DIR}/.latest-prod-source-dump")"
fi
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "error: set DUMP_FILE=... or run copy-prod-dump-for-staging.sh first" >&2
  exit 1
fi

bash "$ROOT/scripts/generate-supabase-compose-env.sh" "$ENV_FILE" "$ROOT/$RUNTIME_ENV"

compose_staging() {
  docker compose --project-name "$PROJECT_SUPABASE" \
    --env-file "$ROOT/$RUNTIME_ENV" \
    -f "$ROOT/docker/supabase/docker-compose.yml" \
    -f "$ROOT/docker/supabase/docker-compose.pg17.yml" \
    -f "$ROOT/docker/supabase/docker-compose.pastane.staging.yml" "$@"
}

echo "Ensuring staging Supabase stack is up..."
compose_staging up -d

DB_USER="${STAGING_POSTGRES_USER:-${POSTGRES_USER:-postgres}}"
DB_NAME="${STAGING_POSTGRES_DB:-${POSTGRES_DB:-pastane_db_staging}}"

echo "Waiting for db health..."
for _ in $(seq 1 90); do
  if compose_staging exec -T "$DB_SVC" pg_isready -U "$DB_USER" -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Recreating staging database ${DB_NAME}..."
compose_staging exec -T "$DB_SVC" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true
compose_staging exec -T "$DB_SVC" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
compose_staging exec -T "$DB_SVC" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${DB_NAME}\";"

echo "Copying dump into staging container..."
compose_staging cp "$DUMP_FILE" "${DB_SVC}:/tmp/restore.dump"

START_RESTORE=$(date +%s)
compose_staging exec -T "$DB_SVC" pg_restore -U postgres -d "$DB_NAME" --no-owner --role="$DB_USER" /tmp/restore.dump
END_RESTORE=$(date +%s)
RESTORE_SEC=$((END_RESTORE - START_RESTORE))
echo "pg_restore duration: ${RESTORE_SEC}s"

echo "Applying sanitize SQL..."
compose_staging cp "$SQL_SANITIZE" "${DB_SVC}:/tmp/sanitize.sql"
compose_staging exec -T "$DB_SVC" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /tmp/sanitize.sql

bash "$ROOT/scripts/staging/set-staging-passwords.sh"

echo "Restore + sanitize complete. pg_restore_seconds=${RESTORE_SEC}" | tee "${BACKUP_DIR:-${ROOT}/tmp/pastane-staging}/last-restore-timing.txt"
