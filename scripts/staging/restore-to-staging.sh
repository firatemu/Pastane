#!/usr/bin/env bash
# Restore sanitized production dump into staging Supabase DB. Does NOT modify production.
#
# Usage:
#   DUMP_FILE=/var/backups/pastane-staging/prod-source-XXX.dump bash scripts/staging/restore-to-staging.sh
#   bash scripts/staging/restore-to-staging.sh   # uses .latest-prod-source-dump pointer
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.staging}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.staging.yml}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-staging}"
SQL_SANITIZE="${SQL_SANITIZE:-scripts/staging/sanitize-staging-db.sql}"

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

echo "Ensuring staging Supabase DB is up..."
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" up -d supabase-db

echo "Waiting for supabase-db health..."
for _ in $(seq 1 30); do
  if docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
    exec -T supabase-db pg_isready -U "${STAGING_POSTGRES_USER:-$POSTGRES_USER}" -d "${STAGING_POSTGRES_DB:-$POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

DB_USER="${STAGING_POSTGRES_USER:-$POSTGRES_USER}"
DB_NAME="${STAGING_POSTGRES_DB:-$POSTGRES_DB}"

echo "Recreating staging database ${DB_NAME}..."
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\";"

echo "Copying dump into staging container..."
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  cp "$DUMP_FILE" "supabase-db:/tmp/restore.dump"

START_RESTORE=$(date +%s)
echo "pg_restore started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --role="$DB_USER" /tmp/restore.dump
END_RESTORE=$(date +%s)
RESTORE_SEC=$((END_RESTORE - START_RESTORE))
echo "pg_restore duration: ${RESTORE_SEC}s"

echo "Applying sanitize SQL..."
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  cp "$SQL_SANITIZE" "supabase-db:/tmp/sanitize.sql"
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /tmp/sanitize.sql

bash "$ROOT/scripts/staging/set-staging-passwords.sh"

echo "Restore + sanitize complete. pg_restore_seconds=${RESTORE_SEC}" | tee "${BACKUP_DIR:-${ROOT}/tmp/pastane-staging}/last-restore-timing.txt"
