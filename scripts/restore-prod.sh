#!/usr/bin/env bash
# Restore PostgreSQL from a pg_dump custom-format file created by backup-prod.sh.
# DESTRUCTIVE: overwrites the active database after drop/create inside the container.
#
# Usage:
#   DUMP_FILE=/path/to/pastane-pg-....dump CONFIRM=YES bash scripts/restore-prod.sh
#   DB_SERVICE=supabase-db DUMP_FILE=... CONFIRM=YES bash scripts/restore-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
DB_SERVICE="${DB_SERVICE:-postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.prod.yml}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"
PROJECT_SUPABASE="${SUPABASE_PROJECT_NAME:-supabase-prod}"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES to run destructive restore." >&2
  exit 1
fi

if [[ -z "${DUMP_FILE:-}" ]] || [[ ! -f "$DUMP_FILE" ]]; then
  echo "error: DUMP_FILE must point to an existing .dump file." >&2
  exit 1
fi

echo "Stopping API to close DB connections (best effort)..."
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop api || true

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ "$DB_SERVICE" == "supabase-db" ]]; then
  SVC="supabase-db"
  COMPOSE_TARGET="$COMPOSE_SUPABASE"
  PROJECT_TARGET="$PROJECT_SUPABASE"
else
  SVC="postgres"
  COMPOSE_TARGET="$COMPOSE_FILE"
  PROJECT_TARGET="$PROJECT_NAME"
fi

echo "Copying dump into ${SVC} container..."
docker compose --project-name "$PROJECT_TARGET" --env-file "$ENV_FILE" -f "$COMPOSE_TARGET" \
  cp "$DUMP_FILE" "${SVC}:/tmp/restore.dump"

echo "Dropping and recreating database ${POSTGRES_DB}..."
docker compose --project-name "$PROJECT_TARGET" --env-file "$ENV_FILE" -f "$COMPOSE_TARGET" \
  exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true
docker compose --project-name "$PROJECT_TARGET" --env-file "$ENV_FILE" -f "$COMPOSE_TARGET" \
  exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"
docker compose --project-name "$PROJECT_TARGET" --env-file "$ENV_FILE" -f "$COMPOSE_TARGET" \
  exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${POSTGRES_DB}\";"

echo "Restoring..."
docker compose --project-name "$PROJECT_TARGET" --env-file "$ENV_FILE" -f "$COMPOSE_TARGET" \
  exec -T "$SVC" pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --role="${POSTGRES_USER}" "/tmp/restore.dump"

docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start api

echo "Restore complete. Run prisma migrate status if schema drift is suspected."
