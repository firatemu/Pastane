#!/usr/bin/env bash
# Faz 8.0 — Production cutover: plain postgres:16-alpine + pgAdmin → full Supabase self-host stack.
#
# Usage (on VPS, from repo root):
#   CONFIRM=YES bash scripts/cutover-full-supabase-prod.sh
#
# Requires: fresh backup, .env.production with Supabase Faz 8.0 vars (see generate-supabase-secrets.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
LEGACY_VOLUME="${LEGACY_VOLUME:-supabase_prod_db_data_legacy_faz8}"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES to run destructive cutover." >&2
  exit 1
fi

# shellcheck source=scripts/lib/compose-prod.sh
source "$ROOT/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$ROOT"

bash "$ROOT/scripts/validate-env.sh" "$ENV_FILE"
bash "$ROOT/scripts/generate-supabase-compose-env.sh" "$ENV_FILE"

echo "[1] Final backup before cutover..."
OUT_DIR="${BACKUP_DIR:-/var/www/pastane-app/backups}"
if docker ps --format '{{.Names}}' | grep -qx 'pastane_supabase_db_prod'; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$OUT_DIR"
  DUMP="$OUT_DIR/pastane-pg-${STAMP}.dump"
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
  docker exec pastane_supabase_db_prod pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-pastane_db}" -Fc -f /tmp/backup.dump
  docker cp "pastane_supabase_db_prod:/tmp/backup.dump" "$DUMP"
  echo "Legacy container backup: $DUMP"
elif [[ -z "${DUMP_FILE:-}" ]]; then
  DUMP="$(ls -t "$OUT_DIR"/pastane-pg-*.dump 2>/dev/null | head -1)"
  if [[ -z "$DUMP" ]]; then
    echo "error: no running db container and no pastane-pg-*.dump in $OUT_DIR" >&2
    exit 1
  fi
  echo "Using existing dump: $DUMP"
else
  DUMP="$DUMP_FILE"
  echo "Using DUMP_FILE: $DUMP"
fi
if [[ -z "$DUMP" ]]; then
  echo "error: no dump found after backup" >&2
  exit 1
fi
echo "Using dump: $DUMP"

echo "[2] Stop API and legacy supabase stack..."
compose_prod_app stop api || true
docker stop pastane_supabase_studio_prod pastane_supabase_db_prod 2>/dev/null || true
docker rm -f pastane_supabase_studio_prod pastane_supabase_db_prod 2>/dev/null || true
compose_supabase down --remove-orphans 2>/dev/null || true

echo "[3] Snapshot legacy DB volume (rollback window)..."
if docker volume inspect supabase_prod_db_data >/dev/null 2>&1; then
  if ! docker volume inspect "$LEGACY_VOLUME" >/dev/null 2>&1; then
    docker volume create "$LEGACY_VOLUME" >/dev/null
    docker run --rm \
      -v supabase_prod_db_data:/from:ro \
      -v "$LEGACY_VOLUME":/to \
      alpine sh -c "cd /from && cp -a . /to/"
    echo "Legacy data copied to volume $LEGACY_VOLUME"
  else
    echo "Legacy volume $LEGACY_VOLUME already exists — skipping copy"
  fi
fi

echo "[4] Remove old DB volume for fresh Supabase init..."
docker volume rm supabase_prod_db_data 2>/dev/null || true
docker volume rm supabase_prod_db_config 2>/dev/null || true

echo "[5] Start full Supabase stack (PG17)..."
ensure_supabase_stack_up

echo "[6] Create pastane_db and restore application data..."
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

PASTANE_DB="${POSTGRES_DB:-pastane_db}"
PASTANE_USER="${POSTGRES_USER:-postgres}"

compose_supabase exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT 1 FROM pg_database WHERE datname = '${PASTANE_DB}'" | grep -q 1 || \
  compose_supabase exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${PASTANE_DB}\";"

compose_supabase cp "$DUMP" "db:/tmp/restore.dump"
compose_supabase exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PASTANE_DB}' AND pid <> pg_backend_pid();" || true
compose_supabase exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"${PASTANE_DB}\";"
compose_supabase exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE \"${PASTANE_DB}\";"
compose_supabase exec -T db pg_restore -U postgres -d "${PASTANE_DB}" --no-owner --role="${PASTANE_USER}" /tmp/restore.dump

echo "[7] Start API and run migrations..."
compose_prod_app up -d api
compose_prod_app exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

echo "[8] Smoke checks..."
bash "$ROOT/scripts/post-deploy-smoke-prod.sh"

echo "Cutover complete. Open https://studio.azem.cloud (DASHBOARD_USERNAME / DASHBOARD_PASSWORD)."
echo "Rollback: docs/supabase-full-self-host-faz-8.0.md"
