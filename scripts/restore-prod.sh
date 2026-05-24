#!/usr/bin/env bash
# Restore PostgreSQL from a pg_dump custom-format file created by backup-prod.sh.
# DESTRUCTIVE: overwrites the active database after drop/create inside the container.
#
# Usage:
#   DUMP_FILE=/path/to/pastane-pg-....dump CONFIRM=YES bash scripts/restore-prod.sh
#   DB_SERVICE=supabase-db DUMP_FILE=... CONFIRM=YES bash scripts/restore-prod.sh
#   DB_SERVICE=postgres DUMP_FILE=... CONFIRM=YES bash scripts/restore-prod.sh  # legacy rollback window
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
DB_SERVICE="${DB_SERVICE:-supabase-db}"

# shellcheck source=scripts/lib/compose-prod.sh
source "$ROOT/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES to run destructive restore." >&2
  exit 1
fi

if [[ -z "${DUMP_FILE:-}" ]] || [[ ! -f "$DUMP_FILE" ]]; then
  echo "error: DUMP_FILE must point to an existing .dump file." >&2
  exit 1
fi

echo "Stopping API to close DB connections (best effort)..."
compose_prod_app stop api || true

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ "$DB_SERVICE" == "supabase-db" ]]; then
  SVC="$(supabase_db_service)"
  COMPOSE_TARGET=(compose_supabase)
else
  SVC="postgres"
  echo "Starting legacy postgres (profile ${COMPOSE_LEGACY_PROFILE}) for restore..."
  compose_prod_app --profile "$COMPOSE_LEGACY_PROFILE" up -d postgres
  COMPOSE_TARGET=(compose_prod_app --profile "$COMPOSE_LEGACY_PROFILE")
fi

echo "Copying dump into ${SVC} container..."
"${COMPOSE_TARGET[@]}" cp "$DUMP_FILE" "${SVC}:/tmp/restore.dump"

echo "Dropping and recreating database ${POSTGRES_DB}..."
"${COMPOSE_TARGET[@]}" exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true
"${COMPOSE_TARGET[@]}" exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"
"${COMPOSE_TARGET[@]}" exec -T "$SVC" psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${POSTGRES_DB}\";"

echo "Restoring..."
if ! "${COMPOSE_TARGET[@]}" exec -T "$SVC" pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --no-owner --no-acl --role="${POSTGRES_USER}" "/tmp/restore.dump"; then
  echo "pg_restore reported errors (ACL/schema warnings are common on Supabase stack); verifying database..."
  "${COMPOSE_TARGET[@]}" exec -T "$SVC" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT 1" >/dev/null
fi

if [[ "${SKIP_API_START:-}" != "1" ]]; then
  compose_prod_app start api
fi

echo "Restore complete. Run prisma migrate status if schema drift is suspected."
