#!/usr/bin/env bash
# Restore PostgreSQL from a pg_dump custom-format file created by backup-prod.sh.
# DESTRUCTIVE: overwrites the active database after drop/create inside the container.
# Usage:
#   DUMP_FILE=/path/to/pastane-pg-....dump CONFIRM=YES bash scripts/restore-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES to run destructive restore." >&2
  exit 1
fi

if [[ -z "${DUMP_FILE:-}" ]] || [[ ! -f "$DUMP_FILE" ]]; then
  echo "error: DUMP_FILE must point to an existing .dump file." >&2
  exit 1
fi

echo "Stopping API to close DB connections (best effort)..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop api || true

echo "Copying dump into postgres container..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" cp "$DUMP_FILE" "postgres:/tmp/restore.dump"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

echo "Dropping and recreating database ${POSTGRES_DB}..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${POSTGRES_DB}\";"

echo "Restoring..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --role="${POSTGRES_USER}" "/tmp/restore.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start api

echo "Restore complete. Run prisma migrate status if schema drift is suspected."
